import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db"; // ✅ attention: auth.ts est dans /api donc _db est "./_db"
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodeCrypto from "node:crypto";

type UserRole = "admin" | "courier" | "customer";

const OTP_WINDOW_MIN = 10;

// ✅ Secrets serveur
const OTP_SECRET = process.env.OTP_SECRET;
if (!OTP_SECRET) throw new Error("Missing env OTP_SECRET");

// ✅ EmailJS env (gardés)
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL || "";

// ⚠️ Message neutre
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ✅ On garde la fonction (non utilisée côté serveur)
async function sendOtpByEmailJs(toEmail: string, otp: string) {
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: toEmail,
      otp_code: otp,
      expires_in: OTP_WINDOW_MIN,
      app_name: "SouqLik",
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
    const sql = getSql();

    // route = /api/auth/xxxxx
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const path = url.pathname.replace(/^\/api\/auth/, "") || "/";

    // =========================
    // GET /api/auth/me?email=...
    // =========================
    if (req.method === "GET" && (path === "/me" || path === "/me/")) {
      const email = (url.searchParams.get("email") || "").trim();
      if (!email) return res.status(400).json({ error: "email is required" });

      const rows = await sql`
        select id, email, name, phone
        from public.users
        where lower(email) = lower(${email})
        limit 1
      `;

      const user = rows[0] ?? null;
      return res.status(200).json(user);
    }

    // Toutes les autres routes sont POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = (req.body ?? {}) as any;

    // =========================
    // POST /api/auth/register
    // =========================
    if (path === "/register" || path === "/register/") {
      const { email, name, phone, role, password } = body as {
        email?: string;
        name?: string;
        phone?: string | null;
        role?: UserRole;
        password?: string;
      };

      if (!email || !name || !password) {
        return res.status(400).json({ error: "email, name and password are required" });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ error: "Email invalide" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)" });
      }

      const existing = await sql`
        select id from public.users
        where lower(email) = lower(${cleanEmail})
        limit 1
      `;
      if (existing.length) {
        return res.status(409).json({ error: "Email déjà utilisé" });
      }

      const isAdminEmail = cleanEmail === "admin@SouqLik.com";
      const effectiveRole: UserRole = isAdminEmail ? "admin" : (role ?? "customer");

      const passwordHash = await bcrypt.hash(password, 10);
      const id = nodeCrypto.randomUUID();

      const inserted = await sql`
        insert into public.users (id, email, name, phone, role, password_hash, created_at)
        values (${id}, ${cleanEmail}, ${name}, ${phone ?? null}, ${effectiveRole}, ${passwordHash}, now())
        returning id, email, name, phone, role
      `;

      return res.status(201).json(inserted[0]);
    }

    // =========================
    // POST /api/auth/forgot-password
    // =========================
    if (path === "/forgot-password" || path === "/forgot-password/") {
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "email is required" });

      const found = await sql`
        select id
        from public.users
        where lower(email) = lower(${email})
        limit 1
      `;
      const user = found[0] as any;

      // ✅ Toujours OK
      if (!user) {
        return res.status(200).json({
          message: GENERIC_FORGOT_MSG,
          expiresInMinutes: OTP_WINDOW_MIN,
          otp: null,
        });
      }

      const otp = otpForEmail(email, timeWindowIndex());

      // ❌ ne pas envoyer via serveur
      return res.status(200).json({
        message: GENERIC_FORGOT_MSG,
        expiresInMinutes: OTP_WINDOW_MIN,
        otp, // MVP uniquement
      });
    }

    // =========================
    // POST /api/auth/reset-password
    // =========================
    if (path === "/reset-password" || path === "/reset-password/") {
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

      if (!user) return res.status(401).json({ error: "Code invalide ou expiré." });
      if (!isValidOtp(email, otp)) return res.status(401).json({ error: "Code invalide ou expiré." });

      const newHash = await bcrypt.hash(newPassword, 10);

      await sql`
        update public.users
        set password_hash = ${newHash}
        where lower(email) = lower(${email})
      `;

      return res.status(200).json({ message: "Mot de passe mis à jour avec succès." });
    }

    // =========================
    // POST /api/auth/login
    // =========================
    if (path === "/login" || path === "/login/" || path === "/" ) {
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

      if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

      if (!user.password_hash) {
        return res.status(401).json({
          error: "Ce compte n’a pas de mot de passe. Cliquez sur « Mot de passe oublié ? ».",
        });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

      const dbRole = normalizeRole(user.role);
      const askedRole = role ? normalizeRole(role) : undefined;

      const isAdminEmail = cleanEmail === "admin@SouqLik.com";
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
    }

    // =========================
    // Route inconnue
    // =========================
    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("api/auth handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}