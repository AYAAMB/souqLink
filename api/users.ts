import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const sql = getSql();
  const rows = await sql`
    select id, email, name, phone
    from public.users
    order by name
  `;

  res.status(200).json(rows);
}
