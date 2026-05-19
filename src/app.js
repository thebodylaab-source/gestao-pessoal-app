import { createClient } from '@supabase/supabase-js';

// --- migrated inline script 1 ---
const PASSWORD_HASH_KEY = 'gp_password_sha256';
const DEFAULT_PASSWORD_HASH = '0aef600f16c3719b3f25bca35e5768f9d239c419ed468e0097e6f76976a74e56';

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function storedPasswordHash() {
  return localStorage.getItem(PASSWORD_HASH_KEY) || DEFAULT_PASSWORD_HASH;
}

function showLockError(message = 'Password incorreta') {
  const input = document.getElementById('lock-input');
  const err = document.getElementById('lock-error');
  err.textContent = message;
  err.style.opacity = '1';
  input.value = '';
  input.style.borderColor = '#e05c5c';
  setTimeout(() => {
    err.style.opacity = '0';
    input.style.borderColor = '#2a2a36';
  }, 2500);
}

async function checkPassword() {
  const input = document.getElementById('lock-input').value;
  if (!input) {
    showLockError('Introduza a password');
    return;
  }
  try {
    if (await sha256(input) === storedPasswordHash()) {
      sessionStorage.setItem('gp_unlocked', '1');
      document.getElementById('lockscreen').style.display = 'none';
    } else {
      showLockError();
    }
  } catch (e) {
    showLockError('Este browser não suporta validação segura');
  }
}

function lockApp() {
  sessionStorage.removeItem('gp_unlocked');
  const lock = document.getElementById('lockscreen');
  if (lock) lock.style.display = 'flex';
  setTimeout(() => document.getElementById('lock-input')?.focus(), 50);
}

async function changePassword() {
  const current = prompt('Password atual:');
  if (current === null) return;
  if (await sha256(current) !== storedPasswordHash()) {
    toast('Password atual incorreta', 'var(--red)');
    return;
  }
  const next = prompt('Nova password:');
  if (!next || next.length < 8) {
    toast('Use pelo menos 8 caracteres', 'var(--red)');
    return;
  }
  const confirmNext = prompt('Repita a nova password:');
  if (next !== confirmNext) {
    toast('As passwords não coincidem', 'var(--red)');
    return;
  }
  localStorage.setItem(PASSWORD_HASH_KEY, await sha256(next));
  toast('Password alterada', 'var(--teal)');
}

if (sessionStorage.getItem('gp_unlocked') === '1') {
  document.getElementById('lockscreen').style.display = 'none';
}

window.addEventListener('load', () => {
  document.getElementById('lock-input')?.focus();
});

// --- migrated inline script 2 ---
// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
const STORAGE_KEY = 'gp_v3';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_TABLE = 'personal_data';

function createEmergencyState() {
  return {
    monthlyExpenses: 0,
    targetMonths: 6,
    currentAmount: 0,
    location: '',
    moves: []
  };
}

const S = {
  transactions: [],
  timeEntries: [],
  investments: [],
  budgets: [],
  credits: [],
  emergency: createEmergencyState(),
  categories: {
    expense: [
      {icon:'🛒',name:'Alimentação'},{icon:'🚗',name:'Transporte'},{icon:'🏠',name:'Habitação'},
      {icon:'💊',name:'Saúde'},{icon:'🎬',name:'Lazer'},{icon:'👕',name:'Vestuário'},
      {icon:'📚',name:'Educação'},{icon:'💻',name:'Tecnologia'},{icon:'🍽️',name:'Restauração'},
      {icon:'📦',name:'Outros'}
    ],
    income: [
      {icon:'💼',name:'Salário'},{icon:'🔧',name:'Freelance'},
      {icon:'📈',name:'Investimentos'},{icon:'🎁',name:'Presente'},{icon:'📦',name:'Outros'}
    ]
  },
  finType: 'expense',
  periods: { fin: 'month', time: 'month' },
  months: { fin: new Date(), time: new Date(), inv: new Date() }
};

const UI = {
  editing: {
    transaction: null,
    time: null,
    investment: null,
    credit: null
  }
};

function normalizeState() {
  if (!S.emergency || typeof S.emergency !== 'object') S.emergency = createEmergencyState();
  S.emergency = { ...createEmergencyState(), ...S.emergency };
  S.emergency.monthlyExpenses = Number(S.emergency.monthlyExpenses) || 0;
  S.emergency.targetMonths = Math.max(1, parseInt(S.emergency.targetMonths, 10) || 6);
  S.emergency.currentAmount = Math.max(0, Number(S.emergency.currentAmount) || 0);
  S.emergency.location = S.emergency.location || '';
  S.emergency.moves = Array.isArray(S.emergency.moves) ? S.emergency.moves : [];
}

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { const d = JSON.parse(saved); Object.assign(S, d); S.months = { fin: new Date(), time: new Date(), inv: new Date() }; }
  } catch(e) {}
  normalizeState();
}

function stateSnapshot() {
  const d = { transactions: S.transactions, timeEntries: S.timeEntries, investments: S.investments, budgets: S.budgets, categories: S.categories, credits: S.credits, emergency: S.emergency };
  return d;
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateSnapshot()));
}

function save() {
  saveLocal();
  queueCloudAutoSave();
  queueDriveAutoSave();
}

function queueDriveAutoSave() {
  if (typeof DRIVE !== 'undefined' && DRIVE.authed && DRIVE.fileId) {
    clearTimeout(DRIVE._autoSaveTimer);
    DRIVE._autoSaveTimer = setTimeout(() => driveSave(), 2000);
  }
}

load();

// ══════════════════════════════════════
// TABS
// ══════════════════════════════════════
function showTab(tab, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'financeiro') renderFin();
  if (tab === 'tempo') renderTime();
  if (tab === 'investimentos') renderInv();
  if (tab === 'orcamento') renderBudget();
  if (tab === 'reserva') renderEmergency();
  if (tab === 'creditos') renderCredits();
}

// ══════════════════════════════════════
// MONTH NAV
// ══════════════════════════════════════
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function changeMonth(key, dir) {
  S.months[key].setMonth(S.months[key].getMonth() + dir);
  updateMonthLabels();
  if (key === 'fin') renderFin();
  if (key === 'time') renderTime();
  if (key === 'inv') renderInv();
}
function updateMonthLabels() {
  ['fin','time','inv'].forEach(k => {
    const el = document.getElementById('month-label-' + k);
    if (el) el.textContent = MONTHS_PT[S.months[k].getMonth()] + ' ' + S.months[k].getFullYear();
  });
  const b = document.getElementById('bud-month-label');
  if (b) b.textContent = MONTHS_PT[S.months.fin.getMonth()] + ' ' + S.months.fin.getFullYear();
}
function setPeriod(key, val, btn) {
  S.periods[key] = val;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (key === 'fin') renderFin();
}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}
function fmt(n, decimals=2) { return n.toLocaleString('pt-PT', {minimumFractionDigits:decimals, maximumFractionDigits:decimals}) + ' €'; }
function fmtH(h) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return hh + 'h' + (mm ? mm + 'm' : ''); }
function fmtDate(s) { const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }
function toDate(s) { const [y,m,d] = String(s || today()).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function jsStr(s) { return esc(String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'\\r').replace(/\n/g,'\\n')); }
function num(id) { return parseFloat(String(document.getElementById(id).value).replace(',', '.')); }
function uid() { return Date.now() + Math.random().toString(36).slice(2,6); }
function pct(a,b) { return b ? ((a/b)*100).toFixed(1) + '%' : '—'; }

function toast(msg, col) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderLeftColor = col || 'var(--gold)';
  el.style.color = col || 'var(--gold)';
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function filterByMonth(arr, key, m, y) {
  return arr.filter(x => { const d = toDate(x[key]); return d.getMonth() === m && d.getFullYear() === y; });
}

function setEditMode(kind, active) {
  const cfg = {
    transaction: { submit: 'fin-submit', cancel: 'fin-cancel-edit', add: '+ Adicionar', edit: 'Guardar alterações' },
    time: { submit: 'time-submit', cancel: 'time-cancel-edit', add: '+ Registar', edit: 'Guardar alterações' },
    investment: { submit: 'inv-submit', cancel: 'inv-cancel-edit', add: '+ Adicionar', edit: 'Guardar alterações' },
    credit: { submit: 'cred-submit', cancel: 'cred-cancel-edit', add: '+ Registar Crédito', edit: 'Guardar alterações' }
  }[kind];
  if (!cfg) return;
  const submit = document.getElementById(cfg.submit);
  const cancel = document.getElementById(cfg.cancel);
  if (submit) submit.textContent = active ? cfg.edit : cfg.add;
  if (cancel) cancel.style.display = active ? 'block' : 'none';
}

function clearTransactionForm() {
  ['fin-desc','fin-amount','fin-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fin-date').value = today();
}

function clearTimeForm() {
  ['time-desc','time-hours','time-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('time-date').value = today();
}

function clearInvestmentForm() {
  ['inv-name','inv-ticker','inv-qty','inv-buy-price','inv-curr-price','inv-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('inv-date').value = today();
}

function clearCreditForm() {
  ['cred-name','cred-total','cred-paid','cred-monthly','cred-remaining','cred-rate','cred-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cred-start').value = today();
}

function cancelEdit(kind) {
  UI.editing[kind] = null;
  setEditMode(kind, false);
  if (kind === 'transaction') clearTransactionForm();
  if (kind === 'time') clearTimeForm();
  if (kind === 'investment') clearInvestmentForm();
  if (kind === 'credit') clearCreditForm();
}

function renderAll() {
  updateMonthLabels();
  renderTimeSubcats();
  renderFin();
  renderTime();
  renderInv();
  renderBudget();
  renderEmergency();
  renderCredits();
}

// ══════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════
function getCategories(type) { return S.categories[type] || []; }
function getCatIcon(type, name) {
  const c = getCategories(type).find(c => c.name === name);
  return c ? c.icon : '📦';
}

function addCategory(type) {
  const icon = document.getElementById('new-' + (type==='expense'?'exp':'inc') + '-icon').value.trim() || '📦';
  const name = document.getElementById('new-' + (type==='expense'?'exp':'inc') + '-name').value.trim();
  if (!name) return;
  if (S.categories[type].find(c => c.name === name)) { toast('Categoria já existe'); return; }
  S.categories[type].push({ icon, name });
  document.getElementById('new-' + (type==='expense'?'exp':'inc') + '-icon').value = '';
  document.getElementById('new-' + (type==='expense'?'exp':'inc') + '-name').value = '';
  save();
  renderCategoryEditors();
  updateCatSelects();
  toast('Categoria adicionada');
}
function removeCategory(type, name) {
  S.categories[type] = S.categories[type].filter(c => c.name !== name);
  save();
  renderCategoryEditors();
  updateCatSelects();
  toast('Categoria removida');
}
function renderCategoryEditors() {
  ['expense','income'].forEach(type => {
    const el = document.getElementById('cat-' + type + '-editor');
    if (!el) return;
    el.innerHTML = S.categories[type].map(c => `
      <div class="cat-chip">
        <span class="icon">${c.icon}</span>
        <span>${esc(c.name)}</span>
        <button class="remove" onclick="removeCategory('${type}','${jsStr(c.name)}')" title="Remover">×</button>
      </div>
    `).join('');
  });
}
function updateCatSelects() {
  const finCat = document.getElementById('fin-cat');
  const budCat = document.getElementById('bud-cat');
  const type = S.finType;
  if (finCat) {
    finCat.innerHTML = getCategories(type).map(c => `<option value="${esc(c.name)}">${c.icon} ${esc(c.name)}</option>`).join('');
  }
  if (budCat) {
    budCat.innerHTML = [...getCategories('expense'), ...getCategories('income')]
      .map(c => `<option value="${esc(c.name)}">${c.icon} ${esc(c.name)}</option>`).join('');
  }
}
function showCatEditor(type) {
  showTab('orcamento', document.querySelector('.tab-btn:nth-child(5)') || document.querySelectorAll('.tab-btn')[3]);
}

// ══════════════════════════════════════
// FINANCE
// ══════════════════════════════════════
function setFinType(t) {
  S.finType = t;
  document.getElementById('fin-btn-exp').className = 'type-btn' + (t==='expense' ? ' exp' : '');
  document.getElementById('fin-btn-inc').className = 'type-btn' + (t==='income' ? ' inc' : '');
  updateCatSelects();
}

function addTransaction() {
  const desc = document.getElementById('fin-desc').value.trim();
  const amount = num('fin-amount');
  const cat = document.getElementById('fin-cat').value;
  const date = document.getElementById('fin-date').value;
  const note = document.getElementById('fin-note').value.trim();
  if (!desc) { highlight('fin-desc'); return; }
  if (!amount || amount <= 0) { highlight('fin-amount'); return; }
  if (!date) { highlight('fin-date'); return; }
  const payload = { id: UI.editing.transaction || uid(), type: S.finType, desc, amount, cat, date, note };
  const idx = S.transactions.findIndex(t => t.id === UI.editing.transaction);
  if (idx >= 0) S.transactions[idx] = payload;
  else S.transactions.push(payload);
  save(); renderFin(); renderBudget();
  const wasEditing = Boolean(UI.editing.transaction);
  UI.editing.transaction = null;
  setEditMode('transaction', false);
  clearTransactionForm();
  toast(wasEditing ? 'Transação atualizada' : (S.finType === 'expense' ? '↓ Despesa registada' : '↑ Receita registada'), S.finType === 'expense' ? 'var(--red)' : 'var(--teal)');
}

function editTransaction(id) {
  const t = S.transactions.find(x => x.id === id);
  if (!t) return;
  UI.editing.transaction = id;
  setFinType(t.type);
  updateCatSelects();
  document.getElementById('fin-desc').value = t.desc || '';
  document.getElementById('fin-amount').value = t.amount || '';
  document.getElementById('fin-cat').value = t.cat || '';
  document.getElementById('fin-date').value = t.date || today();
  document.getElementById('fin-note').value = t.note || '';
  setEditMode('transaction', true);
  document.getElementById('fin-desc').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteTransaction(id) {
  if (!confirm('Eliminar esta transação?')) return;
  S.transactions = S.transactions.filter(t => t.id !== id);
  save(); renderFin(); renderBudget(); toast('Eliminado');
}

function renderFin() {
  updateMonthLabels();
  updateCatSelects();
  const m = S.months.fin.getMonth(), y = S.months.fin.getFullYear();
  const q = (document.getElementById('fin-search')?.value || '').toLowerCase();
  const period = S.periods.fin;

  // Filter by period
  let filtered = S.transactions.filter(t => {
    const d = toDate(t.date);
    if (period === 'day') { const today2 = new Date(); return d.toDateString() === today2.toDateString(); }
    if (period === 'week') { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return d >= start; }
    if (period === 'quarter') { const qStart = new Date(y, Math.floor(m/3)*3, 1); const qEnd = new Date(y, Math.floor(m/3)*3 + 3, 0); return d >= qStart && d <= qEnd; }
    return d.getMonth() === m && d.getFullYear() === y;
  }).filter(t => !q || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q));

  const income = filtered.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expense = filtered.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : null;

  // KPIs
  const budgetExpenseTotal = S.budgets.filter(b => b.type === 'expense').reduce((s,b) => s + b.limit, 0);
  const budgetIncomeTotal = S.budgets.filter(b => b.type === 'income').reduce((s,b) => s + b.limit, 0);

  document.getElementById('kpi-income').textContent = fmt(income);
  document.getElementById('kpi-income-vs').textContent = budgetIncomeTotal ? `orçamento: ${fmt(budgetIncomeTotal)}` : 'sem orçamento def.';
  document.getElementById('kpi-expense').textContent = fmt(expense);
  document.getElementById('kpi-expense-vs').textContent = budgetExpenseTotal ? `orçamento: ${fmt(budgetExpenseTotal)}` : 'sem orçamento def.';
  document.getElementById('kpi-balance').textContent = fmt(balance);
  document.getElementById('kpi-balance-pct').textContent = income > 0 ? `${pct(balance, income)} do rendimento` : '';
  document.getElementById('kpi-savings').textContent = savingsRate !== null ? savingsRate + '%' : '—';

  // Line chart
  drawLineChart('chart-fin-line', filtered);

  // Donut
  const expByCat = {};
  filtered.filter(t => t.type === 'expense').forEach(t => expByCat[t.cat] = (expByCat[t.cat] || 0) + t.amount);
  drawDonut('chart-fin-donut', expByCat, CAT_COLORS);
  const legend = document.getElementById('fin-legend');
  if (legend) {
    const sorted = Object.entries(expByCat).sort((a,b) => b[1]-a[1]);
    legend.innerHTML = sorted.map(([cat, val], i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${CAT_COLORS[i % CAT_COLORS.length]}"></div>
        <div class="legend-label">${esc(cat)}</div>
        <div class="legend-val">${fmt(val)}</div>
      </div>
    `).join('');
  }

  // Transaction list
  const list = document.getElementById('fin-list');
  const sorted2 = [...filtered].sort((a,b) => b.date.localeCompare(a.date));
  if (!sorted2.length) {
    list.innerHTML = `<div class="empty"><div class="e-icon">◎</div>Sem transações neste período</div>`;
  } else {
    list.innerHTML = sorted2.map(t => {
      const bud = S.budgets.find(b => b.cat === t.cat);
      const budTag = bud ? `<span class="tag budget-ok">orç: ${fmt(bud.limit)}</span>` : '';
      return `<div class="tx-row" style="grid-template-columns:34px 1fr auto auto">
        <div class="tx-icon ${t.type}" style="background:${t.type==='expense'?'var(--red-d)':'var(--teal-d)'}">${getCatIcon(t.type, t.cat)}</div>
        <div><div class="tx-desc">${esc(t.desc)}</div>
        <div class="tx-meta"><span>${fmtDate(t.date)}</span><span class="tag">${esc(t.cat)}</span>${budTag}${t.note?`<span style="color:var(--text3);font-size:0.72rem">📝 ${esc(t.note.slice(0,30))}</span>`:''}</div></div>
        <div class="mono ${t.type==='expense'?'c-red':'c-teal'}">${t.type==='expense'?'−':'+'}${fmt(t.amount)}</div>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" onclick="editTransaction('${t.id}')" title="Editar">✎</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')" title="Eliminar">×</button>
        </div>
      </div>`;
    }).join('');
  }

  // Cat bars vs budget
  const bars = document.getElementById('fin-cat-bars');
  if (bars) {
    const monthTx = filterByMonth(S.transactions, 'date', m, y).filter(t => t.type === 'expense');
    const catTotals = {};
    monthTx.forEach(t => catTotals[t.cat] = (catTotals[t.cat] || 0) + t.amount);
    const allCats = new Set([...Object.keys(catTotals), ...S.budgets.filter(b=>b.type==='expense').map(b=>b.cat)]);
    const rows = [...allCats].map(cat => ({ cat, spent: catTotals[cat] || 0, bud: (S.budgets.find(b=>b.cat===cat&&b.type==='expense') || {}).limit || 0 }));
    rows.sort((a,b) => b.spent - a.spent);
    const maxVal = Math.max(...rows.map(r => Math.max(r.spent, r.bud)), 0.01);
    bars.innerHTML = rows.length ? rows.map(r => {
      const pctVal = (r.spent / maxVal * 100).toFixed(1);
      const cls = r.bud === 0 ? '' : r.spent <= r.bud * 0.75 ? 'ok' : r.spent <= r.bud ? 'warn' : 'over';
      const color = cls === 'ok' ? 'var(--teal)' : cls === 'warn' ? 'var(--gold)' : cls === 'over' ? 'var(--red)' : 'var(--blue)';
      return `<div class="bar-row">
        <div class="bar-label">${getCatIcon('expense',r.cat)} ${esc(r.cat)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pctVal}%;background:${color}"></div></div>
        <div class="bar-val">${fmt(r.spent)}${r.bud?` / ${fmt(r.bud)}`:''}</div>
      </div>`;
    }).join('') : '<div style="color:var(--text3);font-size:0.82rem;padding:8px 0">Sem dados</div>';
  }
}

// ══════════════════════════════════════
// TIME TRACKING
// ══════════════════════════════════════
const TIME_CATS = {
  familia: { label: '👨‍👩‍👧‍👦 Família', color: 'var(--teal)', subs: ['Diana','Simão','Mãe','Pai','Família toda'] },
  trabalho: { label: '💼 Trabalho', color: 'var(--gold)', subs: ['Treinos','Gestão','Eventos','Formação','Reuniões','Outros'] },
  dormir: { label: '😴 Dormir', color: 'var(--purple)', subs: ['Noite','Sesta'] },
  desporto: { label: '🏃 Desporto', color: 'var(--blue)', subs: ['Corrida','Ginásio','Natação','Futebol','Ciclismo','Outro'] },
  ler: { label: '📖 Leitura', color: '#c8a96e', subs: ['Livro','Artigos','Newsletters','Outro'] },
  perdido: { label: '⌛ Tempo Perdido', color: 'var(--red)', subs: ['Redes sociais','TV/Streaming','Procrastinação','Outro'] }
};

function renderTimeSubcats() {
  const main = document.getElementById('time-main-cat').value;
  const subs = TIME_CATS[main]?.subs || [];
  document.getElementById('time-sub-cat').innerHTML = subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
}

function addTimeEntry() {
  const mainCat = document.getElementById('time-main-cat').value;
  const subCat = document.getElementById('time-sub-cat').value;
  const desc = document.getElementById('time-desc').value.trim();
  const date = document.getElementById('time-date').value;
  const hours = num('time-hours');
  const note = document.getElementById('time-note').value.trim();
  if (!date) { highlight('time-date'); return; }
  if (!hours || hours <= 0) { highlight('time-hours'); return; }
  const payload = { id: UI.editing.time || uid(), mainCat, subCat, desc, date, hours, note };
  const idx = S.timeEntries.findIndex(e => e.id === UI.editing.time);
  if (idx >= 0) S.timeEntries[idx] = payload;
  else S.timeEntries.push(payload);
  save(); renderTime();
  const wasEditing = Boolean(UI.editing.time);
  UI.editing.time = null;
  setEditMode('time', false);
  clearTimeForm();
  toast(wasEditing ? 'Registo atualizado' : '⏱ Tempo registado', 'var(--blue)');
}

function editTimeEntry(id) {
  const e = S.timeEntries.find(x => x.id === id);
  if (!e) return;
  UI.editing.time = id;
  document.getElementById('time-main-cat').value = e.mainCat || 'familia';
  renderTimeSubcats();
  document.getElementById('time-sub-cat').value = e.subCat || '';
  document.getElementById('time-desc').value = e.desc || '';
  document.getElementById('time-date').value = e.date || today();
  document.getElementById('time-hours').value = e.hours || '';
  document.getElementById('time-note').value = e.note || '';
  setEditMode('time', true);
  document.getElementById('time-main-cat').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteTimeEntry(id) {
  if (!confirm('Eliminar este registo de tempo?')) return;
  S.timeEntries = S.timeEntries.filter(e => e.id !== id);
  save(); renderTime(); toast('Eliminado');
}

function renderTime() {
  updateMonthLabels();
  renderTimeSubcats();
  const m = S.months.time.getMonth(), y = S.months.time.getFullYear();
  const entries = filterByMonth(S.timeEntries, 'date', m, y);
  const total = entries.reduce((s,e) => s + e.hours, 0);

  const byMain = {};
  Object.keys(TIME_CATS).forEach(k => byMain[k] = 0);
  entries.forEach(e => byMain[e.mainCat] = (byMain[e.mainCat] || 0) + e.hours);

  // KPIs
  document.getElementById('time-kpi-total').textContent = fmtH(total);
  document.getElementById('time-kpi-family').textContent = fmtH(byMain.familia);
  document.getElementById('time-kpi-family-pct').textContent = total ? pct(byMain.familia, total) + ' do total' : '—';
  document.getElementById('time-kpi-work').textContent = fmtH(byMain.trabalho);
  document.getElementById('time-kpi-work-pct').textContent = total ? pct(byMain.trabalho, total) + ' do total' : '—';
  document.getElementById('time-kpi-lost').textContent = fmtH(byMain.perdido);
  document.getElementById('time-kpi-lost-pct').textContent = total ? pct(byMain.perdido, total) + ' do total' : '—';

  // Circles
  const circles = document.getElementById('time-circles');
  circles.innerHTML = Object.entries(TIME_CATS).map(([key, info]) => {
    const h = byMain[key] || 0;
    const p = total > 0 ? h / total : 0;
    const r = 38, cx = 44, cy = 44, stroke = 7;
    const circ = 2 * Math.PI * r;
    const dash = circ * p;
    return `<div class="time-circle-card">
      <div class="circle-label">${info.label}</div>
      <svg class="circle-svg" width="88" height="88" viewBox="0 0 88 88">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${info.color}" stroke-width="${stroke}"
          stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
          stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
      </svg>
      <div class="circle-val">${fmtH(h)}</div>
      <div class="circle-pct">${total ? (p*100).toFixed(1) + '%' : '—'}</div>
    </div>`;
  }).join('');

  // Subcat bars
  const subTotals = {};
  entries.forEach(e => { const k = e.mainCat + '|' + e.subCat; subTotals[k] = (subTotals[k] || 0) + e.hours; });
  const maxH = Math.max(...Object.values(subTotals), 0.01);
  const subBars = document.getElementById('time-subcat-bars');
  const sortedSub = Object.entries(subTotals).sort((a,b) => b[1]-a[1]);
  subBars.innerHTML = sortedSub.length ? sortedSub.map(([key, h]) => {
    const [main, sub] = key.split('|');
    return `<div class="bar-row">
      <div class="bar-label">${TIME_CATS[main]?.label.slice(0,2) || ''} ${esc(sub)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(h/maxH*100).toFixed(1)}%;background:${TIME_CATS[main]?.color || 'var(--gold)'}"></div></div>
      <div class="bar-val">${fmtH(h)}</div>
    </div>`;
  }).join('') : '<div style="color:var(--text3);font-size:0.82rem">Sem dados</div>';

  // List
  const list = document.getElementById('time-list');
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.length ? sorted.map(e => {
    const info = TIME_CATS[e.mainCat] || {};
    return `<div class="tx-row" style="grid-template-columns:34px 1fr auto auto">
      <div class="tx-icon" style="background:${info.color || 'var(--blue)'}22">${info.label?.slice(0,2) || '⏱'}</div>
      <div>
        <div class="tx-desc">${e.desc ? esc(e.desc) : esc(e.subCat)}</div>
        <div class="tx-meta"><span>${fmtDate(e.date)}</span><span class="tag" style="background:${info.color||'var(--blue)'}22;color:${info.color||'var(--blue)'}">${esc(e.subCat)}</span>${e.note?`<span style="color:var(--text3);font-size:0.72rem">📝 ${esc(e.note.slice(0,30))}</span>`:''}</div>
      </div>
      <div class="mono" style="color:${info.color || 'var(--blue)'}">${fmtH(e.hours)}</div>
      <div class="row-actions">
        <button class="btn btn-ghost btn-sm" onclick="editTimeEntry('${e.id}')" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTimeEntry('${e.id}')" title="Eliminar">×</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><div class="e-icon">◎</div>Sem registos neste mês</div>`;
}

// ══════════════════════════════════════
// INVESTMENTS
// ══════════════════════════════════════
const INV_COLORS = { 'ETF':'var(--teal)', 'Ação':'var(--gold)', 'Obrigação':'var(--blue)', 'Cripto':'var(--purple)', 'Imobiliário':'#c8a96e', 'Outro':'var(--text2)' };

function addInvestment() {
  const name = document.getElementById('inv-name').value.trim();
  const ticker = document.getElementById('inv-ticker').value.trim();
  const type = document.getElementById('inv-type').value;
  const qty = num('inv-qty');
  const buyPrice = num('inv-buy-price');
  const currPrice = num('inv-curr-price');
  const date = document.getElementById('inv-date').value;
  const note = document.getElementById('inv-note').value.trim();
  if (!name) { highlight('inv-name'); return; }
  if (!qty || qty <= 0) { highlight('inv-qty'); return; }
  if (!buyPrice || buyPrice <= 0) { highlight('inv-buy-price'); return; }
  if (!currPrice || currPrice <= 0) { highlight('inv-curr-price'); return; }
  const payload = { id: UI.editing.investment || uid(), name, ticker, type, qty, buyPrice, currPrice, date, note };
  const idx = S.investments.findIndex(i => i.id === UI.editing.investment);
  if (idx >= 0) S.investments[idx] = payload;
  else S.investments.push(payload);
  save(); renderInv(); renderBudget();
  const wasEditing = Boolean(UI.editing.investment);
  UI.editing.investment = null;
  setEditMode('investment', false);
  clearInvestmentForm();
  toast(wasEditing ? 'Investimento atualizado' : '📈 Investimento adicionado', 'var(--teal)');
}
function updateInvPrice(id) {
  const newPrice = parseFloat(String(prompt('Novo preço atual (€):')).replace(',', '.'));
  if (!isNaN(newPrice) && newPrice > 0) {
    const inv = S.investments.find(i => i.id === id);
    if (inv) { inv.currPrice = newPrice; save(); renderInv(); toast('Preço atualizado', 'var(--teal)'); }
  }
}

function editInvestment(id) {
  const i = S.investments.find(x => x.id === id);
  if (!i) return;
  UI.editing.investment = id;
  document.getElementById('inv-name').value = i.name || '';
  document.getElementById('inv-ticker').value = i.ticker || '';
  document.getElementById('inv-type').value = i.type || 'ETF';
  document.getElementById('inv-qty').value = i.qty || '';
  document.getElementById('inv-buy-price').value = i.buyPrice || '';
  document.getElementById('inv-curr-price').value = i.currPrice || '';
  document.getElementById('inv-date').value = i.date || today();
  document.getElementById('inv-note').value = i.note || '';
  setEditMode('investment', true);
  document.getElementById('inv-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteInvestment(id) {
  if (!confirm('Eliminar esta posição?')) return;
  S.investments = S.investments.filter(i => i.id !== id);
  save(); renderInv(); renderBudget(); toast('Eliminado');
}

function renderInv() {
  const total = S.investments.reduce((s,i) => s + i.qty * i.currPrice, 0);
  const invested = S.investments.reduce((s,i) => s + i.qty * i.buyPrice, 0);
  const gain = total - invested;
  const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(2) : 0;
  document.getElementById('inv-kpi-total').textContent = fmt(total);
  document.getElementById('inv-kpi-invested').textContent = fmt(invested);
  const gainEl = document.getElementById('inv-kpi-gain');
  gainEl.textContent = fmt(gain);
  gainEl.style.color = gain >= 0 ? 'var(--teal)' : 'var(--red)';
  document.getElementById('inv-kpi-gain-pct').textContent = gainPct + '%';
  document.getElementById('inv-kpi-count').textContent = S.investments.length;

  // Allocation donut
  const byType = {};
  S.investments.forEach(i => byType[i.type] = (byType[i.type] || 0) + i.qty * i.currPrice);
  drawDonut('chart-inv-donut', byType, Object.values(INV_COLORS));
  const legend = document.getElementById('inv-alloc-legend');
  if (legend) {
    legend.innerHTML = Object.entries(byType).map(([type, val]) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${INV_COLORS[type]||'var(--text2)'}"></div>
        <div class="legend-label">${esc(type)}</div>
        <div class="legend-val">${pct(val, total)}</div>
      </div>
    `).join('');
  }

  // List
  const list = document.getElementById('inv-list');
  if (!S.investments.length) {
    list.innerHTML = `<div class="empty"><div class="e-icon">◎</div>Sem posições registadas</div>`;
  } else {
    const sorted = [...S.investments].sort((a,b) => (b.qty*b.currPrice) - (a.qty*a.currPrice));
    list.innerHTML = sorted.map(i => {
      const currVal = i.qty * i.currPrice;
      const buyVal = i.qty * i.buyPrice;
      const g = currVal - buyVal;
      const gPct = ((g / buyVal) * 100).toFixed(2);
      const col = g >= 0 ? 'var(--teal)' : 'var(--red)';
      const weight = total > 0 ? ((currVal / total) * 100).toFixed(1) : 0;
      return `<div class="inv-row">
        <div>
          <div class="inv-name">${esc(i.name)}</div>
          <div class="inv-ticker">${i.ticker ? esc(i.ticker) + ' · ' : ''}${esc(i.type)} · ${weight}% port. · ${i.qty} un.</div>
        </div>
        <div style="text-align:right">
          <div class="mono" style="font-size:0.98rem">${fmt(i.currPrice)}</div>
          <div style="font-size:0.76rem;color:var(--text2)">compra: ${fmt(i.buyPrice)}</div>
        </div>
        <div style="text-align:right">
          <div class="mono">${fmt(currVal)}</div>
          <div style="font-size:0.76rem;color:var(--text2)">${fmt(buyVal)}</div>
        </div>
        <div style="text-align:right">
          <div class="mono ${g>=0?'gain-pos':'gain-neg'}">${g>=0?'+':''}${fmt(g)}</div>
          <div style="font-size:0.76rem;color:${col}">${gPct}%</div>
        </div>
        <div class="row-actions" style="flex-direction:column;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="updateInvPrice('${i.id}')" title="Atualizar preço">↻</button>
          <button class="btn btn-ghost btn-sm" onclick="editInvestment('${i.id}')" title="Editar">✎</button>
          <button class="btn btn-danger btn-sm" onclick="deleteInvestment('${i.id}')">×</button>
        </div>
      </div>`;
    }).join('');
  }
}

// ══════════════════════════════════════
// EMERGENCY RESERVE
function emergencyCalc() {
  normalizeState();
  const monthly = S.emergency.monthlyExpenses;
  const targetMonths = S.emergency.targetMonths;
  const current = S.emergency.currentAmount;
  const target = monthly * targetMonths;
  const covered = monthly > 0 ? current / monthly : 0;
  const missing = Math.max(target - current, 0);
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return { monthly, targetMonths, current, target, covered, missing, progress };
}

function saveEmergencySettings() {
  const monthly = num('res-monthly');
  const months = parseInt(document.getElementById('res-months').value, 10);
  const current = num('res-current');
  if (Number.isNaN(monthly) || monthly < 0) { highlight('res-monthly'); return; }
  if (!months || months < 1) { highlight('res-months'); return; }
  if (Number.isNaN(current) || current < 0) { highlight('res-current'); return; }
  S.emergency.monthlyExpenses = monthly;
  S.emergency.targetMonths = months;
  S.emergency.currentAmount = current;
  S.emergency.location = document.getElementById('res-location').value.trim();
  save();
  renderEmergency();
  toast('Reserva configurada', 'var(--teal)');
}

function addEmergencyMove() {
  normalizeState();
  const type = document.getElementById('res-move-type').value;
  const amount = num('res-move-amount');
  const date = document.getElementById('res-move-date').value || today();
  const note = document.getElementById('res-move-note').value.trim();
  if (!amount || amount <= 0) { highlight('res-move-amount'); return; }
  if (type === 'out' && amount > S.emergency.currentAmount) {
    toast('A saída é maior do que o saldo atual', 'var(--red)');
    highlight('res-move-amount');
    return;
  }
  const move = { id: uid(), type, amount, date, note };
  S.emergency.moves.push(move);
  S.emergency.currentAmount = Math.max(0, S.emergency.currentAmount + (type === 'in' ? amount : -amount));
  document.getElementById('res-move-amount').value = '';
  document.getElementById('res-move-note').value = '';
  document.getElementById('res-move-date').value = today();
  save();
  renderEmergency();
  toast(type === 'in' ? 'Entrada adicionada' : 'Saída adicionada', type === 'in' ? 'var(--teal)' : 'var(--red)');
}

function deleteEmergencyMove(id) {
  normalizeState();
  const move = S.emergency.moves.find(m => m.id === id);
  if (!move || !confirm('Eliminar este movimento da reserva?')) return;
  S.emergency.moves = S.emergency.moves.filter(m => m.id !== id);
  S.emergency.currentAmount = Math.max(0, S.emergency.currentAmount + (move.type === 'in' ? -move.amount : move.amount));
  save();
  renderEmergency();
  toast('Movimento eliminado');
}

function renderEmergency() {
  normalizeState();
  const els = ['res-kpi-current','res-kpi-target','res-kpi-covered','res-kpi-missing','res-move-list'];
  if (!els.every(id => document.getElementById(id))) return;

  const calc = emergencyCalc();
  const status = calc.target > 0 && calc.current >= calc.target
    ? 'Reserva completa'
    : calc.covered >= 3
      ? 'Base sólida'
      : calc.target > 0
        ? 'Prioridade alta'
        : 'Defina despesas mensais';

  document.getElementById('res-monthly').value = calc.monthly || '';
  document.getElementById('res-months').value = calc.targetMonths;
  document.getElementById('res-current').value = calc.current || '';
  document.getElementById('res-location').value = S.emergency.location || '';
  if (!document.getElementById('res-move-date').value) document.getElementById('res-move-date').value = today();

  document.getElementById('res-kpi-current').textContent = fmt(calc.current);
  document.getElementById('res-kpi-location').textContent = S.emergency.location || 'sem local definido';
  document.getElementById('res-kpi-target').textContent = fmt(calc.target);
  document.getElementById('res-kpi-target-months').textContent = `${calc.targetMonths} meses`;
  document.getElementById('res-kpi-covered').textContent = calc.monthly > 0 ? calc.covered.toFixed(1) : '—';
  document.getElementById('res-kpi-missing').textContent = fmt(calc.missing);
  document.getElementById('res-kpi-progress').textContent = `${calc.progress.toFixed(0)}% concluído`;

  const fill = document.getElementById('res-progress-fill');
  if (fill) fill.style.width = `${calc.progress}%`;
  const ring = document.getElementById('res-ring');
  if (ring) {
    ring.textContent = `${calc.progress.toFixed(0)}%`;
    ring.style.borderColor = calc.progress >= 100 ? 'var(--teal)' : calc.progress >= 50 ? 'var(--gold)' : 'var(--border)';
  }

  const suggested = calc.missing > 0 ? calc.missing / 12 : 0;
  const plan = document.getElementById('res-plan');
  if (plan) {
    plan.innerHTML = [
      { label: 'Estado', value: status, pct: calc.progress, color: calc.progress >= 100 ? 'var(--teal)' : 'var(--gold)' },
      { label: 'Objetivo', value: `${calc.targetMonths} x ${fmt(calc.monthly)}`, pct: 100, color: 'var(--blue)' },
      { label: 'Aporte 12m', value: calc.missing ? fmt(suggested) + '/mês' : 'concluído', pct: calc.progress, color: 'var(--teal)' }
    ].map(row => `<div class="bar-row">
      <div class="bar-label">${row.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(Math.max(row.pct, 0), 100)}%;background:${row.color}"></div></div>
      <div class="bar-val">${row.value}</div>
    </div>`).join('');
  }

  const list = document.getElementById('res-move-list');
  const moves = [...S.emergency.moves].sort((a,b) => b.date.localeCompare(a.date));
  if (!moves.length) {
    list.innerHTML = `<div class="empty"><div class="e-icon">â—Ž</div>Nenhum movimento registado</div>`;
  } else {
    list.innerHTML = moves.map(m => {
      const isIn = m.type === 'in';
      return `<div class="tx-row" style="grid-template-columns:34px 1fr auto auto">
        <div class="tx-icon" style="background:${isIn ? 'var(--teal-d)' : 'var(--red-d)'}">${isIn ? '+' : '&minus;'}</div>
        <div>
          <div class="tx-desc">${isIn ? 'Entrada na reserva' : 'Saída da reserva'}</div>
          <div class="tx-meta"><span>${fmtDate(m.date)}</span>${m.note ? `<span style="color:var(--text3);font-size:0.72rem">${esc(m.note.slice(0,40))}</span>` : ''}</div>
        </div>
        <div class="mono ${isIn ? 'c-teal' : 'c-red'}">${isIn ? '+' : '&minus;'}${fmt(m.amount)}</div>
        <div class="row-actions"><button class="btn btn-danger btn-sm" onclick="deleteEmergencyMove('${m.id}')" title="Eliminar">&times;</button></div>
      </div>`;
    }).join('');
  }
}

// BUDGET
// ══════════════════════════════════════
function setBudget() {
  const cat = document.getElementById('bud-cat').value;
  const limit = num('bud-limit');
  const type = document.getElementById('bud-type').value;
  if (!cat) return;
  if (!limit || limit <= 0) { highlight('bud-limit'); return; }
  const existing = S.budgets.findIndex(b => b.cat === cat && b.type === type);
  if (existing >= 0) S.budgets[existing] = { cat, limit, type };
  else S.budgets.push({ cat, limit, type });
  save(); renderBudget(); renderFin();
  document.getElementById('bud-limit').value = '';
  toast('✓ Orçamento guardado', 'var(--gold)');
}
function editBudget(cat, type) {
  const b = S.budgets.find(x => x.cat === cat && x.type === type);
  if (!b) return;
  document.getElementById('bud-cat').value = b.cat;
  document.getElementById('bud-type').value = b.type;
  document.getElementById('bud-limit').value = b.limit;
  document.getElementById('bud-cat').scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('Orçamento pronto para editar', 'var(--gold)');
}

function deleteBudget(cat, type) {
  if (!confirm('Eliminar este orçamento?')) return;
  S.budgets = S.budgets.filter(b => !(b.cat === cat && b.type === type));
  save(); renderBudget(); renderFin(); toast('Orçamento removido');
}

function renderBudget() {
  updateMonthLabels();
  renderCategoryEditors();
  updateCatSelects();
  const m = S.months.fin.getMonth(), y = S.months.fin.getFullYear();
  const monthTx = filterByMonth(S.transactions, 'date', m, y);
  const label = MONTHS_PT[m] + ' ' + y;
  const el = document.getElementById('bud-month-label');
  if (el) el.textContent = label;

  const catSpent = {};
  monthTx.forEach(t => {
    const key = t.type + '|' + t.cat;
    catSpent[key] = (catSpent[key] || 0) + t.amount;
  });

  // Budget table
  const list = document.getElementById('bud-list');
  if (!S.budgets.length) {
    list.innerHTML = `<div class="empty"><div class="e-icon">◎</div>Nenhum orçamento definido</div>`;
  } else {
    list.innerHTML = S.budgets.map(b => {
      const spent = catSpent[b.type + '|' + b.cat] || 0;
      const pctVal = Math.min((spent / b.limit) * 100, 100).toFixed(1);
      const cls = spent <= b.limit * 0.75 ? 'ok' : spent <= b.limit ? 'warn' : 'over';
      const tag = cls === 'ok' ? 'budget-ok' : cls === 'warn' ? 'budget-warn' : 'budget-over';
      const tagLabel = cls === 'ok' ? 'OK' : cls === 'warn' ? 'Atenção' : 'Excedido';
      return `<div class="budget-row">
        <div style="font-size:0.94rem;color:var(--text)">
          ${getCatIcon(b.type, b.cat)} ${esc(b.cat)}
          <div style="font-size:0.72rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em">${b.type === 'expense' ? 'despesa' : 'receita'}</div>
        </div>
        <div>
          <div class="budget-track"><div class="budget-fill ${cls}" style="width:${pctVal}%"></div></div>
          <div style="font-size:0.72rem;color:var(--text3);margin-top:4px">${pctVal}% utilizado</div>
        </div>
        <div class="mono" style="font-size:0.96rem;text-align:right;color:var(--text)">${fmt(spent)}</div>
        <div class="mono" style="font-size:0.9rem;text-align:right;color:var(--text2)">${fmt(b.limit)}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:4px">
          <span class="tag ${tag}">${tagLabel}</span>
          <button class="btn btn-ghost btn-sm" onclick="editBudget('${jsStr(b.cat)}','${b.type}')" title="Editar">✎</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBudget('${jsStr(b.cat)}','${b.type}')" title="Eliminar">×</button>
        </div>
      </div>`;
    }).join('');
  }

  // KPIs
  const totalBudget = S.budgets.filter(b=>b.type==='expense').reduce((s,b)=>s+b.limit,0);
  const totalSpent = S.budgets.filter(b=>b.type==='expense').reduce((s,b)=>s+(catSpent[b.type + '|' + b.cat]||0),0);
  const available = totalBudget - totalSpent;
  const catsOk = S.budgets.filter(b=>b.type==='expense' && (catSpent[b.type + '|' + b.cat]||0) <= b.limit).length;
  document.getElementById('bud-total').textContent = fmt(totalBudget);
  document.getElementById('bud-spent').textContent = fmt(totalSpent);
  document.getElementById('bud-spent-pct').textContent = totalBudget ? pct(totalSpent, totalBudget) + ' utilizado' : '—';
  document.getElementById('bud-available').textContent = fmt(Math.max(available, 0));
  document.getElementById('bud-cats-ok').textContent = catsOk + '/' + S.budgets.filter(b=>b.type==='expense').length;

  // Regra pessoal: 60% despesas gerais | 20% investir | 10% poupança | 10% lazer
  const income = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const lazerCats = ['Lazer','Restauração','Vestuário'];
  const poupancaCats = ['Poupança'];
  const investCats = ['Investimentos'];
  const lazer    = monthTx.filter(t=>t.type==='expense'&&lazerCats.includes(t.cat)).reduce((s,t)=>s+t.amount,0);
  const poupanca = monthTx.filter(t=>t.type==='expense'&&poupancaCats.includes(t.cat)).reduce((s,t)=>s+t.amount,0);
  const investTx = monthTx.filter(t=>t.type==='expense'&&investCats.includes(t.cat)).reduce((s,t)=>s+t.amount,0);
  const investPort = S.investments.filter(i=>{ const d=toDate(i.date); return d.getMonth()===m&&d.getFullYear()===y; }).reduce((s,i)=>s+i.qty*i.buyPrice,0);
  const invest   = investTx + investPort;
  const despGerais = monthTx.filter(t=>t.type==='expense'&&!lazerCats.includes(t.cat)&&!poupancaCats.includes(t.cat)&&!investCats.includes(t.cat)).reduce((s,t)=>s+t.amount,0);
  const ruleBars = document.getElementById('rule-bars');
  if (ruleBars && income > 0) {
    const ruleData = [
      { label: '60% Desp. Gerais', val: despGerais, target: income * 0.6, color: 'var(--red)' },
      { label: '20% Investir',     val: invest,     target: income * 0.2, color: 'var(--blue)' },
      { label: '10% Poupança',     val: poupanca,   target: income * 0.1, color: 'var(--teal)' },
      { label: '10% Lazer',        val: lazer,      target: income * 0.1, color: 'var(--gold)' }
    ];
    ruleBars.innerHTML = ruleData.map(r => {
      const barW = Math.min(r.target > 0 ? (r.val/r.target)*100 : 0, 100).toFixed(1);
      const over = r.val > r.target;
      const diff = r.val - r.target;
      const diffLabel = diff === 0 ? '' : over
        ? `<span style="color:var(--red);font-size:0.72rem;margin-left:6px">+${fmt(diff)} acima</span>`
        : `<span style="color:var(--teal);font-size:0.72rem;margin-left:6px">${fmt(Math.abs(diff))} livre</span>`;
      return `<div class="bar-row" style="margin-bottom:6px">
        <div class="bar-label" style="width:120px">${r.label}</div>
        <div style="flex:1">
          <div class="bar-track"><div class="bar-fill" style="width:${barW}%;background:${over?'var(--red)':r.color}"></div></div>
          <div style="font-size:0.72rem;color:var(--text3);margin-top:3px">${income>0?((r.val/income)*100).toFixed(1):'0'}% do rendimento</div>
        </div>
        <div style="font-family:var(--font-mono);font-size:0.86rem;color:var(--text);min-width:180px;text-align:right">${fmt(r.val)} / ${fmt(r.target)}${diffLabel}</div>
      </div>`;
    }).join('');
  } else if (ruleBars) {
    ruleBars.innerHTML = '<div style="color:var(--text3);font-size:0.82rem">Registe receitas para ver a análise 60/20/10/10</div>';
  }
}

// ══════════════════════════════════════
// CHARTS
// ══════════════════════════════════════
const CAT_COLORS = ['#e05c5c','#d4a843','#3dbf9b','#5b8dee','#9b72d4','#c8a96e','#e0855c','#5cb8e0','#72d4a5','#d472a8'];

function drawDonut(canvasId, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const entries = Object.entries(data).filter(([,v]) => v > 0);
  if (!entries.length) {
    ctx.fillStyle = '#2a2a36';
    ctx.beginPath();
    ctx.arc(W/2, H/2, W*0.38, 0, Math.PI*2);
    ctx.arc(W/2, H/2, W*0.22, 0, Math.PI*2, true);
    ctx.fill();
    return;
  }
  const total = entries.reduce((s,[,v]) => s+v, 0);
  let startAngle = -Math.PI / 2;
  const cx = W/2, cy = H/2, ro = W*0.42, ri = W*0.25;
  entries.forEach(([,val], i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + ri * Math.cos(startAngle), cy + ri * Math.sin(startAngle));
    ctx.arc(cx, cy, ro, startAngle, startAngle + slice);
    ctx.arc(cx, cy, ri, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    startAngle += slice;
  });
}

function drawLineChart(canvasId, transactions) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || canvas.width || 400;
  const H = canvas.height || 180;
  canvas.width = W;
  ctx.clearRect(0, 0, W, H);

  const period = S.periods.fin;
  let labels = [], incomeData = [], expenseData = [];

  if (period === 'day') {
    labels = ['Hoje'];
    incomeData.push(transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    expenseData.push(transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  } else if (period === 'week') {
    const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    labels = days;
    days.forEach((_,i) => {
      const dayTx = transactions.filter(t => toDate(t.date).getDay() === i);
      incomeData.push(dayTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
      expenseData.push(dayTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    });
  } else if (period === 'quarter') {
    labels = ['Mês 1','Mês 2','Mês 3'];
    const m = S.months.fin.getMonth(), y = S.months.fin.getFullYear();
    const qStart = Math.floor(m/3)*3;
    for (let i=0;i<3;i++) {
      const mm = qStart + i;
      const monthTx = S.transactions.filter(t => { const d=toDate(t.date); return d.getMonth()===mm&&d.getFullYear()===y; });
      incomeData.push(monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
      expenseData.push(monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    }
  } else {
    const m = S.months.fin.getMonth(), y = S.months.fin.getFullYear();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const step = Math.ceil(daysInMonth / 8);
    for (let d=1; d<=daysInMonth; d+=step) {
      labels.push(d + '/' + (m+1));
      const weekTx = transactions.filter(t => { const td = parseInt(t.date.split('-')[2]); return td >= d && td < d + step; });
      incomeData.push(weekTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
      expenseData.push(weekTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    }
  }

  const pad = { t:16, r:20, b:32, l:52 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const maxVal = Math.max(...incomeData, ...expenseData, 1);

  // Grid
  ctx.strokeStyle = '#2a2a36'; ctx.lineWidth = 1;
  for (let i=0;i<=4;i++) {
    const y2 = pad.t + chartH - (i/4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.l, y2); ctx.lineTo(W - pad.r, y2); ctx.stroke();
    ctx.fillStyle = '#4a4858'; ctx.font = '11px Courier New,monospace';
    ctx.fillText(Math.round((i/4)*maxVal) + '€', 4, y2 + 4);
  }

  // X labels
  ctx.fillStyle = '#4a4858'; ctx.font = '11px Courier New,monospace';
  labels.forEach((lbl, i) => {
    const x2 = pad.l + (i / (labels.length-1||1)) * chartW;
    ctx.fillText(lbl, x2 - 12, H - 8);
  });

  const drawLine = (data, color, fill) => {
    if (!data.length) return;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x2 = pad.l + (i / (data.length-1||1)) * chartW;
      const y2 = pad.t + chartH - (val / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    // Fill
    ctx.lineTo(pad.l + ((data.length-1) / (data.length-1||1)) * chartW, pad.t + chartH);
    ctx.lineTo(pad.l, pad.t + chartH);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    // Dots
    data.forEach((val, i) => {
      if (val > 0) {
        const x2 = pad.l + (i / (data.length-1||1)) * chartW;
        const y2 = pad.t + chartH - (val / maxVal) * chartH;
        ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill();
      }
    });
  };

  drawLine(expenseData, '#e05c5c', 'rgba(224,92,92,0.07)');
  drawLine(incomeData, '#3dbf9b', 'rgba(61,191,155,0.07)');

  // Legend
  ctx.fillStyle = '#3dbf9b'; ctx.fillRect(W-100, 10, 10, 3);
  ctx.fillStyle = '#7a7888'; ctx.font = '11px Arial,sans-serif'; ctx.fillText('Receitas', W-86, 14);
  ctx.fillStyle = '#e05c5c'; ctx.fillRect(W-100, 22, 10, 3);
  ctx.fillStyle = '#7a7888'; ctx.fillText('Despesas', W-86, 26);
}

// ══════════════════════════════════════
// UTILS
// ══════════════════════════════════════
function highlight(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--red)';
  setTimeout(() => el.style.borderColor = '', 1500);
}

// ══════════════════════════════════════
// CRÉDITOS
// ══════════════════════════════════════
const CRED_ICONS = { 'Habitação':'🏠','Automóvel':'🚗','Pessoal':'👤','Educação':'📚','Negócio':'💼','Outro':'📦' };
const CRED_COLORS = ['#5b8dee','#3dbf9b','#d4a843','#9b72d4','#e05c5c','#c8a96e'];

function addCredit() {
  const name     = document.getElementById('cred-name').value.trim();
  const type     = document.getElementById('cred-type').value;
  const total    = num('cred-total');
  const paid     = num('cred-paid') || 0;
  const monthly  = num('cred-monthly');
  const remaining= parseInt(document.getElementById('cred-remaining').value);
  const start    = document.getElementById('cred-start').value;
  const rate     = num('cred-rate') || 0;
  const note     = document.getElementById('cred-note').value.trim();
  if (!name)     { highlight('cred-name');    return; }
  if (!total||total<=0) { highlight('cred-total'); return; }
  if (!monthly||monthly<=0){ highlight('cred-monthly'); return; }
  if (!remaining||remaining<=0){ highlight('cred-remaining'); return; }
  if (!start)    { highlight('cred-start');   return; }
  const payload = { id: UI.editing.credit || uid(), name, type, total, paid, monthly, remaining, start, rate, note };
  const idx = S.credits.findIndex(c => c.id === UI.editing.credit);
  if (idx >= 0) S.credits[idx] = payload;
  else S.credits.push(payload);
  save(); renderCredits();
  const wasEditing = Boolean(UI.editing.credit);
  UI.editing.credit = null;
  setEditMode('credit', false);
  clearCreditForm();
  toast(wasEditing ? 'Crédito atualizado' : '🏦 Crédito registado', 'var(--blue)');
}

function editCredit(id) {
  const c = S.credits.find(x => x.id === id);
  if (!c) return;
  UI.editing.credit = id;
  document.getElementById('cred-type').value = c.type || 'Habitação';
  document.getElementById('cred-name').value = c.name || '';
  document.getElementById('cred-total').value = c.total || '';
  document.getElementById('cred-paid').value = c.paid || '';
  document.getElementById('cred-monthly').value = c.monthly || '';
  document.getElementById('cred-remaining').value = c.remaining || '';
  document.getElementById('cred-start').value = c.start || today();
  document.getElementById('cred-rate').value = c.rate || '';
  document.getElementById('cred-note').value = c.note || '';
  setEditMode('credit', true);
  document.getElementById('cred-type').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteCredit(id) {
  if (!confirm('Eliminar este crédito?')) return;
  S.credits = S.credits.filter(c => c.id !== id);
  save(); renderCredits(); toast('Crédito eliminado');
}

function renderCredits() {
  // KPIs
  const totalDebt    = S.credits.reduce((s,c) => s + (c.total - c.paid), 0);
  const totalPaid    = S.credits.reduce((s,c) => s + c.paid, 0);
  const totalMonthly = S.credits.reduce((s,c) => s + c.monthly, 0);
  document.getElementById('cred-kpi-total').textContent   = fmt(totalDebt);
  document.getElementById('cred-kpi-paid').textContent    = fmt(totalPaid);
  document.getElementById('cred-kpi-monthly').textContent = fmt(totalMonthly);
  document.getElementById('cred-kpi-count').textContent   = S.credits.length;

  // Timeline canvas
  drawCreditTimeline();

  // Cards
  const container = document.getElementById('cred-cards');
  if (!S.credits.length) {
    container.innerHTML = `<div class="empty"><div class="e-icon">◎</div>Nenhum crédito registado</div>`;
    return;
  }
  container.innerHTML = S.credits.map((c, idx) => {
    const outstanding = Math.max(c.total - c.paid, 0);
    const pctPaid = c.total > 0 ? Math.min((c.paid / c.total) * 100, 100) : 0;
    const endDate = creditEndDate(c);
    const endStr  = endDate ? endDate.toLocaleDateString('pt-PT', { month:'long', year:'numeric' }) : '—';
    const yearsLeft = endDate ? ((endDate - new Date()) / (1000*60*60*24*365.25)).toFixed(1) : '—';
    const color = CRED_COLORS[idx % CRED_COLORS.length];
    return `<div class="cred-card" style="border-top:3px solid ${color}">
      <div class="cred-card-header">
        <div>
          <div class="cred-card-title">${CRED_ICONS[c.type]||'📦'} ${esc(c.name)}</div>
          <div class="cred-card-type">${esc(c.type)}${c.rate ? ' · ' + c.rate + '% a.a.' : ''}</div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" onclick="editCredit('${c.id}')" title="Editar">✎</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCredit('${c.id}')" title="Eliminar">×</button>
        </div>
      </div>
      <div class="cred-card-body">
        <div class="cred-stat"><label>Valor Total</label><div class="v">${fmt(c.total)}</div></div>
        <div class="cred-stat"><label>Total Pago</label><div class="v" style="color:var(--teal)">${fmt(c.paid)}</div></div>
        <div class="cred-stat"><label>Em Dívida</label><div class="v" style="color:var(--red)">${fmt(outstanding)}</div></div>
        <div class="cred-stat"><label>Prestação</label><div class="v" style="color:var(--gold)">${fmt(c.monthly)}/mês</div></div>
        <div class="cred-stat"><label>Prestações Falta</label><div class="v">${c.remaining}</div></div>
        <div class="cred-stat"><label>Anos Restantes</label><div class="v" style="color:var(--blue)">${yearsLeft !== '—' ? yearsLeft + ' anos' : '—'}</div></div>
      </div>
      <div class="cred-card-footer">
        <div>
          <div class="cred-progress-label"><span>Progresso de amortização</span><span>${pctPaid.toFixed(1)}%</span></div>
          <div class="cred-bar-track"><div class="cred-bar-fill" style="width:${pctPaid.toFixed(1)}%;background:linear-gradient(90deg,${color}88,${color})"></div></div>
        </div>
        <div class="cred-end-date">Liquidação prevista: <span>${endStr}</span></div>
        ${c.note ? `<div style="font-size:0.8rem;color:var(--text2);border-top:1px solid var(--border);padding-top:8px;margin-top:4px">📝 ${esc(c.note)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function creditEndDate(c) {
  if (!c.start || !c.remaining) return null;
  const d = toDate(c.start);
  d.setMonth(d.getMonth() + (c.remaining));
  return d;
}

function drawCreditTimeline() {
  const canvas = document.getElementById('chart-timeline');
  if (!canvas) return;
  const container = canvas.parentElement;
  const minW = Math.max(container.offsetWidth || 900, 700);
  canvas.width  = minW;
  canvas.height = 130;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);       // Jan this year
  const end   = new Date(now.getFullYear() + 10, 11, 31); // 10 years ahead
  const totalMs = end - start;

  const pad = { l: 20, r: 20, t: 20, b: 40 };
  const trackY = H - pad.b - 14;
  const trackH = 4;
  const trackW = W - pad.l - pad.r;

  // ── background track ──
  ctx.fillStyle = '#22222c';
  roundRect(ctx, pad.l, trackY, trackW, trackH, 2);
  ctx.fill();

  // ── year ticks ──
  ctx.fillStyle = '#4a4858';
  ctx.font = '11px Courier New,monospace';
  ctx.textAlign = 'center';
  for (let y = now.getFullYear(); y <= now.getFullYear() + 10; y++) {
    const d = new Date(y, 0, 1);
    const x = pad.l + ((d - start) / totalMs) * trackW;
    ctx.fillStyle = '#2a2a36';
    ctx.fillRect(x, trackY - 6, 1, trackH + 12);
    ctx.fillStyle = '#4a4858';
    ctx.fillText(y, x, H - 6);
  }

  // ── "today" marker ──
  const nowX = pad.l + ((now - start) / totalMs) * trackW;
  ctx.strokeStyle = '#d4a843';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(nowX, pad.t); ctx.lineTo(nowX, trackY + trackH + 4); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#d4a843';
  ctx.font = '10px Courier New,monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HOJE', nowX, pad.t - 4);

  if (!S.credits.length) {
    ctx.fillStyle = '#4a4858';
    ctx.font = '12px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Adicione créditos para ver a linha temporal', W/2, trackY - 20);
    return;
  }

  // ── credit bars ──
  const laneH = 18;
  const lanes = S.credits.length;
  const totalLaneH = lanes * (laneH + 6);
  const laneStartY = trackY - totalLaneH - 12;

  S.credits.forEach((c, idx) => {
    const color = CRED_COLORS[idx % CRED_COLORS.length];
    const startD = c.start ? toDate(c.start) : now;
    const endD   = creditEndDate(c) || now;
    const sx = pad.l + Math.max(0, (startD - start) / totalMs) * trackW;
    const ex = pad.l + Math.min(1, (endD   - start) / totalMs) * trackW;
    const barW = Math.max(ex - sx, 4);
    const y2 = laneStartY + idx * (laneH + 6);
    const pctPaid = c.total > 0 ? Math.min(c.paid / c.total, 1) : 0;
    const paidW = barW * pctPaid;

    // full bar (remaining)
    ctx.fillStyle = color + '30';
    roundRect(ctx, sx, y2, barW, laneH, 4);
    ctx.fill();

    // paid portion
    ctx.fillStyle = color + 'cc';
    roundRect(ctx, sx, y2, Math.max(paidW, 0), laneH, 4);
    ctx.fill();

    // end dot
    ctx.beginPath();
    ctx.arc(Math.min(ex, pad.l + trackW), y2 + laneH/2, 5, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();

    // label
    ctx.fillStyle = '#e8e6f0';
    ctx.font = '11px Arial,sans-serif';
    ctx.textAlign = 'left';
    const labelX = sx + 8;
    ctx.fillText(`${CRED_ICONS[c.type]||''} ${c.name.slice(0,22)}`, labelX, y2 + laneH/2 + 3.5);

    // end date label
    if (endD) {
      const eStr = endD.toLocaleDateString('pt-PT', { month:'short', year:'2-digit' });
      ctx.fillStyle = color;
      ctx.font = '10px Courier New,monospace';
      ctx.textAlign = 'left';
      ctx.fillText(eStr, Math.min(ex + 6, W - 60), y2 + laneH/2 + 3.5);
    }
  });

  // connector dots on axis
  S.credits.forEach((c, idx) => {
    const color = CRED_COLORS[idx % CRED_COLORS.length];
    const endD = creditEndDate(c);
    if (!endD) return;
    const ex = pad.l + Math.min(1, (endD - start) / totalMs) * trackW;
    ctx.beginPath();
    ctx.arc(ex, trackY + trackH/2, 5, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0a0a0f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ══════════════════════════════════════
// BACKUP / IMPORT / EXPORT
// ══════════════════════════════════════
function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const payload = {
    ...stateSnapshot(),
    savedAt: new Date().toISOString(),
    appVersion: '1.2.0'
  };
  downloadFile(`gestao-pessoal-backup-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  toast('Backup JSON exportado', 'var(--teal)');
}

function csvCell(value) {
  const v = value === undefined || value === null ? '' : String(value);
  return /[",\r\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function exportCsv() {
  const rows = [
    ['area','id','tipo','categoria','descricao','data','valor','horas','nome','ticker','quantidade','preco_compra','preco_atual','total','pago','prestacao','prestacoes_falta','taxa','nota']
  ];
  S.transactions.forEach(t => rows.push(['financeiro', t.id, t.type, t.cat, t.desc, t.date, t.amount, '', '', '', '', '', '', '', '', '', '', '', t.note]));
  S.timeEntries.forEach(e => rows.push(['tempo', e.id, e.mainCat, e.subCat, e.desc, e.date, '', e.hours, '', '', '', '', '', '', '', '', '', '', e.note]));
  S.investments.forEach(i => rows.push(['investimento', i.id, i.type, '', '', i.date, '', '', i.name, i.ticker, i.qty, i.buyPrice, i.currPrice, '', '', '', '', '', i.note]));
  S.budgets.forEach(b => rows.push(['orcamento', '', b.type, b.cat, '', '', b.limit, '', '', '', '', '', '', '', '', '', '', '', '']));
  rows.push(['reserva', 'config', 'emergencia', '', 'Reserva de emergência', '', S.emergency.currentAmount, '', S.emergency.location, '', '', '', '', S.emergency.monthlyExpenses, '', '', S.emergency.targetMonths, '', 'configuracao']);
  S.emergency.moves.forEach(m => rows.push(['reserva', m.id, m.type, '', m.note || '', m.date, m.amount, '', '', '', '', '', '', '', '', '', '', '', 'movimento']));
  S.credits.forEach(c => rows.push(['credito', c.id, c.type, '', c.name, c.start, '', '', '', '', '', '', '', c.total, c.paid, c.monthly, c.remaining, c.rate, c.note]));
  const csv = rows.map(row => row.map(csvCell).join(';')).join('\r\n');
  downloadFile(`gestao-pessoal-dados-${today()}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
  toast('CSV exportado', 'var(--teal)');
}

function applyImportedData(data) {
  if (!data || typeof data !== 'object') throw new Error('Formato inválido');
  ['transactions','timeEntries','investments','budgets','credits'].forEach(key => {
    if (Array.isArray(data[key])) S[key] = data[key];
  });
  if (data.emergency && typeof data.emergency === 'object') S.emergency = data.emergency;
  if (data.categories && typeof data.categories === 'object') S.categories = data.categories;
  normalizeState();
  saveLocal();
  queueCloudAutoSave();
  renderAll();
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm('Importar este backup e substituir os dados atuais neste browser?')) return;
      applyImportedData(data);
      toast('Backup importado', 'var(--teal)');
    } catch (e) {
      toast('Não foi possível importar o ficheiro', 'var(--red)');
    } finally {
      const input = document.getElementById('import-file');
      if (input) input.value = '';
    }
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════
// CLOUD SYNC (SUPABASE)
const CLOUD = {
  client: null,
  ready: false,
  user: null,
  syncTimer: null,
  busy: false
};

function cloudSetStatus(state) {
  const dot = document.getElementById('cloud-dot');
  const label = document.getElementById('cloud-label');
  const btn = document.getElementById('cloud-btn');
  const saveB = document.getElementById('cloud-save-btn');
  const loadB = document.getElementById('cloud-load-btn');
  const logoutB = document.getElementById('cloud-logout-btn');
  const colors = { off:'var(--text3)', ready:'var(--gold)', ok:'var(--teal)', error:'var(--red)', syncing:'var(--blue)' };
  const labels = { off:'Cloud', ready:'Cloud pronta', ok:'Cloud ligada', error:'Erro Cloud', syncing:'A sincronizar...' };
  if (dot) dot.style.background = colors[state] || colors.off;
  if (label) label.textContent = labels[state] || 'Cloud';
  if (btn) {
    btn.style.display = CLOUD.user ? 'none' : 'block';
    btn.textContent = CLOUD.ready ? 'Ligar' : 'Configurar';
  }
  if (saveB) saveB.style.display = CLOUD.user ? 'block' : 'none';
  if (loadB) loadB.style.display = CLOUD.user ? 'block' : 'none';
  if (logoutB) logoutB.style.display = CLOUD.user ? 'block' : 'none';
}

function cloudAuth() {
  if (!CLOUD.ready) {
    toast('Supabase ainda nao esta configurado no ambiente', 'var(--red)');
    return;
  }
  const email = document.getElementById('cloud-email');
  const password = document.getElementById('cloud-password');
  if (email) email.value = localStorage.getItem('gp_cloud_email') || '';
  if (password) password.value = '';
  document.getElementById('cloud-modal').style.display = 'flex';
  setTimeout(() => (email?.value ? password : email)?.focus(), 50);
}

function cloudCredentials() {
  const email = document.getElementById('cloud-email')?.value.trim();
  const password = document.getElementById('cloud-password')?.value;
  if (!email || !password) {
    toast('Preencha email e password', 'var(--red)');
    return null;
  }
  if (password.length < 6) {
    toast('A password da Cloud precisa de pelo menos 6 caracteres', 'var(--red)');
    return null;
  }
  return { email, password };
}

function cloudEmail() {
  const email = document.getElementById('cloud-email')?.value.trim();
  if (!email) {
    toast('Escreva o email para recuperar a password', 'var(--red)');
    return null;
  }
  return email;
}

async function cloudLogin() {
  if (!CLOUD.client) return cloudAuth();
  const credentials = cloudCredentials();
  if (!credentials) return;
  cloudSetStatus('syncing');
  try {
    const { data, error } = await CLOUD.client.auth.signInWithPassword(credentials);
    if (error) throw error;
    CLOUD.user = data.user;
    localStorage.setItem('gp_cloud_email', credentials.email);
    document.getElementById('cloud-modal').style.display = 'none';
    cloudSetStatus('ok');
    await cloudLoad({ silent: true });
    toast('Cloud ligada', 'var(--teal)');
  } catch (e) {
    cloudSetStatus('error');
    toast('Erro no login Cloud: ' + e.message, 'var(--red)');
  }
}

async function cloudSignUp() {
  if (!CLOUD.client) return cloudAuth();
  const credentials = cloudCredentials();
  if (!credentials) return;
  cloudSetStatus('syncing');
  try {
    const { data, error } = await CLOUD.client.auth.signUp(credentials);
    if (error) throw error;
    localStorage.setItem('gp_cloud_email', credentials.email);
    document.getElementById('cloud-modal').style.display = 'none';
    if (data.session && data.user) {
      CLOUD.user = data.user;
      cloudSetStatus('ok');
      await cloudSave({ silent: true });
      toast('Conta criada e dados guardados na Cloud', 'var(--teal)');
    } else {
      cloudSetStatus('ready');
      toast('Conta criada. Confirme o email e depois entre.', 'var(--gold)');
    }
  } catch (e) {
    cloudSetStatus('error');
    toast('Erro ao criar conta: ' + e.message, 'var(--red)');
  }
}

async function cloudResetPassword() {
  if (!CLOUD.client) return cloudAuth();
  const email = cloudEmail();
  if (!email) return;
  cloudSetStatus('syncing');
  try {
    const { error } = await CLOUD.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    localStorage.setItem('gp_cloud_email', email);
    cloudSetStatus('ready');
    toast('Email de recuperação enviado', 'var(--teal)');
  } catch (e) {
    cloudSetStatus('error');
    toast('Erro ao recuperar password: ' + e.message, 'var(--red)');
  }
}

async function finishCloudPasswordRecovery() {
  if (!CLOUD.client) return;
  const next = prompt('Nova password Cloud:');
  if (!next || next.length < 6) {
    toast('Use pelo menos 6 caracteres', 'var(--red)');
    return;
  }
  const confirmNext = prompt('Repita a nova password Cloud:');
  if (next !== confirmNext) {
    toast('As passwords não coincidem', 'var(--red)');
    return;
  }
  cloudSetStatus('syncing');
  try {
    const { data, error } = await CLOUD.client.auth.updateUser({ password: next });
    if (error) throw error;
    CLOUD.user = data.user || CLOUD.user;
    cloudSetStatus('ok');
    toast('Password Cloud alterada', 'var(--teal)');
  } catch (e) {
    cloudSetStatus('error');
    toast('Erro ao alterar password: ' + e.message, 'var(--red)');
  }
}

async function cloudLogout() {
  if (!CLOUD.client) return;
  await CLOUD.client.auth.signOut();
  CLOUD.user = null;
  cloudSetStatus('ready');
  toast('Sessao Cloud terminada', 'var(--gold)');
}

async function cloudSave(options = {}) {
  const { silent = false } = options;
  if (!CLOUD.client || !CLOUD.user) {
    if (!silent) toast('Cloud nao ligada', 'var(--red)');
    return;
  }
  if (CLOUD.busy) return;
  CLOUD.busy = true;
  cloudSetStatus('syncing');
  try {
    const payload = {
      ...stateSnapshot(),
      savedAt: new Date().toISOString(),
      appVersion: '1.2.0'
    };
    const { error } = await CLOUD.client
      .from(SUPABASE_TABLE)
      .upsert({
        user_id: CLOUD.user.id,
        data: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) throw error;
    cloudSetStatus('ok');
    if (!silent) toast('Guardado na Cloud', 'var(--teal)');
  } catch (e) {
    cloudSetStatus('error');
    if (!silent) toast('Erro ao guardar na Cloud: ' + e.message, 'var(--red)');
  } finally {
    CLOUD.busy = false;
  }
}

async function cloudLoad(options = {}) {
  const { silent = false } = options;
  if (!CLOUD.client || !CLOUD.user) {
    if (!silent) toast('Cloud nao ligada', 'var(--red)');
    return;
  }
  cloudSetStatus('syncing');
  try {
    const { data, error } = await CLOUD.client
      .from(SUPABASE_TABLE)
      .select('data,updated_at')
      .eq('user_id', CLOUD.user.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.data && Object.keys(data.data).length) {
      const snapshot = data.data;
      ['transactions','timeEntries','investments','budgets','credits'].forEach(key => {
        if (Array.isArray(snapshot[key])) S[key] = snapshot[key];
      });
      if (snapshot.emergency && typeof snapshot.emergency === 'object') S.emergency = snapshot.emergency;
      if (snapshot.categories && typeof snapshot.categories === 'object') S.categories = snapshot.categories;
      normalizeState();
      saveLocal();
      renderAll();
      cloudSetStatus('ok');
      if (!silent) {
        const when = data.updated_at ? new Date(data.updated_at).toLocaleString('pt-PT') : '?';
        toast(`Dados carregados da Cloud (${when})`, 'var(--teal)');
      }
    } else {
      await cloudSave({ silent: true });
      cloudSetStatus('ok');
      if (!silent) toast('Primeira copia guardada na Cloud', 'var(--teal)');
    }
  } catch (e) {
    cloudSetStatus('error');
    if (!silent) toast('Erro ao carregar Cloud: ' + e.message, 'var(--red)');
  }
}

function queueCloudAutoSave() {
  if (!CLOUD.user) return;
  clearTimeout(CLOUD.syncTimer);
  CLOUD.syncTimer = setTimeout(() => cloudSave({ silent: true }), 1500);
}

function initCloud() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    cloudSetStatus('off');
    return;
  }
  CLOUD.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  CLOUD.ready = true;
  cloudSetStatus('ready');
  CLOUD.client.auth.getSession().then(({ data }) => {
    CLOUD.user = data.session?.user || null;
    cloudSetStatus(CLOUD.user ? 'ok' : 'ready');
    if (CLOUD.user) cloudLoad({ silent: true });
  });
  CLOUD.client.auth.onAuthStateChange((_event, session) => {
    const nextUser = session?.user || null;
    const changedUser = nextUser?.id !== CLOUD.user?.id;
    CLOUD.user = nextUser;
    cloudSetStatus(CLOUD.user ? 'ok' : 'ready');
    if (_event === 'PASSWORD_RECOVERY') finishCloudPasswordRecovery();
    if (CLOUD.user && changedUser) cloudLoad({ silent: true });
  });
}

// GOOGLE DRIVE SYNC
// ══════════════════════════════════════
const DRIVE = {
  CLIENT_ID: localStorage.getItem('gp_client_id') || '',
  API_KEY:   localStorage.getItem('gp_api_key') || '',
  SCOPES:    'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
  FILE_NAME: 'gestao-pessoal.json',
  FILE_MIME: 'application/json',
  tokenClient: null,
  fileId: null,
  ready: false,
  authed: false
};

function driveSetStatus(state) {
  // states: 'off' | 'connecting' | 'ok' | 'error' | 'syncing'
  const dot   = document.getElementById('drive-dot');
  const label = document.getElementById('drive-label');
  const btn   = document.getElementById('drive-btn');
  const saveB = document.getElementById('drive-save-btn');
  const loadB = document.getElementById('drive-load-btn');
  const colors = { off:'var(--text3)', connecting:'var(--gold)', ok:'var(--teal)', error:'var(--red)', syncing:'var(--blue)' };
  const labels = { off:'Google Drive', connecting:'A ligar…', ok:'Drive ✓', error:'Erro Drive', syncing:'A sincronizar…' };
  if (dot)   { dot.style.background = colors[state] || colors.off; }
  if (label) { label.textContent = labels[state] || 'Drive'; }
  if (btn)   { btn.style.display = (state === 'ok' ? 'none' : 'block'); btn.textContent = (state === 'error' ? 'Reconectar' : 'Ligar'); }
  if (saveB) { saveB.style.display = state === 'ok' ? 'block' : 'none'; }
  if (loadB) { loadB.style.display = state === 'ok' ? 'block' : 'none'; }
}

function saveDriveConfig() {
  const cid = document.getElementById('cfg-client-id').value.trim();
  const key = document.getElementById('cfg-api-key').value.trim();
  if (!cid || !key) { toast('Preencha Client ID e API Key', 'var(--red)'); return; }
  DRIVE.CLIENT_ID = cid;
  DRIVE.API_KEY   = key;
  localStorage.setItem('gp_client_id', cid);
  localStorage.setItem('gp_api_key', key);
  document.getElementById('drive-modal').style.display = 'none';
  initDriveAPI();
  toast('Credenciais guardadas — a ligar…', 'var(--gold)');
}

function driveAuth() {
  if (!DRIVE.CLIENT_ID || !DRIVE.API_KEY) {
    // Pre-fill if already saved
    document.getElementById('cfg-client-id').value = DRIVE.CLIENT_ID;
    document.getElementById('cfg-api-key').value   = DRIVE.API_KEY;
    document.getElementById('drive-modal').style.display = 'flex';
    return;
  }
  if (DRIVE.ready && !DRIVE.authed) {
    DRIVE.tokenClient.requestAccessToken({ prompt: 'consent' });
  } else if (!DRIVE.ready) {
    initDriveAPI();
  }
}

function initDriveAPI() {
  if (!DRIVE.CLIENT_ID || !DRIVE.API_KEY) return;
  driveSetStatus('connecting');

  if (typeof gapi === 'undefined' || typeof google === 'undefined') {
    driveSetStatus('error');
    toast('Erro: scripts Google não carregados. Precisa de internet para autenticar.', 'var(--red)');
    return;
  }

  gapi.load('client', async () => {
    try {
      await gapi.client.init({ apiKey: DRIVE.API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] });
      DRIVE.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: DRIVE.CLIENT_ID,
        scope: DRIVE.SCOPES,
        callback: async (resp) => {
          if (resp.error) { driveSetStatus('error'); toast('Erro de autenticação: ' + resp.error, 'var(--red)'); return; }
          DRIVE.authed = true;
          driveSetStatus('ok');
          toast('✓ Google Drive ligado!', 'var(--teal)');
          await driveFindOrCreateFile();
          await driveLoad();
        }
      });
      DRIVE.ready = true;
      DRIVE.tokenClient.requestAccessToken({ prompt: '' });
    } catch(e) {
      driveSetStatus('error');
      toast('Erro ao inicializar Drive: ' + e.message, 'var(--red)');
    }
  });
}

async function driveFindOrCreateFile() {
  try {
    // Search for existing file
    const res = await gapi.client.drive.files.list({
      q: `name='${DRIVE.FILE_NAME}' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id,name,modifiedTime)'
    });
    const files = res.result.files;
    if (files && files.length > 0) {
      DRIVE.fileId = files[0].id;
      toast(`Ficheiro encontrado no Drive (${files[0].modifiedTime?.slice(0,10) || '?'})`, 'var(--teal)');
    } else {
      // Create new file
      const createRes = await gapi.client.request({
        path: 'https://www.googleapis.com/drive/v3/files',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: DRIVE.FILE_NAME, mimeType: DRIVE.FILE_MIME })
      });
      DRIVE.fileId = createRes.result.id;
      toast('Novo ficheiro criado no Drive', 'var(--teal)');
    }
  } catch(e) {
    toast('Erro ao aceder ao Drive: ' + e.message, 'var(--red)');
  }
}

async function driveSave() {
  if (!DRIVE.authed || !DRIVE.fileId) { toast('Drive não ligado', 'var(--red)'); return; }
  driveSetStatus('syncing');
  try {
    const payload = JSON.stringify({
      ...stateSnapshot(),
      savedAt: new Date().toISOString()
    });
    await gapi.client.request({
      path: `https://www.googleapis.com/upload/drive/v3/files/${DRIVE.fileId}?uploadType=media`,
      method: 'PATCH',
      headers: { 'Content-Type': DRIVE.FILE_MIME },
      body: payload
    });
    driveSetStatus('ok');
    toast('💾 Guardado no Google Drive', 'var(--teal)');
  } catch(e) {
    driveSetStatus('error');
    toast('Erro ao guardar: ' + e.message, 'var(--red)');
  }
}

async function driveLoad() {
  if (!DRIVE.authed || !DRIVE.fileId) { toast('Drive não ligado', 'var(--red)'); return; }
  driveSetStatus('syncing');
  try {
    const res = await gapi.client.request({
      path: `https://www.googleapis.com/drive/v3/files/${DRIVE.fileId}?alt=media`,
      method: 'GET'
    });
    const data = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
    if (data && typeof data === 'object') {
      if (data.transactions) S.transactions = data.transactions;
      if (data.timeEntries)  S.timeEntries  = data.timeEntries;
      if (data.investments)  S.investments  = data.investments;
      if (data.budgets)      S.budgets      = data.budgets;
      if (data.categories)   S.categories   = data.categories;
      if (data.credits)      S.credits      = data.credits;
      if (data.emergency)    S.emergency    = data.emergency;
      normalizeState();
      saveLocal(); // also update localStorage as cache without re-uploading immediately
      renderAll();
      driveSetStatus('ok');
      const when = data.savedAt ? new Date(data.savedAt).toLocaleString('pt-PT') : '?';
      toast(`☁ Dados carregados do Drive (${when})`, 'var(--teal)');
    } else {
      driveSetStatus('ok');
      toast('Drive ligado — ficheiro vazio (novo)', 'var(--gold)');
    }
  } catch(e) {
    // 404 means file has no content yet — not an error
    if (e.status === 404 || (e.result && e.result.error && e.result.error.code === 404)) {
      driveSetStatus('ok');
      toast('Drive ligado — a aguardar primeiro guardado', 'var(--gold)');
    } else {
      driveSetStatus('error');
      toast('Erro ao carregar: ' + (e.message || JSON.stringify(e)), 'var(--red)');
    }
  }
}

// Auto-connect if credentials already saved
window.addEventListener('load', () => {
  if (DRIVE.CLIENT_ID && DRIVE.API_KEY) {
    setTimeout(() => initDriveAPI(), 1500);
  }
});

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
initCloud();
document.getElementById('fin-date').value = today();
document.getElementById('time-date').value = today();
document.getElementById('inv-date').value = today();
document.getElementById('cred-start').value = today();
document.getElementById('res-move-date').value = today();
renderTimeSubcats();
renderFin();
renderBudget();
renderEmergency();
renderCredits();

window.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['fin-desc','fin-amount'].includes(e.target.id)) addTransaction();
  if (e.key === 'Enter' && ['time-hours','time-desc'].includes(e.target.id)) addTimeEntry();
  if (e.key === 'Enter' && ['res-move-amount','res-move-note'].includes(e.target.id)) addEmergencyMove();
});

window.addEventListener('resize', () => {
  if (document.getElementById('page-creditos').classList.contains('active')) drawCreditTimeline();
  if (document.getElementById('page-financeiro').classList.contains('active')) {
    const m = S.months.fin.getMonth(), y = S.months.fin.getFullYear();
    const filtered = filterByMonth(S.transactions, 'date', m, y);
    drawLineChart('chart-fin-line', filtered);
  }
});

Object.assign(window, {
  addCategory,
  addCredit,
  addEmergencyMove,
  addInvestment,
  addTimeEntry,
  addTransaction,
  cancelEdit,
  changeMonth,
  changePassword,
  checkPassword,
  cloudAuth,
  cloudLoad,
  cloudLogin,
  cloudLogout,
  cloudResetPassword,
  cloudSave,
  cloudSignUp,
  deleteBudget,
  deleteCredit,
  deleteEmergencyMove,
  deleteInvestment,
  deleteTimeEntry,
  deleteTransaction,
  driveAuth,
  driveLoad,
  driveSave,
  editBudget,
  editCredit,
  editInvestment,
  editTimeEntry,
  editTransaction,
  exportBackup,
  exportCsv,
  importBackup,
  lockApp,
  removeCategory,
  renderFin,
  renderEmergency,
  renderTimeSubcats,
  saveEmergencySettings,
  saveDriveConfig,
  setBudget,
  setFinType,
  setPeriod,
  showCatEditor,
  showTab,
  updateInvPrice
});
