import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingCart, Plus, Minus, X, Check, ChevronRight, ChevronLeft, Search,
  Package, Users, CreditCard, LayoutDashboard, Truck, Clock, MapPin, Phone,
  Leaf, Star, MessageCircle, Trash2, Pencil, LogOut, AlertCircle, Loader2,
  Settings as SettingsIcon, ArrowLeft, PackageCheck, ClipboardList, Sprout
} from "lucide-react";

/* ============================================================================
   GREEN GROCER — Kenyan online grocery ordering & delivery prototype
   Frontend-only demo. Products / orders / settings persist via window.storage
   (shared) so the storefront and admin dashboard read the same live data.
   M-Pesa payment is SIMULATED — see the note in the admin Settings tab.
============================================================================ */

const STORAGE = {
  PRODUCTS: "gg_products_v2",
  SETTINGS: "gg_settings_v1",
  ORDERS: "gg_orders_v1",
};

const UNIT_LABEL = { kg: "kg", half_kg: "½ kg", quarter_kg: "¼ kg", piece: "piece", bunch: "bunch", packet: "packet" };
// Selling-size choices shown in the admin dropdown (incl. ¼ kg). "Custom…" lets the admin type their own.
const PRESET_LABELS = ["1 piece", "3 pieces", "1 slice", "Whole", "¼ kg", "½ kg", "1 kg", "2 kg", "1 bunch", "1 packet"];
const KG_SIZES = { "¼ kg": 0.25, "½ kg": 0.5, "1 kg": 1, "2 kg": 2 };
const POOL_UNITS = ["kg", "pieces", "whole", "bunches", "packets"];

const ORDER_FLOW = [
  { key: "pending", label: "Order Placed" },
  { key: "paid", label: "Payment Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready for Delivery" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_META = {
  pending: { label: "Pending", color: "#8A7A2E", bg: "#FBF3D6" },
  payment_pending: { label: "Payment Pending", color: "#9A5B12", bg: "#FCEEDD" },
  paid: { label: "Paid", color: "#1B6E42", bg: "#E1F3E7" },
  preparing: { label: "Preparing", color: "#1B6E42", bg: "#E1F3E7" },
  ready: { label: "Ready for Delivery", color: "#1B6E42", bg: "#E1F3E7" },
  out_for_delivery: { label: "Out for Delivery", color: "#1B4A9A", bg: "#E3ECFC" },
  delivered: { label: "Delivered", color: "#1B4A31", bg: "#E1F3E7" },
  cancelled: { label: "Cancelled", color: "#8A1E1E", bg: "#FBE3E3" },
};

function seedProducts() {
  // Each product has ONE shared stock pool (in poolUnit) and several selling options.
  // option.size = how much of the pool one sale of that option uses, so piece and bulk sales
  // draw from the same stock (e.g. a watermelon slice uses 0.1 of a whole watermelon).
  const P = (id, category, name, emoji, description, stock, poolUnit, options) => ({
    id, name, category, emoji, description, stock, poolUnit, active: true,
    options: options.map(([label, price, size], i) => ({ id: "o" + (i + 1), label, price, size })),
  });
  const V = "Vegetables", F = "Fruits";
  return [
    P("p01", V, "Onions", "🧅", "Firm red onions — buy one onion or by the kilo.", 80, "kg", [["1 piece", 5, 0.1], ["¼ kg", 25, 0.25], ["½ kg", 50, 0.5], ["1 kg", 100, 1]]),
    P("p02", V, "Tomatoes", "🍅", "Ripe, juicy tomatoes — one at a time or 3 for less.", 300, "pieces", [["1 tomato", 5, 1], ["3 tomatoes", 10, 3]]),
    P("p03", V, "Spinach", "🥬", "Tender green spinach, washed and bunched.", 60, "bunches", [["1 bunch", 30, 1]]),
    P("p04", V, "Sukuma Wiki", "🥬", "The everyday classic — collard greens.", 100, "bunches", [["1 bunch", 20, 1]]),
    P("p05", V, "Kienyeji Vegetables", "🥗", "Traditional mixed indigenous greens.", 50, "bunches", [["1 bunch", 25, 1]]),
    P("p06", V, "Cabbage", "🥬", "Whole cabbage, crisp and tightly packed.", 40, "pieces", [["1 piece", 60, 1]]),
    P("p07", V, "Carrots", "🥕", "Sweet, crunchy carrots by the kilo.", 70, "kg", [["1 kg", 90, 1]]),
    P("p08", V, "Capsicum", "🫑", "Bright, crisp bell pepper.", 55, "pieces", [["1 piece", 15, 1]]),
    P("p09", V, "Coriander / Dhania", "🌿", "Fragrant fresh coriander for garnish.", 65, "bunches", [["1 bunch", 15, 1]]),
    P("p10", V, "Hoho", "🫑", "Large green sweet pepper.", 45, "pieces", [["1 piece", 15, 1]]),
    P("p11", V, "Garlic", "🧄", "A 250g packet of peeled garlic cloves.", 40, "packets", [["1 packet", 50, 1]]),
    P("p12", V, "Ginger", "🫚", "Fresh, fiery ginger root.", 18, "kg", [["½ kg", 80, 0.5]]),
    P("p13", F, "Avocado", "🥑", "Creamy Hass avocado, ready to eat in days.", 120, "pieces", [["1 piece", 30, 1]]),
    P("p14", F, "Bananas", "🍌", "Sweet ripe bananas, sold per piece.", 150, "pieces", [["1 piece", 15, 1]]),
    P("p15", F, "Oranges", "🍊", "Juicy, sweet local oranges.", 100, "pieces", [["1 piece", 15, 1]]),
    P("p16", F, "Mangoes", "🥭", "Fragrant, in-season mangoes.", 70, "pieces", [["1 piece", 40, 1]]),
    P("p17", F, "Watermelon", "🍉", "Buy a single slice or take the whole watermelon.", 25, "whole", [["1 slice", 10, 0.1], ["Whole", 100, 1]]),
    P("p18", F, "Pineapple", "🍍", "Sweet, golden whole pineapple.", 30, "whole", [["Whole", 600, 1]]),
    P("p19", F, "Apples", "🍎", "Crisp red apples.", 80, "pieces", [["1 piece", 35, 1]]),
    P("p20", F, "Pawpaw", "🍈", "Ripe, sweet pawpaw (papaya).", 20, "pieces", [["1 piece", 100, 1]]),
    P("p21", F, "Passion Fruits", "🟣", "A packet of ten tangy passion fruits.", 30, "packets", [["1 packet", 100, 1]]),
    P("p22", F, "Lemons", "🍋", "Sour, aromatic lemons.", 90, "pieces", [["1 piece", 10, 1]]),
  ];
}

function defaultSettings() {
  return {
    businessName: "Shamba Fresh",
    businessPhone: "0700 123 456",
    businessLocation: "Thika, Kiambu County",
    openingHours: "Mon–Sat: 6:00 AM – 8:00 PM, Sun: 8:00 AM – 6:00 PM",
    deliveryFee: 10,
    mpesaPaybill: "174379 (demo till — simulated)",
    orderSeq: 10025,
  };
}

function fmt(n) {
  return "KSh " + Math.round(n).toLocaleString("en-KE");
}
function unitSuffix(u) {
  return "/" + (UNIT_LABEL[u] || u);
}
function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function genReceipt() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const r3 = (n) => Math.round(n * 1000) / 1000;

// Selling options for a product (falls back to a single option for any legacy product).
function optionsOf(p) {
  if (p.options && p.options.length) return p.options;
  return [{ id: "o1", label: "1 " + (UNIT_LABEL[p.unit] || "piece"), price: p.price || 0, size: 1 }];
}
// Cart lines are { productId, optionId, qty }. Resolve them against the live catalogue (current prices).
function resolveCart(cart, products) {
  return cart.map(c => {
    const product = products.find(p => p.id === c.productId);
    if (!product) return null;
    const option = optionsOf(product).find(o => o.id === c.optionId);
    if (!option) return null;
    return { ...c, key: c.productId + ":" + c.optionId, product, option, lineTotal: option.price * c.qty };
  }).filter(Boolean);
}
// Max quantity of `option` the customer may hold, given what other options of the same product already use of the shared stock.
function maxQtyFor(cart, product, option) {
  const usedByOthers = cart.reduce((s, c) => {
    if (c.productId !== product.id || c.optionId === option.id) return s;
    const o = optionsOf(product).find(x => x.id === c.optionId);
    return s + (o ? c.qty * o.size : 0);
  }, 0);
  return Math.max(0, Math.floor((product.stock - usedByOthers + 1e-9) / option.size));
}

async function storageGet(key, fallback) {
  try {
    const res = await window.storage.get(key, true);
    return res ? JSON.parse(res.value) : fallback;
  } catch {
    return fallback;
  }
}
async function storageSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), true);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------- small UI atoms ---------------------------- */

function PriceTag({ children, size = "md" }) {
  return (
    <span className={`price-tag ${size === "lg" ? "price-tag-lg" : ""}`}>
      <span className="price-tag-dot" />
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full shadow-lg text-sm font-medium animate-toast"
      style={{ background: toast.type === "error" ? "#8A1E1E" : "#1B4A31", color: "#fff" }}>
      {toast.msg}
    </div>
  );
}

function Stepper({ value, min = 1, max = 99, onChange, size = "md" }) {
  const dim = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${dim} rounded-full flex items-center justify-center btn-outline-brand`}
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <span className="w-6 text-center font-semibold text-[15px]" style={{ color: "var(--ink)" }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${dim} rounded-full flex items-center justify-center btn-outline-brand`}
        aria-label="Increase quantity"
        disabled={value >= max}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ------------------------------- Header --------------------------------- */

function Header({ settings, cartCount, onCartClick, route, setRoute, isAdmin }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => setRoute("store")} className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--brand)" }}>
            <Sprout size={18} color="#fff" />
          </span>
          <span className="font-display text-xl font-bold" style={{ color: "var(--brand-dark)" }}>{settings.businessName}</span>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--ink)" }}>
          <button onClick={() => setRoute("store")} className={`nav-link ${route === "store" ? "nav-link-active" : ""}`}>Shop</button>
          <button onClick={() => setRoute("track")} className={`nav-link ${route === "track" ? "nav-link-active" : ""}`}>Track Order</button>
          <button onClick={() => setRoute("admin")} className={`nav-link ${route === "admin" ? "nav-link-active" : ""}`}>{isAdmin ? "Admin" : "Admin Login"}</button>
        </nav>
        <button onClick={onCartClick} className="relative w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--brand-light)" }}>
          <ShoppingCart size={19} color="var(--brand-dark)" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: "var(--accent)" }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>
      <div className="md:hidden flex items-center justify-around border-t text-xs font-medium" style={{ borderColor: "var(--line)" }}>
        {[["store", "Shop"], ["track", "Track"], ["admin", isAdmin ? "Admin" : "Admin"]].map(([k, l]) => (
          <button key={k} onClick={() => setRoute(k)} className="flex-1 py-2 text-center" style={{ color: route === k ? "var(--brand-dark)" : "#7A8B80", fontWeight: route === k ? 700 : 500 }}>
            {l}
          </button>
        ))}
      </div>
    </header>
  );
}

/* ------------------------------ Storefront ------------------------------- */

function Hero({ setRoute }) {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, var(--brand-light) 0%, #fff 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "var(--accent-soft)", color: "var(--accent-dark)" }}>
            <Leaf size={13} /> Fresh from the market, daily
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.08]" style={{ color: "var(--brand-dark)" }}>
            Fresh Groceries.<br />Delivered to Your Door.
          </h1>
          <p className="mt-4 text-base md:text-lg" style={{ color: "#3E5C4B" }}>
            Order fresh vegetables and fruits online and get them delivered around your area.
          </p>
          <button onClick={() => setRoute("store")} className="btn-accent mt-6 px-7 py-3 text-base">
            Shop Now <ChevronRight size={18} className="inline -mr-1 ml-1" />
          </button>
          <div className="flex gap-6 mt-8 text-sm" style={{ color: "#3E5C4B" }}>
            <div><div className="font-bold text-lg" style={{ color: "var(--brand-dark)" }}>22+</div>fresh items</div>
            <div><div className="font-bold text-lg" style={{ color: "var(--brand-dark)" }}>KSh 10</div>flat delivery</div>
            <div><div className="font-bold text-lg" style={{ color: "var(--brand-dark)" }}>Same day</div>delivery</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["🍅", "🥑", "🥕", "🍌", "🥬", "🍊"].map((e, i) => (
            <div key={i} className="produce-tile" style={{ animationDelay: `${i * 0.08}s` }}>{e}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ p, cart, onAdd, onSetQty }) {
  const opts = optionsOf(p);
  const [optId, setOptId] = useState(opts[0].id);
  const opt = opts.find(o => o.id === optId) || opts[0];
  const line = cart.find(c => c.productId === p.id && c.optionId === opt.id);
  const cartQty = line ? line.qty : 0;
  const maxQty = maxQtyFor(cart, p, opt);
  const others = cart.filter(c => c.productId === p.id && c.optionId !== opt.id)
    .map(c => { const o = opts.find(x => x.id === c.optionId); return o ? `${o.label} ×${c.qty}` : null; }).filter(Boolean);
  const outOfStock = p.stock <= 0;
  const lowStock = !outOfStock && p.stock <= 10;
  return (
    <div className="produce-card">
      <div className="relative flex items-center justify-center h-28 md:h-32 rounded-xl mb-3" style={{ background: "var(--brand-light)" }}>
        <span className="text-5xl md:text-6xl">{p.emoji}</span>
        <span className="absolute top-2 right-2">
          {outOfStock ? (
            <span className="stock-badge stock-out">Out of Stock</span>
          ) : lowStock ? (
            <span className="stock-badge stock-low">Only {r3(p.stock)} {p.poolUnit || ""} left</span>
          ) : (
            <span className="stock-badge stock-in">In Stock</span>
          )}
        </span>
      </div>
      <h3 className="font-semibold text-[15px] leading-tight" style={{ color: "var(--ink)" }}>{p.name}</h3>
      <p className="text-xs mt-0.5 mb-2 line-clamp-2" style={{ color: "#7A8B80" }}>{p.description}</p>

      {opts.length > 1 ? (
        <select value={optId} onChange={e => setOptId(e.target.value)} disabled={outOfStock} className="input-field w-full mb-2 py-2 text-sm font-semibold" aria-label={`Choose size for ${p.name}`}>
          {opts.map(o => (
            <option key={o.id} value={o.id} disabled={maxQtyFor(cart, p, o) <= 0}>
              {o.label} — {fmt(o.price)}
            </option>
          ))}
        </select>
      ) : null}
      <PriceTag>{fmt(opt.price)}<span style={{ fontWeight: 600, fontSize: 11 }}> / {opt.label}</span></PriceTag>

      <div className="mt-3">
        {outOfStock || (maxQty <= 0 && cartQty === 0) ? (
          <button disabled className="btn-brand w-full py-2 text-sm opacity-40 cursor-not-allowed">Unavailable</button>
        ) : cartQty > 0 ? (
          <div className="flex items-center justify-between rounded-full px-1.5 py-1" style={{ background: "var(--brand-light)" }}>
            <button onClick={() => onSetQty(p.id, opt.id, cartQty - 1)} className="w-9 h-9 rounded-full flex items-center justify-center btn-brand" aria-label="Decrease quantity"><Minus size={16} /></button>
            <div className="text-center leading-tight">
              <div className="font-bold text-[15px]" style={{ color: "var(--brand-dark)" }}>{cartQty}</div>
              <div className="text-[10px]" style={{ color: "#5E7A6A" }}>{fmt(opt.price * cartQty)}</div>
            </div>
            <button onClick={() => onSetQty(p.id, opt.id, cartQty + 1)} disabled={cartQty >= maxQty} className="w-9 h-9 rounded-full flex items-center justify-center btn-brand disabled:opacity-40" aria-label="Increase quantity"><Plus size={16} /></button>
          </div>
        ) : (
          <button onClick={() => onAdd(p.id, opt.id, 1)} className="btn-brand w-full py-2.5 text-sm flex items-center justify-center gap-1.5"><Plus size={15} /> Add to Cart</button>
        )}
      </div>
      {others.length > 0 && <p className="text-[11px] mt-1.5" style={{ color: "#5E7A6A" }}>Also in cart: {others.join(", ")}</p>}
    </div>
  );
}

function StoreFront({ products, cart, addToCart, setCartQty, setRoute }) {
  const [cat, setCat] = useState("All");
  const cats = ["All", "Vegetables", "Fruits"];
  const list = products.filter(p => p.active && (cat === "All" || p.category === cat));

  return (
    <div>
      <Hero setRoute={setRoute} />

      <section id="shop" className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold" style={{ color: "var(--brand-dark)" }}>Shop Fresh Groceries</h2>
            <p className="text-sm" style={{ color: "#7A8B80" }}>Hand-picked vegetables and fruits, priced per kilo, bunch or piece.</p>
          </div>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? "chip-active" : ""}`}>{c}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {list.map(p => <ProductCard key={p.id} p={p} cart={cart} onAdd={addToCart} onSetQty={setCartQty} />)}
        </div>
        {list.length === 0 && <p className="text-center py-10 text-sm" style={{ color: "#7A8B80" }}>No products in this category right now.</p>}
      </section>

      <section className="py-12" style={{ background: "var(--paper)" }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-2xl font-bold mb-8 text-center" style={{ color: "var(--brand-dark)" }}>How It Works</h2>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              [Leaf, "Browse", "Pick fresh vegetables and fruits from the shop."],
              [ShoppingCart, "Add to Cart", "Choose quantities — your total updates instantly."],
              [CreditCard, "Pay with M-Pesa", "Checkout and pay securely from your phone."],
              [Truck, "Get it Delivered", "We prepare your order and deliver it to your door."],
            ].map(([Icon, title, body], i) => (
              <div key={i} className="how-card">
                <div className="how-icon"><Icon size={20} color="var(--brand-dark)" /></div>
                <h3 className="font-semibold mt-3" style={{ color: "var(--ink)" }}>{i + 1}. {title}</h3>
                <p className="text-sm mt-1" style={{ color: "#7A8B80" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-2xl font-bold mb-4" style={{ color: "var(--brand-dark)" }}>Why Choose Us</h2>
          <ul className="space-y-3">
            {[
              "Sourced fresh from local farmers and markets every morning",
              "Flat KSh 10 delivery fee across your area",
              "Pay easily and securely with M-Pesa",
              "Track your order from prep to delivery",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#3E5C4B" }}>
                <Check size={16} className="mt-0.5 shrink-0" color="var(--brand)" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--brand-light)" }}>
          <h3 className="font-display text-xl font-bold mb-2" style={{ color: "var(--brand-dark)" }}>Delivery Information</h3>
          <div className="space-y-2 text-sm" style={{ color: "#3E5C4B" }}>
            <p className="flex items-center gap-2"><Truck size={15} /> Flat delivery fee: <strong>KSh 10</strong></p>
            <p className="flex items-center gap-2"><Clock size={15} /> Orders prepared same day</p>
            <p className="flex items-center gap-2"><MapPin size={15} /> Delivering across Thika and surrounding estates</p>
          </div>
        </div>
      </section>

      <section className="py-12" style={{ background: "var(--paper)" }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-2xl font-bold mb-8 text-center" style={{ color: "var(--brand-dark)" }}>What Customers Say</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              ["Wanjiru M.", "Fresh produce every time and the M-Pesa checkout is so quick."],
              ["Otieno K.", "My sukuma and tomatoes arrived within the hour. Great service."],
              ["Amina H.", "Love that I can track my order from the app until it's delivered."],
            ].map(([name, quote], i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex gap-0.5 mb-2">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={14} fill="var(--accent)" color="var(--accent)" />)}</div>
                <p className="text-sm" style={{ color: "#3E5C4B" }}>"{quote}"</p>
                <p className="text-xs font-semibold mt-3" style={{ color: "var(--brand-dark)" }}>{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Footer({ settings }) {
  return (
    <footer className="mt-auto" style={{ background: "var(--brand-dark)" }}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8 text-sm" style={{ color: "#D4E8DB" }}>
        <div>
          <div className="font-display text-lg font-bold text-white mb-2">{settings.businessName}</div>
          <p>{settings.businessLocation}</p>
          <p className="mt-1">{settings.openingHours}</p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Contact</div>
          <p className="flex items-center gap-2"><Phone size={14} /> {settings.businessPhone}</p>
          <p className="flex items-center gap-2 mt-1"><MessageCircle size={14} /> WhatsApp us for help with your order</p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Pay with confidence</div>
          <p>M-Pesa checkout · Order tracking · Fresh produce guarantee</p>
        </div>
      </div>
      <div className="text-center text-xs py-4 border-t" style={{ borderColor: "#2A5A40", color: "#9FC4AC" }}>
        © {new Date().getFullYear()} {settings.businessName}. Prototype build.
      </div>
    </footer>
  );
}

/* -------------------------------- Cart ----------------------------------- */

function CartDrawer({ open, onClose, cart, products, updateQty, removeItem, settings, goCheckout }) {
  const items = resolveCart(cart, products);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const total = subtotal + (items.length ? settings.deliveryFee : 0);

  return (
    <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl flex flex-col transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b shrink-0" style={{ borderColor: "var(--line)" }}>
          <h3 className="font-display font-bold text-lg" style={{ color: "var(--brand-dark)" }}>Your Cart</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16" style={{ color: "#7A8B80" }}>
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your cart is empty. Add some fresh groceries!</p>
            </div>
          ) : items.map(i => (
            <div key={i.key} className="flex gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--line)" }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "var(--brand-light)" }}>{i.product.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--ink)" }}>{i.product.name}</p>
                  <button onClick={() => removeItem(i.productId, i.optionId)} className="shrink-0"><Trash2 size={15} color="#B0473F" /></button>
                </div>
                <p className="text-xs" style={{ color: "#7A8B80" }}>{i.option.label} · {fmt(i.option.price)} each</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <Stepper value={i.qty} max={maxQtyFor(cart, i.product, i.option)} onChange={(v) => updateQty(i.productId, i.optionId, v)} size="sm" />
                  <span className="text-sm font-semibold" style={{ color: "var(--brand-dark)" }}>{fmt(i.lineTotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="border-t px-5 py-4 shrink-0" style={{ borderColor: "var(--line)" }}>
            <div className="flex justify-between text-sm mb-1" style={{ color: "#3E5C4B" }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-sm mb-2" style={{ color: "#3E5C4B" }}><span>Delivery</span><span>{fmt(settings.deliveryFee)}</span></div>
            <div className="flex justify-between font-bold text-base mb-4" style={{ color: "var(--brand-dark)" }}><span>Total</span><span>{fmt(total)}</span></div>
            <button onClick={goCheckout} className="btn-accent w-full py-3">Proceed to Checkout</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Checkout --------------------------------- */

function MpesaModal({ open, amount, phone, onClose, onResult }) {
  const [stage, setStage] = useState("confirm"); // confirm | sending | waiting | failed
  const [mpesaPhone, setMpesaPhone] = useState(phone || "");

  useEffect(() => { if (open) { setStage("confirm"); setMpesaPhone(phone || ""); } }, [open, phone]);

  if (!open) return null;

  const send = () => {
    if (!/^0[71]\d{8}$/.test(mpesaPhone.trim())) return;
    setStage("sending");
    setTimeout(() => {
      setStage("waiting");
      setTimeout(() => {
        const success = Math.random() > 0.12; // simulated ~88% success rate
        if (success) {
          onResult({ status: "paid", reference: genReceipt(), phone: mpesaPhone.trim() });
        } else {
          setStage("failed");
        }
      }, 2200);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg" style={{ color: "var(--brand-dark)" }}>Pay with M-Pesa</h3>
          {stage === "confirm" && <button onClick={onClose}><X size={20} /></button>}
        </div>

        {stage === "confirm" && (
          <>
            <p className="text-sm mb-4" style={{ color: "#3E5C4B" }}>Amount to pay: <strong>{fmt(amount)}</strong></p>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>M-Pesa phone number</label>
            <input
              value={mpesaPhone}
              onChange={e => setMpesaPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="input-field w-full mb-1"
            />
            <p className="text-[11px] mb-4" style={{ color: "#7A8B80" }}>Format: 07XXXXXXXX or 01XXXXXXXX</p>
            <button onClick={send} className="btn-brand w-full py-3">Send STK Push</button>
          </>
        )}

        {stage === "sending" && (
          <div className="py-8 text-center">
            <Loader2 size={30} className="mx-auto animate-spin mb-3" color="var(--brand)" />
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Sending payment request to {mpesaPhone}…</p>
          </div>
        )}

        {stage === "waiting" && (
          <div className="py-8 text-center">
            <Loader2 size={30} className="mx-auto animate-spin mb-3" color="var(--brand)" />
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Enter your M-Pesa PIN on your phone to complete payment of {fmt(amount)}…</p>
          </div>
        )}

        {stage === "failed" && (
          <div className="py-4 text-center">
            <AlertCircle size={30} className="mx-auto mb-3" color="#B0473F" />
            <p className="text-sm font-medium mb-4" style={{ color: "var(--ink)" }}>Payment was not completed. It may have been cancelled or timed out.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-outline-brand flex-1 py-2.5">Cancel</button>
              <button onClick={() => setStage("confirm")} className="btn-brand flex-1 py-2.5">Try Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Checkout({ cart, products, settings, onBack, onPlaceOrder, showToast }) {
  const [form, setForm] = useState({ name: "", phone: "", location: "", estate: "", landmark: "", instructions: "" });
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  const items = resolveCart(cart, products);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const total = subtotal + settings.deliveryFee;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && /^0[71]\d{8}$/.test(form.phone.trim()) && form.location.trim() && form.estate.trim();

  const handlePayResult = async (result) => {
    setMpesaOpen(false);
    setPlacing(true);
    const res = await onPlaceOrder(form, result);
    setPlacing(false);
    if (!res.ok) showToast(res.error, "error");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-sm mb-4" style={{ color: "#7A8B80" }}>Your cart is empty — add some groceries before checking out.</p>
        <button onClick={onBack} className="btn-brand px-6 py-2.5">Back to Shop</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4 font-medium" style={{ color: "var(--brand-dark)" }}>
        <ArrowLeft size={16} /> Back to Shop
      </button>
      <h2 className="font-display text-2xl font-bold mb-6" style={{ color: "var(--brand-dark)" }}>Checkout</h2>

      <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "var(--line)" }}>
        <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--ink)" }}>Delivery Details</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input placeholder="Full name" value={form.name} onChange={set("name")} className="input-field sm:col-span-2" />
          <input placeholder="Phone number (07XXXXXXXX)" value={form.phone} onChange={set("phone")} className="input-field" />
          <input placeholder="Delivery location / town" value={form.location} onChange={set("location")} className="input-field" />
          <input placeholder="Estate / area" value={form.estate} onChange={set("estate")} className="input-field" />
          <input placeholder="Landmark (optional)" value={form.landmark} onChange={set("landmark")} className="input-field" />
          <textarea placeholder="Delivery instructions (optional)" value={form.instructions} onChange={set("instructions")} className="input-field sm:col-span-2" rows={2} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "var(--line)" }}>
        <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--ink)" }}>Order Summary</h3>
        {items.map(i => (
          <div key={i.key} className="flex justify-between text-sm py-1" style={{ color: "#3E5C4B" }}>
            <span>{i.product.name} ({i.option.label}) × {i.qty}</span>
            <span>{fmt(i.lineTotal)}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 space-y-1" style={{ borderColor: "var(--line)" }}>
          <div className="flex justify-between text-sm" style={{ color: "#3E5C4B" }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="flex justify-between text-sm" style={{ color: "#3E5C4B" }}><span>Delivery</span><span>{fmt(settings.deliveryFee)}</span></div>
          <div className="flex justify-between font-bold text-base" style={{ color: "var(--brand-dark)" }}><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>

      <button
        disabled={!valid || placing}
        onClick={() => setMpesaOpen(true)}
        className="btn-accent w-full py-3.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {placing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {placing ? "Confirming order…" : `Pay ${fmt(total)} with M-Pesa`}
      </button>
      {!valid && <p className="text-xs text-center mt-2" style={{ color: "#B0473F" }}>Fill in your name, a valid phone number, location and estate to continue.</p>}

      <MpesaModal open={mpesaOpen} amount={total} phone={form.phone} onClose={() => setMpesaOpen(false)} onResult={handlePayResult} />
    </div>
  );
}

/* --------------------------- Order Confirmation --------------------------- */

function Confirmation({ order, setRoute, setSelectedOrder }) {
  if (!order) return null;
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--brand-light)" }}>
        <PackageCheck size={30} color="var(--brand-dark)" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--brand-dark)" }}>Order Confirmed 🎉</h2>
      <p className="text-sm mb-6" style={{ color: "#3E5C4B" }}>Thank you, {order.customer.name.split(" ")[0]}! Your order has been received.</p>
      <div className="bg-white rounded-2xl border p-6 text-left" style={{ borderColor: "var(--line)" }}>
        <div className="flex justify-between mb-2"><span className="text-sm" style={{ color: "#7A8B80" }}>Order Number</span><span className="font-bold" style={{ color: "var(--brand-dark)" }}>{order.id}</span></div>
        <div className="flex justify-between mb-2"><span className="text-sm" style={{ color: "#7A8B80" }}>Amount Paid</span><span className="font-semibold">{fmt(order.total)}</span></div>
        <div className="flex justify-between mb-2"><span className="text-sm" style={{ color: "#7A8B80" }}>Delivery Fee</span><span>{fmt(order.deliveryFee)}</span></div>
        <div className="flex justify-between mb-2"><span className="text-sm" style={{ color: "#7A8B80" }}>M-Pesa Ref</span><span className="font-mono text-sm">{order.payment.reference}</span></div>
        <div className="flex justify-between"><span className="text-sm" style={{ color: "#7A8B80" }}>Status</span><StatusPill status={order.status} /></div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={() => setRoute("store")} className="btn-outline-brand flex-1 py-3">Continue Shopping</button>
        <button onClick={() => { setSelectedOrder(order.id); setRoute("track"); }} className="btn-brand flex-1 py-3">Track My Order</button>
      </div>
    </div>
  );
}

/* ------------------------------ Track Order -------------------------------- */

function OrderTimeline({ status }) {
  if (status === "cancelled") {
    return <StatusPill status="cancelled" />;
  }
  const idx = ORDER_FLOW.findIndex(s => s.key === status);
  return (
    <div className="space-y-0">
      {ORDER_FLOW.map((s, i) => {
        const done = i <= idx;
        return (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0`} style={{ background: done ? "var(--brand)" : "#E4E9E6" }}>
                {done && <Check size={13} color="#fff" />}
              </div>
              {i < ORDER_FLOW.length - 1 && <div className="w-0.5 flex-1 min-h-[24px]" style={{ background: done && i < idx ? "var(--brand)" : "#E4E9E6" }} />}
            </div>
            <div className="pb-5">
              <p className="text-sm font-medium" style={{ color: done ? "var(--ink)" : "#A3AFA9" }}>{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, onTrack, onReorder }) {
  return (
    <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "var(--line)" }}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--brand-dark)" }}>{order.id}</p>
          <p className="text-xs" style={{ color: "#7A8B80" }}>{new Date(order.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <p className="text-xs mb-3" style={{ color: "#3E5C4B" }}>{order.items.length} item(s) · {fmt(order.total)}</p>
      <div className="flex gap-2">
        <button onClick={() => onTrack(order.id)} className="btn-outline-brand flex-1 py-1.5 text-xs">View / Track</button>
        <button onClick={() => onReorder(order)} className="btn-brand flex-1 py-1.5 text-xs">Reorder</button>
      </div>
    </div>
  );
}

function TrackOrder({ orders, selectedOrder, setSelectedOrder, reorder, setRoute }) {
  const [query, setQuery] = useState(selectedOrder || "");
  const [searched, setSearched] = useState(!!selectedOrder);

  useEffect(() => { if (selectedOrder) { setQuery(selectedOrder); setSearched(true); } }, [selectedOrder]);

  const byId = orders.find(o => o.id.toLowerCase() === query.trim().toLowerCase());
  const byPhone = !byId ? orders.filter(o => o.customer.phone === query.trim()).sort((a, b) => b.createdAt - a.createdAt) : [];

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--brand-dark)" }}>Track Your Order</h2>
      <p className="text-sm mb-5" style={{ color: "#7A8B80" }}>Enter your order number (e.g. GG-10025) or your phone number to view your orders.</p>
      <div className="flex gap-2 mb-6">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Order number or phone" className="input-field flex-1" />
        <button onClick={() => setSearched(true)} className="btn-brand px-5"><Search size={16} /></button>
      </div>

      {searched && byId && (
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex justify-between items-center mb-1">
            <p className="font-bold" style={{ color: "var(--brand-dark)" }}>{byId.id}</p>
            <StatusPill status={byId.status} />
          </div>
          <p className="text-xs mb-4" style={{ color: "#7A8B80" }}>Placed {new Date(byId.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>
          <OrderTimeline status={byId.status} />
          <div className="border-t pt-3 mt-2" style={{ borderColor: "var(--line)" }}>
            {byId.items.map(i => (
              <div key={i.productId} className="flex justify-between text-sm py-0.5" style={{ color: "#3E5C4B" }}>
                <span>{i.name}{i.optionLabel ? ` (${i.optionLabel})` : ""} × {i.qty}</span><span>{fmt(i.total)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t" style={{ borderColor: "var(--line)", color: "var(--brand-dark)" }}>
              <span>Total</span><span>{fmt(byId.total)}</span>
            </div>
          </div>
          <button onClick={() => reorder(byId)} className="btn-brand w-full py-2.5 mt-4 text-sm">Reorder These Items</button>
        </div>
      )}

      {searched && !byId && byPhone.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: "#7A8B80" }}>{byPhone.length} order(s) found for this number</p>
          {byPhone.map(o => (
            <OrderCard key={o.id} order={o} onTrack={(id) => { setSelectedOrder(id); setQuery(id); }} onReorder={reorder} />
          ))}
        </div>
      )}

      {searched && !byId && byPhone.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "#7A8B80" }}>No orders found for "{query}". Check the order number or phone and try again.</p>
      )}
    </div>
  );
}

/* -------------------------------- Admin ----------------------------------- */

function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "var(--line)" }}>
        <h2 className="font-display text-xl font-bold mb-1" style={{ color: "var(--brand-dark)" }}>Admin Login</h2>
        <p className="text-xs mb-4" style={{ color: "#7A8B80" }}>Demo password: <span className="font-mono">admin123</span></p>
        <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setErr(false); }} placeholder="Password" className="input-field w-full mb-2" />
        {err && <p className="text-xs mb-2" style={{ color: "#B0473F" }}>Incorrect password.</p>}
        <button onClick={() => pwd === "admin123" ? onLogin() : setErr(true)} className="btn-brand w-full py-2.5">Log In</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "#7A8B80" }}>{label}</span>
        <Icon size={15} color={accent ? "var(--accent)" : "var(--brand)"} />
      </div>
      <p className="text-xl font-bold" style={{ color: "var(--brand-dark)" }}>{value}</p>
    </div>
  );
}

function ProductForm({ initial, onSave, onCancel }) {
  const blank = { name: "", category: "Vegetables", emoji: "🥬", description: "", active: true, stock: 0, poolUnit: "kg", options: [{ id: "o1", label: "1 kg", price: 0, size: 1 }] };
  const [f, setF] = useState(initial ? { ...initial, poolUnit: initial.poolUnit || "pieces", options: optionsOf(initial).map(o => ({ ...o })) } : blank);
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  const setOpt = (i, patch) => setF(v => ({ ...v, options: v.options.map((o, idx) => idx === i ? { ...o, ...patch } : o) }));
  const pickLabel = (i, label) => {
    if (label === "__custom") return setOpt(i, { label: "" });
    const patch = { label };
    if (f.poolUnit === "kg" && KG_SIZES[label]) patch.size = KG_SIZES[label];
    setOpt(i, patch);
  };
  const addOpt = () => setF(v => ({ ...v, options: [...v.options, { id: "o" + Date.now(), label: "1 piece", price: 0, size: 1 }] }));
  const removeOpt = (i) => setF(v => ({ ...v, options: v.options.filter((_, idx) => idx !== i) }));
  const valid = f.name.trim() && f.options.length > 0 && f.options.every(o => o.label.trim() && o.price > 0 && o.size > 0);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: "var(--brand-dark)" }}>{initial ? "Edit Product" : "Add Product"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Name" value={f.name} onChange={set("name")} className="input-field col-span-2" />
          <input placeholder="Emoji" value={f.emoji} onChange={set("emoji")} className="input-field" />
          <select value={f.category} onChange={set("category")} className="input-field"><option>Vegetables</option><option>Fruits</option></select>
          <div>
            <label className="text-[11px] font-semibold" style={{ color: "var(--ink)" }}>Stock in</label>
            <select value={f.poolUnit} onChange={set("poolUnit")} className="input-field w-full mt-0.5">
              {POOL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold" style={{ color: "var(--ink)" }}>Stock quantity ({f.poolUnit})</label>
            <input type="number" placeholder="Stock" value={f.stock} onChange={set("stock")} className="input-field w-full mt-0.5" />
          </div>
          <textarea placeholder="Description" value={f.description} onChange={set("description")} className="input-field col-span-2" rows={2} />
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>Selling options & prices</p>
          <p className="text-[11px] mb-2" style={{ color: "#7A8B80" }}>Offer single pieces and bulk sizes. "Uses" is how much of the stock ({f.poolUnit}) one sale takes, e.g. ¼ kg uses 0.25.</p>
          <div className="space-y-2">
            {f.options.map((o, i) => (
              <div key={o.id} className="rounded-xl border p-2.5" style={{ borderColor: "var(--line)" }}>
                <div className="flex gap-2 mb-2">
                  <select value={PRESET_LABELS.includes(o.label) ? o.label : "__custom"} onChange={e => pickLabel(i, e.target.value)} className="input-field flex-1 py-1.5 text-sm">
                    {PRESET_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                    <option value="__custom">Custom…</option>
                  </select>
                  {f.options.length > 1 && <button onClick={() => removeOpt(i)} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FBE3E3" }}><Trash2 size={14} color="#B0473F" /></button>}
                </div>
                {!PRESET_LABELS.includes(o.label) && <input placeholder="Custom size name, e.g. 5 tomatoes" value={o.label} onChange={e => setOpt(i, { label: e.target.value })} className="input-field w-full mb-2 py-1.5 text-sm" />}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[11px]" style={{ color: "#7A8B80" }}>Price (KSh)</label><input type="number" value={o.price} onChange={e => setOpt(i, { price: Number(e.target.value) })} className="input-field w-full py-1.5 text-sm" /></div>
                  <div><label className="text-[11px]" style={{ color: "#7A8B80" }}>Uses ({f.poolUnit})</label><input type="number" step="any" value={o.size} onChange={e => setOpt(i, { size: Number(e.target.value) })} className="input-field w-full py-1.5 text-sm" /></div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addOpt} className="btn-outline-brand w-full py-2 mt-2 text-sm">+ Add another size</button>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={f.active} onChange={e => setF(v => ({ ...v, active: e.target.checked }))} /> Active (visible in store)
        </label>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="btn-outline-brand flex-1 py-2.5">Cancel</button>
          <button onClick={() => onSave(f)} disabled={!valid} className="btn-brand flex-1 py-2.5 disabled:opacity-40">Save</button>
        </div>
      </div>
    </div>
  );
}

function AdminProducts({ products, saveProducts }) {
  const [editing, setEditing] = useState(null); // product or "new" or null
  const save = (f) => {
    if (editing === "new") {
      const id = "p" + Date.now();
      saveProducts([...products, { ...f, id }]);
    } else {
      saveProducts(products.map(p => p.id === editing.id ? { ...f, id: editing.id } : p));
    }
    setEditing(null);
  };
  const toggleActive = (p) => saveProducts(products.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
  const remove = (p) => { if (confirm(`Delete ${p.name}?`)) saveProducts(products.filter(x => x.id !== p.id)); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold" style={{ color: "var(--ink)" }}>Products ({products.length})</h3>
        <button onClick={() => setEditing("new")} className="btn-brand px-4 py-2 text-sm">+ Add Product</button>
      </div>
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: "var(--line)" }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: "var(--brand-light)" }}>{p.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "var(--ink)" }}>{p.name} {!p.active && <span className="text-xs font-normal" style={{ color: "#B0473F" }}>(inactive)</span>}</p>
              <p className="text-xs" style={{ color: "#7A8B80" }}>{p.category} · {optionsOf(p).map(o => `${o.label} ${fmt(o.price)}`).join(" · ")} · stock {r3(p.stock)} {p.poolUnit || ""}</p>
            </div>
            <button onClick={() => toggleActive(p)} className="btn-outline-brand px-2.5 py-1.5 text-xs shrink-0">{p.active ? "Deactivate" : "Activate"}</button>
            <button onClick={() => setEditing(p)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--brand-light)" }}><Pencil size={14} color="var(--brand-dark)" /></button>
            <button onClick={() => remove(p)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FBE3E3" }}><Trash2 size={14} color="#B0473F" /></button>
          </div>
        ))}
      </div>
      {editing && <ProductForm initial={editing === "new" ? null : editing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function AdminOrders({ orders, updateOrderStatus }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const list = orders.filter(o => filter === "all" || o.status === filter).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["all", ...Object.keys(STATUS_META)].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? "chip-active" : ""}`}>{s === "all" ? "All" : STATUS_META[s].label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map(o => (
          <div key={o.id} className="bg-white rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
            <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--brand-dark)" }}>{o.id} — {o.customer.name}</p>
                <p className="text-xs" style={{ color: "#7A8B80" }}>{new Date(o.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })} · {fmt(o.total)}</p>
              </div>
              <StatusPill status={o.status} />
            </div>
            {expanded === o.id && (
              <div className="mt-3 pt-3 border-t text-sm" style={{ borderColor: "var(--line)" }}>
                <p className="flex items-center gap-1.5 mb-1" style={{ color: "#3E5C4B" }}><Phone size={13} /> {o.customer.phone}</p>
                <p className="flex items-center gap-1.5 mb-2" style={{ color: "#3E5C4B" }}><MapPin size={13} /> {o.customer.location}, {o.customer.estate}{o.customer.landmark ? ` (near ${o.customer.landmark})` : ""}</p>
                {o.customer.instructions && <p className="text-xs mb-2 italic" style={{ color: "#7A8B80" }}>"{o.customer.instructions}"</p>}
                {o.items.map(i => (
                  <div key={i.productId} className="flex justify-between text-xs py-0.5" style={{ color: "#3E5C4B" }}>
                    <span>{i.name}{i.optionLabel ? ` (${i.optionLabel})` : ""} × {i.qty}</span><span>{fmt(i.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-sm mt-1 pt-1 border-t" style={{ borderColor: "var(--line)" }}><span>Total</span><span>{fmt(o.total)}</span></div>
                <p className="text-xs mt-2" style={{ color: "#7A8B80" }}>M-Pesa ref: <span className="font-mono">{o.payment.reference}</span></p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>Update status:</span>
                  <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className="input-field py-1.5 text-xs flex-1">
                    {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-center py-8" style={{ color: "#7A8B80" }}>No orders in this filter.</p>}
      </div>
    </div>
  );
}

function AdminCustomers({ orders }) {
  const map = {};
  orders.forEach(o => {
    const k = o.customer.phone;
    if (!map[k]) map[k] = { name: o.customer.name, phone: k, estate: o.customer.estate, orders: 0, spent: 0 };
    map[k].orders += 1;
    map[k].spent += o.total;
  });
  const list = Object.values(map).sort((a, b) => b.spent - a.spent);
  return (
    <div className="space-y-2">
      {list.map(c => (
        <div key={c.phone} className="bg-white rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>{c.name}</p>
            <p className="text-xs" style={{ color: "#7A8B80" }}>{c.phone} · {c.estate}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: "var(--brand-dark)" }}>{fmt(c.spent)}</p>
            <p className="text-xs" style={{ color: "#7A8B80" }}>{c.orders} order(s)</p>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-sm text-center py-8" style={{ color: "#7A8B80" }}>No customers yet.</p>}
    </div>
  );
}

function AdminPayments({ orders }) {
  return (
    <div className="space-y-2">
      {orders.slice().sort((a, b) => b.createdAt - a.createdAt).map(o => (
        <div key={o.id} className="bg-white rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>{o.id} · {o.payment.phone}</p>
            <p className="text-xs font-mono" style={{ color: "#7A8B80" }}>{o.payment.reference}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold" style={{ color: "var(--brand-dark)" }}>{fmt(o.total)}</p>
            <StatusPill status={o.payment.status === "paid" ? "paid" : "payment_pending"} />
          </div>
        </div>
      ))}
      {orders.length === 0 && <p className="text-sm text-center py-8" style={{ color: "#7A8B80" }}>No transactions yet.</p>}
    </div>
  );
}

function AdminSettings({ settings, saveSettings }) {
  const [f, setF] = useState(settings);
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--line)" }}>
        <div><label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Business Name</label><input value={f.businessName} onChange={set("businessName")} className="input-field w-full mt-1" /></div>
        <div><label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Business Phone</label><input value={f.businessPhone} onChange={set("businessPhone")} className="input-field w-full mt-1" /></div>
        <div><label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Business Location</label><input value={f.businessLocation} onChange={set("businessLocation")} className="input-field w-full mt-1" /></div>
        <div><label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Opening Hours</label><input value={f.openingHours} onChange={set("openingHours")} className="input-field w-full mt-1" /></div>
        <div><label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Delivery Fee (KSh)</label><input type="number" value={f.deliveryFee} onChange={set("deliveryFee")} className="input-field w-full mt-1" /></div>
        <div><label className="text-xs font-semibold" style={{ color: "var(--ink)" }}>M-Pesa Paybill / Till</label><input value={f.mpesaPaybill} onChange={set("mpesaPaybill")} className="input-field w-full mt-1" /></div>
        <button onClick={() => saveSettings(f)} className="btn-brand w-full py-2.5 mt-2">Save Settings</button>
      </div>
      <div className="mt-4 p-4 rounded-2xl text-xs leading-relaxed" style={{ background: "var(--accent-soft)", color: "#7A4A15" }}>
        <strong>Prototype note:</strong> M-Pesa payment in this demo is simulated in the browser — no real Safaricom Daraja API call is made. Going live requires a backend server holding your Daraja credentials, a public callback URL to confirm payment, and a real database in place of this demo's browser-based storage.
      </div>
    </div>
  );
}

function AdminDashboard({ products, orders, settings, saveProducts, saveOrders, saveSettings, onLogout }) {
  const [tab, setTab] = useState("overview");
  const today = todayKey();
  const todayOrders = orders.filter(o => todayKey(new Date(o.createdAt)) === today);
  const stats = {
    total: orders.length,
    todayOrders: todayOrders.length,
    todaySales: todayOrders.reduce((s, o) => s + (o.payment.status === "paid" ? o.total : 0), 0),
    pending: orders.filter(o => o.status === "pending" || o.status === "payment_pending").length,
    paid: orders.filter(o => o.payment.status === "paid").length,
    delivered: orders.filter(o => o.status === "delivered").length,
    customers: new Set(orders.map(o => o.customer.phone)).size,
    inStock: products.reduce((s, p) => s + p.stock, 0),
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
  };
  const updateOrderStatus = (id, status) => {
    const next = orders.map(o => o.id === id ? { ...o, status, statusHistory: [...o.statusHistory, { status, at: Date.now() }] } : o);
    saveOrders(next);
  };

  const tabs = [
    ["overview", "Overview", LayoutDashboard],
    ["products", "Products", Package],
    ["orders", "Orders", ClipboardList],
    ["customers", "Customers", Users],
    ["payments", "Payments", CreditCard],
    ["settings", "Settings", SettingsIcon],
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl font-bold" style={{ color: "var(--brand-dark)" }}>Admin Dashboard</h2>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-sm font-medium btn-outline-brand px-3 py-1.5"><LogOut size={14} /> Logout</button>
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip flex items-center gap-1.5 ${tab === k ? "chip-active" : ""}`}>
            <Icon size={13} /> {l}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Orders" value={stats.total} icon={ClipboardList} />
          <StatCard label="Today's Orders" value={stats.todayOrders} icon={ClipboardList} />
          <StatCard label="Today's Sales" value={fmt(stats.todaySales)} icon={CreditCard} accent />
          <StatCard label="Pending Orders" value={stats.pending} icon={Clock} />
          <StatCard label="Paid Orders" value={stats.paid} icon={Check} />
          <StatCard label="Delivered" value={stats.delivered} icon={Truck} />
          <StatCard label="Total Customers" value={stats.customers} icon={Users} />
          <StatCard label="Units In Stock" value={stats.inStock} icon={Package} />
          <StatCard label="Low-Stock Products" value={stats.lowStock} icon={AlertCircle} accent />
        </div>
      )}
      {tab === "products" && <AdminProducts products={products} saveProducts={saveProducts} />}
      {tab === "orders" && <AdminOrders orders={orders} updateOrderStatus={updateOrderStatus} />}
      {tab === "customers" && <AdminCustomers orders={orders} />}
      {tab === "payments" && <AdminPayments orders={orders} />}
      {tab === "settings" && <AdminSettings settings={settings} saveSettings={saveSettings} />}
    </div>
  );
}

/* --------------------------------- App ------------------------------------ */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings());
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [route, setRoute] = useState("store");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    (async () => {
      const [p, s, o] = await Promise.all([
        storageGet(STORAGE.PRODUCTS, null),
        storageGet(STORAGE.SETTINGS, null),
        storageGet(STORAGE.ORDERS, null),
      ]);
      let seededProducts = p;
      let seededSettings = s;
      if (!seededProducts) { seededProducts = seedProducts(); await storageSet(STORAGE.PRODUCTS, seededProducts); }
      if (!seededSettings) { seededSettings = defaultSettings(); await storageSet(STORAGE.SETTINGS, seededSettings); }
      setProducts(seededProducts);
      setSettings(seededSettings);
      setOrders(o || []);
      setLoading(false);
    })();
  }, []);

  const saveProducts = useCallback((next) => { setProducts(next); storageSet(STORAGE.PRODUCTS, next); }, []);
  const saveSettings = useCallback((next) => { setSettings(next); storageSet(STORAGE.SETTINGS, next); showToast("Settings saved"); }, [showToast]);
  const saveOrders = useCallback((next) => { setOrders(next); storageSet(STORAGE.ORDERS, next); }, []);

  const addToCart = useCallback((productId, optionId, qty = 1) => {
    setCart(c => {
      const prod = products.find(p => p.id === productId);
      const opt = prod && optionsOf(prod).find(o => o.id === optionId);
      if (!prod || !opt) return c;
      const existing = c.find(i => i.productId === productId && i.optionId === optionId);
      const nextQty = Math.min((existing ? existing.qty : 0) + qty, maxQtyFor(c, prod, opt));
      if (nextQty <= 0) return c;
      if (existing) return c.map(i => i === existing ? { ...i, qty: nextQty } : i);
      return [...c, { productId, optionId, qty: nextQty }];
    });
    showToast("Added to cart");
  }, [products, showToast]);

  // Set an exact quantity for one size of a product. 0 removes the line; capped by shared stock.
  const setCartQty = useCallback((productId, optionId, qty) => {
    setCart(c => {
      const prod = products.find(p => p.id === productId);
      const opt = prod && optionsOf(prod).find(o => o.id === optionId);
      if (!prod || !opt) return c;
      const capped = Math.min(qty, maxQtyFor(c, prod, opt));
      return capped <= 0
        ? c.filter(i => !(i.productId === productId && i.optionId === optionId))
        : c.map(i => (i.productId === productId && i.optionId === optionId) ? { ...i, qty: capped } : i);
    });
  }, [products]);

  const updateQty = (productId, optionId, qty) => setCartQty(productId, optionId, qty);
  const removeItem = (productId, optionId) => setCart(c => c.filter(i => !(i.productId === productId && i.optionId === optionId)));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = resolveCart(cart, products).reduce((s, l) => s + l.lineTotal, 0) + (cart.length ? settings.deliveryFee : 0);

  const placeOrder = async (form, paymentResult) => {
    // Re-validate against the latest known stock/prices before committing (server-side check, simulated).
    const latest = await storageGet(STORAGE.PRODUCTS, products);
    const lineItems = [];
    const usage = {}; // stock consumed per product, across all sizes in the cart
    for (const c of cart) {
      const prod = latest.find(p => p.id === c.productId);
      if (!prod || !prod.active) return { ok: false, error: "An item in your cart is no longer available." };
      const opt = optionsOf(prod).find(o => o.id === c.optionId);
      if (!opt) return { ok: false, error: `${prod.name}: that size is no longer offered.` };
      usage[prod.id] = r3((usage[prod.id] || 0) + c.qty * opt.size);
      if (usage[prod.id] > prod.stock + 1e-9) return { ok: false, error: `Not enough stock for ${prod.name}.` };
      // price comes from the catalogue, never from the browser cart
      lineItems.push({ productId: prod.id, optionId: opt.id, name: prod.name, optionLabel: opt.label, size: opt.size, price: opt.price, qty: c.qty, total: opt.price * c.qty });
    }
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
    const latestSettings = await storageGet(STORAGE.SETTINGS, settings);
    const deliveryFee = latestSettings.deliveryFee;
    const total = subtotal + deliveryFee;

    const latestOrders = await storageGet(STORAGE.ORDERS, orders);
    const orderId = `GG-${latestSettings.orderSeq + latestOrders.length}`;

    const order = {
      id: orderId,
      customer: { ...form },
      items: lineItems,
      subtotal, deliveryFee, total,
      payment: { method: "mpesa", phone: paymentResult.phone, status: paymentResult.status, reference: paymentResult.reference, paidAt: Date.now() },
      status: "paid",
      statusHistory: [{ status: "pending", at: Date.now() - 500 }, { status: "paid", at: Date.now() }],
      createdAt: Date.now(),
    };

    const nextProducts = latest.map(p => usage[p.id] ? { ...p, stock: r3(p.stock - usage[p.id]) } : p);
    const nextOrders = [...latestOrders, order];

    setProducts(nextProducts);
    setOrders(nextOrders);
    await storageSet(STORAGE.PRODUCTS, nextProducts);
    await storageSet(STORAGE.ORDERS, nextOrders);

    // simulate "preparing" kicking off shortly after payment
    setTimeout(() => {
      setOrders(cur => {
        const upd = cur.map(o => o.id === orderId ? { ...o, status: "preparing", statusHistory: [...o.statusHistory, { status: "preparing", at: Date.now() }] } : o);
        storageSet(STORAGE.ORDERS, upd);
        return upd;
      });
    }, 4000);

    setCart([]);
    setCurrentOrder(order);
    setRoute("confirmation");
    return { ok: true };
  };

  const reorder = (order) => {
    const next = [];
    order.items.forEach(i => {
      const p = products.find(pr => pr.id === i.productId);
      const o = p && (optionsOf(p).find(x => x.id === i.optionId) || (i.optionId ? null : optionsOf(p)[0]));
      if (p && o && p.active) {
        const q = Math.min(i.qty, maxQtyFor(next, p, o));
        if (q > 0) next.push({ productId: p.id, optionId: o.id, qty: q });
      }
    });
    setCart(next);
    setCartOpen(true);
    setRoute("store");
    showToast(next.length ? "Items added to cart" : "Those items are no longer available");
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin" color="var(--brand)" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff", fontFamily: "var(--font-body)" }}>
      <style>{CSS}</style>
      <Header settings={settings} cartCount={cartCount} onCartClick={() => setCartOpen(true)} route={route} setRoute={setRoute} isAdmin={isAdmin} />

      <main className="flex-1">
        {route === "store" && <StoreFront products={products} cart={cart} addToCart={addToCart} setCartQty={setCartQty} setRoute={setRoute} />}
        {route === "checkout" && (
          <Checkout cart={cart} products={products} settings={settings} onBack={() => setRoute("store")} onPlaceOrder={placeOrder} showToast={showToast} />
        )}
        {route === "confirmation" && <Confirmation order={currentOrder} setRoute={setRoute} setSelectedOrder={setSelectedOrder} />}
        {route === "track" && (
          <TrackOrder orders={orders} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} reorder={reorder} setRoute={setRoute} />
        )}
        {route === "admin" && (
          isAdmin
            ? <AdminDashboard products={products} orders={orders} settings={settings} saveProducts={saveProducts} saveOrders={saveOrders} saveSettings={saveSettings} onLogout={() => { setIsAdmin(false); setRoute("store"); }} />
            : <AdminLogin onLogin={() => setIsAdmin(true)} />
        )}
      </main>

      <Footer settings={settings} />

      {route === "store" && cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 btn-accent rounded-full h-14 pl-5 pr-6 flex items-center gap-3 shadow-xl max-w-[calc(100%-7rem)]">
          <span className="relative">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: "var(--brand-dark)" }}>{cartCount}</span>
          </span>
          <span className="text-sm font-bold whitespace-nowrap">View Cart · {fmt(cartTotal)}</span>
        </button>
      )}
      <a href="https://wa.me/254700123456" target="_blank" rel="noreferrer" className="fixed bottom-5 left-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl" style={{ background: "#25D366" }} aria-label="Chat on WhatsApp">
        <MessageCircle size={20} color="#fff" />
      </a>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} products={products} updateQty={updateQty} removeItem={removeItem} settings={settings} goCheckout={() => { setCartOpen(false); setRoute("checkout"); }} />
      <Toast toast={toast} />
    </div>
  );
}

/* --------------------------------- CSS ------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,800&family=Manrope:wght@400;500;600;700;800&display=swap');

:root{
  --brand:#2F7A4D;
  --brand-dark:#173C29;
  --brand-light:#E7F4EC;
  --accent:#E2872A;
  --accent-dark:#8A4E10;
  --accent-soft:#FCEEDD;
  --paper:#FBF9F3;
  --line:#DCE8E0;
  --ink:#16261C;
  --font-body:'Manrope', system-ui, sans-serif;
}
.font-display{ font-family:'Fraunces', Georgia, serif; }

.btn-brand{ background:var(--brand); color:#fff; border-radius:9999px; font-weight:700; font-size:14px; transition:filter .15s; }
.btn-brand:hover{ filter:brightness(1.08); }
.btn-accent{ background:var(--accent); color:#fff; border-radius:9999px; font-weight:700; font-size:14px; transition:filter .15s; }
.btn-accent:hover{ filter:brightness(1.06); }
.btn-outline-brand{ background:#fff; color:var(--brand-dark); border:1.5px solid var(--brand); border-radius:9999px; font-weight:600; }
.btn-outline-brand:hover{ background:var(--brand-light); }

.nav-link{ padding:6px 2px; border-bottom:2px solid transparent; }
.nav-link-active{ color:var(--brand-dark); border-color:var(--accent); font-weight:700; }

.input-field{ border:1.5px solid var(--line); border-radius:10px; padding:9px 12px; font-size:14px; color:var(--ink); background:#fff; outline:none; }
.input-field:focus{ border-color:var(--brand); }

.chip{ white-space:nowrap; padding:7px 14px; border-radius:9999px; font-size:13px; font-weight:600; background:#fff; border:1.5px solid var(--line); color:var(--ink); }
.chip-active{ background:var(--brand-dark); border-color:var(--brand-dark); color:#fff; }

.produce-card{ background:#fff; border:1.5px solid var(--line); border-radius:18px; padding:12px; transition:box-shadow .15s, transform .15s; }
.produce-card:hover{ box-shadow:0 8px 24px rgba(23,60,41,0.08); transform:translateY(-2px); }

.produce-tile{ aspect-ratio:1; background:#fff; border:1.5px solid var(--line); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:2.25rem; animation:float 3.2s ease-in-out infinite; box-shadow:0 6px 18px rgba(23,60,41,0.06); }
@keyframes float{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-6px);} }

.stock-badge{ font-size:10px; font-weight:700; padding:3px 8px; border-radius:9999px; }
.stock-in{ background:#E1F3E7; color:#1B6E42; }
.stock-low{ background:var(--accent-soft); color:var(--accent-dark); }
.stock-out{ background:#F1F1EE; color:#8A8A80; }

.price-tag{ display:inline-flex; align-items:center; gap:5px; font-weight:800; font-size:13.5px; color:var(--accent-dark); background:var(--accent-soft); border:1.5px dashed var(--accent); border-radius:8px; padding:3px 9px 3px 7px; transform:rotate(-1.2deg); }
.price-tag-lg{ font-size:16px; padding:5px 12px 5px 9px; }
.price-tag-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); }

.how-card{ background:#fff; border-radius:16px; padding:18px; border:1.5px solid var(--line); }
.how-icon{ width:38px; height:38px; border-radius:10px; background:var(--brand-light); display:flex; align-items:center; justify-content:center; }

@keyframes toastIn{ from{ opacity:0; transform:translate(-50%, 8px);} to{ opacity:1; transform:translate(-50%, 0);} }
.animate-toast{ animation:toastIn .2s ease-out; }
`;
