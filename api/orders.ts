import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import crypto from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();
  const { action, id, email, role } = req.query as any;
    // ✅ GET /api/orders?action=tracking&id=...
  if (req.method === "GET" && action === "tracking" && id) {
    const rows = await sql`select * from public.orders where id = ${String(id)}`;
    if (!rows.length) return res.status(404).json({ error: "Order not found" });

    const order = rows[0];
    const status = (order.status ?? "pending").toString();

    const timeline = [
      { key: "pending", label: "Order received", done: true },
      { key: "assigned", label: "Courier assigned", done: ["assigned", "picking", "on_the_way", "delivered"].includes(status) },
      { key: "picking", label: "Shopping in progress", done: ["picking", "on_the_way", "delivered"].includes(status) },
      { key: "on_the_way", label: "On the way", done: ["on_the_way", "delivered"].includes(status) },
      { key: "delivered", label: "Delivered", done: status === "delivered" },
    ];

    return res.status(200).json({
      orderId: order.id,
      status,
      assignedCourierEmail: order.assigned_courier_email ?? null,
      updatedAt: order.courier_last_update_time ?? order.created_at ?? null,
      timeline,
    });
  }

  try {
    // ✅ GET /api/orders
    if (req.method === "GET" && !action && !id && !role) {
      const rows = await sql`select * from public.orders order by created_at desc`;
      return res.status(200).json(rows);
    }

    // ✅ GET /api/orders?role=customer&email=...
    if (req.method === "GET" && role === "customer" && email) {
      const rows = await sql`
        select * from public.orders
        where lower(customer_email) = lower(${String(email)})
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    // ✅ GET /api/orders?role=courier&email=...
    if (req.method === "GET" && role === "courier" && email) {
      const rows = await sql`
        select * from public.orders
        where lower(assigned_courier_email) = lower(${String(email)})
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    // ✅ GET /api/orders?id=...
    if (req.method === "GET" && id) {
      const rows = await sql`select * from public.orders where id = ${String(id)}`;
      return rows.length
        ? res.status(200).json(rows[0])
        : res.status(404).json({ error: "Order not found" });
    }

    // ✅ POST /api/orders
    if (req.method === "POST") {
      const body = (req.body ?? {}) as any;

      const newId = crypto.randomUUID();

      const orderType = (body.orderType ?? "supermarket").toString().trim() || "supermarket";
      const customerEmail = (body.customerEmail ?? "").toString().trim() || null;
      const customerName = (body.customerName ?? "").toString().trim() || null;
      const customerPhone = (body.customerPhone ?? "").toString().trim() || null;
      const deliveryAddress = (body.deliveryAddress ?? "").toString().trim() || null;
      const notes = (body.notes ?? "").toString().trim() || null;

      // ✅ IMPORTANT: ta table a delivery_fee et final_total (pas total_amount)
      const deliveryFee = body.deliveryFee != null ? String(body.deliveryFee) : "0";
      const finalTotal = body.finalTotal != null ? String(body.finalTotal) : null;

      // ✅ Ta table a souq_list_text -> on y met la liste des items
      const items = Array.isArray(body.items) ? body.items : [];
      const souqListText = items.length ? JSON.stringify(items) : null;

      const status = (body.status ?? "pending").toString();

      const inserted = await sql`
        insert into public.orders (
          id,
          order_type,
          customer_email,
          customer_name,
          customer_phone,
          delivery_address,
          status,
          delivery_fee,
          final_total,
          notes,
          souq_list_text,
          created_at
        )
        values (
          ${newId},
          ${orderType},
          ${customerEmail},
          ${customerName},
          ${customerPhone},
          ${deliveryAddress},
          ${status},
          ${deliveryFee},
          ${finalTotal},
          ${notes},
          ${souqListText},
          now()
        )
        returning *
      `;

      return res.status(200).json(inserted[0]);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("❌ /api/orders error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err?.message ?? String(err),
    });
  }
}
