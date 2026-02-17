// api/orders.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import crypto from "node:crypto";

function toStr(v: any) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function safeJson(body: any) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

// NOTE: Tu n'as pas api/orders/[id].ts donc /api/orders/:id ne sera PAS routé ici.
// Mais on garde parsePath au cas où ton environnement local/proxy envoie quand même ces URLs.
function parsePath(req: VercelRequest) {
  const url = req.url || "";
  const path = url.split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);

  const ordersIdx = parts.findIndex((p) => p === "orders");
  if (ordersIdx === -1) return { pathOrderId: null as string | null, pathAction: null as string | null };

  const pathOrderId = parts[ordersIdx + 1] ?? null;
  const pathAction = parts[ordersIdx + 2] ?? null; // items | tracking | claim | ...
  return { pathOrderId, pathAction };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();

  const q = (req.query ?? {}) as any;
  const action = (q.action ?? null) as string | null;
  const id = (q.id ?? null) as string | null;
  const email = (q.email ?? null) as string | null;
  const role = (q.role ?? null) as string | null;

  const { pathOrderId, pathAction } = parsePath(req);

  try {
    // ---------------------------------------------------
    // ✅ ROUTES "PATH" (optionnel, si jamais ça arrive ici)
    // ---------------------------------------------------
    // GET /api/orders/:id/items
    if (req.method === "GET" && pathAction === "items" && pathOrderId) {
      const rows = await sql`
        select
          oi.id,
          oi.product_id,
          oi.quantity,
          oi.indicative_price,
          p.name as product_name,
          p.image_url as product_image_url
        from public.order_items oi
        left join public.products p on p.id = oi.product_id
        where oi.order_id = ${String(pathOrderId)}
        order by oi.id asc
      `;

      const formatted = rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        quantity: r.quantity,
        indicativePrice: r.indicative_price,
        product: { name: r.product_name ?? "Produit", imageUrl: r.product_image_url ?? null },
      }));

      return res.status(200).json(formatted);
    }

    // GET /api/orders/:id/tracking
    if (req.method === "GET" && pathAction === "tracking" && pathOrderId) {
      const rows = await sql`select * from public.orders where id = ${String(pathOrderId)}`;
      if (!rows.length) return res.status(404).json({ error: "Order not found" });

      const o: any = rows[0];

      return res.status(200).json({
        orderId: o.id,
        status: o.status,
        orderType: o.order_type,
        createdAt: o.created_at,
        pickup: {
          address: o.pickup_address ?? "Pickup",
          lat: o.pickup_lat != null ? Number(o.pickup_lat) : 0,
          lng: o.pickup_lng != null ? Number(o.pickup_lng) : 0,
        },
        dropoff: {
          address: o.dropoff_address ?? o.delivery_address ?? "Dropoff",
          lat: o.dropoff_lat != null ? Number(o.dropoff_lat) : 0,
          lng: o.dropoff_lng != null ? Number(o.dropoff_lng) : 0,
        },
        courier: o.assigned_courier_email
          ? {
              name: o.assigned_courier_email,
              phone: null,
              lat: o.courier_lat != null ? Number(o.courier_lat) : null,
              lng: o.courier_lng != null ? Number(o.courier_lng) : null,
              lastUpdate: o.courier_last_update ?? null,
            }
          : null,
      });
    }

    // POST /api/orders/:id/claim
    if (req.method === "POST" && pathAction === "claim" && pathOrderId) {
      const body = safeJson(req.body) as any;
      const courierEmail = toStr(body.courierEmail);
      if (!courierEmail) return res.status(400).json({ error: "courierEmail is required" });

      const updated = await sql`
        update public.orders
        set
          assigned_courier_email = ${courierEmail},
          status = case when status in ('received','pending') then 'shopping' else status end,
          courier_last_update = now()
        where id = ${String(pathOrderId)}
          and (assigned_courier_email is null or assigned_courier_email = '')
        returning *
      `;

      if (!updated.length) {
        const exists = await sql`
          select id, assigned_courier_email
          from public.orders
          where id = ${String(pathOrderId)}
        `;
        if (!exists.length) return res.status(404).json({ error: "Order not found" });
        return res.status(409).json({ error: "Order already assigned" });
      }

      return res.status(200).json(updated[0]);
    }

    // PATCH /api/orders/:id  (status)
    if (req.method === "PATCH" && pathOrderId && !pathAction) {
      const body = safeJson(req.body) as any;

      const nextStatus = toStr(body.status);
      const courierEmail = toStr(body.courierEmail);

      const courierLat = body.courierLat != null && `${body.courierLat}` !== "" ? Number(body.courierLat) : null;
      const courierLng = body.courierLng != null && `${body.courierLng}` !== "" ? Number(body.courierLng) : null;

      if (!nextStatus) return res.status(400).json({ error: "status is required" });

      const updated = await sql`
        update public.orders
        set
          status = ${nextStatus},
          courier_lat = coalesce(${courierLat}, courier_lat),
          courier_lng = coalesce(${courierLng}, courier_lng),
          courier_last_update = now()
        where id = ${String(pathOrderId)}
          ${courierEmail ? sql`and lower(assigned_courier_email) = lower(${courierEmail})` : sql``}
        returning *
      `;

      return updated.length
        ? res.status(200).json(updated[0])
        : res.status(404).json({ error: "Order not found (or not assigned to this courier)" });
    }

    // -----------------------------
    // ✅ ROUTES "QUERY" (TES VRAIES ROUTES)
    // -----------------------------

    // ✅ GET /api/orders?action=available
    if (req.method === "GET" && action === "available") {
      const rows = await sql`
        select *
        from public.orders
        where (assigned_courier_email is null or assigned_courier_email = '')
          and status in ('received','pending','shopping')
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    // ✅ POST /api/orders?action=assign&id=...
    if (req.method === "POST" && action === "assign" && id) {
      const body = safeJson(req.body) as any;
      const courierEmail = toStr(body.courierEmail);
      if (!courierEmail) return res.status(400).json({ error: "courierEmail is required" });

      const updated = await sql`
        update public.orders
        set
          assigned_courier_email = ${courierEmail},
          status = case when status in ('received','pending') then 'shopping' else status end,
          courier_last_update = now()
        where id = ${String(id)}
          and (assigned_courier_email is null or assigned_courier_email = '')
        returning *
      `;

      if (!updated.length) {
        const exists = await sql`select id from public.orders where id = ${String(id)}`;
        if (!exists.length) return res.status(404).json({ error: "Order not found" });
        return res.status(409).json({ error: "Order already assigned" });
      }

      return res.status(200).json(updated[0]);
    }

    // ✅ GET /api/orders?action=tracking&id=...
    if (req.method === "GET" && action === "tracking" && id) {
      const rows = await sql`select * from public.orders where id = ${String(id)}`;
      if (!rows.length) return res.status(404).json({ error: "Order not found" });

      const o: any = rows[0];

      return res.status(200).json({
        orderId: o.id,
        status: o.status,
        orderType: o.order_type,
        createdAt: o.created_at,
        pickup: {
          address: o.pickup_address ?? "Pickup",
          lat: o.pickup_lat != null ? Number(o.pickup_lat) : 0,
          lng: o.pickup_lng != null ? Number(o.pickup_lng) : 0,
        },
        dropoff: {
          address: o.dropoff_address ?? o.delivery_address ?? "Dropoff",
          lat: o.dropoff_lat != null ? Number(o.dropoff_lat) : 0,
          lng: o.dropoff_lng != null ? Number(o.dropoff_lng) : 0,
        },
        courier: o.assigned_courier_email
          ? {
              name: o.assigned_courier_email,
              phone: null,
              lat: o.courier_lat != null ? Number(o.courier_lat) : null,
              lng: o.courier_lng != null ? Number(o.courier_lng) : null,
              lastUpdate: o.courier_last_update ?? null,
            }
          : null,
      });
    }

    // ✅ GET /api/orders?action=items&id=...   (ORDER ITEMS + PRODUCT)
    if (req.method === "GET" && action === "items" && id) {
      const rows = await sql`
        select
          oi.id,
          oi.product_id,
          oi.quantity,
          oi.indicative_price,
          p.name as product_name,
          p.image_url as product_image_url
        from public.order_items oi
        left join public.products p on p.id = oi.product_id
        where oi.order_id = ${String(id)}
        order by oi.id asc
      `;

      const formatted = rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        quantity: r.quantity,
        indicativePrice: r.indicative_price,
        product: { name: r.product_name ?? "Produit", imageUrl: r.product_image_url ?? null },
      }));

      return res.status(200).json(formatted);
    }

    // ✅ POST /api/orders?action=status&id=... (UPDATE STATUS + optional courier coords)
    if (req.method === "POST" && action === "status" && id) {
      const body = safeJson(req.body) as any;

      const nextStatus = toStr(body.status);
      const courierEmail = toStr(body.courierEmail);

      const courierLat = body.courierLat != null && `${body.courierLat}` !== "" ? Number(body.courierLat) : null;
      const courierLng = body.courierLng != null && `${body.courierLng}` !== "" ? Number(body.courierLng) : null;

      if (!nextStatus) return res.status(400).json({ error: "status is required" });

      const updated = await sql`
        update public.orders
        set
          status = ${nextStatus},
          courier_lat = coalesce(${courierLat}, courier_lat),
          courier_lng = coalesce(${courierLng}, courier_lng),
          courier_last_update = now()
        where id = ${String(id)}
          ${courierEmail ? sql`and lower(assigned_courier_email) = lower(${courierEmail})` : sql``}
        returning *
      `;

      return updated.length
        ? res.status(200).json(updated[0])
        : res.status(404).json({ error: "Order not found (or not assigned to this courier)" });
    }

    // ✅ GET /api/orders  (liste)
    if (req.method === "GET" && !action && !id && !role) {
      const rows = await sql`select * from public.orders order by created_at desc`;
      return res.status(200).json(rows);
    }

    // ✅ GET /api/orders?role=customer&email=...
    if (req.method === "GET" && role === "customer" && email) {
      const rows = await sql`
        select *
        from public.orders
        where lower(customer_email) = lower(${String(email)})
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    // ✅ GET /api/orders?role=courier&email=...
    if (req.method === "GET" && role === "courier" && email) {
      const rows = await sql`
        select *
        from public.orders
        where lower(assigned_courier_email) = lower(${String(email)})
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    // ✅ GET /api/orders?id=...
    if (req.method === "GET" && id) {
      const rows = await sql`select * from public.orders where id = ${String(id)}`;
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: "Order not found" });
    }

    // ✅ POST /api/orders  (CREATE ORDER)
   // ✅ POST /api/orders  (CREATE ORDER + ORDER ITEMS)
 // ✅ POST /api/orders  (CREATE ORDER + ORDER ITEMS)
if (req.method === "POST" && !action) {
  const body = safeJson(req.body) as any;

  const orderType = toStr(body.orderType) ?? "supermarket";
  const customerEmail = toStr(body.customerEmail);
  const customerName = toStr(body.customerName);
  const customerPhone = toStr(body.customerPhone);
  const deliveryAddress = toStr(body.deliveryAddress);
  const notes = toStr(body.notes);

  const souqListText = toStr(body.souqListText);
  const qualityPreference = toStr(body.qualityPreference);
  const budgetEnabled = !!body.budgetEnabled;
  const budgetMax =
    body.budgetMax != null && `${body.budgetMax}`.trim() !== "" ? String(body.budgetMax) : null;
  const preferredTimeWindow = toStr(body.preferredTimeWindow);

  const status = (body.status ?? "received").toString();
  const newId = crypto.randomUUID();

  // 1) insert order
  const inserted = await sql`
    insert into public.orders (
      id,
      order_type,
      customer_email,
      customer_name,
      customer_phone,
      delivery_address,
      status,
      notes,
      souq_list_text,
      quality_preference,
      budget_enabled,
      budget_max,
      preferred_time_window,
      assigned_courier_email,
      courier_last_update,
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
      ${notes},
      ${souqListText},
      ${qualityPreference},
      ${budgetEnabled},
      ${budgetMax},
      ${preferredTimeWindow},
      null,
      null,
      now()
    )
    returning *
  `;

  // 2) insert order_items (UNE SEULE FOIS) + merge par productId
  const rawItems = Array.isArray(body.items) ? body.items : [];

  const merged: Record<string, { productId: string; quantity: number; indicativePrice: string }> = {};

  for (const it of rawItems) {
    const productId = toStr(it.productId ?? it.product_id);
    if (!productId) continue;

    const quantity = Number.isFinite(Number(it.quantity)) ? Number(it.quantity) : 1;
    const indicativePrice =
      it.indicativePrice != null && `${it.indicativePrice}`.trim() !== ""
        ? String(it.indicativePrice)
        : (it.indicative_price != null && `${it.indicative_price}`.trim() !== ""
            ? String(it.indicative_price)
            : "0");

    if (!merged[productId]) {
      merged[productId] = { productId, quantity, indicativePrice };
    } else {
      merged[productId].quantity += quantity; // additionne si même produit
    }
  }

  for (const key of Object.keys(merged)) {
    const it = merged[key];
    await sql`
      insert into public.order_items (
        id,
        order_id,
        product_id,
        quantity,
        indicative_price
      )
      values (
        ${crypto.randomUUID()},
        ${newId},
        ${it.productId},
        ${it.quantity},
        ${it.indicativePrice}
      )
    `;
  }

  return res.status(200).json(inserted[0]);
}



    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("orders api error:", e);
    return res.status(500).json({
      error: e?.message ?? "Internal Server Error",
      code: e?.code ?? null,
      detail: e?.detail ?? null,
      hint: e?.hint ?? null,
      where: e?.where ?? null,
    });
  }
}
