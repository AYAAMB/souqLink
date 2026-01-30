import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const email = (req.query.email as string) || "";
  if (!email) return res.status(400).json({ error: "email is required" });

  const sql = getSql();
  const rows = await sql`
    select id, email, name, phone
    from public.users
    where lower(email) = lower(${email})
    limit 1
  `;

  const user = rows[0] ?? null;
  return res.status(200).json(user);
}
