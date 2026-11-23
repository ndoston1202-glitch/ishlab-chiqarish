'use strict';
/* =========================================================
   Ma'lumotlar bazasi, yordamchi funksiyalar va amallar
   ========================================================= */

const STORE_KEY = 'zavod-dasturi-v1';
const COLLECTIONS = [
  'materials', 'suppliers', 'purchases', 'supplierPayments',
  'products', 'productions', 'writeoffs',
  'customers', 'sales', 'customerPayments',
  'expenses', 'workers'
];

const UNITS = ['kg', 'g', 't', 'l', 'm', 'm²', 'm³', 'dona', 'qop', 'quti', 'rulon', 'pachka'];
const EXPENSE_CATEGORIES = ['Ish haqi', 'Elektr energiya', 'Gaz', 'Suv', 'Ijara', 'Transport', "Ta'mirlash", 'Soliq', 'Reklama', 'Boshqa'];
const WRITEOFF_REASONS = ['Yaroqsiz (brak)', "Muddati o'tgan", 'Shikastlangan', 'Isrof', "Yo'qolgan", 'Boshqa'];

function emptyDB() {
  const d = { settings: { name: 'Mening zavodim', passwordHash: '' } };
  COLLECTIONS.forEach(c => { d[c] = []; });
  return d;
}

function normalizeDB(raw) {
  const d = emptyDB();
  if (raw && typeof raw === 'object') {
    COLLECTIONS.forEach(c => { if (Array.isArray(raw[c])) d[c] = raw[c]; });
    if (raw.settings && typeof raw.settings === 'object') Object.assign(d.settings, raw.settings);
  }
  return d;
}

function loadDB() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) return normalizeDB(JSON.parse(s));
  } catch (e) { console.warn(e); }
  return emptyDB();
}

let db = loadDB();

function saveDB() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    toast("Ma'lumotni saqlab bo'lmadi: " + e.message, 'err');
    return false;
  }
}

/* ---------- Yordamchilar ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const r6 = x => Math.round((+x || 0) * 1e6) / 1e6;
const r2 = x => Math.round((+x || 0) * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const dateStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayStr = () => dateStr(new Date());
const monthStart = () => { const d = new Date(); return dateStr(new Date(d.getFullYear(), d.getMonth(), 1)); };

function addDays(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}
function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return [dateStr(new Date(y, m - 1, 1)), dateStr(new Date(y, m, 0))];
}
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}
function fmt(n, dec = 2) {
  return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: dec }).replace(/ /g, ' ');
}
const money = n => fmt(Math.round(n || 0), 0) + " so'm";

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const byId = (list, id) => list.find(x => x.id === id);
const nameOf = (list, id, fallback = '—') => {
  const x = byId(list, id);
  return x ? x.name : (id ? "(o'chirilgan)" : fallback);
};
const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);
const sum = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0);
const byName = (a, b) => a.name.localeCompare(b.name);
function removeById(list, id) {
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) list.splice(i, 1);
}

/* ---------- Hisob-kitoblar ---------- */
function unitCost(p) {
  return sum(p.recipe || [], r => {
    const m = byId(db.materials, r.materialId);
    return m ? r.qty * m.price : 0;
  });
}
const isLow = m => m.minQty > 0 && m.qty <= m.minQty;
const lowStock = () => db.materials.filter(isLow);
const saleTotal = s => s.qty * s.price;
const purchaseTotal = p => p.qty * p.price;

function supplierDebt(id) {
  const P = db.purchases.filter(p => p.supplierId === id);
  return r2(sum(P, purchaseTotal) - sum(P, p => p.paid) -
    sum(db.supplierPayments.filter(p => p.supplierId === id), p => p.amount));
}
function customerDebt(id) {
  const S = db.sales.filter(s => s.customerId === id);
  return r2(sum(S, saleTotal) - sum(S, s => s.paid) -
    sum(db.customerPayments.filter(p => p.customerId === id), p => p.amount));
}

function materialNeeds(p, units) {
  return (p.recipe || []).map(r => ({ materialId: r.materialId, qty: r6(r.qty * units) }));
}
function shortages(needs) {
  return needs.filter(n => {
    const m = byId(db.materials, n.materialId);
    return !m || m.qty + 1e-9 < n.qty;
  });
}
function shortageText(list) {
  return list.map(n => {
    const m = byId(db.materials, n.materialId);
    return m ? `${m.name}: kerak ${fmt(n.qty)} ${m.unit}, bor ${fmt(m.qty)} ${m.unit}` : "o'chirilgan xomashyo";
  }).join('; ');
}

/** Tanlangan davr uchun moliyaviy ko'rsatkichlar */
function finance(from, to) {
  const S = db.sales.filter(s => inRange(s.date, from, to));
  const revenue = sum(S, saleTotal);
  const cogs = sum(S, s => s.cost);
  const E = db.expenses.filter(e => inRange(e.date, from, to));
  const expenses = sum(E, e => e.amount);
  const P = db.productions.filter(p => inRange(p.date, from, to));
  const lossDefect = sum(P, p => {
    const tot = p.qty + (p.defect || 0);
    return tot ? p.cost * (p.defect || 0) / tot : 0;
  });
  const lossWriteoff = sum(db.writeoffs.filter(w => inRange(w.date, from, to)), w => w.cost);
  const gross = revenue - cogs;
  const net = gross - expenses - lossDefect - lossWriteoff;
  const cashIn = sum(S, s => s.paid) +
    sum(db.customerPayments.filter(p => inRange(p.date, from, to)), p => p.amount);
  const cashOut = sum(db.purchases.filter(p => inRange(p.date, from, to)), p => p.paid) +
    sum(db.supplierPayments.filter(p => inRange(p.date, from, to)), p => p.amount) + expenses;
  return { revenue, cogs, gross, expenses, lossDefect, lossWriteoff, net, cashIn, cashOut, sales: S, productions: P };
}

/* =========================================================
   Amallar. Har biri xato matnini yoki null qaytaradi.
   ========================================================= */

function opPurchase(v) {
  const m = byId(db.materials, v.materialId);
  if (!m) return 'Xomashyoni tanlang';
  if (!(v.qty > 0)) return "Miqdor 0 dan katta bo'lishi kerak";
  if (v.price < 0 || v.paid < 0) return "Summa manfiy bo'lishi mumkin emas";
  const total = v.qty * v.price;
  if (v.paid > total + 0.01) return "To'langan summa jami summadan oshib ketdi";
  if (!v.supplierId && v.paid < total - 0.01) return 'Qarzga olish uchun yetkazib beruvchini tanlang';
  // O'rtacha tortilgan narx (tannarx to'g'ri hisoblanishi uchun)
  m.price = m.qty > 0 ? r2((m.qty * m.price + v.qty * v.price) / (m.qty + v.qty)) : v.price;
  m.qty = r6(m.qty + v.qty);
  db.purchases.push({
    id: uid(), created: Date.now(), date: v.date || todayStr(), materialId: m.id,
    supplierId: v.supplierId || '', qty: v.qty, price: v.price, paid: r2(v.paid), note: v.note || ''
  });
  return null;
}
function undoPurchase(id) {
  const p = byId(db.purchases, id);
  if (!p) return null;
  const m = byId(db.materials, p.materialId);
  if (m) {
    if (m.qty + 1e-9 < p.qty) return `Omborda ${m.name} yetarli emas (bor: ${fmt(m.qty)} ${m.unit}). Bu kirim allaqachon ishlatilgan.`;
    m.qty = r6(m.qty - p.qty);
  }
  removeById(db.purchases, id);
  return null;
}

function opProduce(v) {
  const p = byId(db.products, v.productId);
  if (!p) return 'Mahsulotni tanlang';
  const good = +v.qty || 0, bad = +v.defect || 0;
  if (good < 0 || bad < 0) return "Miqdor manfiy bo'lishi mumkin emas";
  if (good + bad <= 0) return 'Ishlab chiqarilgan miqdorni kiriting';
  const needs = materialNeeds(p, good + bad);
  const sh = shortages(needs);
  if (sh.length) return 'Xomashyo yetarli emas — ' + shortageText(sh);
  let cost = 0;
  needs.forEach(n => {
    const m = byId(db.materials, n.materialId);
    cost += n.qty * m.price;
    m.qty = r6(m.qty - n.qty);
  });
  p.qty = r6(p.qty + good);
  db.productions.push({
    id: uid(), created: Date.now(), date: v.date || todayStr(), productId: p.id,
    qty: good, defect: bad, workerId: v.workerId || '', note: v.note || '', used: needs, cost: r2(cost)
  });
  return null;
}
function undoProduce(id) {
  const pr = byId(db.productions, id);
  if (!pr) return null;
  const p = byId(db.products, pr.productId);
  if (p && p.qty + 1e-9 < pr.qty) return `Omborda ${p.name} yetarli emas (bor: ${fmt(p.qty)}). Mahsulot allaqachon sotilgan.`;
  if (p) p.qty = r6(p.qty - pr.qty);
  (pr.used || []).forEach(n => {
    const m = byId(db.materials, n.materialId);
    if (m) m.qty = r6(m.qty + n.qty);
  });
  removeById(db.productions, id);
  return null;
}

function opWriteoff(v) {
  if (!(v.qty > 0)) return "Miqdor 0 dan katta bo'lishi kerak";
  let cost;
  if (v.type === 'material') {
    const m = byId(db.materials, v.itemId);
    if (!m) return 'Xomashyoni tanlang';
    if (m.qty + 1e-9 < v.qty) return `Omborda ${m.name} yetarli emas (bor: ${fmt(m.qty)} ${m.unit})`;
    cost = v.qty * m.price;
    m.qty = r6(m.qty - v.qty);
  } else {
    const p = byId(db.products, v.itemId);
    if (!p) return 'Mahsulotni tanlang';
    if (p.qty + 1e-9 < v.qty) return `Omborda ${p.name} yetarli emas (bor: ${fmt(p.qty)} ${p.unit})`;
    cost = v.qty * unitCost(p);
    p.qty = r6(p.qty - v.qty);
  }
  db.writeoffs.push({
    id: uid(), created: Date.now(), date: v.date || todayStr(), type: v.type, itemId: v.itemId,
    qty: v.qty, reason: v.reason || '', note: v.note || '', cost: r2(cost)
  });
  return null;
}
function undoWriteoff(id) {
  const w = byId(db.writeoffs, id);
  if (!w) return null;
  const item = byId(w.type === 'material' ? db.materials : db.products, w.itemId);
  if (item) item.qty = r6(item.qty + w.qty);
  removeById(db.writeoffs, id);
  return null;
}

function opSale(v) {
  const p = byId(db.products, v.productId);
  if (!p) return 'Mahsulotni tanlang';
  if (!(v.qty > 0)) return "Miqdor 0 dan katta bo'lishi kerak";
  if (v.price < 0 || v.paid < 0) return "Summa manfiy bo'lishi mumkin emas";
  if (p.qty + 1e-9 < v.qty) return `Omborda ${p.name} yetarli emas (bor: ${fmt(p.qty)} ${p.unit})`;
  const total = v.qty * v.price;
  if (v.paid > total + 0.01) return "To'langan summa jami summadan oshib ketdi";
  if (!v.customerId && v.paid < total - 0.01) return 'Qarzga sotish uchun mijozni tanlang';
  p.qty = r6(p.qty - v.qty);
  db.sales.push({
    id: uid(), created: Date.now(), date: v.date || todayStr(), customerId: v.customerId || '',
    productId: p.id, qty: v.qty, price: v.price, paid: r2(v.paid), cost: r2(unitCost(p) * v.qty), note: v.note || ''
  });
  return null;
}
function undoSale(id) {
  const s = byId(db.sales, id);
  if (!s) return null;
  const p = byId(db.products, s.productId);
  if (p) p.qty = r6(p.qty + s.qty);
  removeById(db.sales, id);
  return null;
}

function opPayment(kind, v) {
  if (!(v.amount > 0)) return "Summa 0 dan katta bo'lishi kerak";
  if (kind === 'customer') {
    if (!byId(db.customers, v.partyId)) return 'Mijozni tanlang';
    db.customerPayments.push({ id: uid(), created: Date.now(), date: v.date || todayStr(), customerId: v.partyId, amount: r2(v.amount), note: v.note || '' });
  } else {
    if (!byId(db.suppliers, v.partyId)) return 'Yetkazib beruvchini tanlang';
    db.supplierPayments.push({ id: uid(), created: Date.now(), date: v.date || todayStr(), supplierId: v.partyId, amount: r2(v.amount), note: v.note || '' });
  }
  return null;
}

function opExpense(v) {
  if (!(v.amount > 0)) return "Summa 0 dan katta bo'lishi kerak";
  if (!v.category) return 'Turini tanlang';
  db.expenses.push({
    id: uid(), created: Date.now(), date: v.date || todayStr(), category: v.category,
    amount: r2(v.amount), workerId: v.workerId || '', note: v.note || ''
  });
  return null;
}

/* ---------- Xodimlar ish haqi ---------- */
function workerStats(w, from, to) {
  const produced = sum(db.productions.filter(p => p.workerId === w.id && inRange(p.date, from, to)), p => p.qty);
  const accrued = w.payType === 'piece' ? produced * (w.rate || 0) : (w.rate || 0);
  const paid = sum(db.expenses.filter(e => e.category === 'Ish haqi' && e.workerId === w.id && inRange(e.date, from, to)), e => e.amount);
  return { produced, accrued: r2(accrued), paid: r2(paid), left: r2(accrued - paid) };
}

/* ---------- Parol ---------- */
async function hashPassword(pass, method) {
  const data = new TextEncoder().encode('zavod:' + pass);
  const useSha = method ? method === 'sha256' : !!(window.crypto && crypto.subtle);
  if (useSha) {
    if (!(window.crypto && crypto.subtle)) throw new Error('Brauzer parolni tekshira olmaydi');
    const buf = await crypto.subtle.digest('SHA-256', data);
    return 'sha256:' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (const b of data) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return 'fnv:' + h.toString(16);
}
async function checkPassword(pass) {
  const stored = db.settings.passwordHash;
  if (!stored) return true;
  const method = stored.split(':')[0];
  return (await hashPassword(pass, method)) === stored;
}
