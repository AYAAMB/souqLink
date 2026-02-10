import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import crypto from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();

  if (req.method === "GET") {
    const rows = await sql`
      select *
      from public.orders
      order by created_at desc
    `;
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = (req.body ?? {}) as any;
    const { items, ...orderData } = body;

    const id = crypto.randomUUID();

    // mêmes valeurs par défaut que ton Express
    const status = orderData.status ?? "received";
    const deliveryFee = orderData.deliveryFee ?? 15;

    const inserted = await sql`
      insert into public.orders (
        id, order_type, customer_email, customer_name, customer_phone,
        delivery_address, status, assigned_courier_email,
        delivery_fee, final_total, notes, souq_list, quality_preference,
        budget_enabled, budget_max, preferred_time_window,
        pickup_lat, pickup_lng, pickup_address,
        dropoff_lat, dropoff_lng,
        created_at
      )
      values (
        ${id},
        ${orderData.orderType ?? null},
        ${orderData.customerEmail ?? null},
        ${orderData.customerName ?? null},
        ${orderData.customerPhone ?? null},
        ${orderData.deliveryAddress ?? null},
        ${status},
        ${orderData.assignedCourierEmail ?? null},
        ${deliveryFee},
        ${orderData.finalTotal ?? null},
        ${orderData.notes ?? null},
        ${orderData.souqList ?? null},
        ${orderData.qualityPreference ?? null},
        ${orderData.budgetEnabled ?? null},
        ${orderData.budgetMax ?? null},
        ${orderData.preferredTimeWindow ?? null},
        ${orderData.pickupLat ?? null},
        ${orderData.pickupLng ?? null},
        ${orderData.pickupAddress ?? null},
        ${orderData.dropoffLat ?? null},
        ${orderData.dropoffLng ?? null},
        now()
      )
      returning *
    `;

    // order_items
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        await sql`
          insert into public.order_items (id, order_id, product_id, quantity, indicative_price)
          values (${crypto.randomUUID()}, ${id}, ${it.productId}, ${it.quantity}, ${it.indicativePrice ?? null})
        `;
      }
    }

    return res.status(200).json(inserted[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
