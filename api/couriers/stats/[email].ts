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
    where lower(assigned_courier_email) = lower(${email})
      and lower(status) = 'delivered'
  `;

  // ✅ si tu veux des gains : on somme total_amount des livraisons delivered
  const earnings = await sql`
    select coalesce(sum(total_amount), 0)::float as s
    from public.orders
    where lower(assigned_courier_email) = lower(${email})
      and lower(status) = 'delivered'
  `;

  return res.status(200).json({
    totalDeliveries: total[0]?.c ?? 0,
    completedDeliveries: delivered[0]?.c ?? 0,
    totalEarnings: earnings[0]?.s ?? 0,
    averageRating: 0, // si tu as une table ratings on le calcule
  });
}