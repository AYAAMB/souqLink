import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.query as { email: string };
  const sql = getSql();

  const rows = await sql`
    select
      id,
      order_type as "orderType",
      lower(status) as status,
      total_amount as "totalAmount",
      delivery_address as "deliveryAddress",
      assigned_courier_email as "assignedCourierEmail",
      to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
    from public.orders
    where lower(assigned_courier_email) = lower(${String(email)})
    order by created_at desc
  `;

  return res.status(200).json(rows);
}