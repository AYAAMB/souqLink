import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

type UserRole = "admin" | "courier" | "customer";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, name, phone, role, password } = (req.body ?? {}) as {
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

  const sql = getSql();

  // email déjà utilisé ?
  const existing = await sql`
    select id from public.users
    where lower(email) = lower(${cleanEmail})
    limit 1
  `;
  if (existing.length) {
    return res.status(409).json({ error: "Email déjà utilisé" });
  }

  const isAdminEmail = cleanEmail === "admin@souqlink.com";
  const effectiveRole: UserRole = isAdminEmail ? "admin" : (role ?? "customer");

  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  const inserted = await sql`
    insert into public.users (id, email, name, phone, role, password_hash, created_at)
    values (${id}, ${cleanEmail}, ${name}, ${phone ?? null}, ${effectiveRole}, ${passwordHash}, now())
    returning id, email, name, phone, role
  `;

  return res.status(201).json(inserted[0]);
}
