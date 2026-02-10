import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query as { id: string };
  const sql = getSql();

  const orders = await sql`select * from public.orders where id = ${id} limit 1`;
  const order = orders[0];
  if (!order) return res.status(404).json({ error: "Order not found" });

  let courier: any = null;
  if (order.assigned_courier_email) {
    const u = await sql`
      select id, email, name, phone, role
      from public.users
      where lower(email) = lower(${order.assigned_courier_email})
      limit 1
    `;
    courier = u[0] ?? null;
  }

  return res.status(200).json({
    orderId: order.id,
    status: order.status,
    pickup: {
      address: order.pickup_address || "Supermarché local",
      lat: order.pickup_lat ? Number(order.pickup_lat) : 33.5731,
      lng: order.pickup_lng ? Number(order.pickup_lng) : -7.5898,
    },
    dropoff: {
      address: order.delivery_address,
      lat: order.dropoff_lat ? Number(order.dropoff_lat) : 33.5831,
      lng: order.dropoff_lng ? Number(order.dropoff_lng) : -7.5998,
    },
    courier: order.assigned_courier_email
      ? {
          name: courier?.name || "Livreur",
          phone: courier?.phone || null,
          lat: order.courier_lat ? Number(order.courier_lat) : null,
          lng: order.courier_lng ? Number(order.courier_lng) : null,
          lastUpdate: order.courier_last_update,
        }
      : null,
    orderType: order.order_type,
    createdAt: order.created_at,
  });
}
