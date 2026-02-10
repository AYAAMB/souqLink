import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();
  const { action, id, email, role } = req.query;

  // GET /api/orders
  if (req.method === "GET" && !action && !id) {
    const rows = await sql`select * from orders order by created_at desc`;
    return res.json(rows);
  }

  // GET /api/orders?role=customer&email=...
  if (req.method === "GET" && role === "customer" && email) {
    const rows = await sql`
      select * from orders
      where lower(customer_email) = lower(${email})
    `;
    return res.json(rows);
  }

  // GET /api/orders?role=courier&email=...
  if (req.method === "GET" && role === "courier" && email) {
    const rows = await sql`
      select * from orders
      where lower(assigned_courier_email) = lower(${email})
    `;
    return res.json(rows);
  }

  // GET /api/orders?id=123
  if (req.method === "GET" && id) {
    const rows = await sql`select * from orders where id = ${id}`;
    return rows.length
      ? res.json(rows[0])
      : res.status(404).json({ error: "Order not found" });
  }

  res.status(404).json({ error: "Not found" });
}
