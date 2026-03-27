import { getDb } from './src/db/db.client';

async function main() {
  const db = await getDb();
  const tenantId = 'default_tenant';
  const limit = 50;
  const offset = 0;
  
  const query = `SELECT o.*,
      COALESCE(c.name, o.customer_name) as resolved_customer_name,
      COALESCE(c.phone, o.customer_phone) as resolved_customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.restaurant_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
      
  const params = [tenantId, limit, offset];
  const orders = await db.all(query, params);

  console.log('Returned rows:', orders.length);
  if (orders.length > 0) {
    console.log(JSON.stringify({
      id: orders[0].id,
      customer_id: orders[0].customer_id,
      customer_name: orders[0].customer_name,
      resolved_customer_name: orders[0].resolved_customer_name,
      items: orders[0].items
    }, null, 2));
  }
}
main().catch(console.error);
