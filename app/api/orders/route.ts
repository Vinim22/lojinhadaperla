import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type OrderItemInput = { productId?: unknown; quantity?: unknown };

async function database() {
  const { env } = await import("cloudflare:workers");
  return env.DB;
}

async function ensureOrderTables() {
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS neighborhoods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, delivery_fee REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL, fulfillment TEXT NOT NULL, neighborhood_id INTEGER REFERENCES neighborhoods(id) ON DELETE SET NULL, subtotal REAL NOT NULL, delivery_fee REAL NOT NULL DEFAULT 0, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'novo', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, product_name TEXT NOT NULL, unit_price REAL NOT NULL, quantity INTEGER NOT NULL)"),
  ]);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const customerName = String(body?.customerName || "").trim().slice(0, 120);
  const customerPhone = String(body?.customerPhone || "").replace(/[^0-9+]/g, "").slice(0, 20);
  const fulfillment = body?.fulfillment === "entrega" ? "entrega" : "retirada";
  const neighborhoodId = fulfillment === "entrega" ? Number(body?.neighborhoodId) : null;
  const inputItems = Array.isArray(body?.items) ? body.items as OrderItemInput[] : [];
  const quantities = new Map<number, number>();

  for (const item of inputItems) {
    const productId = Number(item.productId);
    const quantity = Math.min(99, Math.max(0, Math.trunc(Number(item.quantity))));
    if (Number.isInteger(productId) && productId > 0 && quantity > 0) quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  if (!customerName || customerPhone.length < 8 || quantities.size === 0) return Response.json({ error: "Confira os dados do pedido." }, { status: 400 });
  if (fulfillment === "entrega" && (!Number.isInteger(neighborhoodId) || neighborhoodId < 1)) return Response.json({ error: "Escolha um bairro de entrega." }, { status: 400 });

  await ensureOrderTables();
  const db = await database();
  let deliveryFee = 0;
  if (fulfillment === "entrega") {
    const neighborhood = await db.prepare("SELECT id, delivery_fee AS deliveryFee FROM neighborhoods WHERE id = ? AND active = 1").bind(neighborhoodId).first<{ id: number; deliveryFee: number }>();
    if (!neighborhood) return Response.json({ error: "Este bairro não está disponível para entrega." }, { status: 400 });
    deliveryFee = Number(neighborhood.deliveryFee || 0);
  }

  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(",");
  const result = await db.prepare(`SELECT id, name, price FROM products WHERE available = 1 AND id IN (${placeholders})`).bind(...ids).all<{ id: number; name: string; price: number }>();
  if (result.results.length !== ids.length) return Response.json({ error: "Um produto não está mais disponível. Atualize o carrinho." }, { status: 409 });

  const items = result.results.map(product => ({ ...product, quantity: quantities.get(product.id) || 0 }));
  const subtotal = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const total = Number((subtotal + deliveryFee).toFixed(2));
  const order = await db.prepare("INSERT INTO orders (customer_name, customer_phone, fulfillment, neighborhood_id, subtotal, delivery_fee, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'novo')")
    .bind(customerName, customerPhone, fulfillment, neighborhoodId, subtotal, deliveryFee, total).run();
  const orderId = Number(order.meta.last_row_id);
  await db.batch(items.map(item => db.prepare("INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)").bind(orderId, item.id, item.name, item.price, item.quantity)));
  return Response.json({ orderId, subtotal, deliveryFee, total, status: "novo" }, { status: 201 });
}

export async function GET() {
  if (!await getChatGPTUser()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureOrderTables();
  const db = await database();
  const [orders, items] = await db.batch([
    db.prepare("SELECT o.id, o.customer_name AS customerName, o.customer_phone AS customerPhone, o.fulfillment, o.subtotal, o.delivery_fee AS deliveryFee, o.total, o.status, o.created_at AS createdAt, n.name AS neighborhood FROM orders o LEFT JOIN neighborhoods n ON n.id = o.neighborhood_id ORDER BY o.id DESC LIMIT 100"),
    db.prepare("SELECT order_id AS orderId, product_name AS productName, unit_price AS unitPrice, quantity FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT 100) ORDER BY id"),
  ]);
  return Response.json({ orders: orders.results, items: items.results });
}

export async function PATCH(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const status = String(body?.status || "");
  const allowed = new Set(["novo", "confirmado", "preparando", "concluido", "cancelado"]);
  if (!Number.isInteger(id) || id < 1 || !allowed.has(status)) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  await ensureOrderTables();
  const db = await database();
  await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
  return Response.json({ ok: true });
}
