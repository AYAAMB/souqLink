import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };
  const sql = getSql();

  if (req.method === "GET") {
    const rows = await sql`select * from public.orders where id = ${id} limit 1`;
    if (!rows[0]) return res.status(404).json({ error: "Order not found" });
    return res.status(200).json(rows[0]);
  }

  if (req.method === "PATCH") {
    const b = (req.body ?? {}) as any;

    const updated = await sql`
      update public.orders
      set
        status = coalesce(${b.status ?? null}, status),
        assigned_courier_email = coalesce(${b.assignedCourierEmail ?? null}, assigned_courier_email),
        final_total = coalesce(${b.finalTotal ?? null}, final_total),
        notes = coalesce(${b.notes ?? null}, notes),
        courier_lat = coalesce(${b.courierLat ?? null}, courier_lat),
        courier_lng = coalesce(${b.courierLng ?? null}, courier_lng),
        courier_last_update = case when ${b.courierLastUpdate ?? null} is null then courier_last_update else ${b.courierLastUpdate} end
      where id = ${id}
      returning *
    `;

    if (!updated[0]) return res.status(404).json({ error: "Order not found" });
    return res.status(200).json(updated[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
