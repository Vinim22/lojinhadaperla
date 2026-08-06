import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function database() { const { env } = await import("cloudflare:workers"); return env.DB; }
async function authorized() { return Boolean(await getChatGPTUser()); }

export async function GET() {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const db = await database();
  const [productResult, categoryResult] = await db.batch([
    db.prepare("SELECT p.id, p.name, p.description, p.price, p.old_price AS oldPrice, p.category_id AS categoryId, COALESCE(c.name, 'Sem categoria') AS category, p.art, p.color, p.available, p.featured FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC"),
    db.prepare("SELECT id, name FROM categories WHERE active = 1 ORDER BY position, name"),
  ]);
  return Response.json({ products: productResult.results.map((item: any) => ({ ...item, available: Boolean(item.available), featured: Boolean(item.featured) })), categories: categoryResult.results });
}

async function productPayload(request: Request) {
  const body = await request.json();
  if (!body.name?.trim() || !Number.isFinite(body.price) || body.price < 0) return null;
  return { ...body, name: body.name.trim(), description: String(body.description || "").trim(), art: String(body.art || "▣"), color: String(body.color || "#f3eef2"), available: body.available ? 1 : 0, featured: body.featured ? 1 : 0 };
}

export async function POST(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const body = await productPayload(request); if (!body) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const db = await database();
  const result = await db.prepare("INSERT INTO products (name, description, price, old_price, category_id, art, color, available, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(body.name, body.description, body.price, body.oldPrice, body.categoryId, body.art, body.color, body.available, body.featured).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const body = await productPayload(request); if (!body?.id) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const db = await database();
  await db.prepare("UPDATE products SET name=?, description=?, price=?, old_price=?, category_id=?, art=?, color=?, available=?, featured=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.name, body.description, body.price, body.oldPrice, body.categoryId, body.art, body.color, body.available, body.featured, body.id).run();
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id, action } = await request.json(); const db = await database();
  if (action === "toggle") await db.prepare("UPDATE products SET available = CASE available WHEN 1 THEN 0 ELSE 1 END, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  else if (action === "duplicate") await db.prepare("INSERT INTO products (name, description, price, old_price, category_id, art, color, available, featured) SELECT name || ' (cópia)', description, price, old_price, category_id, art, color, available, featured FROM products WHERE id=?").bind(id).run();
  else if (action === "delete") await db.prepare("DELETE FROM products WHERE id=?").bind(id).run();
  else return Response.json({ error: "Ação inválida" }, { status: 400 });
  return Response.json({ ok: true });
}
