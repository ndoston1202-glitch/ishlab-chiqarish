'use strict';
/* =========================================================
   Menyu, sahifalar almashinuvi, kirish (parol)
   ========================================================= */

const PAGES = {
  dashboard:  { title: 'Bosh sahifa',            icon: '🏠', group: 'Asosiy',           render: renderDashboard },
  materials:  { title: 'Xomashyo ombori',        icon: '📦', group: 'Ombor',            render: renderMaterials },
  purchases:  { title: 'Xomashyo kirimi',        icon: '🚚', group: 'Ombor',            render: renderPurchases },
  suppliers:  { title: 'Yetkazib beruvchilar',   icon: '🤝', group: 'Ombor',            render: renderSuppliers },
  products:   { title: 'Mahsulotlar va ombor',   icon: '🏷️', group: 'Ombor',            render: renderProducts },
  production: { title: 'Ishlab chiqarish',       icon: '🏭', group: 'Ishlab chiqarish', render: renderProduction },
  defects:    { title: 'Brak va isrof',          icon: '⚠️', group: 'Ishlab chiqarish', render: renderDefects },
  sales:      { title: 'Sotuv',                  icon: '💰', group: 'Sotuv',            render: renderSales },
  customers:  { title: 'Mijozlar va qarzlar',    icon: '👥', group: 'Sotuv',            render: renderCustomers },
  expenses:   { title: 'Xarajatlar',             icon: '🧾', group: 'Moliya',           render: renderExpenses },
  reports:    { title: 'Hisobotlar (foyda)',     icon: '📊', group: 'Moliya',           render: renderReports },
  workers:    { title: 'Xodimlar va ish haqi',   icon: '👷', group: 'Boshqa',           render: renderWorkers },
  settings:   { title: 'Sozlamalar',             icon: '⚙️', group: 'Boshqa',           render: renderSettings }
};

const currentPage = () => {
  const k = location.hash.slice(1);
  return PAGES[k] ? k : 'dashboard';
};

function buildNav() {
  let html = '', group = '';
  for (const [k, p] of Object.entries(PAGES)) {
    if (p.group !== group) { group = p.group; html += `<div class="nav-group">${esc(group)}</div>`; }
    html += `<a href="#${k}" data-page="${k}"><span class="nav-icon">${p.icon}</span>${esc(p.title)}</a>`;
  }
  document.getElementById('nav').innerHTML = html;
}

function updateBrand() {
  document.getElementById('brand-name').textContent = db.settings.name;
  document.getElementById('login-title').textContent = db.settings.name;
  document.title = db.settings.name + ' — Zavod boshqaruvi';
  document.getElementById('sidebar-foot').innerHTML = db.settings.passwordHash
    ? btn('🔒 Chiqish', 'A.logout()', 'small block') : '';
}

function render() {
  const k = currentPage();
  const page = PAGES[k];
  TABLES = [];
  let html;
  try {
    html = page.render();
  } catch (e) {
    console.error(e);
    html = `<div class="card empty">Xatolik yuz berdi: ${esc(e.message)}</div>`;
  }
  document.getElementById('content').innerHTML = html;
  document.getElementById('page-title').textContent = page.icon + ' ' + page.title;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.page === k));
  document.getElementById('topbar-actions').innerHTML =
    TABLES.some(t => t.rows.length) ? btn('📊 Excel', 'A.exportPage()', 'small', 'Jadvallarni Excelga yuklash') : '';
  updateBrand();
}

A.exportPage = () => {
  const k = currentPage();
  exportSheets(TABLES, `${PAGES[k].title.replace(/[^\p{L}\p{N} ]/gu, '').trim().replace(/\s+/g, '-')}-${todayStr()}`);
};

/* ---------- Mobil menyu ---------- */
function setMenu(open) { document.body.classList.toggle('menu-open', open); }
document.getElementById('menu-btn').onclick = () => setMenu(!document.body.classList.contains('menu-open'));
document.getElementById('backdrop').onclick = () => setMenu(false);
document.getElementById('nav').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });

/* ---------- Kirish ---------- */
const AUTH_KEY = 'zavod-auth';
function setSessionAuth() {
  try { sessionStorage.setItem(AUTH_KEY, db.settings.passwordHash || ''); } catch (e) { /* e'tiborsiz */ }
}
function isAuthed() {
  if (!db.settings.passwordHash) return true;
  try { return sessionStorage.getItem(AUTH_KEY) === db.settings.passwordHash; } catch (e) { return false; }
}
function showApp() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  render();
}
function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
  updateBrand();
  const inp = document.getElementById('login-pass');
  inp.value = '';
  inp.focus();
}
document.getElementById('login-form').onsubmit = async e => {
  e.preventDefault();
  const err = document.getElementById('login-err');
  try {
    if (await checkPassword(document.getElementById('login-pass').value)) {
      err.textContent = '';
      setSessionAuth();
      showApp();
    } else {
      err.textContent = "Parol noto'g'ri";
    }
  } catch (ex) {
    err.textContent = ex.message;
  }
};
A.logout = () => {
  try { sessionStorage.removeItem(AUTH_KEY); } catch (e) { /* e'tiborsiz */ }
  showLogin();
};

/* ---------- Ishga tushirish ---------- */
buildNav();
updateBrand();
if (isAuthed()) showApp(); else showLogin();
