require('dotenv/config');
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: false });

async function cleanup() {
  const items = await sql`DELETE FROM order_items RETURNING id`;
  console.log('Deleted order_items:', items.length);
  
  const orders = await sql`DELETE FROM orders RETURNING id`;
  console.log('Deleted orders:', orders.length);
  
  await sql.end();
}
cleanup().catch(e => { console.error(e); process.exit(1); });
