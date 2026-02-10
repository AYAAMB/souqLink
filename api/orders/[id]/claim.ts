import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "../../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query as { id: string };
  const { courierEmail } = (req.body ?? {}) as { courierEmail?: string };

  if (!courierEmail) return res.status(400).json({ error: "courierEmail is required" });

  const sql = getSql();
  const order = await sql`select * from public.orders where id = ${id} limit 1`;
  if (!order[0]) return res.status(404).json({ error: "Commande non trouvée" });

  if (order[0].assigned_courier_email) {
    return res.status(400).json({ error: "Cette commande a déjà été acceptée par un autre livreur" });
  }

  const updated = await sql`
    update public.orders
    set assigned_courier_email = ${courierEmail}, status = 'shopping'
    where id = ${id}
    returning *
  `;

  return res.status(200).json(updated[0]);
}
