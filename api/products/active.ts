import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const sql = getSql();
  const rows = await sql`
    select id, name, category, image_url, indicative_price, is_active, created_at
    from public.products
    where is_active = true
    order by created_at desc
  `;
  return res.status(200).json(rows);
}
