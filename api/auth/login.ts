import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";
import crypto from "node:crypto";

type UserRole = "admin" | "courier" | "customer";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, name, phone, role } = (req.body ?? {}) as {
    email?: string;
    name?: string;
    phone?: string | null;
    role?: UserRole;
  };

  if (!email || !name) return res.status(400).json({ error: "Email and name are required" });

  const sql = getSql();

  const isAdminEmail = email.toLowerCase() === "admin@souqlink.com";
  const effectiveRole: UserRole = isAdminEmail ? "admin" : (role ?? "customer");

  const found = await sql`
    select id, email, name, phone, role
    from public.users
    where lower(email) = lower(${email})
    limit 1
  `;

  let user = found[0] as any;

  if (!user) {
    const id = crypto.randomUUID();
    const inserted = await sql`
      insert into public.users (id, email, name, phone, role, created_at)
      values (${id}, ${email}, ${name}, ${phone ?? null}, ${effectiveRole}, now())
      returning id, email, name, phone, role
    `;
    user = inserted[0];
    return res.status(200).json(user);
  }

  // Fix admin if needed
  if (isAdminEmail && user.role !== "admin") {
    const updated = await sql`
      update public.users
      set role = 'admin'
      where id = ${user.id}
      returning id, email, name, phone, role
    `;
    return res.status(200).json(updated[0]);
  }

  // Role mismatch protection (same as Express)
  if (!isAdminEmail && role && user.role !== role && user.role !== "admin") {
    const roleNames: Record<string, string> = { customer: "client", courier: "livreur", admin: "administrateur" };
    return res.status(400).json({
      error: `Ce compte existe déjà en tant que ${roleNames[user.role] || user.role}. Utilisez un autre email ou connectez-vous avec le bon rôle.`,
    });
  }

  // Update name/phone
  const updated = await sql`
    update public.users
    set name = ${name}, phone = ${phone ?? null}
    where id = ${user.id}
    returning id, email, name, phone, role
  `;

  return res.status(200).json(updated[0]);
}
