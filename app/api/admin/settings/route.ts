import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

const settingKeys = ["store_name", "whatsapp", "address", "hours", "delivery_note"] as const;

async function database() {
  const { env } = await import("cloudflare:workers");
  return env.DB;
}

async function authorized() {
  return Boolean(await getChatGPTUser());
}

async function ensureSettingsTables() {
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS neighborhoods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, delivery_fee REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE TABLE IF NOT EXISTS store_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  ]);
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('store_name', 'Lojinha da Perla')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('whatsapp', '')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('address', '')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('hours', '')"),
    db.prepare("INSERT OR IGNORE INTO store_settings (key, value) VALUES ('delivery_note', 'Confira a taxa do seu bairro antes de confirmar.')"),
  ]);
}

export async function GET() {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureSettingsTables();
  const db = await database();
  const [settingsResult, neighborhoodResult] = await db.batch([
    db.prepare("SELECT key, value FROM store_settings"),
    db.prepare("SELECT id, name, delivery_fee AS deliveryFee, active FROM neighborhoods ORDER BY active DESC, name"),
  ]);
  const settings = Object.fromEntries((settingsResult.results || []).map((item: any) => [item.key, item.value]));
  return Response.json({
    settings,
    neighborhoods: (neighborhoodResult.results || []).map((item: any) => ({ ...item, active: Boolean(item.active) })),
  });
}

export async function PUT(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureSettingsTables();
  const body = await request.json().catch(() => ({}));
  const db = await database();
  await db.batch(settingKeys.map((key) => db
    .prepare("INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP")
    .bind(key, String(body?.settings?.[key] || "").trim().slice(0, 280))));
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureSettingsTables();
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || "").trim().slice(0, 80);
  const deliveryFee = Math.max(0, Number(body?.deliveryFee));
  if (!name || !Number.isFinite(deliveryFee)) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const db = await database();
  await db.prepare("INSERT INTO neighborhoods (name, delivery_fee, active) VALUES (?, ?, 1) ON CONFLICT(name) DO UPDATE SET delivery_fee=excluded.delivery_fee, active=1").bind(name, Number(deliveryFee.toFixed(2))).run();
  return Response.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await authorized()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  await ensureSettingsTables();
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Dados inválidos" }, { status: 400 });
  const db = await database();
  if (body?.action === "toggle") {
    await db.prepare("UPDATE neighborhoods SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ?").bind(id).run();
  } else if (body?.action === "update") {
    const name = String(body?.name || "").trim().slice(0, 80);
    const deliveryFee = Math.max(0, Number(body?.deliveryFee));
    if (!name || !Number.isFinite(deliveryFee)) return Response.json({ error: "Dados inválidos" }, { status: 400 });
    await db.prepare("UPDATE neighborhoods SET name = ?, delivery_fee = ? WHERE id = ?").bind(name, Number(deliveryFee.toFixed(2)), id).run();
  } else {
    return Response.json({ error: "Ação inválida" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
