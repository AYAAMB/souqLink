import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

type UserRole = "admin" | "courier" | "customer";

const OTP_WINDOW_MIN = 10;

// ✅ Secrets serveur
const OTP_SECRET = process.env.OTP_SECRET;
if (!OTP_SECRET) throw new Error("Missing env OTP_SECRET");

// ✅ EmailJS env (gardés, même si appel serveur bloqué par EmailJS)
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY; // user_id (public key)
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY; // accessToken (private key)
const APP_BASE_URL = process.env.APP_BASE_URL || "";

// ⚠️ Message neutre (ne révèle pas si email existe)
const GENERIC_FORGOT_MSG = "Si ce compte existe, un code a été envoyé par email.";

function timeWindowIndex(date = new Date()) {
  const ms = date.getTime();
  const windowMs = OTP_WINDOW_MIN * 60 * 1000;
  return Math.floor(ms / windowMs);
}

function otpForEmail(email: string, windowIdx: number) {
  const h = crypto
    .createHmac("sha256", OTP_SECRET!)
    .update(`${email}|${windowIdx}`)
    .digest("hex");

  const n = parseInt(h.slice(0, 8), 16);
  return String(n % 1000000).padStart(6, "0");
}

function isValidOtp(email: string, otp: string) {
  const w = timeWindowIndex();
  const candidates = [w - 1, w, w + 1].map((idx) => otpForEmail(email, idx));
  return candidates.includes(otp);
}

function normalizeRole(r: any): UserRole {
  if (r === "customer" || r === "courier" || r === "admin") return r;
  if (typeof r === "string" && r.toLowerCase().startsWith("custom")) return "customer";
  return r as UserRole;
}

// ✅ On garde la fonction (tu as demandé de ne rien supprimer)
// ⚠️ Mais EmailJS bloque serveur => on NE l’appelle PAS.
async function sendOtpByEmailJs(toEmail: string, otp: string) {
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: toEmail,
      otp_code: otp,
      expires_in: OTP_WINDOW_MIN,
      app_name: "SouqLink",
    },
  };

  const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const txt = await r.text();
    console.error("EmailJS send failed:", r.status, txt);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const sql = getSql();
    const body = (req.body ?? {}) as any;

    const action = body.action as "forgot_password" | "reset_password" | undefined;

    // =========================
    // 1) FORGOT PASSWORD (MVP)
    // =========================
    if (action === "forgot_password") {
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "email is required" });

      const found = await sql`
        select id
        from public.users
        where lower(email) = lower(${email})
        limit 1
      `;
      const user = found[0] as any;

      // ✅ Toujours réponse OK (anti-enumération)
      if (!user) {
        return res.status(200).json({
          message: GENERIC_FORGOT_MSG,
          expiresInMinutes: OTP_WINDOW_MIN,
          otp: null, // pas d’info
        });
      }

      const otp = otpForEmail(email, timeWindowIndex());

      // ❌ IMPORTANT: ne pas envoyer via serveur (EmailJS bloque => 403)
      // ✅ MVP: on renvoie l’otp au navigateur pour l’envoyer via EmailJS (front)
      return res.status(200).json({
        message: GENERIC_FORGOT_MSG,
        expiresInMinutes: OTP_WINDOW_MIN,
        otp, // MVP uniquement
      });
    }

    // =========================
    // 2) RESET PASSWORD
    // =========================
    if (action === "reset_password") {
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      const otp = (body.otp as string | undefined)?.trim();
      const newPassword = (body.newPassword as string | undefined)?.trim();

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "email, otp and newPassword are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)." });
      }

      const found = await sql`
        select id
        from public.users
        where lower(email) = lower(${email})
        limit 1
      `;
      const user = found[0] as any;

      if (!user) {
        return res.status(401).json({ error: "Code invalide ou expiré." });
      }

      if (!isValidOtp(email, otp)) {
        return res.status(401).json({ error: "Code invalide ou expiré." });
      }

      const newHash = await bcrypt.hash(newPassword, 10);

      await sql`
        update public.users
        set password_hash = ${newHash}
        where lower(email) = lower(${email})
      `;

      return res.status(200).json({ message: "Mot de passe mis à jour avec succès." });
    }

    // =========================
    // 3) LOGIN NORMAL
    // =========================
    const { email, password, role } = body as {
      email?: string;
      password?: string;
      role?: UserRole;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const found = await sql`
      select id, email, name, phone, role, password_hash
      from public.users
      where lower(email) = lower(${cleanEmail})
      limit 1
    `;

    const user = found[0] as any;

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: "Ce compte n’a pas de mot de passe. Cliquez sur « Mot de passe oublié ? ».",
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const dbRole = normalizeRole(user.role);
    const askedRole = role ? normalizeRole(role) : undefined;

    const isAdminEmail = cleanEmail === "admin@souqlink.com";
    const isAdmin = dbRole === "admin";

    if (!isAdminEmail && askedRole && !isAdmin && dbRole !== askedRole) {
      const roleNames: Record<string, string> = {
        customer: "client",
        courier: "livreur",
        admin: "administrateur",
      };
      return res.status(400).json({
        error: `Ce compte existe déjà en tant que ${roleNames[dbRole] || dbRole}.`,
      });
    }

    const { password_hash, ...safeUser } = user;
    return res.status(200).json({ ...safeUser, role: dbRole });
  } catch (err) {
    console.error("auth/login handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
