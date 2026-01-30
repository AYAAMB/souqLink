import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const sql = neon(process.env.DATABASE_URL!);

  const users = await sql`
    select id, email, name, phone
    from public.users
    order by name
  `;

  res.status(200).json(users);
}
