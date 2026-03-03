import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ Préflight CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(204).end();
  }

  // ✅ Autoriser PUT (et PATCH si tu veux)
  if (req.method !== "PUT" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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