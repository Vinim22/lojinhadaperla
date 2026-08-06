"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Category = { id: number; name: string; icon: string; color: string; position: number; active: boolean; productCount: number };
type Product = { id: number; name: string; description: string; price: number; oldPrice: number | null; categoryId: number | null; category: string; art: string; color: string; available: boolean; featured: boolean };
type Order = { id: number; customerName: string; customerPhone: string; fulfillment: string; neighborhood?: string | null; subtotal: number; deliveryFee: number; total: number; status: string; createdAt: string };
type OrderItem = { orderId: number; productName: string; unitPrice: number; quantity: number };
type Neighborhood = { id: number; name: string; deliveryFee: number; active: boolean };
type Section = "catalog" | "create" | "categories" | "settings" | "orders";

const emptyForm = { name: "", description: "", price: "", oldPrice: "", categoryId: "", art: "▣", color: "#f3eef2", available: true, featured: false };
const emptyCategoryForm = { name: "", icon: "▣", color: "#f3eef2", position: "", active: true };
const emptySettings = { store_name: "Lojinha da Perla", whatsapp: "", address: "", hours: "", delivery_note: "Confira a taxa do seu bairro antes de confirmar." };
const emptyNeighborhood = { name: "", deliveryFee: "" };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function AdminPanel({ userName, signOutHref }: { userName: string; signOutHref: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [section, setSection] = useState<Section>("catalog");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [accountOpen, setAccountOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [settings, setSettings] = useState(emptySettings);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [neighborhoodForm, setNeighborhoodForm] = useState(emptyNeighborhood);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } else setMessage("Não foi possível carregar os produtos.");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredProducts = useMemo(() => products.filter(product => {
    const matchesText = `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || (status === "active" ? product.available : !product.available);
    return matchesText && matchesStatus;
  }), [products, query, status]);

  const reset = () => { setEditing(null); setForm(emptyForm); };
  const resetCategory = () => { setEditingCategory(null); setCategoryForm(emptyCategoryForm); };
  const navigate = (next: Section) => { setSection(next); setMessage(""); if (next === "create" && editing) reset(); };
  const edit = (product: Product) => {
    setEditing(product.id);
    setForm({ name: product.name, description: product.description, price: String(product.price), oldPrice: product.oldPrice == null ? "" : String(product.oldPrice), categoryId: product.categoryId == null ? "" : String(product.categoryId), art: product.art, color: product.color, available: product.available, featured: product.featured });
    setSection("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const editCategory = (category: Category) => {
    setEditingCategory(category.id);
    setCategoryForm({ name: category.name, icon: category.icon || "▣", color: category.color || "#f3eef2", position: String(category.position || 0), active: category.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/admin/products", { method: editing ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, id: editing, price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null, categoryId: form.categoryId ? Number(form.categoryId) : null }) });
    setSaving(false);
    if (!response.ok) { setMessage("Confira os dados e tente novamente."); return; }
    setMessage(editing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
    reset(); await load(); setSection("catalog");
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/admin/products", { method: editingCategory ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resource: "category", id: editingCategory, ...categoryForm, position: Number(categoryForm.position || 0) }) });
    setSaving(false);
    if (!response.ok) { setMessage("Confira os dados da categoria."); return; }
    setMessage(editingCategory ? "Categoria atualizada." : "Categoria criada.");
    resetCategory(); await load();
  };

  const action = async (actionName: string, id: number) => {
    if (actionName === "delete" && !confirm("Excluir este produto?")) return;
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: actionName, id }) });
    if (response.ok) { setMessage(actionName === "duplicate" ? "Produto duplicado." : actionName === "delete" ? "Produto excluído." : "Disponibilidade alterada."); await load(); }
  };
  const toggleCategory = async (id: number) => {
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ resource: "category", action: "toggle", id }) });
    if (response.ok) { setMessage("Categoria atualizada."); await load(); }
  };

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (response.ok) { const data = await response.json(); setOrders(data.orders || []); setOrderItems(data.items || []); }
    else setMessage("Não foi possível carregar os pedidos.");
    setOrdersLoading(false);
  }, []);
  useEffect(() => { if (section === "orders") void loadOrders(); }, [section, loadOrders]);
  const updateOrderStatus = async (id: number, nextStatus: string) => {
    const response = await fetch("/api/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: nextStatus }) });
    if (response.ok) { setMessage("Status do pedido atualizado."); await loadOrders(); }
  };

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const response = await fetch("/api/admin/settings", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setSettings({ ...emptySettings, ...(data.settings || {}) });
      setNeighborhoods(data.neighborhoods || []);
    } else setMessage("Não foi possível carregar as configurações.");
    setSettingsLoading(false);
  }, []);
  useEffect(() => { if (section === "settings") void loadSettings(); }, [section, loadSettings]);
  const saveSettings = async () => {
    setSaving(true); setMessage("");
    const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings }) });
    setSaving(false);
    setMessage(response.ok ? "Configurações salvas." : "Não foi possível salvar as configurações.");
  };
  const addNeighborhood = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: neighborhoodForm.name, deliveryFee: Number(neighborhoodForm.deliveryFee) }) });
    setSaving(false);
    if (response.ok) { setNeighborhoodForm(emptyNeighborhood); setMessage("Bairro de entrega salvo."); await loadSettings(); }
    else setMessage("Confira os dados do bairro.");
  };
  const toggleNeighborhood = async (id: number) => {
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "toggle", id }) });
    if (response.ok) { setMessage("Bairro atualizado."); await loadSettings(); }
  };

  return <div className="admin-app">
    <aside className="admin-sidebar" aria-label="Menu administrativo">
      <Link className="admin-mini-brand" href="/"><b>P</b><span>Lojinha<br />da Perla</span></Link>
      <nav>
        <button className={section === "catalog" ? "active" : ""} onClick={() => navigate("catalog")}><i>▦</i><span>Loja</span></button>
        <button className={section === "create" || section === "categories" ? "active" : ""} onClick={() => navigate("create")}><i>＋</i><span>Cadastrar</span></button>
        <button className={section === "settings" ? "active" : ""} onClick={() => navigate("settings")}><i>⚙</i><span>Configurar</span></button>
        <button className={section === "orders" ? "active" : ""} onClick={() => navigate("orders")}><i>▣</i><span>Pedidos</span></button>
      </nav>
      <button className="admin-account" onClick={() => setAccountOpen(!accountOpen)}><i>♙</i><span>Conta</span></button>
    </aside>

    <div className="admin-workspace">
      <header className="admin-topbar">
        <Link className="admin-logo" href="/"><b>P</b><span>Lojinha da Perla</span></Link>
        <nav>
          <button className={section === "catalog" ? "active" : ""} onClick={() => navigate("catalog")}>Loja</button>
          <button className={section === "create" || section === "categories" ? "active" : ""} onClick={() => navigate("create")}>Cadastrar</button>
          <button className={section === "settings" ? "active" : ""} onClick={() => navigate("settings")}>Configurar</button>
          <button className={section === "orders" ? "active" : ""} onClick={() => navigate("orders")}>Gerenciar</button>
        </nav>
        <div className="admin-top-actions"><Link href="/" title="Visualizar loja">◉</Link><button title="Ajuda">?</button><button title="Notificações">♟</button></div>
      </header>

      {accountOpen && <div className="admin-account-menu"><strong>{userName}</strong><small>Administrador</small><a href={signOutHref}>Sair da conta</a></div>}
      {message && <button className="admin-toast" onClick={() => setMessage("")}>{message}<span>×</span></button>}

      {section === "catalog" && <main className="admin-page admin-catalog-page">
        <div className="admin-page-heading"><div><small>VISÃO GERAL DA LOJA</small><h1>Seus produtos</h1><p>Cadastre, edite e controle o que aparece na sua vitrine.</p></div><button className="admin-cta" onClick={() => navigate("create")}>＋ Adicionar produto</button></div>
        <section className="admin-metrics">
          <article><i>▦</i><span><small>Produtos cadastrados</small><strong>{products.length}</strong></span></article>
          <article><i>✓</i><span><small>Produtos ativos</small><strong>{products.filter(p => p.available).length}</strong></span></article>
          <article><i>⊘</i><span><small>Produtos esgotados</small><strong>{products.filter(p => !p.available).length}</strong></span></article>
          <article><i>✦</i><span><small>Em destaque</small><strong>{products.filter(p => p.featured).length}</strong></span></article>
        </section>
        <section className="admin-product-panel">
          <div className="admin-list-head"><div><h2>Catálogo</h2><span>{filteredProducts.length} itens exibidos</span></div><div className="admin-filters"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto" /></label><select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Esgotados</option></select></div></div>
          {loading ? <p className="admin-empty">Carregando catálogo...</p> : filteredProducts.length ? <div className="admin-product-table">
            <div className="admin-table-labels"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Status</span><span>Ações</span></div>
            {filteredProducts.map(product => <article key={product.id} className={!product.available ? "unavailable" : ""}>
              <div className="admin-product-name"><span className="admin-art" style={{ background: product.color }}>{product.art}</span><span><strong>{product.name}</strong><small>#{String(product.id).padStart(4, "0")}</small></span></div>
              <span>{product.category}</span><strong>{money(product.price)}</strong><span className={`status-pill ${product.available ? "on" : "off"}`}>{product.available ? "Ativo" : "Esgotado"}</span>
              <div className="admin-row-actions"><button onClick={() => edit(product)}>Editar</button><button title="Alterar disponibilidade" onClick={() => action("toggle", product.id)}>●</button><button title="Duplicar" onClick={() => action("duplicate", product.id)}>⧉</button><button className="danger" title="Excluir" onClick={() => action("delete", product.id)}>⌫</button></div>
            </article>)}
          </div> : <p className="admin-empty">Nenhum produto encontrado.</p>}
        </section>
      </main>}

      {section === "create" && <main className="admin-page admin-register-page">
        <div className="admin-back-row"><button onClick={() => { reset(); setSection("catalog"); }}>‹</button><div><small>{editing ? "EDITAR PRODUTO" : "NOVO PRODUTO"}</small><h1>{editing ? "Alterar produto" : "Adicionar produto"}</h1></div></div>
        <form className="admin-product-form" onSubmit={submit}>
          <section className="form-column form-main">
            <div className="form-card"><header><span>1</span><div><h2>Informações do produto</h2><p>Dados principais que aparecerão na loja.</p></div></header>
              <label>Nome do produto <b>*</b><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Sifão universal Krona" /></label>
              <div className="form-price-row"><label>Preço <b>*</b><div className="money-input"><span>R$</span><input required min="0" step="0.01" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0,00" /></div></label><label>Preço anterior <small>opcional</small><div className="money-input"><span>R$</span><input min="0" step="0.01" type="number" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} placeholder="0,00" /></div></label></div>
              <label>Descrição<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Conte os detalhes importantes do produto" /><small className="field-help">Uma descrição simples ajuda o cliente a decidir.</small></label>
            </div>
            <div className="form-card"><header><span>2</span><div><h2>Imagem e aparência</h2><p>Identificação visual usada atualmente no catálogo.</p></div></header>
              <div className="appearance-row"><div className="appearance-preview" style={{ background: form.color }}>{form.art || "▣"}</div><label>Ícone do produto<input maxLength={8} value={form.art} onChange={e => setForm({ ...form, art: e.target.value })} placeholder="▣" /></label><label>Cor de fundo<input className="color-input" type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></label></div>
            </div>
          </section>
          <aside className="form-column form-side">
            <div className="form-card"><header><span>3</span><div><h2>Organização</h2><p>Defina onde o produto aparece.</p></div></header><label>Categoria<select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">Sem categoria</option>{categories.filter(category => category.active).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button type="button" className="outline-action" onClick={() => setSection("categories")}>＋ Gerenciar categorias</button></div>
            <div className="form-card"><header><span>4</span><div><h2>Publicação</h2><p>Controle a visibilidade na loja.</p></div></header><label className="switch-row"><span><strong>Produto disponível</strong><small>Aparece para os clientes</small></span><input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} /></label><label className="switch-row"><span><strong>Produto em destaque</strong><small>Recebe mais visibilidade</small></span><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /></label></div>
            <div className="form-submit"><button type="button" onClick={() => { reset(); setSection("catalog"); }}>Cancelar</button><button className="admin-cta" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar produto"}</button></div>
          </aside>
        </form>
      </main>}

      {section === "categories" && <main className="admin-page admin-simple-page">
        <button className="simple-back" onClick={() => setSection("create")}>‹ Voltar ao produto</button>
        <div className="admin-page-heading"><div><small>ORGANIZAÇÃO</small><h1>Categorias</h1><p>Crie grupos, ajuste a ordem e escolha quais aparecem na vitrine.</p></div></div>
        <section className="category-manager">
          <form className="category-editor" onSubmit={submitCategory}>
            <header><div className="category-preview" style={{ background: categoryForm.color }}>{categoryForm.icon || "▣"}</div><div><h2>{editingCategory ? "Editar categoria" : "Nova categoria"}</h2><p>Use ícones curtos para facilitar a leitura no celular.</p></div></header>
            <label>Nome<input required value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Ex.: Papelaria" /></label>
            <div className="category-form-row"><label>Ícone<input maxLength={8} value={categoryForm.icon} onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} /></label><label>Cor<input className="color-input" type="color" value={categoryForm.color} onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })} /></label><label>Ordem<input type="number" value={categoryForm.position} onChange={e => setCategoryForm({ ...categoryForm, position: e.target.value })} placeholder="0" /></label></div>
            <label className="switch-row"><span><strong>Categoria ativa</strong><small>Aparece na vitrine e no cadastro de produtos</small></span><input type="checkbox" checked={categoryForm.active} onChange={e => setCategoryForm({ ...categoryForm, active: e.target.checked })} /></label>
            <div className="form-submit"><button type="button" onClick={resetCategory}>Limpar</button><button className="admin-cta" disabled={saving}>{saving ? "Salvando..." : editingCategory ? "Salvar categoria" : "Criar categoria"}</button></div>
          </form>
          <section className="category-list">
            {categories.map(category => <article key={category.id} className={!category.active ? "inactive" : ""}>
              <i style={{ background: category.color }}>{category.icon || "▣"}</i>
              <div><strong>{category.name}</strong><small>{category.productCount} {category.productCount === 1 ? "produto" : "produtos"} · ordem {category.position}</small></div>
              <span className={`status-pill ${category.active ? "on" : "off"}`}>{category.active ? "Ativa" : "Inativa"}</span>
              <button onClick={() => editCategory(category)}>Editar</button>
              <button onClick={() => toggleCategory(category.id)}>{category.active ? "Desativar" : "Ativar"}</button>
            </article>)}
          </section>
        </section>
      </main>}

      {section === "settings" && <main className="admin-page admin-simple-page"><div className="admin-page-heading"><div><small>CONFIGURAÇÕES</small><h1>Configurar loja</h1><p>Controle os dados que aparecem na vitrine e as opções de entrega.</p></div><button className="admin-cta" onClick={saveSettings} disabled={saving || settingsLoading}>{saving ? "Salvando..." : "Salvar loja"}</button></div><section className="settings-grid"><form className="settings-card" onSubmit={event => { event.preventDefault(); void saveSettings(); }}><header><i>⚙</i><div><h2>Dados da loja</h2><p>Essas informações alimentam a vitrine e os links de atendimento.</p></div></header><label>Nome da loja<input value={settings.store_name} onChange={e => setSettings({ ...settings, store_name: e.target.value })} placeholder="Lojinha da Perla" /></label><label>WhatsApp<input value={settings.whatsapp} onChange={e => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="Ex.: 87999999999" inputMode="tel" /></label><label>Endereço<input value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} placeholder="Rua, número e cidade" /></label><label>Horário de atendimento<input value={settings.hours} onChange={e => setSettings({ ...settings, hours: e.target.value })} placeholder="Seg a sáb, 8h às 18h" /></label><label>Recado de entrega<textarea value={settings.delivery_note} onChange={e => setSettings({ ...settings, delivery_note: e.target.value })} placeholder="Mensagem curta para o checkout" /></label></form><section className="settings-card"><header><i>⌂</i><div><h2>Bairros de entrega</h2><p>Cadastre taxas por bairro e desative rotas temporariamente.</p></div></header><form className="neighborhood-form" onSubmit={addNeighborhood}><input value={neighborhoodForm.name} onChange={e => setNeighborhoodForm({ ...neighborhoodForm, name: e.target.value })} placeholder="Bairro" required /><div className="money-input"><span>R$</span><input value={neighborhoodForm.deliveryFee} onChange={e => setNeighborhoodForm({ ...neighborhoodForm, deliveryFee: e.target.value })} placeholder="0,00" min="0" step="0.01" type="number" required /></div><button disabled={saving}>Adicionar</button></form><div className="neighborhood-list">{neighborhoods.length ? neighborhoods.map(neighborhood => <article key={neighborhood.id} className={!neighborhood.active ? "inactive" : ""}><div><strong>{neighborhood.name}</strong><small>{money(neighborhood.deliveryFee)}</small></div><button onClick={() => toggleNeighborhood(neighborhood.id)}>{neighborhood.active ? "Ativo" : "Inativo"}</button></article>) : <p className="admin-empty">Nenhum bairro cadastrado ainda.</p>}</div></section></section></main>}

      {section === "orders" && <main className="admin-page admin-simple-page"><div className="admin-page-heading"><div><small>GERENCIAMENTO</small><h1>Pedidos</h1><p>Acompanhe e atualize os pedidos recebidos pela loja.</p></div><button className="admin-cta" onClick={loadOrders}>Atualizar</button></div>{ordersLoading ? <p className="admin-empty">Carregando pedidos...</p> : orders.length ? <section className="orders-grid">{orders.map(order => <article key={order.id} className="order-admin-card"><header><div><small>PEDIDO</small><h2>#{order.id}</h2></div><select value={order.status} onChange={event => updateOrderStatus(order.id, event.target.value)}><option value="novo">Novo</option><option value="confirmado">Confirmado</option><option value="preparando">Preparando</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select></header><div className="order-customer"><strong>{order.customerName}</strong><a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a><small>{order.fulfillment === "entrega" ? `Entrega${order.neighborhood ? ` · ${order.neighborhood}` : ""}` : "Retirada na loja"} · {new Date(order.createdAt.replace(" ", "T") + "Z").toLocaleString("pt-BR")}</small></div><div className="order-admin-items">{orderItems.filter(item => item.orderId === order.id).map((item, index) => <p key={`${order.id}-${index}`}><span>{item.quantity}x {item.productName}</span><b>{money(item.unitPrice * item.quantity)}</b></p>)}</div><div className="order-totals"><p><span>Produtos</span><b>{money(order.subtotal)}</b></p>{order.deliveryFee > 0 && <p><span>Entrega</span><b>{money(order.deliveryFee)}</b></p>}</div><footer><span>Total</span><strong>{money(order.total)}</strong></footer></article>)}</section> : <section className="coming-card"><i>▣</i><h2>Nenhum pedido registrado</h2><p>Os novos pedidos feitos na loja aparecerão aqui.</p></section>}</main>}
    </div>
  </div>;
}
