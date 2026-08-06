export const dynamic = "force-dynamic";

const categorySeed = [
  ["Limpeza", "🧴", "#dff4ff", 1], ["Utilidades", "🏠", "#fff0c9", 2],
  ["Hidráulica", "🔧", "#e9e4ff", 3], ["Elétrica", "💡", "#fff4bc", 4],
  ["Infantil", "🎈", "#e1f7db", 5],
] as const;

const productSeed = [
  ["Kit de limpeza perfumado", 24.9, 29.9, "Limpeza", "🧼", "#dff3ff", 1],
  ["Bola pula-pula colorida", 6.5, null, "Infantil", "⚽", "#fff0d8", 1],
  ["Sifão universal Krona", 8, null, "Hidráulica", "〰️", "#e6ecff", 1],
  ["Plafon LED de sobrepor", 19.9, 23.9, "Elétrica", "💡", "#fff8cc", 1],
  ["Pote organizador com tampa", 12.9, null, "Utilidades", "▣", "#e8f8e4", 0],
  ["Cola instantânea 75g", 8.5, null, "Utilidades", "💧", "#f2e8ff", 0],
  ["Cards de personagens", 3.5, null, "Infantil", "🃏", "#ffe6ef", 0],
  ["Pincel broxa reforçado", 8.9, null, "Utilidades", "🖌️", "#e3f6f0", 0],
] as const;

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  return env.DB;
}

async function initializeCatalog() {
  const db = await getDatabase();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, icon TEXT NOT NULL DEFAULT '▣', color TEXT NOT NULL DEFAULT '#f3eef2', position INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price REAL NOT NULL, old_price REAL, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, art TEXT NOT NULL DEFAULT '▣', color TEXT NOT NULL DEFAULT '#f3eef2', available INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS product_categories (product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE, PRIMARY KEY (product_id, category_id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS neighborhoods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, delivery_fee REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE TABLE IF NOT EXISTS store_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("INSERT OR IGNORE INTO product_categories (product_id, category_id) SELECT id, category_id FROM products WHERE category_id IS NOT NULL"),
  ]);
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('store_name', 'Lojinha da Perla')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('whatsapp', '')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('address', '')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('hours', '')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('delivery_note', 'Confira a taxa do seu bairro antes de confirmar.')"),
  ]);
  const count = await db.prepare("SELECT COUNT(*) AS total FROM categories").first<{ total: number }>();
  if (!count?.total) {
    await db.batch(categorySeed.map((item) => db.prepare("INSERT INTO categories (name, icon, color, position) VALUES (?, ?, ?, ?)").bind(...item)));
    await db.batch(productSeed.map((item) => db.prepare("INSERT INTO products (name, price, old_price, category_id, art, color, featured) SELECT ?, ?, ?, id, ?, ?, ? FROM categories WHERE name = ?").bind(item[0], item[1], item[2], item[4], item[5], item[6], item[3])));
  }
}

export async function GET() {
  await initializeCatalog();
  const db = await getDatabase();
  const [categoryResult, productResult, settingsResult, neighborhoodResult] = await db.batch([
    db.prepare("SELECT name, icon, color FROM categories WHERE active = 1 ORDER BY position, name"),
    db.prepare("SELECT p.id, p.name, p.description, p.price, p.old_price AS oldPrice, COALESCE(GROUP_CONCAT(DISTINCT c.name), 'Sem categoria') AS category, p.art, p.color FROM products p LEFT JOIN product_categories pc ON pc.product_id = p.id LEFT JOIN categories c ON c.id = pc.category_id AND c.active = 1 WHERE p.available = 1 GROUP BY p.id ORDER BY p.created_at DESC, p.id DESC"),
    db.prepare("SELECT key, value FROM store_settings"),
    db.prepare("SELECT id, name, delivery_fee AS deliveryFee FROM neighborhoods WHERE active = 1 ORDER BY name"),
  ]);
  const settings = Object.fromEntries((settingsResult.results || []).map((item: any) => [item.key, item.value]));
  return Response.json({ categories: categoryResult.results, products: productResult.results, settings, neighborhoods: neighborhoodResult.results });
}
