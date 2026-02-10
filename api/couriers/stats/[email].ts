import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../../_db";


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.query as { email: string };
  const sql = getSql();

  const total = await sql`
    select count(*)::int as c
    from public.orders
    where lower(assigned_courier_email) = lower(${email})
  `;

  const delivered = await sql`
    select count(*)::int as c
    from public.orders
    where lower(assigned_courier_email) = lower(${email}) and status = 'delivered'
  `;

  const active = await sql`
    select count(*)::int as c
    from public.orders
    where lower(assigned_courier_email) = lower(${email}) and status in ('shopping','in_delivery')
  `;

  return res.status(200).json({
    totalAssigned: total[0]?.c ?? 0,
    delivered: delivered[0]?.c ?? 0,
    active: active[0]?.c ?? 0,
  });
}
