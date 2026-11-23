'use strict';
/* =========================================================
   Sahifalar
   ========================================================= */

const state = { from: monthStart(), to: todayStr(), wageMonth: todayStr().slice(0, 7) };

function periodBar() {
  return `<div class="period card">
    <label>Dan <input type="date" value="${state.from}" onchange="A.setPeriod(this.value, null)"></label>
    <label>Gacha <input type="date" value="${state.to}" onchange="A.setPeriod(null, this.value)"></label>
    <div class="seg">
      ${btn('Bugun', "A.quickPeriod('today')", 'small')}
      ${btn('7 kun', "A.quickPeriod('week')", 'small')}
      ${btn('Bu oy', "A.quickPeriod('month')", 'small')}
      ${btn('Hammasi', "A.quickPeriod('all')", 'small')}
    </div></div>`;
}
A.setPeriod = (f, t) => { if (f !== null) state.from = f; if (t !== null) state.to = t; render(); };
A.quickPeriod = k => {
  const t = todayStr();
  if (k === 'today') { state.from = t; state.to = t; }
  else if (k === 'week') { state.from = addDays(t, -6); state.to = t; }
  else if (k === 'month') { state.from = monthStart(); state.to = t; }
  else { state.from = ''; state.to = ''; }
  render();
};
const periodLabel = () => (!state.from && !state.to) ? 'barcha vaqt' : `${fmtDate(state.from) || '…'} – ${fmtDate(state.to) || '…'}`;

const delBtn = fn => [`🗑`, fn, "O'chirish", 'danger-ghost'];
const editBtn = fn => [`✎`, fn, 'Tahrirlash'];

/* =========================================================
   BOSH SAHIFA
   ========================================================= */
function renderDashboard() {
  const t = todayStr(), ms = monthStart();
  const f = finance(ms, t);
  const matValue = sum(db.materials, m => m.qty * m.price);
  const prodValue = sum(db.products, p => p.qty * unitCost(p));
  const recv = sum(db.customers, c => Math.max(0, customerDebt(c.id)));
  const pay = sum(db.suppliers, s => Math.max(0, supplierDebt(s.id)));
  const low = lowStock();
  const producedToday = sum(db.productions.filter(p => p.date === t), p => p.qty);

  if (!db.materials.length && !db.products.length) {
    return `<div class="card welcome">
      <h2>Xush kelibsiz! 👋</h2>
      <p>Dastur hozircha bo'sh. Ishni boshlash tartibi:</p>
      <ol>
        <li><a href="#materials">Xomashyo</a> qo'shing (un, shakar, mato, plastik va h.k.)</li>
        <li><a href="#products">Mahsulot</a> qo'shing va uning retseptini (tarkibini) kiriting</li>
        <li><a href="#purchases">Xomashyo kirimi</a> qiling</li>
        <li><a href="#production">Ishlab chiqarish</a>ni yozing — xomashyo avtomatik ayiriladi</li>
        <li><a href="#sales">Sotuv</a> qiling — foyda avtomatik hisoblanadi</li>
      </ol>
      <p class="muted">Avval sinab ko'rmoqchimisiz? Namuna ma'lumotlarni yuklang:</p>
      ${btn("Namuna ma'lumotlarni yuklash", 'A.loadDemo()', 'primary')}
    </div>`;
  }

  // Oxirgi 14 kunlik grafik
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(addDays(t, -i));
  const rev = days.map(d => sum(db.sales.filter(s => s.date === d), saleTotal));
  const prod = days.map(d => sum(db.productions.filter(p => p.date === d), p => p.qty));
  const maxR = Math.max(1, ...rev), maxP = Math.max(1, ...prod);
  const chart = `<div class="chart" role="img" aria-label="Oxirgi 14 kunlik sotuv va ishlab chiqarish">
    ${days.map((d, i) => `<div class="chart-col" title="${fmtDate(d)}&#10;Sotuv: ${money(rev[i])}&#10;Ishlab chiqarildi: ${fmt(prod[i])}">
      <div class="bars"><div class="bar b1" style="height:${(rev[i] / maxR) * 100}%"></div><div class="bar b2" style="height:${(prod[i] / maxP) * 100}%"></div></div>
      <div class="chart-x">${d.slice(8)}</div></div>`).join('')}
  </div>
  <div class="legend"><span><i class="dot b1"></i>Sotuv (so'm)</span><span><i class="dot b2"></i>Ishlab chiqarish (dona)</span></div>`;

  const recent = [
    ...db.productions.map(p => ({ date: p.date, created: p.created, icon: '🏭', text: `${esc(nameOf(db.products, p.productId))} — ${fmt(p.qty)} ishlab chiqarildi${p.defect ? ` (brak: ${fmt(p.defect)})` : ''}` })),
    ...db.sales.map(s => ({ date: s.date, created: s.created, icon: '💰', text: `${esc(nameOf(db.products, s.productId))} — ${fmt(s.qty)} sotildi, ${money(saleTotal(s))}` })),
    ...db.purchases.map(p => ({ date: p.date, created: p.created, icon: '🚚', text: `${esc(nameOf(db.materials, p.materialId))} — ${fmt(p.qty)} kirim` }))
  ].sort(byDateDesc).slice(0, 8);

  return cards([
    card('Bu oy tushum', money(f.revenue), `Yalpi foyda: ${money(f.gross)}`),
    card('Bu oy sof foyda', money(f.net), `Xarajatlar: ${money(f.expenses)}`, f.net >= 0 ? 'good' : 'bad'),
    card('Bugun ishlab chiqarildi', fmt(producedToday), `Bu oy: ${fmt(sum(f.productions, p => p.qty))}`),
    card('Xomashyo ombori', money(matValue), `${db.materials.length} xil xomashyo`),
    card('Tayyor mahsulot ombori', money(prodValue), `${db.products.length} xil mahsulot`),
    card('Mijozlar qarzi', money(recv), `Biz qarzdormiz: ${money(pay)}`, recv > 0 ? 'warn' : '')
  ]) +
  `<div class="grid-2">
    ${section('Oxirgi 14 kun', chart)}
    ${section('Kam qolgan xomashyo', low.length
      ? `<ul class="list">${low.map(m => `<li><span>⚠️ <b>${esc(m.name)}</b></span><span>${fmt(m.qty)} ${esc(m.unit)} <small class="muted">(min ${fmt(m.minQty)})</small> ${btn('Kirim', `A.purchaseForm('${m.id}')`, 'small')}</span></li>`).join('')}</ul>`
      : `<div class="empty small">✅ Barcha xomashyo yetarli</div>`)}
  </div>` +
  section("So'nggi amallar", recent.length
    ? `<ul class="list">${recent.map(r => `<li><span>${r.icon} ${r.text}</span><span class="muted">${fmtDate(r.date)}</span></li>`).join('')}</ul>`
    : `<div class="empty small">Hali amallar yo'q</div>`);
}

/* =========================================================
   XOMASHYO OMBORI
   ========================================================= */
function renderMaterials() {
  const rows = [...db.materials].sort(byName);
  const cols = [
    { label: 'Nomi', get: m => `<b>${esc(m.name)}</b>`, val: m => m.name },
    { label: 'Qoldiq', cls: 'num', get: m => `${fmt(m.qty)} ${esc(m.unit)} ${isLow(m) ? badge('Kam', 'warn') : ''}`, val: m => m.qty },
    { label: 'Birlik', get: m => esc(m.unit) },
    { label: 'Min. qoldiq', cls: 'num', get: m => fmt(m.minQty), val: m => m.minQty },
    { label: "O'rtacha narx", cls: 'num', get: m => money(m.price), val: m => m.price },
    { label: 'Qiymati', cls: 'num', get: m => money(m.qty * m.price), val: m => r2(m.qty * m.price) },
    { label: '', cls: 'actions', noExport: true, get: m => actions([['+ Kirim', `A.purchaseForm('${m.id}')`], editBtn(`A.materialForm('${m.id}')`), delBtn(`A.deleteMaterial('${m.id}')`)]) }
  ];
  const low = lowStock().length;
  return pageHead('Xomashyo qoldiqlari. Kirim qilinganda qoldiq oshadi, ishlab chiqarishda avtomatik kamayadi.',
      btn('+ Yangi xomashyo', 'A.materialForm()', 'primary') + btn('+ Kirim qilish', 'A.purchaseForm()')) +
    cards([
      card('Xomashyo turlari', fmt(db.materials.length)),
      card('Ombor qiymati', money(sum(db.materials, m => m.qty * m.price))),
      card('Kam qolgan', fmt(low), low ? 'Tezroq kirim qiling' : 'Hammasi yetarli', low ? 'warn' : 'good')
    ]) +
    section('Xomashyo ro\'yxati', table('Xomashyo ombori', cols, rows, { search: true, empty: "Hali xomashyo qo'shilmagan" }));
}

A.materialForm = id => {
  const m = id ? byId(db.materials, id) : null;
  openForm({
    title: m ? 'Xomashyoni tahrirlash' : 'Yangi xomashyo',
    fields: [
      { name: 'name', label: 'Nomi', required: true, value: m?.name, full: true },
      { name: 'unit', label: "O'lchov birligi", type: 'select', value: m?.unit || 'kg', options: UNITS },
      { name: 'minQty', label: 'Minimal qoldiq', type: 'number', value: m?.minQty ?? 0, hint: 'Shundan kam qolsa ogohlantiradi' },
      { name: 'qty', label: m ? 'Qoldiq (inventarizatsiya)' : "Boshlang'ich qoldiq", type: 'number', value: m?.qty ?? 0, hint: m ? "Faqat sanoq natijasida tuzatish uchun" : '' },
      { name: 'price', label: m ? "O'rtacha narx (so'm)" : "1 birlik narxi (so'm)", type: 'number', value: m?.price ?? 0 }
    ],
    onSubmit: v => {
      if (db.materials.some(x => x.name.toLowerCase() === v.name.toLowerCase() && x.id !== id)) return 'Bunday nomli xomashyo bor';
      if (v.qty < 0 || v.price < 0 || v.minQty < 0) return "Qiymatlar manfiy bo'lishi mumkin emas";
      if (m) Object.assign(m, v);
      else db.materials.push({ id: uid(), ...v });
    }
  });
};
A.deleteMaterial = id => {
  const m = byId(db.materials, id);
  const usedIn = db.products.filter(p => (p.recipe || []).some(r => r.materialId === id));
  if (usedIn.length) { alert(`«${m.name}» quyidagi mahsulotlar retseptida ishlatilgan: ${usedIn.map(p => p.name).join(', ')}.\nAvval retseptdan olib tashlang.`); return; }
  confirmDo(`«${m.name}» o'chirilsinmi?`, () => removeById(db.materials, id));
};

/* =========================================================
   XOMASHYO KIRIMI
   ========================================================= */
function renderPurchases() {
  const rows = db.purchases.filter(p => inRange(p.date, state.from, state.to)).sort(byDateDesc);
  const cols = [
    { label: 'Sana', get: p => fmtDate(p.date), val: p => p.date },
    { label: 'Xomashyo', get: p => `<b>${esc(nameOf(db.materials, p.materialId))}</b>` },
    { label: 'Yetkazib beruvchi', get: p => esc(nameOf(db.suppliers, p.supplierId)) },
    { label: 'Miqdor', cls: 'num', get: p => `${fmt(p.qty)} ${esc(byId(db.materials, p.materialId)?.unit || '')}`, val: p => p.qty },
    { label: 'Narx', cls: 'num', get: p => money(p.price), val: p => p.price },
    { label: 'Jami', cls: 'num', get: p => money(purchaseTotal(p)), val: p => r2(purchaseTotal(p)) },
    { label: "To'langan", cls: 'num', get: p => money(p.paid) + (p.paid < purchaseTotal(p) - 0.01 ? ' ' + badge('Qarz', 'warn') : ''), val: p => p.paid },
    { label: 'Izoh', get: p => esc(p.note) },
    { label: '', cls: 'actions', noExport: true, get: p => actions([delBtn(`A.deletePurchase('${p.id}')`)]) }
  ];
  const total = sum(rows, purchaseTotal), paid = sum(rows, p => p.paid);
  return pageHead('Yetkazib beruvchilardan kelgan xomashyo. Kirim qilinganda ombor qoldig\'i oshadi.',
      btn('+ Kirim qilish', 'A.purchaseForm()', 'primary')) +
    periodBar() +
    cards([
      card('Kirimlar soni', fmt(rows.length), periodLabel()),
      card('Jami summa', money(total)),
      card("To'langan", money(paid)),
      card('Qarzga olingan', money(total - paid), '', total - paid > 0 ? 'warn' : '')
    ]) +
    section('Kirimlar', table('Xomashyo kirimi', cols, rows, { search: true, empty: "Bu davrda kirim yo'q" }));
}

A.purchaseForm = materialId => {
  if (!db.materials.length) { alert("Avval xomashyo qo'shing."); location.hash = 'materials'; return; }
  const first = materialId ? byId(db.materials, materialId) : [...db.materials].sort(byName)[0];
  openForm({
    title: 'Xomashyo kirimi',
    fields: [
      { name: 'materialId', label: 'Xomashyo', type: 'select', value: first.id, options: listOpts([...db.materials].sort(byName), m => `${m.name} (${m.unit})`), full: true },
      { name: 'supplierId', label: 'Yetkazib beruvchi', type: 'select', value: '', options: listOpts([...db.suppliers].sort(byName), s => s.name, '— Tanlanmagan —'), full: true },
      { name: 'qty', label: 'Miqdor', type: 'number', required: true },
      { name: 'price', label: "1 birlik narxi (so'm)", type: 'number', value: first.price || '', required: true },
      { name: 'paid', label: "To'langan summa (so'm)", type: 'number', hint: "Qarzga olingan bo'lsa kamroq yozing" },
      { name: 'date', label: 'Sana', type: 'date', value: todayStr() },
      { name: 'note', label: 'Izoh', full: true },
      { type: 'html', html: '<div class="calc full" id="calc"></div>' }
    ],
    submitText: 'Kirim qilish',
    onInit: form => {
      let touched = false;
      const E = form.elements;
      const upd = () => {
        const total = (+E.qty.value || 0) * (+E.price.value || 0);
        if (!touched) E.paid.value = total ? r2(total) : '';
        const m = byId(db.materials, E.materialId.value);
        form.querySelector('#calc').innerHTML = `Jami: <b>${money(total)}</b> · Hozirgi qoldiq: ${fmt(m.qty)} ${esc(m.unit)}`;
      };
      E.materialId.onchange = () => { const m = byId(db.materials, E.materialId.value); E.price.value = m.price || ''; upd(); };
      E.qty.oninput = E.price.oninput = upd;
      E.paid.oninput = () => { touched = true; };
      upd();
    },
    onSubmit: v => opPurchase(v)
  });
};
A.deletePurchase = id => confirmDo("Bu kirim bekor qilinsinmi? Xomashyo qoldig'i kamayadi.", () => undoPurchase(id), 'Kirim bekor qilindi');

/* =========================================================
   YETKAZIB BERUVCHILAR
   ========================================================= */
function renderSuppliers() {
  const rows = [...db.suppliers].sort(byName);
  const cols = [
    { label: 'Nomi', get: s => `<b>${esc(s.name)}</b>`, val: s => s.name },
    { label: 'Telefon', get: s => s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : '', val: s => s.phone },
    { label: 'Jami xarid', cls: 'num', get: s => money(sum(db.purchases.filter(p => p.supplierId === s.id), purchaseTotal)), val: s => r2(sum(db.purchases.filter(p => p.supplierId === s.id), purchaseTotal)) },
    { label: 'Bizning qarz', cls: 'num', get: s => { const d = supplierDebt(s.id); return d > 0 ? badge(money(d), 'warn') : (d < 0 ? badge('Avans: ' + money(-d), 'info') : badge("Qarz yo'q", 'good')); }, val: s => supplierDebt(s.id) },
    { label: 'Izoh', get: s => esc(s.note) },
    { label: '', cls: 'actions', noExport: true, get: s => actions([["💵 To'lash", `A.paymentForm('supplier','${s.id}')`], editBtn(`A.partyForm('supplier','${s.id}')`), delBtn(`A.deleteParty('supplier','${s.id}')`)]) }
  ];
  const pays = db.supplierPayments.filter(p => inRange(p.date, state.from, state.to)).sort(byDateDesc);
  const payCols = [
    { label: 'Sana', get: p => fmtDate(p.date), val: p => p.date },
    { label: 'Yetkazib beruvchi', get: p => esc(nameOf(db.suppliers, p.supplierId)) },
    { label: 'Summa', cls: 'num', get: p => money(p.amount), val: p => p.amount },
    { label: 'Izoh', get: p => esc(p.note) },
    { label: '', cls: 'actions', noExport: true, get: p => actions([delBtn(`A.deletePayment('supplier','${p.id}')`)]) }
  ];
  const debt = sum(db.suppliers, s => Math.max(0, supplierDebt(s.id)));
  return pageHead('Xomashyo yetkazib beruvchilar va ularga bo\'lgan qarzlar.',
      btn('+ Yangi yetkazib beruvchi', "A.partyForm('supplier')", 'primary') + btn("💵 To'lov qilish", "A.paymentForm('supplier')")) +
    cards([card('Yetkazib beruvchilar', fmt(db.suppliers.length)), card('Bizning jami qarz', money(debt), '', debt > 0 ? 'warn' : 'good')]) +
    section("Ro'yxat", table('Yetkazib beruvchilar', cols, rows, { search: true, empty: "Hali yetkazib beruvchi qo'shilmagan" })) +
    periodBar() +
    section("To'lovlar tarixi", table("Yetkazib beruvchilarga to'lovlar", payCols, pays, { empty: "Bu davrda to'lov yo'q" }));
}

/* =========================================================
   MIJOZLAR
   ========================================================= */
function renderCustomers() {
  const rows = [...db.customers].sort(byName);
  const cols = [
    { label: 'Nomi', get: c => `<b>${esc(c.name)}</b>`, val: c => c.name },
    { label: 'Telefon', get: c => c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '', val: c => c.phone },
    { label: 'Jami xarid', cls: 'num', get: c => money(sum(db.sales.filter(s => s.customerId === c.id), saleTotal)), val: c => r2(sum(db.sales.filter(s => s.customerId === c.id), saleTotal)) },
    { label: 'Qarzi', cls: 'num', get: c => { const d = customerDebt(c.id); return d > 0 ? badge(money(d), 'warn') : (d < 0 ? badge('Avans: ' + money(-d), 'info') : badge("Qarz yo'q", 'good')); }, val: c => customerDebt(c.id) },
    { label: 'Izoh', get: c => esc(c.note) },
    { label: '', cls: 'actions', noExport: true, get: c => actions([["💵 To'lov", `A.paymentForm('customer','${c.id}')`], editBtn(`A.partyForm('customer','${c.id}')`), delBtn(`A.deleteParty('customer','${c.id}')`)]) }
  ];
  const pays = db.customerPayments.filter(p => inRange(p.date, state.from, state.to)).sort(byDateDesc);
  const payCols = [
    { label: 'Sana', get: p => fmtDate(p.date), val: p => p.date },
    { label: 'Mijoz', get: p => esc(nameOf(db.customers, p.customerId)) },
    { label: 'Summa', cls: 'num', get: p => money(p.amount), val: p => p.amount },
    { label: 'Izoh', get: p => esc(p.note) },
    { label: '', cls: 'actions', noExport: true, get: p => actions([delBtn(`A.deletePayment('customer','${p.id}')`)]) }
  ];
  const debt = sum(db.customers, c => Math.max(0, customerDebt(c.id)));
  return pageHead('Mijozlar, ularning qarzlari va to\'lovlari.',
      btn('+ Yangi mijoz', "A.partyForm('customer')", 'primary') + btn("💵 To'lov qabul qilish", "A.paymentForm('customer')")) +
    cards([card('Mijozlar', fmt(db.customers.length)), card('Mijozlarning jami qarzi', money(debt), '', debt > 0 ? 'warn' : 'good')]) +
    section("Ro'yxat", table('Mijozlar', cols, rows, { search: true, empty: "Hali mijoz qo'shilmagan" })) +
    periodBar() +
    section("Qabul qilingan to'lovlar", table("Mijozlardan to'lovlar", payCols, pays, { empty: "Bu davrda to'lov yo'q" }));
}

/* ---------- Mijoz / yetkazib beruvchi umumiy formalari ---------- */
const partyList = kind => kind === 'customer' ? db.customers : db.suppliers;
const partyWord = kind => kind === 'customer' ? 'mijoz' : 'yetkazib beruvchi';

A.partyForm = (kind, id) => {
  const x = id ? byId(partyList(kind), id) : null;
  openForm({
    title: x ? `${x.name} — tahrirlash` : `Yangi ${partyWord(kind)}`,
    fields: [
      { name: 'name', label: 'Nomi / F.I.Sh.', required: true, value: x?.name, full: true },
      { name: 'phone', label: 'Telefon', type: 'tel', value: x?.phone },
      { name: 'note', label: 'Izoh (manzil va h.k.)', value: x?.note }
    ],
    onSubmit: v => {
      if (partyList(kind).some(p => p.name.toLowerCase() === v.name.toLowerCase() && p.id !== id)) return 'Bunday nom allaqachon bor';
      if (x) Object.assign(x, v); else partyList(kind).push({ id: uid(), ...v });
    }
  });
};
A.deleteParty = (kind, id) => {
  const x = byId(partyList(kind), id);
  const used = kind === 'customer' ? db.sales.some(s => s.customerId === id) : db.purchases.some(p => p.supplierId === id);
  if (used) { alert(`«${x.name}» bilan bog'liq ${kind === 'customer' ? 'sotuvlar' : 'kirimlar'} bor. O'chirib bo'lmaydi.`); return; }
  confirmDo(`«${x.name}» o'chirilsinmi?`, () => removeById(partyList(kind), id));
};
A.paymentForm = (kind, id) => {
  const list = [...partyList(kind)].sort(byName);
  if (!list.length) { alert(`Avval ${partyWord(kind)} qo'shing.`); return; }
  const debtOf = kind === 'customer' ? customerDebt : supplierDebt;
  const sel = id || (list.find(x => debtOf(x.id) > 0) || list[0]).id;
  openForm({
    title: kind === 'customer' ? "Mijozdan to'lov qabul qilish" : "Yetkazib beruvchiga to'lov",
    fields: [
      { name: 'partyId', label: kind === 'customer' ? 'Mijoz' : 'Yetkazib beruvchi', type: 'select', value: sel, options: listOpts(list, x => `${x.name} (qarz: ${money(debtOf(x.id))})`), full: true },
      { name: 'amount', label: "Summa (so'm)", type: 'number', required: true, value: Math.max(0, debtOf(sel)) || '' },
      { name: 'date', label: 'Sana', type: 'date', value: todayStr() },
      { name: 'note', label: 'Izoh', full: true }
    ],
    onInit: form => { form.elements.partyId.onchange = () => { form.elements.amount.value = Math.max(0, debtOf(form.elements.partyId.value)) || ''; }; },
    onSubmit: v => opPayment(kind, v)
  });
};
A.deletePayment = (kind, id) => confirmDo("Bu to'lov o'chirilsinmi?", () => removeById(kind === 'customer' ? db.customerPayments : db.supplierPayments, id));

/* =========================================================
   MAHSULOTLAR (tayyor mahsulot ombori + retsept)
   ========================================================= */
function recipeText(p) {
  if (!p.recipe || !p.recipe.length) return '<span class="muted">Retsept kiritilmagan</span>';
  return p.recipe.map(r => {
    const m = byId(db.materials, r.materialId);
    return m ? `${esc(m.name)} ${fmt(r.qty, 4)} ${esc(m.unit)}` : "(o'chirilgan)";
  }).join(', ');
}

function renderProducts() {
  const rows = [...db.products].sort(byName);
  const cols = [
    { label: 'Mahsulot', get: p => `<b>${esc(p.name)}</b>`, val: p => p.name },
    { label: 'Omborda', cls: 'num', get: p => `${fmt(p.qty)} ${esc(p.unit)}`, val: p => p.qty },
    { label: 'Tannarx', cls: 'num', get: p => money(unitCost(p)), val: p => r2(unitCost(p)) },
    { label: 'Sotuv narxi', cls: 'num', get: p => money(p.price), val: p => p.price },
    { label: 'Foyda (1 birlik)', cls: 'num', get: p => { const pr = p.price - unitCost(p); const pc = p.price ? Math.round(pr / p.price * 100) : 0; return `<span class="${pr < 0 ? 'neg' : 'pos'}">${money(pr)}</span> <small class="muted">${pc}%</small>`; }, val: p => r2(p.price - unitCost(p)) },
    { label: 'Ombor qiymati', cls: 'num', get: p => money(p.qty * unitCost(p)), val: p => r2(p.qty * unitCost(p)) },
    { label: 'Retsept (1 birlik uchun)', cls: 'wrap', get: p => recipeText(p), val: p => stripHtml(recipeText(p)) },
    { label: '', cls: 'actions', noExport: true, get: p => actions([['🏭 Ishlab chiqarish', `A.produceForm('${p.id}')`], editBtn(`A.productForm('${p.id}')`), delBtn(`A.deleteProduct('${p.id}')`)]) }
  ];
  return pageHead("Tayyor mahsulotlar, ularning ombordagi qoldig'i, retsepti va tannarxi. Tannarx xomashyo narxidan avtomatik hisoblanadi.",
      btn('+ Yangi mahsulot', 'A.productForm()', 'primary')) +
    cards([
      card('Mahsulot turlari', fmt(db.products.length)),
      card('Tayyor mahsulot qiymati (tannarxda)', money(sum(db.products, p => p.qty * unitCost(p)))),
      card('Sotuv narxida qiymati', money(sum(db.products, p => p.qty * p.price)))
    ]) +
    section('Mahsulotlar', table('Mahsulotlar', cols, rows, { search: true, empty: "Hali mahsulot qo'shilmagan" }));
}

function recipeRowHtml(r = {}) {
  return `<div class="recipe-row">
    <select class="r-mat" aria-label="Xomashyo">${[...db.materials].sort(byName).map(m => `<option value="${m.id}"${m.id === r.materialId ? ' selected' : ''}>${esc(m.name)} (${esc(m.unit)})</option>`).join('')}</select>
    <input class="r-qty" type="number" inputmode="decimal" step="any" min="0" placeholder="Miqdor" aria-label="Miqdor" value="${r.qty ?? ''}">
    <button type="button" class="icon-btn" onclick="this.parentElement.remove(); A.recipeCost()" aria-label="Olib tashlash">✕</button></div>`;
}
A.addRecipeRow = () => { document.getElementById('recipe-rows').insertAdjacentHTML('beforeend', recipeRowHtml()); A.recipeCost(); };
function readRecipe() {
  const map = new Map();
  document.querySelectorAll('#recipe-rows .recipe-row').forEach(row => {
    const id = row.querySelector('.r-mat').value;
    const q = parseFloat(row.querySelector('.r-qty').value.replace(',', '.'));
    if (id && q > 0) map.set(id, r6((map.get(id) || 0) + q));
  });
  return [...map].map(([materialId, qty]) => ({ materialId, qty }));
}
A.recipeCost = () => {
  const el = document.getElementById('recipe-cost');
  if (el) el.innerHTML = `1 birlik tannarxi: <b>${money(unitCost({ recipe: readRecipe() }))}</b>`;
};

A.productForm = id => {
  const p = id ? byId(db.products, id) : null;
  const recipeHtml = db.materials.length
    ? `<div class="field full"><span>Retsept — 1 birlik mahsulot uchun ketadigan xomashyo</span>
        <div id="recipe-rows">${(p?.recipe || []).map(recipeRowHtml).join('')}</div>
        <div class="recipe-foot">${btn("+ Xomashyo qo'shish", 'A.addRecipeRow()', 'small')}<span id="recipe-cost" class="muted"></span></div></div>`
    : `<div class="field full"><span>Retsept</span><p class="muted">Retsept kiritish uchun avval <a href="#materials" onclick="closeModal()">xomashyo</a> qo'shing.</p></div>`;
  openForm({
    title: p ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot',
    wide: true,
    fields: [
      { name: 'name', label: 'Mahsulot nomi', required: true, value: p?.name, full: true },
      { name: 'unit', label: "O'lchov birligi", type: 'select', value: p?.unit || 'dona', options: UNITS },
      { name: 'price', label: "Sotuv narxi (so'm)", type: 'number', value: p?.price ?? '' },
      { name: 'qty', label: p ? 'Omborda (inventarizatsiya)' : "Boshlang'ich qoldiq", type: 'number', value: p?.qty ?? 0 },
      { type: 'html', html: recipeHtml }
    ],
    onInit: form => {
      if (!p && db.materials.length) A.addRecipeRow();
      form.addEventListener('input', e => { if (e.target.closest('#recipe-rows')) A.recipeCost(); });
      form.addEventListener('change', e => { if (e.target.closest('#recipe-rows')) A.recipeCost(); });
      A.recipeCost();
    },
    onSubmit: v => {
      if (db.products.some(x => x.name.toLowerCase() === v.name.toLowerCase() && x.id !== id)) return 'Bunday nomli mahsulot bor';
      if (v.qty < 0 || v.price < 0) return "Qiymatlar manfiy bo'lishi mumkin emas";
      const recipe = db.materials.length ? readRecipe() : (p?.recipe || []);
      if (p) Object.assign(p, v, { recipe });
      else db.products.push({ id: uid(), ...v, recipe });
    }
  });
};
A.deleteProduct = id => {
  const p = byId(db.products, id);
  confirmDo(`«${p.name}» o'chirilsinmi? Tarixdagi yozuvlar saqlanib qoladi.`, () => removeById(db.products, id));
};

/* =========================================================
   ISHLAB CHIQARISH
   ========================================================= */
function renderProduction() {
  const rows = db.productions.filter(p => inRange(p.date, state.from, state.to)).sort(byDateDesc);
  const cols = [
    { label: 'Sana', get: p => fmtDate(p.date), val: p => p.date },
    { label: 'Mahsulot', get: p => `<b>${esc(nameOf(db.products, p.productId))}</b>` },
    { label: 'Sifatli', cls: 'num', get: p => fmt(p.qty), val: p => p.qty },
    { label: 'Brak', cls: 'num', get: p => p.defect ? `<span class="neg">${fmt(p.defect)}</span>` : '0', val: p => p.defect || 0 },
    { label: 'Xodim', get: p => esc(nameOf(db.workers, p.workerId)) },
    { label: 'Xomashyo sarfi', cls: 'num', get: p => money(p.cost), val: p => p.cost },
    { label: '1 birlik tannarxi', cls: 'num', get: p => p.qty ? money(p.cost / p.qty) : '—', val: p => p.qty ? r2(p.cost / p.qty) : 0 },
    { label: 'Izoh', get: p => esc(p.note) },
    { label: '', cls: 'actions', noExport: true, get: p => actions([delBtn(`A.deleteProduction('${p.id}')`)]) }
  ];
  const good = sum(rows, p => p.qty), bad = sum(rows, p => p.defect || 0);
  const byProduct = {};
  rows.forEach(p => { (byProduct[p.productId] ||= { id: p.productId, qty: 0, defect: 0, cost: 0 }); const b = byProduct[p.productId]; b.qty += p.qty; b.defect += p.defect || 0; b.cost += p.cost; });
  const sumCols = [
    { label: 'Mahsulot', get: b => `<b>${esc(nameOf(db.products, b.id))}</b>` },
    { label: 'Sifatli', cls: 'num', get: b => fmt(b.qty), val: b => b.qty },
    { label: 'Brak', cls: 'num', get: b => fmt(b.defect), val: b => b.defect },
    { label: 'Brak %', cls: 'num', get: b => fmt(b.defect / Math.max(1, b.qty + b.defect) * 100, 1) + '%', val: b => r2(b.defect / Math.max(1, b.qty + b.defect) * 100) },
    { label: 'Xomashyo sarfi', cls: 'num', get: b => money(b.cost), val: b => r2(b.cost) }
  ];
  return pageHead('Ishlab chiqarish jurnali. Yozilganda retsept bo\'yicha xomashyo ombordan avtomatik ayiriladi, tayyor mahsulot omborga qo\'shiladi.',
      btn('+ Ishlab chiqarishni yozish', 'A.produceForm()', 'primary')) +
    periodBar() +
    cards([
      card('Sifatli mahsulot', fmt(good), periodLabel()),
      card('Brak', fmt(bad), `${fmt(bad / Math.max(1, good + bad) * 100, 1)}% umumiydan`, bad ? 'warn' : ''),
      card('Xomashyo sarfi', money(sum(rows, p => p.cost)))
    ]) +
    section("Mahsulotlar bo'yicha", table("Ishlab chiqarish (jamlanma)", sumCols, Object.values(byProduct), { empty: "Bu davrda ishlab chiqarish yo'q" })) +
    section('Jurnal', table('Ishlab chiqarish jurnali', cols, rows, { search: true, empty: "Bu davrda ishlab chiqarish yo'q" }));
}

A.produceForm = productId => {
  if (!db.products.length) { alert("Avval mahsulot qo'shing."); location.hash = 'products'; return; }
  const list = [...db.products].sort(byName);
  openForm({
    title: 'Ishlab chiqarishni yozish',
    wide: true,
    fields: [
      { name: 'productId', label: 'Mahsulot', type: 'select', value: productId || list[0].id, options: listOpts(list, p => `${p.name} (omborda: ${fmt(p.qty)} ${p.unit})`), full: true },
      { name: 'qty', label: 'Sifatli mahsulot miqdori', type: 'number', required: true },
      { name: 'defect', label: 'Brak (yaroqsiz) miqdori', type: 'number', value: 0, hint: 'Brakka ham xomashyo sarflanadi' },
      { name: 'workerId', label: "Mas'ul xodim", type: 'select', value: '', options: listOpts([...db.workers].sort(byName), w => w.name, '— Tanlanmagan —') },
      { name: 'date', label: 'Sana', type: 'date', value: todayStr() },
      { name: 'note', label: 'Izoh (smena, partiya raqami va h.k.)', full: true },
      { type: 'html', html: '<div class="calc full" id="calc"></div>' }
    ],
    submitText: 'Yozish',
    onInit: form => {
      const E = form.elements;
      const upd = () => {
        const p = byId(db.products, E.productId.value);
        const units = (+E.qty.value || 0) + (+E.defect.value || 0);
        const needs = materialNeeds(p, units);
        const box = form.querySelector('#calc');
        if (!needs.length) { box.innerHTML = `<span class="muted">Bu mahsulotga retsept kiritilmagan — xomashyo ayirilmaydi.</span>`; return; }
        box.innerHTML = `<b>Kerakli xomashyo (${fmt(units)} birlik uchun):</b>
          <table class="mini"><tr><th>Xomashyo</th><th class="num">Kerak</th><th class="num">Omborda</th></tr>
          ${needs.map(n => { const m = byId(db.materials, n.materialId); const ok = m && m.qty + 1e-9 >= n.qty;
            return `<tr class="${ok ? '' : 'short'}"><td>${esc(m ? m.name : "(o'chirilgan)")}</td><td class="num">${fmt(n.qty)} ${esc(m?.unit || '')}</td><td class="num">${m ? fmt(m.qty) : 0} ${ok ? '✅' : '❌'}</td></tr>`; }).join('')}
          </table>Xomashyo qiymati: <b>${money(sum(needs, n => n.qty * (byId(db.materials, n.materialId)?.price || 0)))}</b>`;
      };
      E.productId.onchange = upd;
      E.qty.oninput = E.defect.oninput = upd;
      upd();
    },
    onSubmit: v => opProduce(v)
  });
};
A.deleteProduction = id => confirmDo("Bu yozuv bekor qilinsinmi? Xomashyo omborga qaytariladi, tayyor mahsulot ayiriladi.", () => undoProduce(id), 'Bekor qilindi');

/* =========================================================
   BRAK VA ISROF
   ========================================================= */
function renderDefects() {
  const W = db.writeoffs.filter(w => inRange(w.date, state.from, state.to)).sort(byDateDesc);
  const P = db.productions.filter(p => p.defect > 0 && inRange(p.date, state.from, state.to)).sort(byDateDesc);
  const loss = p => p.cost * p.defect / (p.qty + p.defect);
  const wItem = w => w.type === 'material' ? byId(db.materials, w.itemId) : byId(db.products, w.itemId);
  const wCols = [
    { label: 'Sana', get: w => fmtDate(w.date), val: w => w.date },
    { label: 'Turi', get: w => w.type === 'material' ? badge('Xomashyo', 'info') : badge('Mahsulot', ''), val: w => w.type === 'material' ? 'Xomashyo' : 'Mahsulot' },
    { label: 'Nomi', get: w => `<b>${esc(nameOf(w.type === 'material' ? db.materials : db.products, w.itemId))}</b>` },
    { label: 'Miqdor', cls: 'num', get: w => `${fmt(w.qty)} ${esc(wItem(w)?.unit || '')}`, val: w => w.qty },
    { label: 'Sabab', get: w => esc(w.reason) },
    { label: 'Zarar', cls: 'num', get: w => `<span class="neg">${money(w.cost)}</span>`, val: w => w.cost },
    { label: 'Izoh', get: w => esc(w.note) },
    { label: '', cls: 'actions', noExport: true, get: w => actions([delBtn(`A.deleteWriteoff('${w.id}')`)]) }
  ];
  const pCols = [
    { label: 'Sana', get: p => fmtDate(p.date), val: p => p.date },
    { label: 'Mahsulot', get: p => `<b>${esc(nameOf(db.products, p.productId))}</b>` },
    { label: 'Brak', cls: 'num', get: p => fmt(p.defect), val: p => p.defect },
    { label: 'Brak %', cls: 'num', get: p => fmt(p.defect / (p.qty + p.defect) * 100, 1) + '%', val: p => r2(p.defect / (p.qty + p.defect) * 100) },
    { label: 'Xodim', get: p => esc(nameOf(db.workers, p.workerId)) },
    { label: 'Zarar', cls: 'num', get: p => `<span class="neg">${money(loss(p))}</span>`, val: p => r2(loss(p)) }
  ];
  const lossW = sum(W, w => w.cost), lossP = sum(P, loss);
  return pageHead("Ishlab chiqarishdagi brak hamda ombordan hisobdan chiqarilgan (yaroqsiz, muddati o'tgan, isrof bo'lgan) xomashyo va mahsulotlar.",
      btn('+ Hisobdan chiqarish', 'A.writeoffForm()', 'primary')) +
    periodBar() +
    cards([
      card('Ishlab chiqarishdagi brak', fmt(sum(P, p => p.defect)), `Zarar: ${money(lossP)}`, lossP ? 'warn' : ''),
      card('Hisobdan chiqarilgan', fmt(W.length) + ' ta', `Zarar: ${money(lossW)}`, lossW ? 'warn' : ''),
      card('Jami zarar', money(lossW + lossP), periodLabel(), lossW + lossP ? 'bad' : 'good')
    ]) +
    section('Hisobdan chiqarishlar (isrof, yaroqsiz)', table('Hisobdan chiqarishlar', wCols, W, { search: true, empty: "Bu davrda yozuv yo'q" })) +
    section('Ishlab chiqarishdagi brak', table('Ishlab chiqarishdagi brak', pCols, P, { empty: "Bu davrda brak yo'q 👍" }));
}

A.writeoffForm = () => {
  if (!db.materials.length && !db.products.length) { alert("Ombor bo'sh."); return; }
  const optsFor = type => type === 'material'
    ? listOpts([...db.materials].sort(byName), m => `${m.name} (bor: ${fmt(m.qty)} ${m.unit})`)
    : listOpts([...db.products].sort(byName), p => `${p.name} (bor: ${fmt(p.qty)} ${p.unit})`);
  const startType = db.materials.length ? 'material' : 'product';
  openForm({
    title: 'Hisobdan chiqarish (brak / isrof)',
    fields: [
      { name: 'type', label: 'Nima', type: 'select', value: startType, options: [{ value: 'material', label: 'Xomashyo' }, { value: 'product', label: 'Tayyor mahsulot' }] },
      { name: 'itemId', label: 'Nomi', type: 'select', options: optsFor(startType), full: true },
      { name: 'qty', label: 'Miqdor', type: 'number', required: true },
      { name: 'reason', label: 'Sabab', type: 'select', options: WRITEOFF_REASONS },
      { name: 'date', label: 'Sana', type: 'date', value: todayStr() },
      { name: 'note', label: 'Izoh', full: true }
    ],
    submitText: 'Hisobdan chiqarish',
    onInit: form => {
      const E = form.elements;
      E.type.onchange = () => {
        E.itemId.innerHTML = optsFor(E.type.value).map(o => `<option value="${o.value}">${esc(o.label)}</option>`).join('');
      };
    },
    onSubmit: v => opWriteoff(v)
  });
};
A.deleteWriteoff = id => confirmDo('Bu yozuv bekor qilinsinmi? Miqdor omborga qaytariladi.', () => undoWriteoff(id), 'Bekor qilindi');

/* =========================================================
   SOTUV
   ========================================================= */
function renderSales() {
  const rows = db.sales.filter(s => inRange(s.date, state.from, state.to)).sort(byDateDesc);
  const cols = [
    { label: 'Sana', get: s => fmtDate(s.date), val: s => s.date },
    { label: 'Mijoz', get: s => esc(nameOf(db.customers, s.customerId, 'Naqd mijoz')) },
    { label: 'Mahsulot', get: s => `<b>${esc(nameOf(db.products, s.productId))}</b>` },
    { label: 'Miqdor', cls: 'num', get: s => `${fmt(s.qty)} ${esc(byId(db.products, s.productId)?.unit || '')}`, val: s => s.qty },
    { label: 'Narx', cls: 'num', get: s => money(s.price), val: s => s.price },
    { label: 'Jami', cls: 'num', get: s => `<b>${money(saleTotal(s))}</b>`, val: s => r2(saleTotal(s)) },
    { label: "To'langan", cls: 'num', get: s => money(s.paid) + (s.paid < saleTotal(s) - 0.01 ? ' ' + badge('Qarz', 'warn') : ''), val: s => s.paid },
    { label: 'Foyda', cls: 'num', get: s => { const pr = saleTotal(s) - s.cost; return `<span class="${pr < 0 ? 'neg' : 'pos'}">${money(pr)}</span>`; }, val: s => r2(saleTotal(s) - s.cost) },
    { label: 'Izoh', get: s => esc(s.note) },
    { label: '', cls: 'actions', noExport: true, get: s => actions([delBtn(`A.deleteSale('${s.id}')`)]) }
  ];
  const total = sum(rows, saleTotal), paid = sum(rows, s => s.paid), profit = total - sum(rows, s => s.cost);
  return pageHead("Mahsulot sotuvlari. Sotilganda tayyor mahsulot omboridan avtomatik ayiriladi. Qarzga sotilsa mijoz qarzi oshadi.",
      btn('+ Yangi sotuv', 'A.saleForm()', 'primary')) +
    periodBar() +
    cards([
      card('Tushum', money(total), `${rows.length} ta sotuv · ${periodLabel()}`),
      card('Yalpi foyda', money(profit), total ? `Rentabellik: ${fmt(profit / total * 100, 1)}%` : '', profit >= 0 ? 'good' : 'bad'),
      card("To'langan", money(paid)),
      card('Qarzga sotilgan', money(total - paid), '', total - paid > 0 ? 'warn' : '')
    ]) +
    section('Sotuvlar', table('Sotuvlar', cols, rows, { search: true, empty: "Bu davrda sotuv yo'q" }));
}

A.saleForm = () => {
  const list = [...db.products].sort(byName);
  if (!list.length) { alert("Avval mahsulot qo'shing."); location.hash = 'products'; return; }
  const first = list.find(p => p.qty > 0) || list[0];
  openForm({
    title: 'Yangi sotuv',
    fields: [
      { name: 'customerId', label: 'Mijoz', type: 'select', value: '', options: listOpts([...db.customers].sort(byName), c => c.name, '— Naqd mijoz —'), full: true, hint: "Qarzga sotish uchun mijozni tanlang. Yangi mijozni «Mijozlar» bo'limida qo'shing." },
      { name: 'productId', label: 'Mahsulot', type: 'select', value: first.id, options: listOpts(list, p => `${p.name} (omborda: ${fmt(p.qty)} ${p.unit})`), full: true },
      { name: 'qty', label: 'Miqdor', type: 'number', required: true },
      { name: 'price', label: "1 birlik narxi (so'm)", type: 'number', required: true, value: first.price || '' },
      { name: 'paid', label: "To'langan summa (so'm)", type: 'number', hint: "Qarzga bo'lsa kamroq yozing" },
      { name: 'date', label: 'Sana', type: 'date', value: todayStr() },
      { name: 'note', label: 'Izoh', full: true },
      { type: 'html', html: '<div class="calc full" id="calc"></div>' }
    ],
    submitText: 'Sotish',
    onInit: form => {
      let touched = false;
      const E = form.elements;
      const upd = () => {
        const p = byId(db.products, E.productId.value);
        const qty = +E.qty.value || 0, total = qty * (+E.price.value || 0);
        if (!touched) E.paid.value = total ? r2(total) : '';
        const profit = total - qty * unitCost(p);
        form.querySelector('#calc').innerHTML = `Jami: <b>${money(total)}</b> · Foyda: <b class="${profit < 0 ? 'neg' : 'pos'}">${money(profit)}</b> · Omborda: ${fmt(p.qty)} ${esc(p.unit)}` +
          (qty > p.qty ? ` <span class="neg">— yetarli emas!</span>` : '');
      };
      E.productId.onchange = () => { E.price.value = byId(db.products, E.productId.value).price || ''; upd(); };
      E.qty.oninput = E.price.oninput = upd;
      E.paid.oninput = () => { touched = true; };
      upd();
    },
    onSubmit: v => opSale(v)
  });
};
A.deleteSale = id => confirmDo("Bu sotuv bekor qilinsinmi? Mahsulot omborga qaytariladi.", () => undoSale(id), 'Sotuv bekor qilindi');

/* =========================================================
   XARAJATLAR
   ========================================================= */
function renderExpenses() {
  const rows = db.expenses.filter(e => inRange(e.date, state.from, state.to)).sort(byDateDesc);
  const cols = [
    { label: 'Sana', get: e => fmtDate(e.date), val: e => e.date },
    { label: 'Turi', get: e => badge(e.category, e.category === 'Ish haqi' ? 'info' : ''), val: e => e.category },
    { label: 'Summa', cls: 'num', get: e => `<b>${money(e.amount)}</b>`, val: e => e.amount },
    { label: 'Xodim', get: e => e.workerId ? esc(nameOf(db.workers, e.workerId)) : '', val: e => e.workerId ? nameOf(db.workers, e.workerId) : '' },
    { label: 'Izoh', get: e => esc(e.note) },
    { label: '', cls: 'actions', noExport: true, get: e => actions([delBtn(`A.deleteExpense('${e.id}')`)]) }
  ];
  const byCat = {};
  rows.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const total = sum(rows, e => e.amount);
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));
  const catCols = [
    { label: 'Turi', get: c => esc(c.name), val: c => c.name },
    { label: 'Summa', cls: 'num', get: c => money(c.amount), val: c => r2(c.amount) },
    { label: 'Ulushi', get: c => `<div class="meter"><i style="width:${c.amount / total * 100}%"></i></div> ${fmt(c.amount / total * 100, 1)}%`, val: c => r2(c.amount / total * 100) }
  ];
  return pageHead("Svet, gaz, ijara, transport, ish haqi va boshqa xarajatlar. Sof foyda hisobida ishlatiladi.",
      btn('+ Yangi xarajat', 'A.expenseForm()', 'primary')) +
    periodBar() +
    cards([card('Jami xarajat', money(total), periodLabel(), 'bad'), card('Yozuvlar soni', fmt(rows.length))]) +
    `<div class="grid-2">${section("Turlar bo'yicha", table("Xarajatlar turlari bo'yicha", catCols, catRows, { empty: "Bu davrda xarajat yo'q" }))}
    ${section('Xarajatlar', table('Xarajatlar', cols, rows, { search: true, empty: "Bu davrda xarajat yo'q" }))}</div>`;
}

A.expenseForm = (preset = {}) => {
  openForm({
    title: preset.category === 'Ish haqi' ? "Ish haqi to'lash" : 'Yangi xarajat',
    fields: [
      { name: 'category', label: 'Turi', type: 'select', value: preset.category || EXPENSE_CATEGORIES[1], options: EXPENSE_CATEGORIES },
      { name: 'amount', label: "Summa (so'm)", type: 'number', required: true, value: preset.amount || '' },
      { name: 'workerId', label: 'Xodim (ish haqi uchun)', type: 'select', value: preset.workerId || '', options: listOpts([...db.workers].sort(byName), w => w.name, '—') },
      { name: 'date', label: 'Sana', type: 'date', value: preset.date || todayStr() },
      { name: 'note', label: 'Izoh', full: true, value: preset.note || '' }
    ],
    onSubmit: v => {
      if (v.category === 'Ish haqi' && !v.workerId) return 'Ish haqi uchun xodimni tanlang';
      if (v.category !== 'Ish haqi') v.workerId = '';
      return opExpense(v);
    }
  });
};
A.deleteExpense = id => confirmDo("Bu xarajat o'chirilsinmi?", () => removeById(db.expenses, id));

/* =========================================================
   XODIMLAR
   ========================================================= */
function renderWorkers() {
  const [from, to] = monthRange(state.wageMonth);
  const rows = [...db.workers].sort(byName);
  const st = Object.fromEntries(rows.map(w => [w.id, workerStats(w, from, to)]));
  const cols = [
    { label: 'F.I.Sh.', get: w => `<b>${esc(w.name)}</b>`, val: w => w.name },
    { label: 'Lavozimi', get: w => esc(w.position) },
    { label: 'Telefon', get: w => w.phone ? `<a href="tel:${esc(w.phone)}">${esc(w.phone)}</a>` : '', val: w => w.phone },
    { label: 'Ish haqi turi', get: w => w.payType === 'piece' ? `Ishbay: ${money(w.rate)} / dona` : `Oylik: ${money(w.rate)}`, val: w => w.payType === 'piece' ? 'Ishbay' : 'Oylik' },
    { label: 'Ishlab chiqargan', cls: 'num', get: w => fmt(st[w.id].produced), val: w => st[w.id].produced },
    { label: 'Hisoblangan', cls: 'num', get: w => money(st[w.id].accrued), val: w => st[w.id].accrued },
    { label: "To'langan", cls: 'num', get: w => money(st[w.id].paid), val: w => st[w.id].paid },
    { label: 'Qoldiq', cls: 'num', get: w => { const l = st[w.id].left; return l > 0 ? badge(money(l), 'warn') : badge(money(l), 'good'); }, val: w => st[w.id].left },
    { label: '', cls: 'actions', noExport: true, get: w => actions([["💵 To'lash", `A.payWage('${w.id}')`], editBtn(`A.workerForm('${w.id}')`), delBtn(`A.deleteWorker('${w.id}')`)]) }
  ];
  const tot = k => sum(rows, w => st[w.id][k]);
  return pageHead("Xodimlar va ish haqi. Ishbay ish haqi xodim ishlab chiqargan sifatli mahsulot soniga qarab avtomatik hisoblanadi.",
      btn("+ Yangi xodim", 'A.workerForm()', 'primary')) +
    `<div class="period card"><label>Oy <input type="month" value="${state.wageMonth}" onchange="state.wageMonth=this.value||todayStr().slice(0,7);render()"></label></div>` +
    cards([
      card('Xodimlar', fmt(rows.length)),
      card('Hisoblangan ish haqi', money(tot('accrued')), state.wageMonth),
      card("To'langan", money(tot('paid'))),
      card("To'lanishi kerak", money(Math.max(0, tot('left'))), '', tot('left') > 0 ? 'warn' : 'good')
    ]) +
    section('Xodimlar va ish haqi', table(`Xodimlar ${state.wageMonth}`, cols, rows, { search: true, empty: "Hali xodim qo'shilmagan" }));
}

A.workerForm = id => {
  const w = id ? byId(db.workers, id) : null;
  openForm({
    title: w ? 'Xodimni tahrirlash' : 'Yangi xodim',
    fields: [
      { name: 'name', label: 'F.I.Sh.', required: true, value: w?.name, full: true },
      { name: 'position', label: 'Lavozimi', value: w?.position },
      { name: 'phone', label: 'Telefon', type: 'tel', value: w?.phone },
      { name: 'payType', label: 'Ish haqi turi', type: 'select', value: w?.payType || 'monthly', options: [{ value: 'monthly', label: 'Oylik (belgilangan)' }, { value: 'piece', label: 'Ishbay (har bir dona uchun)' }] },
      { name: 'rate', label: "Summa (so'm)", type: 'number', value: w?.rate ?? '', hint: "Oylik bo'lsa — oyiga, ishbay bo'lsa — 1 dona uchun" }
    ],
    onSubmit: v => {
      if (v.rate < 0) return "Summa manfiy bo'lishi mumkin emas";
      if (w) Object.assign(w, v); else db.workers.push({ id: uid(), ...v });
    }
  });
};
A.deleteWorker = id => {
  const w = byId(db.workers, id);
  confirmDo(`«${w.name}» o'chirilsinmi? Tarixdagi yozuvlar saqlanib qoladi.`, () => removeById(db.workers, id));
};
A.payWage = id => {
  const w = byId(db.workers, id);
  const [from, to] = monthRange(state.wageMonth);
  const s = workerStats(w, from, to);
  const t = todayStr();
  A.expenseForm({ category: 'Ish haqi', workerId: id, amount: Math.max(0, s.left), date: inRange(t, from, to) ? t : to, note: `${state.wageMonth} oyi uchun` });
};

/* =========================================================
   HISOBOTLAR
   ========================================================= */
function renderReports() {
  const { from, to } = state;
  const f = finance(from, to);
  const group = (list, key, fn) => { const o = {}; list.forEach(x => { const k = key(x); o[k] = fn(o[k] || {}, x); }); return o; };

  const salesBy = Object.entries(group(f.sales, s => s.productId, (a, s) => ({ qty: (a.qty || 0) + s.qty, rev: (a.rev || 0) + saleTotal(s), cost: (a.cost || 0) + s.cost })))
    .map(([id, v]) => ({ id, ...v })).sort((a, b) => b.rev - a.rev);
  const salesCols = [
    { label: 'Mahsulot', get: r => `<b>${esc(nameOf(db.products, r.id))}</b>` },
    { label: 'Sotildi', cls: 'num', get: r => fmt(r.qty), val: r => r.qty },
    { label: 'Tushum', cls: 'num', get: r => money(r.rev), val: r => r2(r.rev) },
    { label: 'Tannarx', cls: 'num', get: r => money(r.cost), val: r => r2(r.cost) },
    { label: 'Foyda', cls: 'num', get: r => `<span class="${r.rev - r.cost < 0 ? 'neg' : 'pos'}">${money(r.rev - r.cost)}</span>`, val: r => r2(r.rev - r.cost) }
  ];

  const prodBy = Object.entries(group(f.productions, p => p.productId, (a, p) => ({ qty: (a.qty || 0) + p.qty, defect: (a.defect || 0) + (p.defect || 0), cost: (a.cost || 0) + p.cost })))
    .map(([id, v]) => ({ id, ...v }));
  const prodCols = [
    { label: 'Mahsulot', get: r => `<b>${esc(nameOf(db.products, r.id))}</b>` },
    { label: 'Sifatli', cls: 'num', get: r => fmt(r.qty), val: r => r.qty },
    { label: 'Brak', cls: 'num', get: r => fmt(r.defect), val: r => r.defect },
    { label: 'Xomashyo sarfi', cls: 'num', get: r => money(r.cost), val: r => r2(r.cost) }
  ];

  const use = {};
  f.productions.forEach(p => (p.used || []).forEach(n => { use[n.materialId] = (use[n.materialId] || 0) + n.qty; }));
  const matRows = Object.entries(use).map(([id, qty]) => ({ id, qty })).sort((a, b) => nameOf(db.materials, a.id).localeCompare(nameOf(db.materials, b.id)));
  const matCols = [
    { label: 'Xomashyo', get: r => `<b>${esc(nameOf(db.materials, r.id))}</b>` },
    { label: 'Sarflandi', cls: 'num', get: r => `${fmt(r.qty)} ${esc(byId(db.materials, r.id)?.unit || '')}`, val: r => r6(r.qty) },
    { label: 'Kirim qilindi', cls: 'num', get: r => fmt(sum(db.purchases.filter(p => p.materialId === r.id && inRange(p.date, from, to)), p => p.qty)), val: r => sum(db.purchases.filter(p => p.materialId === r.id && inRange(p.date, from, to)), p => p.qty) },
    { label: 'Hozirgi qoldiq', cls: 'num', get: r => fmt(byId(db.materials, r.id)?.qty || 0), val: r => byId(db.materials, r.id)?.qty || 0 }
  ];

  const pl = [
    ['Tushum (sotuv)', f.revenue, ''],
    ['Sotilgan mahsulot tannarxi', -f.cogs, ''],
    ['Yalpi foyda', f.gross, 'strong'],
    ['Xarajatlar', -f.expenses, ''],
    ['Ishlab chiqarishdagi brak zarari', -f.lossDefect, ''],
    ['Hisobdan chiqarish (isrof) zarari', -f.lossWriteoff, ''],
    ['SOF FOYDA', f.net, 'total']
  ];
  const plHtml = `<table class="pl">${pl.map(([l, v, c]) => `<tr class="${c}"><td>${l}</td><td class="num ${v < 0 ? 'neg' : (c ? 'pos' : '')}">${money(v)}</td></tr>`).join('')}</table>`;
  TABLES.push({ title: 'Foyda va zarar', cols: [{ label: "Ko'rsatkich", get: r => r[0] }, { label: "Summa (so'm)", get: r => '', val: r => r2(r[1]) }], rows: pl });

  const cash = `<table class="pl">
    <tr><td>Kirim (sotuvdan to'lovlar + qarz qaytarilishi)</td><td class="num pos">${money(f.cashIn)}</td></tr>
    <tr><td>Chiqim (xomashyo to'lovlari + xarajatlar)</td><td class="num neg">${money(-f.cashOut)}</td></tr>
    <tr class="total"><td>Pul qoldig'i o'zgarishi</td><td class="num ${f.cashIn - f.cashOut < 0 ? 'neg' : 'pos'}">${money(f.cashIn - f.cashOut)}</td></tr></table>`;

  return pageHead(`Tanlangan davr bo'yicha moliyaviy hisobot: ${periodLabel()}.`,
      btn('🖨 Chop etish', 'window.print()')) +
    periodBar() +
    cards([
      card('Tushum', money(f.revenue)),
      card('Yalpi foyda', money(f.gross), f.revenue ? `${fmt(f.gross / f.revenue * 100, 1)}%` : ''),
      card('Xarajatlar va zararlar', money(f.expenses + f.lossDefect + f.lossWriteoff)),
      card('Sof foyda', money(f.net), '', f.net >= 0 ? 'good' : 'bad')
    ]) +
    `<div class="grid-2">${section('Foyda va zarar', plHtml)}${section('Pul oqimi', cash)}</div>` +
    section("Sotuv — mahsulotlar bo'yicha", table("Sotuv bo'yicha", salesCols, salesBy, { empty: "Bu davrda sotuv yo'q" })) +
    `<div class="grid-2">${section('Ishlab chiqarish', table('Ishlab chiqarish', prodCols, prodBy, { empty: "Bu davrda ishlab chiqarish yo'q" }))}
    ${section('Xomashyo sarfi', table('Xomashyo sarfi', matCols, matRows, { empty: "Bu davrda sarf yo'q" }))}</div>`;
}

/* =========================================================
   SOZLAMALAR
   ========================================================= */
function renderSettings() {
  const hasPass = !!db.settings.passwordHash;
  const counts = COLLECTIONS.reduce((s, c) => s + db[c].length, 0);
  return `<div class="grid-2">` +
    section('Zavod', `<p>Nomi: <b>${esc(db.settings.name)}</b></p>${btn("Nomini o'zgartirish", 'A.renameFactory()')}`) +
    section('Kirish paroli', `<p>${hasPass ? '🔒 Parol o\'rnatilgan.' : '🔓 Parol o\'rnatilmagan — dasturni istalgan kishi ocha oladi.'}</p>
      <div class="btn-row">${btn(hasPass ? "Parolni o'zgartirish" : "Parol o'rnatish", 'A.passwordForm()', 'primary')}${hasPass ? btn("Parolni o'chirish", 'A.removePassword()') : ''}</div>
      <p class="muted small">Parol shu kompyuterdagi dasturga begona kishilar kirmasligi uchun. Parolni unutsangiz, zaxira nusxadan tiklash kerak bo'ladi.</p>`) +
    section('Zaxira nusxa', `<p>Barcha ma'lumotlar shu brauzerda saqlanadi (${counts} ta yozuv). Muntazam zaxira nusxa olib, flesh yoki bulutga saqlab qo'ying.</p>
      <div class="btn-row">${btn('⬇ Zaxira nusxani yuklab olish', 'A.backup()', 'primary')}${btn('⬆ Zaxiradan tiklash', "document.getElementById('restore-file').click()")}</div>
      <input type="file" id="restore-file" accept=".json,application/json" hidden onchange="A.restore(this)">`) +
    section('Excel', `<p>Barcha bo'limlarni bitta Excel faylga yuklab olish (har bir bo'lim alohida varaqda).</p>
      ${btn('📊 Hammasini Excelga yuklash', 'A.exportAll()', 'primary')}
      <p class="muted small">Har bir sahifadagi jadvallarni yuqoridagi «Excel» tugmasi orqali ham yuklab olish mumkin.</p>`) +
    section("Namuna ma'lumotlar", `<p>Dasturni sinab ko'rish uchun namuna ma'lumotlar (shirinlik sexi).</p>${btn("Namuna ma'lumotlarni yuklash", 'A.loadDemo()')}`) +
    section('Xavfli amallar', `<p>Barcha ma'lumotlarni butunlay o'chirish. Avval zaxira nusxa oling!</p>${btn("Hammasini o'chirish", 'A.resetAll()', 'danger')}`) +
    `</div>`;
}

A.renameFactory = () => openForm({
  title: 'Zavod nomi',
  fields: [{ name: 'name', label: 'Nomi', required: true, value: db.settings.name, full: true }],
  onSubmit: v => { db.settings.name = v.name; updateBrand(); }
});
A.passwordForm = () => {
  const hasPass = !!db.settings.passwordHash;
  openForm({
    title: hasPass ? "Parolni o'zgartirish" : "Parol o'rnatish",
    fields: [
      ...(hasPass ? [{ name: 'old', label: 'Joriy parol', type: 'password', required: true, full: true }] : []),
      { name: 'p1', label: 'Yangi parol', type: 'password', required: true, full: true, hint: 'Kamida 4 ta belgi' },
      { name: 'p2', label: 'Yangi parolni takrorlang', type: 'password', required: true, full: true }
    ],
    successMsg: 'Parol saqlandi',
    onSubmit: async v => {
      if (hasPass && !(await checkPassword(v.old))) return "Joriy parol noto'g'ri";
      if (v.p1.length < 4) return "Parol kamida 4 ta belgidan iborat bo'lsin";
      if (v.p1 !== v.p2) return 'Parollar bir xil emas';
      db.settings.passwordHash = await hashPassword(v.p1);
      setSessionAuth();
    }
  });
};
A.removePassword = () => openForm({
  title: "Parolni o'chirish",
  fields: [{ name: 'old', label: 'Joriy parol', type: 'password', required: true, full: true }],
  submitText: "O'chirish",
  successMsg: "Parol o'chirildi",
  onSubmit: async v => {
    if (!(await checkPassword(v.old))) return "Parol noto'g'ri";
    db.settings.passwordHash = '';
  }
});

A.backup = () => {
  downloadFile(JSON.stringify({ app: 'zavod-dasturi', version: 1, exported: new Date().toISOString(), data: db }, null, 2),
    `zavod-zaxira-${todayStr()}.json`, 'application/json');
  toast('Zaxira nusxa yuklab olindi');
};
A.restore = input => {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed.data || parsed;
      if (!Array.isArray(data.materials) || !Array.isArray(data.products)) throw new Error('format');
      if (!confirm("Joriy ma'lumotlar zaxiradagi ma'lumotlar bilan almashtiriladi. Davom etilsinmi?")) return;
      db = normalizeDB(data);
      saveDB();
      setSessionAuth();
      updateBrand();
      render();
      toast("Ma'lumotlar tiklandi");
    } catch (e) {
      alert("Fayl noto'g'ri yoki buzilgan. Dasturning zaxira faylini tanlang.");
    }
  };
  reader.readAsText(file);
};
A.exportAll = () => {
  const saved = TABLES;
  const all = [];
  ['materials', 'purchases', 'suppliers', 'products', 'production', 'defects', 'sales', 'customers', 'expenses', 'workers', 'reports'].forEach(k => {
    TABLES = [];
    PAGES[k].render();
    all.push(...TABLES);
  });
  TABLES = saved;
  exportSheets(all, `zavod-${todayStr()}`);
};
A.resetAll = () => {
  if (!confirm("DIQQAT! Barcha ma'lumotlar o'chiriladi. Davom etilsinmi?")) return;
  if (!confirm("Ishonchingiz komilmi? Bu amalni qaytarib bo'lmaydi.")) return;
  const pass = db.settings.passwordHash, name = db.settings.name;
  db = emptyDB();
  db.settings.passwordHash = pass;
  db.settings.name = name;
  saveDB();
  render();
  toast("Barcha ma'lumotlar o'chirildi");
};
A.loadDemo = () => {
  const hasData = COLLECTIONS.some(c => db[c].length);
  if (hasData && !confirm("Joriy ma'lumotlar o'chirilib, o'rniga namuna ma'lumotlar yuklanadi. Davom etilsinmi?")) return;
  const pass = db.settings.passwordHash;
  db = buildDemo();
  db.settings.passwordHash = pass;
  saveDB();
  updateBrand();
  location.hash = 'dashboard';
  render();
  toast("Namuna ma'lumotlar yuklandi");
};
