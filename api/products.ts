import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import crypto from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();

  if (req.method === "GET") {
    const rows = await sql`
      select id, name, category, image_url, indicative_price, is_active, created_at
      from public.products
      order by created_at desc
    `;
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { name, category, imageUrl, indicativePrice, isActive } = (req.body ?? {}) as any;

    if (!name || !category) return res.status(400).json({ error: "name and category are required" });

    const id = crypto.randomUUID();
    const inserted = await sql`
      insert into public.products (id, name, category, image_url, indicative_price, is_active, created_at)
      values (
        ${id},
        ${name},
        ${category},
        ${imageUrl ?? null},
        ${indicativePrice ?? null},
        ${!!isActive},
        now()
      )
      returning id, name, category, image_url, indicative_price, is_active, created_at
    `;

    return res.status(200).json(inserted[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
