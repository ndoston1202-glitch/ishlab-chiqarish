'use strict';
/* =========================================================
   Interfeys: oyna (modal), forma, jadval, xabarlar, Excel
   ========================================================= */

const A = window.A = {};          // tugmalardan chaqiriladigan amallar
let TABLES = [];                  // joriy sahifadagi jadvallar (Excel uchun)

function toast(msg, type = 'ok') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('hide'), 3200);
  setTimeout(() => el.remove(), 3700);
}

/* ---------- Kichik HTML bo'laklari ---------- */
const btn = (label, onclick, cls = '', title = '') =>
  `<button type="button" class="btn ${cls}" onclick="${onclick}"${title ? ` title="${esc(title)}" aria-label="${esc(title)}"` : ''}>${label}</button>`;
const actions = list => `<div class="row-actions">${list.map(([l, fn, t, c]) => btn(l, fn, 'small ' + (c || ''), t)).join('')}</div>`;
const badge = (text, tone = '') => `<span class="badge ${tone}">${esc(text)}</span>`;
const card = (label, value, sub = '', tone = '') =>
  `<div class="card stat ${tone}"><div class="stat-label">${esc(label)}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
const cards = list => `<div class="stats">${list.join('')}</div>`;
const section = (title, body, extra = '') => `<section class="card section"><div class="section-head"><h2>${esc(title)}</h2>${extra}</div>${body}</section>`;
const pageHead = (desc, buttons = '') => `<div class="page-head"><p class="muted">${desc}</p><div class="page-buttons">${buttons}</div></div>`;
const listOpts = (list, label = x => x.name, empty) =>
  (empty !== undefined ? [{ value: '', label: empty }] : []).concat(list.map(x => ({ value: x.id, label: label(x) })));

/* ---------- Jadval ---------- */
function table(title, cols, rows, opt = {}) {
  TABLES.push({ title, cols, rows });
  if (!rows.length) return `<div class="empty">${opt.empty || "Ma'lumot yo'q"}</div>`;
  const search = opt.search && rows.length > 5
    ? `<input class="search" type="search" placeholder="Qidirish..." oninput="A.filterTable(this)">` : '';
  const foot = opt.foot ? `<tfoot><tr>${cols.map(c => `<td class="${c.cls || ''}">${opt.foot[c.label] ?? ''}</td>`).join('')}</tr></tfoot>` : '';
  return `${search}<div class="table-wrap"><table>
    <thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.cls || ''}" data-label="${esc(c.label)}">${c.get(r)}</td>`).join('')}</tr>`).join('')}</tbody>
    ${foot}</table></div>`;
}
A.filterTable = input => {
  const q = input.value.trim().toLowerCase();
  const tbody = input.nextElementSibling.querySelector('tbody');
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};

/* ---------- Oyna va forma ---------- */
function fieldHtml(f) {
  if (f.type === 'html') return f.html;
  const id = 'f_' + f.name;
  const val = f.value ?? '';
  let input;
  if (f.type === 'select') {
    input = `<select id="${id}" name="${f.name}">${f.options.map(o => {
      const o2 = typeof o === 'object' ? o : { value: o, label: o };
      return `<option value="${esc(o2.value)}"${String(o2.value) === String(val) ? ' selected' : ''}>${esc(o2.label)}</option>`;
    }).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.name}" rows="2">${esc(val)}</textarea>`;
  } else if (f.type === 'number') {
    input = `<input id="${id}" name="${f.name}" type="number" inputmode="decimal" step="any" min="${f.min ?? 0}" value="${esc(val)}">`;
  } else {
    input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}"${f.type === 'password' ? ' autocomplete="new-password"' : ''}>`;
  }
  return `<label class="field${f.full ? ' full' : ''}" for="${id}">
    <span>${esc(f.label)}${f.required ? ' <b class="req">*</b>' : ''}</span>${input}
    ${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
}

function readForm(form, fields) {
  const v = {};
  for (const f of fields) {
    if (!f.name || f.type === 'html') continue;
    const el = form.elements[f.name];
    if (!el) continue;
    const raw = el.value.trim();
    if (f.type === 'number') v[f.name] = raw === '' ? (f.required ? NaN : 0) : parseFloat(raw.replace(',', '.'));
    else v[f.name] = raw;
  }
  return v;
}

let modalOnClose = null;
function closeModal() {
  const m = document.getElementById('modal');
  m.classList.remove('open');
  m.innerHTML = '';
  if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
}

/**
 * opts: { title, fields, submitText, onInit(form), onSubmit(values, form) -> xato | null, wide }
 */
function openForm(opts) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modal-box${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
    <div class="modal-head"><h3>${esc(opts.title)}</h3><button type="button" class="icon-btn" data-close aria-label="Yopish">✕</button></div>
    <form novalidate>
      <div class="form-grid">${opts.fields.map(fieldHtml).join('')}</div>
      <div class="form-error" role="alert"></div>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>Bekor qilish</button>
        <button type="submit" class="btn primary">${esc(opts.submitText || 'Saqlash')}</button>
      </div>
    </form></div>`;
  m.classList.add('open');
  m.querySelectorAll('[data-close]').forEach(b => { b.onclick = closeModal; });
  m.onclick = e => { if (e.target === m) closeModal(); };
  const form = m.querySelector('form');
  const errBox = form.querySelector('.form-error');
  if (opts.onInit) opts.onInit(form);
  form.onsubmit = async e => {
    e.preventDefault();
    const v = readForm(form, opts.fields);
    for (const f of opts.fields) {
      if (!f.required || !f.name) continue;
      const x = v[f.name];
      if (x === '' || (typeof x === 'number' && isNaN(x))) {
        errBox.textContent = `«${f.label}» maydonini to'ldiring`;
        form.elements[f.name]?.focus();
        return;
      }
    }
    const err = await opts.onSubmit(v, form);
    if (err) { errBox.textContent = err; return; }
    closeModal();
    saveDB();
    render();
    if (opts.successMsg !== false) toast(opts.successMsg || 'Saqlandi');
  };
  const first = form.querySelector('input:not([type=hidden]), select, textarea');
  if (first) first.focus();
}

function confirmDo(question, fn, okMsg = "O'chirildi") {
  if (!confirm(question)) return;
  const err = fn();
  if (err) { alert(err); return; }
  saveDB();
  render();
  toast(okMsg);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('modal').classList.contains('open')) closeModal();
});

/* ---------- Excel ---------- */
function loadXLSX() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX')));
    s.onerror = () => reject(new Error('XLSX yuklanmadi'));
    document.head.appendChild(s);
  });
}

const stripHtml = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); };

function tableToRows(t) {
  const cols = t.cols.filter(c => !c.noExport && c.label);
  return [cols.map(c => c.label)].concat(t.rows.map(r => cols.map(c => (c.val ? c.val(r) : stripHtml(c.get(r))))));
}

function downloadFile(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

async function exportSheets(tables, filename) {
  tables = tables.filter(t => t.rows.length);
  if (!tables.length) { toast("Yuklab olish uchun ma'lumot yo'q", 'warn'); return; }
  try {
    const X = await loadXLSX();
    const wb = X.utils.book_new();
    const used = new Set();
    tables.forEach(t => {
      let name = t.title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 28) || 'Varaq';
      let n = name, i = 2;
      while (used.has(n)) n = name + ' ' + i++;
      used.add(n);
      const ws = X.utils.aoa_to_sheet(tableToRows(t));
      ws['!cols'] = tableToRows(t)[0].map(() => ({ wch: 18 }));
      X.utils.book_append_sheet(wb, ws, n);
    });
    X.writeFile(wb, filename + '.xlsx');
    toast('Excel fayl yuklab olindi');
  } catch (e) {
    // Internet bo'lmasa — CSV (Excel ham ochadi)
    const csv = tables.map(t => [[t.title]].concat(tableToRows(t))
      .map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')).join('\r\n\r\n');
    downloadFile('﻿' + csv, filename + '.csv', 'text/csv;charset=utf-8');
    toast("Internet yo'q — CSV formatda saqlandi (Excel ochadi)", 'warn');
  }
}
