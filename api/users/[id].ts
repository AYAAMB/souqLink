import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query as { id: string };
  const { name, phone } = (req.body ?? {}) as { name?: string; phone?: string };

  const sql = getSql();

  const updated = await sql`
    update public.users
    set
      name = coalesce(${name ?? null}, name),
      phone = coalesce(${phone ?? null}, phone)
    where id = ${id}
    returning id, email, name, phone, role
  `;

  if (!updated[0]) return res.status(404).json({ error: "User not found" });
  return res.status(200).json(updated[0]);
}
