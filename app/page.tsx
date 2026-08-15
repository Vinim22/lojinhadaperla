"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  category: string;
  art: string;
  color: string;
  description?: string;
};

type Neighborhood = { id: number; name: string; deliveryFee: number };
type StoreSettings = { store_name?: string; whatsapp?: string; address?: string; hours?: string; delivery_note?: string };

const fallbackCategories = [
  { name: "Ofertas", icon: "✦", color: "#ffe3eb" },
  { name: "Limpeza", icon: "🧴", color: "#dff4ff" },
  { name: "Utilidades", icon: "🏠", color: "#fff0c9" },
  { name: "Hidráulica", icon: "🔧", color: "#e9e4ff" },
  { name: "Elétrica", icon: "💡", color: "#fff4bc" },
  { name: "Infantil", icon: "🎈", color: "#e1f7db" },
];

const fallbackProducts: Product[] = [
  { id: 1, name: "Kit de limpeza perfumado", price: 24.9, oldPrice: 29.9, category: "Limpeza", art: "🧼", color: "#dff3ff" },
  { id: 2, name: "Bola pula-pula colorida", price: 6.5, category: "Infantil", art: "⚽", color: "#fff0d8" },
  { id: 3, name: "Sifão universal Krona", price: 8, category: "Hidráulica", art: "〰️", color: "#e6ecff" },
  { id: 4, name: "Plafon LED de sobrepor", price: 19.9, oldPrice: 23.9, category: "Elétrica", art: "💡", color: "#fff8cc" },
  { id: 5, name: "Pote organizador com tampa", price: 12.9, category: "Utilidades", art: "▣", color: "#e8f8e4" },
  { id: 6, name: "Cola instantânea 75g", price: 8.5, category: "Utilidades", art: "💧", color: "#f2e8ff" },
  { id: 7, name: "Cards de personagens", price: 3.5, category: "Infantil", art: "🃏", color: "#ffe6ef" },
  { id: 8, name: "Pincel broxa reforçado", price: 8.9, category: "Utilidades", art: "🖌️", color: "#e3f6f0" },
];

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const whatsappLink = (phone?: string, text?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const target = digits ? `55${digits.replace(/^55/, "")}` : "5500000000000";
  return `https://wa.me/${target}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const productCategories = (product: Product) => product.category.split(",").map(category => category.trim()).filter(Boolean);
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const productSearchText = (product: Product) => normalizeSearch(`${product.name} ${product.category} ${product.description || ""}`);

function Header({ storeName, products, cartCount, cartTotal, onCart, onFavorites, onProduct, onCategory, onSearch }: { storeName: string; products: Product[]; cartCount: number; cartTotal: number; onCart: () => void; onFavorites: () => void; onProduct: (product: Product) => void; onCategory: (category: string) => void; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query.trim());
  const matches = query.trim()
    ? products.filter((product) => productSearchText(product).includes(normalizedQuery)).slice(0, 4)
    : [];

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#top" aria-label={`Início da ${storeName}`}>
          <span className="brand-mark">P</span>
          <span><strong>{storeName}</strong><small>Preço bom pertinho de você</small></span>
        </a>
        <div className="search-wrap">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) { onSearch(query.trim()); setQuery(""); } }}
            placeholder="O que você está procurando?"
            aria-label="Pesquisar produtos"
          />
          {query && (
            <div className="search-results">
              {matches.length ? <><small className="search-label">PRODUTOS</small>{matches.map((product) => (
                <button key={product.id} onClick={() => { onProduct(product); setQuery(""); }}>
                  <span style={{ background: product.color }}>{product.art}</span>
                  <span><strong>{product.name}</strong><small>{product.category} · {money(product.price)}</small></span>
                </button>
              ))}<small className="search-label">CATEGORIAS</small>{[...new Set(matches.flatMap(productCategories))].map(category => <button className="category-suggestion" key={category} onClick={() => { onCategory(category); setQuery(""); }}>Ver tudo em {category} <span>→</span></button>)}<button className="all-results" onClick={() => { onSearch(query.trim()); setQuery(""); }}>Ver todos os resultados</button></> : <p>Nenhum resultado encontrado.</p>}
            </div>
          )}
        </div>
        <button className="favorites-link" onClick={onFavorites} aria-label="Abrir favoritos">♡</button>
        <button className="cart-summary" onClick={onCart} aria-label={`Abrir carrinho com ${cartCount} itens`}>
          <span className="cart-symbol">🛒</span>
          <span><small>{cartCount} {cartCount === 1 ? "item" : "itens"}</small><strong>{money(cartTotal)}</strong></span>
        </button>
      </div>
    </header>
  );
}

function ProductCard({ product, onAdd, favorite, onFavorite, onOpen }: { product: Product; onAdd: (product: Product) => void; favorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  return (
    <article className="product-card">
      <div className="product-art" style={{ background: product.color }} onClick={onOpen} role="button" tabIndex={0} onKeyDown={event => { if (event.key === "Enter") onOpen(); }}>
        {product.oldPrice && <span className="discount">OFERTA</span>}
        <button className={`heart ${favorite ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
          {favorite ? "♥" : "♡"}
        </button>
        <span aria-hidden="true">{product.art}</span>
      </div>
      <div className="product-info">
        <small>{product.category}</small>
        <h3 onClick={onOpen}>{product.name}</h3>
        <div className="price-row">
          <div>{product.oldPrice && <del>{money(product.oldPrice)}</del>}<strong>{money(product.price)}</strong></div>
          <button onClick={() => onAdd(product)} aria-label={`Adicionar ${product.name} ao carrinho`}>+</button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [categories, setCategories] = useState(fallbackCategories);
  const [settings, setSettings] = useState<StoreSettings>({ store_name: "Lojinha da Perla", whatsapp: "" });
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [view, setView] = useState<"store" | "favorites" | "product" | "search">("store");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [completedOrder, setCompletedOrder] = useState<{ id: number; total: number } | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "", fulfillment: "retirada", neighborhoodId: "", address: "", reference: "", notes: "" });
  const [hydrated, setHydrated] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [storeScroll, setStoreScroll] = useState(0);
  const filteredProducts = activeCategory === "Todos" ? products : products.filter((product) => productCategories(product).includes(activeCategory) || activeCategory === "Ofertas" && product.oldPrice);
  const cartTotal = useMemo(() => cart.reduce((total, product) => total + product.price, 0), [cart]);
  const cartItems = useMemo(() => products.map(product => ({ product, quantity: cart.filter(item => item.id === product.id).length })).filter(item => item.quantity > 0), [cart]);
  const selectedNeighborhood = neighborhoods.find(neighborhood => String(neighborhood.id) === customer.neighborhoodId);
  const deliveryFee = customer.fulfillment === "entrega" && selectedNeighborhood ? selectedNeighborhood.deliveryFee : 0;
  const orderTotal = Number((cartTotal + deliveryFee).toFixed(2));
  const storeName = settings.store_name || "Lojinha da Perla";
  const hasStoreInfo = Boolean(settings.address || settings.hours);
  const fulfillmentSummary = customer.fulfillment === "entrega"
    ? selectedNeighborhood
      ? `Entrega para ${selectedNeighborhood.name} com taxa de ${money(deliveryFee)}.`
      : "Selecione o bairro para calcular a entrega."
    : settings.address
      ? `Retirada na loja: ${settings.address}${settings.hours ? ` · ${settings.hours}` : ""}.`
      : "Retirada na loja combinada pelo atendimento.";
  const checkoutMissing = [
    !cartItems.length && "adicione pelo menos um produto",
    !customer.name.trim() && "informe seu nome",
    !customer.phone.trim() && "informe seu telefone",
    customer.fulfillment === "entrega" && !customer.neighborhoodId && "escolha o bairro",
    customer.fulfillment === "entrega" && !customer.address.trim() && "informe o endereço",
  ].filter(Boolean);
  const favoriteProducts = products.filter(product => favorites.includes(product.id));
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("perla-cart") || "[]")); setFavorites(JSON.parse(localStorage.getItem("perla-favorites") || "[]")); setRecentIds(JSON.parse(localStorage.getItem("perla-recents") || "[]")); } catch {}
    fetch("/api/catalog").then(response => response.ok ? response.json() : Promise.reject()).then(data => {
      if (data.products?.length) setProducts(data.products);
      if (data.categories?.length) setCategories([{ name: "Ofertas", icon: "✦", color: "#ffe3eb" }, ...data.categories]);
      if (data.settings) setSettings(data.settings);
      if (data.neighborhoods) setNeighborhoods(data.neighborhoods);
    }).catch(() => {});
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("perla-cart", JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("perla-favorites", JSON.stringify(favorites)); }, [favorites, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("perla-recents", JSON.stringify(recentIds)); }, [recentIds, hydrated]);
  const toggleFavorite = (id: number) => setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [id, ...current]);
  const removeOne = (id: number) => setCart(current => { const index = current.findIndex(item => item.id === id); return index < 0 ? current : current.filter((_, itemIndex) => itemIndex !== index); });
  const removeProduct = (id: number) => setCart(current => current.filter(item => item.id !== id));
  const setProductQuantity = (product: Product, quantity: number) => setCart(current => {
    const nextQuantity = Math.max(0, Math.min(99, Math.trunc(quantity || 0)));
    const others = current.filter(item => item.id !== product.id);
    return [...others, ...Array.from({ length: nextQuantity }, () => product)];
  });
  const goHome = (restore = false) => { setView("store"); requestAnimationFrame(() => window.scrollTo({ top: restore ? storeScroll : 0, behavior: "smooth" })); };
  const openProduct = (product: Product) => { if (view === "store") setStoreScroll(window.scrollY); setSelectedProduct(product); setView("product"); setRecentIds(current => [product.id, ...current.filter(id => id !== product.id)].slice(0, 10)); history.replaceState(null, "", `#produto-${product.id}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openCategory = (category: string) => { setActiveCategory(category); setView("store"); requestAnimationFrame(() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })); };
  const openSearch = (query: string) => { setSearchQuery(query); setView("search"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const searchProducts = products.filter(product => productSearchText(product).includes(normalizeSearch(searchQuery)));
  const searchCategories = [...new Set(searchProducts.flatMap(productCategories))].slice(0, 6);
  const recentProducts = recentIds.map(id => products.find(product => product.id === id)).filter(Boolean) as Product[];
  const relatedProducts = selectedProduct ? products.filter(product => product.id !== selectedProduct.id && productCategories(product).some(category => productCategories(selectedProduct).includes(category))).slice(0, 8) : [];
  const orderText = useMemo(() => {
    const lines = cartItems.map(({ product, quantity }) => `• ${quantity}x ${product.name} — ${money(product.price * quantity)}`);
    return [`Olá! Quero fazer este pedido na ${storeName}:`, "", ...lines, "", `Produtos: ${money(cartTotal)}`, deliveryFee > 0 && `Entrega: ${money(deliveryFee)}`, `Total: ${money(orderTotal)}`, `Recebimento: ${customer.fulfillment === "entrega" ? "Entrega" : "Retirada na loja"}`, selectedNeighborhood && `Bairro: ${selectedNeighborhood.name}`, customer.name && `Cliente: ${customer.name}`, customer.phone && `Telefone: ${customer.phone}`, customer.fulfillment === "entrega" && customer.address && `Endereço: ${customer.address}`, customer.reference && `Referência: ${customer.reference}`, customer.notes && `Observações: ${customer.notes}`].filter(Boolean).join("\n");
  }, [cartItems, cartTotal, customer, deliveryFee, orderTotal, selectedNeighborhood, storeName]);
  const submitOrder = async () => {
    setSubmittingOrder(true); setOrderError("");
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customerName: customer.name, customerPhone: customer.phone, fulfillment: customer.fulfillment, neighborhoodId: customer.neighborhoodId ? Number(customer.neighborhoodId) : null, items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })) }) });
    const data = await response.json().catch(() => ({}));
    setSubmittingOrder(false);
    if (!response.ok) { setOrderError(data.error || "Não foi possível registrar o pedido. Tente novamente."); return; }
    await navigator.clipboard.writeText(`Pedido #${data.orderId}\n${orderText}`).catch(() => {});
    setCompletedOrder({ id: data.orderId, total: data.total || orderTotal }); setCart([]);
  };
  const productUrl = selectedProduct && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#produto-${selectedProduct.id}` : "";
  const shareText = selectedProduct ? `${selectedProduct.name} — ${money(selectedProduct.price)}\n${productUrl}` : "";
  const copyProductLink = async () => { await navigator.clipboard.writeText(productUrl); setShareOpen(false); alert("Link do produto copiado."); };

  return (
    <div id="top">
      <Header storeName={storeName} products={products} cartCount={cart.length} cartTotal={cartTotal} onCart={() => setCartOpen(true)} onFavorites={() => setView("favorites")} onProduct={openProduct} onCategory={openCategory} onSearch={openSearch} />
      {view === "favorites" ? <main className="saved-page"><div className="saved-heading"><button onClick={() => goHome()}>← Voltar</button><div><span>SEUS ESCOLHIDOS</span><h1>Produtos favoritos</h1></div>{favorites.length > 0 && <button className="clear-favorites" onClick={() => { setFavorites([]); goHome(); }}>Limpar favoritos</button>}</div>{favoriteProducts.length ? <div className="product-grid">{favoriteProducts.map(product => <ProductCard key={product.id} product={product} favorite onFavorite={() => toggleFavorite(product.id)} onOpen={() => openProduct(product)} onAdd={item => setCart(current => [...current, item])} />)}</div> : null}</main> : view === "search" ? <main className="saved-page search-page"><div className="saved-heading"><button onClick={() => goHome()}>← Voltar</button><div><span>RESULTADOS DA PESQUISA</span><h1>“{searchQuery}”</h1></div></div>{searchProducts.length ? <><p className="result-count">{searchProducts.length} {searchProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}</p>{searchCategories.length > 0 && <div className="search-category-chips">{searchCategories.map(category => <button key={category} onClick={() => openCategory(category)}>{category}</button>)}</div>}<div className="product-grid">{searchProducts.map(product => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => toggleFavorite(product.id)} onOpen={() => openProduct(product)} onAdd={item => setCart(current => [...current, item])} />)}</div></> : <div className="no-results"><span>⌕</span><h2>Nenhum resultado encontrado</h2></div>}</main> : view === "product" && selectedProduct ? <main className="product-page"><button className="product-back" onClick={() => goHome(true)}>← Voltar para produtos</button><section className="product-detail"><button className="product-gallery" style={{background:selectedProduct.color}} onClick={() => setImageOpen(true)}><span>{selectedProduct.art}</span><small>Toque para ampliar</small></button><div className="product-copy"><small>{selectedProduct.category}</small><h1>{selectedProduct.name}</h1><p>{selectedProduct.description || "Produto selecionado da Lojinha da Perla. Consulte detalhes e disponibilidade pelo WhatsApp."}</p>{selectedProduct.oldPrice && <del>{money(selectedProduct.oldPrice)}</del>}<strong className="product-price">{money(selectedProduct.price)}</strong><div className="product-buttons"><button onClick={() => setCart(current => [...current, selectedProduct])}>Adicionar ao carrinho</button><button className="product-heart" onClick={() => toggleFavorite(selectedProduct.id)}>{favorites.includes(selectedProduct.id) ? "♥ Favoritado" : "♡ Favoritar"}</button></div><button className="share-product" onClick={() => setShareOpen(true)}>↗ Compartilhar produto</button>{shareOpen && <div className="share-menu"><a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">WhatsApp</a><button onClick={() => navigator.share ? navigator.share({ title: selectedProduct.name, text: `${selectedProduct.name} — ${money(selectedProduct.price)}`, url: productUrl }) : copyProductLink()}>Outros aplicativos</button><button onClick={copyProductLink}>Copiar link</button></div>}</div></section>{relatedProducts.length > 0 && <section className="related"><div className="section-heading"><div><span>VOCÊ TAMBÉM PODE GOSTAR</span><h2>Produtos relacionados</h2></div></div><div className="horizontal-products">{relatedProducts.map(product => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => toggleFavorite(product.id)} onOpen={() => openProduct(product)} onAdd={item => setCart(current => [...current,item])}/>)}</div></section>}</main> : (
      <main className="page-shell">
        <aside className="category-sidebar">
          <p>Explore por categoria</p>
          <button className={activeCategory === "Todos" ? "active" : ""} onClick={() => setActiveCategory("Todos")}><span>⌂</span>Todos os produtos</button>
          {categories.map((category) => (
            <button key={category.name} className={activeCategory === category.name ? "active" : ""} onClick={() => setActiveCategory(category.name)}>
              <span style={{ background: category.color }}>{category.icon}</span>{category.name}
            </button>
          ))}
          <div className="help-card"><span>💬</span><strong>Precisa de ajuda?</strong><small>Fale com a gente pelo WhatsApp</small><a href={whatsappLink(settings.whatsapp, `Olá! Vim pela ${storeName} e preciso de ajuda.`)}>Chamar no WhatsApp</a></div>
        </aside>

        <div className="store-content">
          <section className="hero">
            <div className="hero-copy"><span className="eyebrow">COMPRE FÁCIL · RECEBA RÁPIDO</span><h1>Tem de tudo um pouco.<br/><em>E cabe no seu bolso.</em></h1><p>Escolha seus produtos, monte o carrinho e finalize direto pelo WhatsApp.</p>{hasStoreInfo && <div className="store-info-strip">{settings.hours && <span>⏱ {settings.hours}</span>}{settings.address && <span>📍 {settings.address}</span>}</div>}<a href="#produtos">Ver produtos <span>→</span></a></div>
            <div className="hero-scene" aria-hidden="true"><span className="blob one"></span><span className="blob two"></span><div className="shopping-bag">P<small>Perla</small></div><span className="float f1">🧴</span><span className="float f2">💡</span><span className="float f3">🎈</span></div>
          </section>

          <section className="mobile-categories" aria-label="Categorias">
            {categories.map((category) => <button key={category.name} onClick={() => setActiveCategory(category.name)}><span style={{ background: category.color }}>{category.icon}</span><small>{category.name}</small></button>)}
          </section>

          <section className="benefits">
            <div><span>⚡</span><p><strong>Pedido rápido</strong><small>Finalize pelo WhatsApp</small></p></div>
            <div><span>📍</span><p><strong>Entrega local</strong><small>{neighborhoods.length ? `${neighborhoods.length} bairros atendidos` : "Consulte seu bairro"}</small></p></div>
            <div><span>🏪</span><p><strong>Retire na loja</strong><small>{settings.hours || "Escolha como receber"}</small></p></div>
          </section>

          <section className="products-section" id="produtos">
            <div className="section-heading"><div><span>PARA VOCÊ</span><h2>{activeCategory === "Todos" ? "Produtos em destaque" : activeCategory}</h2></div><p>{filteredProducts.length} produtos</p></div>
            <div className="product-grid">
              {filteredProducts.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => toggleFavorite(product.id)} onOpen={() => openProduct(product)} onAdd={(item) => setCart(current => [...current, item])} />)}
            </div>
          </section>
          {recentProducts.length > 0 && <section className="recent-section"><div className="section-heading"><div><span>VISTOS RECENTEMENTE</span><h2>Continue de onde parou</h2></div></div><div className="horizontal-products">{recentProducts.map(product => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => toggleFavorite(product.id)} onOpen={() => openProduct(product)} onAdd={item => setCart(current => [...current,item])}/>)}</div></section>}
        </div>
      </main>
      )}
      {imageOpen && selectedProduct && <div className="image-lightbox" onClick={() => setImageOpen(false)}><button aria-label="Fechar imagem">×</button><div style={{ background: selectedProduct.color }}><span>{selectedProduct.art}</span><strong>{selectedProduct.name}</strong></div></div>}
      {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={event => event.stopPropagation()} aria-label="Carrinho"><div className="cart-title"><div><span>SEU PEDIDO</span><h2>Carrinho</h2></div><button onClick={() => setCartOpen(false)} aria-label="Fechar carrinho">×</button></div>{cartItems.length ? <><div className="cart-list">{cartItems.map(({ product, quantity }) => <div className="cart-item" key={product.id}><span style={{ background: product.color }}>{product.art}</span><div><strong>{product.name}</strong><small>{money(product.price)} cada</small><div className="quantity"><button onClick={() => removeOne(product.id)} aria-label={`Diminuir ${product.name}`}>−</button><input aria-label={`Quantidade de ${product.name}`} value={quantity} inputMode="numeric" onChange={event => setProductQuantity(product, Number(event.target.value))} /><button onClick={() => setCart(current => [...current, product])} aria-label={`Aumentar ${product.name}`}>+</button><button className="remove-item" onClick={() => removeProduct(product.id)}>Remover</button></div></div><strong>{money(product.price * quantity)}</strong></div>)}</div><div className="cart-footer"><div className="cart-totals"><p><span>Itens</span><strong>{cart.length}</strong></p><p><span>Subtotal</span><strong>{money(cartTotal)}</strong></p></div><button className="checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continuar pedido</button><button className="clear-cart" onClick={() => setCart([])}>Esvaziar carrinho</button></div></> : <div className="empty-cart"><span>🛒</span><h3>Seu carrinho está vazio</h3><p>Adicione produtos para montar seu pedido.</p><button onClick={() => setCartOpen(false)}>Continuar comprando</button></div>}</aside></div>}

      {checkoutOpen && <div className="checkout-backdrop"><section className="checkout-modal" role="dialog" aria-modal="true" aria-label="Finalizar pedido">
        {completedOrder ? <div className="order-success"><span>✓</span><small>PEDIDO REGISTRADO</small><h2>Pedido #{completedOrder.id}</h2><p>Recebemos seu pedido de {money(completedOrder.total)}. O resumo foi copiado para você continuar o atendimento pelo WhatsApp.</p><a href={whatsappLink(settings.whatsapp, `Pedido #${completedOrder.id}\n${orderText}`)} target="_blank" rel="noreferrer">Continuar no WhatsApp</a><button onClick={() => { setCheckoutOpen(false); setCompletedOrder(null); setCustomer({ name: "", phone: "", fulfillment: "retirada", neighborhoodId: "", address: "", reference: "", notes: "" }); }}>Voltar para a loja</button></div> : <>
        <header><button onClick={() => { setCheckoutOpen(false); setCartOpen(true); }}>← Carrinho</button><div><span>ÚLTIMA ETAPA</span><h2>Como você quer receber?</h2></div><button className="checkout-close" onClick={() => setCheckoutOpen(false)}>×</button></header>
        <div className="checkout-body"><div className="checkout-form">
          <div className="fulfillment-options"><button className={customer.fulfillment === "retirada" ? "active" : ""} onClick={() => setCustomer({ ...customer, fulfillment: "retirada" })}><b>🏪 Retirada</b><small>Buscar na loja</small></button><button className={customer.fulfillment === "entrega" ? "active" : ""} onClick={() => setCustomer({ ...customer, fulfillment: "entrega" })}><b>🛵 Entrega</b><small>Receber em casa</small></button></div>
          {customer.fulfillment === "retirada" && hasStoreInfo && <div className="pickup-info">{settings.address && <p><span>Endereço</span><strong>{settings.address}</strong></p>}{settings.hours && <p><span>Horário</span><strong>{settings.hours}</strong></p>}</div>}
          <label>Seu nome<input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Nome de quem receberá" /></label><label>Telefone<input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="(87) 99999-9999" inputMode="tel" /></label>
          {customer.fulfillment === "entrega" && <><label>Bairro<select value={customer.neighborhoodId} onChange={e => setCustomer({ ...customer, neighborhoodId: e.target.value })}><option value="">Selecione o bairro</option>{neighborhoods.map(neighborhood => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name} — {money(neighborhood.deliveryFee)}</option>)}</select><small className="field-help">{settings.delivery_note || "Confira a taxa do seu bairro antes de confirmar."}</small></label><label>Endereço completo<textarea value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} placeholder="Rua, número, casa e cidade" /></label><label>Ponto de referência<input value={customer.reference} onChange={e => setCustomer({ ...customer, reference: e.target.value })} placeholder="Opcional" /></label></>}
          <label>Observações<textarea value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} placeholder="Ex.: entregar após as 14h" /></label>
        </div><aside className="order-review"><span>RESUMO</span><p className="fulfillment-summary">{fulfillmentSummary}</p>{cartItems.map(({ product, quantity }) => <div className="review-item" key={product.id}><small>{product.name}<em>{money(product.price)} cada</em></small><div><button onClick={() => removeOne(product.id)} aria-label={`Diminuir ${product.name}`}>−</button><b>{quantity}</b><button onClick={() => setCart(current => [...current, product])} aria-label={`Aumentar ${product.name}`}>+</button></div><strong>{money(product.price * quantity)}</strong></div>)}<p><small>Produtos</small><b>{money(cartTotal)}</b></p>{customer.fulfillment === "entrega" && <p><small>Entrega{selectedNeighborhood ? ` · ${selectedNeighborhood.name}` : ""}</small><b>{selectedNeighborhood ? money(deliveryFee) : "Escolha o bairro"}</b></p>}<div><span>Total</span><strong>{money(orderTotal)}</strong></div>{orderError && <p className="order-error" role="alert">{orderError}</p>}{checkoutMissing.length > 0 && <p className="checkout-missing">Para confirmar, falta: {checkoutMissing.join(", ")}.</p>}<button onClick={submitOrder} disabled={submittingOrder || checkoutMissing.length > 0}>{submittingOrder ? "Registrando..." : "Confirmar pedido"}</button><small className="pending-whatsapp">Você pode ajustar as quantidades aqui antes de confirmar. O pedido ficará salvo no painel e o resumo será copiado para o WhatsApp.</small></aside></div>
        </>}
      </section></div>}

      <nav className="mobile-nav" aria-label="Navegação principal">
        <button onClick={() => goHome()} className={view === "store" ? "active" : ""}><span>⌂</span><small>Início</small></button>
        <button onClick={() => setCartOpen(true)}><span>🛒</span><small>Carrinho</small>{cart.length > 0 && <b>{cart.length}</b>}</button>
        <a href={whatsappLink(settings.whatsapp, `Olá! Vim pela ${storeName}.`)}><span>◉</span><small>WhatsApp</small></a>
      </nav>
    </div>
  );
}
