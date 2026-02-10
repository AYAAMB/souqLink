import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const sql = getSql();

  const totalOrders = await sql`select count(*)::int as c from public.orders`;
  const supermarketOrders = await sql`select count(*)::int as c from public.orders where order_type = 'supermarket'`;
  const souqOrders = await sql`select count(*)::int as c from public.orders where order_type = 'souq'`;

  const byStatus = await sql`
    select status, count(*)::int as c
    from public.orders
    group by status
  `;

  const ordersByStatus: Record<string, number> = { received: 0, shopping: 0, in_delivery: 0, delivered: 0 };
  for (const r of byStatus as any[]) {
    if (ordersByStatus[r.status] !== undefined) ordersByStatus[r.status] = r.c;
  }

  return res.status(200).json({
    totalOrders: totalOrders[0]?.c ?? 0,
    supermarketOrders: supermarketOrders[0]?.c ?? 0,
    souqOrders: souqOrders[0]?.c ?? 0,
    ordersByStatus,
  });
}
