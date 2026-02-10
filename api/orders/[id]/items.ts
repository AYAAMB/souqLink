import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query as { id: string };
  const sql = getSql();

  const rows = await sql`
    select
      oi.id, oi.order_id, oi.product_id, oi.quantity, oi.indicative_price,
      p.name as product_name,
      p.image_url as product_image_url
    from public.order_items oi
    left join public.products p on p.id = oi.product_id
    where oi.order_id = ${id}
  `;

  // Format identique à ton Express (item.product = {name,imageUrl})
  const formatted = rows.map((r: any) => ({
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    quantity: r.quantity,
    indicativePrice: r.indicative_price,
    product: r.product_name ? { name: r.product_name, imageUrl: r.product_image_url } : null,
  }));

  return res.status(200).json(formatted);
}
