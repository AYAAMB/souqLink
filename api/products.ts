import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import crypto from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();

  const { id, active } = req.query as {
    id?: string;
    active?: string;
  };

  // =========================
  // GET
  // =========================
  if (req.method === "GET") {
    // GET by id
    if (id) {
      const rows = await sql`
        select id, name, category, image_url, indicative_price, is_active, created_at
        from public.products
        where id = ${id}
        limit 1
      `;
      if (!rows[0]) return res.status(404).json({ error: "Product not found" });
      return res.status(200).json(rows[0]);
    }

    // GET active only
    if (active === "true") {
      const rows = await sql`
        select id, name, category, image_url, indicative_price, is_active, created_at
        from public.products
        where is_active = true
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    // GET all
    const rows = await sql`
      select id, name, category, image_url, indicative_price, is_active, created_at
      from public.products
      order by created_at desc
    `;
    return res.status(200).json(rows);
  }

  // =========================
  // POST (create)
  // =========================
  if (req.method === "POST") {
    const { name, category, imageUrl, indicativePrice, isActive } = (req.body ?? {}) as any;

    if (!name || !category) {
      return res.status(400).json({ error: "name and category are required" });
    }

    const newId = crypto.randomUUID();

    const inserted = await sql`
      insert into public.products (id, name, category, image_url, indicative_price, is_active, created_at)
      values (
        ${newId},
        ${name},
        ${category},
        ${imageUrl ?? null},
        ${indicativePrice ?? null},
        ${!!isActive},
        now()
      )
      returning id, name, category, image_url, indicative_price, is_active, created_at
    `;

    return res.status(200).json(inserted[0]);
  }

  // =========================
  // PATCH (update by id)
  // =========================
  if (req.method === "PATCH") {
    if (!id) {
      return res.status(400).json({ error: "Missing id in query (?id=...)" });
    }

    const { name, category, imageUrl, indicativePrice, isActive } = (req.body ?? {}) as any;

    const updated = await sql`
      update public.products
      set
        name = coalesce(${name ?? null}, name),
        category = coalesce(${category ?? null}, category),
        image_url = coalesce(${imageUrl ?? null}, image_url),
        indicative_price = coalesce(${indicativePrice ?? null}, indicative_price),
        is_active = coalesce(${typeof isActive === "boolean" ? isActive : null}, is_active)
      where id = ${id}
      returning id, name, category, image_url, indicative_price, is_active, created_at
    `;

    if (!updated[0]) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json(updated[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
