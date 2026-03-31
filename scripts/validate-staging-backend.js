/*
 * Validate the public staging backend using the real admin auth flow.
 *
 * Usage:
 *   node scripts/validate-staging-backend.js https://your-backend.onrender.com
 *
 * Optional env vars:
 *   STAGING_ADMIN_TOKEN
 *   STAGING_ADMIN_SLUG (default: default)
 */

const baseUrl = (process.argv[2] || process.env.STAGING_BASE_URL || '').replace(/\/+$/, '');
const adminToken = process.env.STAGING_ADMIN_TOKEN || '';
const adminSlug = (process.env.STAGING_ADMIN_SLUG || 'default').trim().toLowerCase();

if (!baseUrl) {
  console.error('Missing staging base URL. Example: node scripts/validate-staging-backend.js https://your-backend.onrender.com');
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function authHeaders() {
  return adminToken
    ? {
        Authorization: `Bearer ${adminToken}`,
      }
    : {};
}

function buildMenuItemPayload() {
  return {
    name: 'Acai 300ml Staging',
    description: 'Item criado automaticamente para validar o fluxo admin em staging.',
    price_cents: 1990,
    category: 'Acai',
    tags: ['staging', 'smoke'],
    available: true,
    image_url: null,
  };
}

async function ensureAdminMenuItem() {
  if (!adminToken) {
    return null;
  }

  const profile = await request(`/api/admin/profile?slug=${encodeURIComponent(adminSlug)}`, {
    headers: authHeaders(),
  });
  assert(profile.response.ok, '/api/admin/profile failed', profile.body);
  console.log('OK /api/admin/profile');

  const adminMenu = await request(`/api/admin/menu?slug=${encodeURIComponent(adminSlug)}`, {
    headers: authHeaders(),
  });
  assert(adminMenu.response.ok, '/api/admin/menu failed', adminMenu.body);
  console.log(`OK /api/admin/menu (${Array.isArray(adminMenu.body) ? adminMenu.body.length : 0} item(s))`);

  if (Array.isArray(adminMenu.body) && adminMenu.body.length > 0) {
    return adminMenu.body[0];
  }

  const createItem = await request(`/api/admin/menu?slug=${encodeURIComponent(adminSlug)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(buildMenuItemPayload()),
  });
  assert(createItem.response.ok, 'POST /api/admin/menu failed', createItem.body);
  assert(typeof createItem.body?.id === 'string' && createItem.body.id.length > 10, 'POST /api/admin/menu did not return id', createItem.body);
  console.log(`OK POST /api/admin/menu (${createItem.body.id})`);

  return null;
}

async function main() {
  console.log(`Validating ${baseUrl}`);

  const health = await request('/health');
  assert(health.response.ok, '/health failed', health.body);
  assert(health.body?.database === 'ok', '/health did not report database ok', health.body);
  console.log('OK /health');

  const legacyLogin = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'legacy', password: 'legacy' }),
  });
  assert(legacyLogin.response.status === 410, '/api/admin/login should be deprecated (410)', legacyLogin.body);
  console.log('OK /api/admin/login deprecated');

  await ensureAdminMenuItem();

  const publicMenu = await request(`/api/${encodeURIComponent(adminSlug)}/menu`);
  assert(publicMenu.response.ok, '/api/default/menu failed', publicMenu.body);
  assert(Array.isArray(publicMenu.body), '/api/default/menu did not return an array', publicMenu.body);

  if (publicMenu.body.length === 0 && !adminToken) {
    throw Object.assign(new Error('Public menu is empty and no STAGING_ADMIN_TOKEN was provided to create a staging item.'), {
      details: publicMenu.body,
    });
  }

  assert(publicMenu.body.length > 0, '/api/default/menu returned no items', publicMenu.body);
  const firstItem = publicMenu.body[0];
  console.log(`OK /api/${adminSlug}/menu (${publicMenu.body.length} item(s))`);

  const orderPayload = {
    customerId: 'staging-smoke-customer',
    customerName: 'Cliente Smoke',
    customerPhone: '5511999990000',
    customerEmail: 'smoke@xacai.test',
    items: [
      {
        menuItemId: firstItem.id,
        qty: 1,
        selected_options: [],
      },
    ],
    subtotalCents: Number(firstItem.price_cents || 1990),
    deliveryFeeCents: 500,
    totalCents: Number(firstItem.price_cents || 1990) + 500,
    addressText: 'Rua Smoke Test, 123',
    paymentMethod: 'pix',
  };

  const order = await request(`/api/${encodeURIComponent(adminSlug)}/orders`, {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
  assert(order.response.ok, 'POST /api/default/orders failed', order.body);
  assert(typeof order.body?.id === 'string' && order.body.id.length > 10, 'Order creation did not return id', order.body);
  console.log(`OK POST /api/${adminSlug}/orders (${order.body.id})`);

  const paymentStatus = await request(`/api/${encodeURIComponent(adminSlug)}/orders/${order.body.id}/payment-status`);
  assert(paymentStatus.response.ok, 'GET /api/default/orders/:id/payment-status failed', paymentStatus.body);
  assert(typeof paymentStatus.body?.payment_status === 'string', 'payment-status did not return payment_status', paymentStatus.body);
  console.log(`OK GET /api/${adminSlug}/orders/:id/payment-status (${paymentStatus.body.payment_status})`);

  console.log('\nStaging backend validated successfully.');
}

main().catch((error) => {
  console.error('\nValidation failed.');
  console.error(error.message);
  if (error.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exit(1);
});
