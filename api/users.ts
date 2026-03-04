import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // handle CORS preflight from web clients
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PUT,PATCH");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(204).end();
  }

  const sql = getSql();

  // helper to extract id that may come either as ?id= query or as a path segment
  function getIdFromReq(r: VercelRequest): string | null {
    const q = r.query as any;
    if (q?.id) return String(q.id);
    const url = r.url || "";
    const parts = url.split("?")[0].split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "users");
    if (idx !== -1 && parts.length > idx + 1) return parts[idx + 1];
    return null;
  }

  const userId = getIdFromReq(req);

  // ============ GET ============
  if (req.method === "GET") {
    if (userId) {
      const rows = await sql`
        select id, email, name, phone, role
        from public.users
        where id = ${userId}
        limit 1
      `;
      if (!rows[0]) return res.status(404).json({ error: "User not found" });
      return res.status(200).json(rows[0]);
    }

    const rows = await sql`
      select id, email, name, phone
      from public.users
      order by name
    `;

    return res.status(200).json(rows);
  }

  // ============ PUT / PATCH (update user) ============
  if ((req.method === "PUT" || req.method === "PATCH") && userId) {
    let body: any = req.body ?? {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { name, phone } = body;

    const updated = await sql`
      update public.users
      set
        name = coalesce(${name ?? null}, name),
        phone = coalesce(${phone ?? null}, phone)
      where id = ${userId}
      returning id, email, name, phone, role
    `;

    if (!updated[0]) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(updated[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
