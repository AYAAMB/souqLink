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

  if (!email || !name) {
    return res.status(400).json({ error: "email and name are required" });
  }

  const safeRole: UserRole = role ?? "customer";
  const sql = getSql();

  // 1) Chercher user par email
  const found = await sql`
    select id, email, name, phone
    from public.users
    where lower(email) = lower(${email})
    limit 1
  `;

  let user = found[0] as any;

  // 2) Si existe -> update name/phone
  if (user?.id) {
    const updated = await sql`
      update public.users
      set name = ${name}, phone = ${phone ?? null}
      where id = ${user.id}
      returning id, email, name, phone
    `;
    user = updated[0];
  } else {
    // 3) Sinon -> insert nouveau
    const id = crypto.randomUUID();
    const inserted = await sql`
      insert into public.users (id, email, name, phone)
      values (${id}, ${email}, ${name}, ${phone ?? null})
      returning id, email, name, phone
    `;
    user = inserted[0];
  }

  // IMPORTANT: ton client attend un User avec role
  return res.status(200).json({
    ...user,
    role: safeRole,
  });
}
