import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function database() {
  const { env } = await import("cloudflare:workers");
  return env.DB;
}

async function authorized() {
  return Boolean(await getChatGPTUser());
}

async function ensureCatalogTables() {
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, icon TEXT NOT NULL DEFAULT '▣', color TEXT NOT NULL DEFAULT '#f3eef2', position INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price REAL NOT NULL, old_price REAL, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, art TEXT NOT NULL DEFAULT '▣', color TEXT NOT NULL DEFAULT '#f3eef2', available INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS product_categories (product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE, PRIMARY KEY (product_id, category_id))"),
    db.prepare("INSERT OR IGNORE INTO product_categories (product_id, category_id) SELECT id, category_id FROM products WHERE category_id IS NOT NULL"),
  ]);
}

export async function GET() {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureCatalogTables();
  const db = await database();
  const [productResult, categoryResult, productCategoryResult] = await db.batch([
    db.prepare("SELECT p.id, p.name, p.description, p.price, p.old_price AS oldPrice, p.category_id AS categoryId, COALESCE(GROUP_CONCAT(DISTINCT c.name), 'Sem categoria') AS category, p.art, p.color, p.available, p.featured FROM products p LEFT JOIN product_categories pc ON pc.product_id = p.id LEFT JOIN categories c ON c.id = pc.category_id GROUP BY p.id ORDER BY p.id DESC"),
    db.prepare("SELECT c.id, c.name, c.icon, c.color, c.position, c.active, COUNT(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.position, c.name"),
    db.prepare("SELECT product_id AS productId, category_id AS categoryId FROM product_categories"),
  ]);
  const categoryIdsByProduct = new Map<number, number[]>();
  for (const link of productCategoryResult.results as any[]) {
    const productId = Number(link.productId);
    const categoryId = Number(link.categoryId);
    categoryIdsByProduct.set(productId, [...(categoryIdsByProduct.get(productId) || []), categoryId]);
  }
  return Response.json({
    products: productResult.results.map((item: any) => ({ ...item, categoryIds: categoryIdsByProduct.get(Number(item.id)) || (item.categoryId ? [item.categoryId] : []), available: Boolean(item.available), featured: Boolean(item.featured) })),
    categories: categoryResult.results.map((item: any) => ({ ...item, active: Boolean(item.active) })),
  });
}

async function productPayload(request: Request) {
  const body = await request.json();
  if (!body.name?.trim() || !Number.isFinite(body.price) || body.price < 0) return null;
  return {
    ...body,
    name: body.name.trim(),
    description: String(body.description || "").trim(),
    art: String(body.art || "▣").slice(0, 8),
    color: String(body.color || "#f3eef2").slice(0, 24),
    available: body.available ? 1 : 0,
    featured: body.featured ? 1 : 0,
    categoryIds: Array.isArray(body.categoryIds)
      ? [...new Set(body.categoryIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0))]
      : body.categoryId ? [Number(body.categoryId)] : [],
  };
}

function categoryPayload(body: any) {
  const name = String(body?.name || "").trim().slice(0, 80);
  const icon = String(body?.icon || "▣").trim().slice(0, 8) || "▣";
  const color = String(body?.color || "#f3eef2").trim().slice(0, 24) || "#f3eef2";
  const position = Number.isFinite(Number(body?.position)) ? Math.trunc(Number(body.position)) : 0;
  if (!name) return null;
  return { name, icon, color, position, active: body?.active === false ? 0 : 1 };
}

export async function POST(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureCatalogTables();
  const rawBody = await request.clone().json().catch(() => ({}));
  const db = await database();
  if (rawBody?.resource === "category") {
    const body = categoryPayload(rawBody);
    if (!body) return Response.json({ error: "Dados inválidos" }, { status: 400 });
    const result = await db.prepare("INSERT INTO categories (name, icon, color, position, active) VALUES (?, ?, ?, ?, ?)").bind(body.name, body.icon, body.color, body.position, body.active).run();
    return Response.json({ id: result.meta.last_row_id }, { status: 201 });
  }
  const body = await productPayload(request);
  if (!body) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const primaryCategoryId = body.categoryIds[0] || null;
  const result = await db.prepare("INSERT INTO products (name, description, price, old_price, category_id, art, color, available, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(body.name, body.description, body.price, body.oldPrice, primaryCategoryId, body.art, body.color, body.available, body.featured).run();
  const productId = Number(result.meta.last_row_id);
  if (body.categoryIds.length) await db.batch(body.categoryIds.map((categoryId: number) => db.prepare("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)").bind(productId, categoryId)));
  return Response.json({ id: productId }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureCatalogTables();
  const rawBody = await request.clone().json().catch(() => ({}));
  const db = await database();
  if (rawBody?.resource === "category") {
    const id = Number(rawBody?.id);
    const body = categoryPayload(rawBody);
    if (!Number.isInteger(id) || id < 1 || !body) return Response.json({ error: "Dados inválidos" }, { status: 400 });
    await db.prepare("UPDATE categories SET name=?, icon=?, color=?, position=?, active=? WHERE id=?").bind(body.name, body.icon, body.color, body.position, body.active, id).run();
    return Response.json({ ok: true });
  }
  const body = await productPayload(request);
  if (!body?.id) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const primaryCategoryId = body.categoryIds[0] || null;
  await db.prepare("UPDATE products SET name=?, description=?, price=?, old_price=?, category_id=?, art=?, color=?, available=?, featured=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.name, body.description, body.price, body.oldPrice, primaryCategoryId, body.art, body.color, body.available, body.featured, body.id).run();
  await db.prepare("DELETE FROM product_categories WHERE product_id=?").bind(body.id).run();
  if (body.categoryIds.length) await db.batch(body.categoryIds.map((categoryId: number) => db.prepare("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)").bind(body.id, categoryId)));
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureCatalogTables();
  const body = await request.json();
  const { id, action, resource } = body;
  const db = await database();
  if (resource === "category") {
    if (action === "toggle") await db.prepare("UPDATE categories SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id=?").bind(id).run();
    else return Response.json({ error: "Ação inválida" }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (resource === "products") {
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map((item: unknown) => Number(item)).filter((item: number) => Number.isInteger(item) && item > 0))] : [];
    if (!ids.length || !["activate", "deactivate", "feature", "unfeature"].includes(action)) return Response.json({ error: "Ação inválida" }, { status: 400 });
    if (action === "activate" || action === "deactivate") {
      const available = action === "activate" ? 1 : 0;
      await db.batch(ids.map((productId: number) => db.prepare("UPDATE products SET available=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(available, productId)));
    } else {
      const featured = action === "feature" ? 1 : 0;
      await db.batch(ids.map((productId: number) => db.prepare("UPDATE products SET featured=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(featured, productId)));
    }
    return Response.json({ ok: true, updated: ids.length });
  }
  if (action === "toggle") await db.prepare("UPDATE products SET available = CASE available WHEN 1 THEN 0 ELSE 1 END, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  else if (action === "duplicate") await db.prepare("INSERT INTO products (name, description, price, old_price, category_id, art, color, available, featured) SELECT name || ' (cópia)', description, price, old_price, category_id, art, color, available, featured FROM products WHERE id=?").bind(id).run();
  else if (action === "delete") await db.prepare("DELETE FROM products WHERE id=?").bind(id).run();
  else return Response.json({ error: "Ação inválida" }, { status: 400 });
  return Response.json({ ok: true });
}
