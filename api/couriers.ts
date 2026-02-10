import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const sql = getSql();
  const rows = await sql`
    select id, email, name, phone, role, created_at
    from public.users
    where role = 'courier'
    order by created_at desc
  `;
  return res.status(200).json(rows);
}
