import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";


export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };
  const sql = getSql();

  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const { name, category, imageUrl, indicativePrice, isActive } = (req.body ?? {}) as any;

  const updated = await sql`
    update public.products
    set
      name = coalesce(${name ?? null}, name),
      category = coalesce(${category ?? null}, category),
      image_url = coalesce(${imageUrl ?? null}, image_url),
      indicative_price = coalesce(${indicativePrice ?? null}, indicative_price),
      is_active = coalesce(${typeof isActive === "boolean" ? isActive : null}, is_active)
    where id = ${id}
    returning id, name, category, image_url, indicative_price, is_active, created_at
  `;

  if (!updated[0]) return res.status(404).json({ error: "Product not found" });
  return res.status(200).json(updated[0]);
}
