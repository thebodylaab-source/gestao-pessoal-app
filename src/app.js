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
    input.style.borderColor = 'var(--border)';
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
const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_TABLE = 'personal_data';
let currentStorageKey = GUEST_STORAGE_KEY;

function createEmergencyState() {
  return {
    reserves: []
  };
}

function createDefaultTimeCategories() {
  return [
    { id: 'familia', icon: '👨‍👩‍👧‍👦', name: 'Família', color: 'var(--teal)', subs: ['Diana','Simão','Mãe','Pai','Família toda'] },
    { id: 'trabalho', icon: '💼', name: 'Trabalho', color: 'var(--gold)', subs: ['Treinos','Gestão','Eventos','Formação','Reuniões','Outros'] },
    { id: 'dormir', icon: '😴', name: 'Dormir', color: 'var(--purple)', subs: ['Noite','Sesta'] },
    { id: 'desporto', icon: '🏃', name: 'Desporto', color: 'var(--blue)', subs: ['Corrida','Ginásio','Natação','Futebol','Ciclismo','Outro'] },
    { id: 'ler', icon: '📖', name: 'Leitura', color: '#c8a96e', subs: ['Livro','Artigos','Newsletters','Outro'] },
    { id: 'perdido', icon: '⌛', name: 'Tempo Perdido', color: 'var(--red)', subs: ['Redes sociais','TV/Streaming','Procrastinação','Outro'] }
  ];
}

function createDefaultPatrimonyCategories() {
  return [
    { id: 'liquidez', type: 'asset', icon: '💶', name: 'Liquidez', subs: ['Conta corrente','Poupança','Dinheiro'] },
    { id: 'investimentos', type: 'asset', icon: '📈', name: 'Investimentos', subs: ['ETF','Ações','Cripto','PPR','Outro'] },
    { id: 'imoveis', type: 'asset', icon: '🏠', name: 'Imóveis', subs: ['Casa','Terreno','Arrendamento'] },
    { id: 'veiculos', type: 'asset', icon: '🚗', name: 'Veículos', subs: ['Carro','Mota','Bicicleta'] },
    { id: 'dividas', type: 'liability', icon: '🏦', name: 'Dívidas', subs: ['Crédito','Cartão','Impostos','Outro'] },
    { id: 'compromissos', type: 'liability', icon: '📄', name: 'Compromissos', subs: ['Prestação','Contrato','Responsabilidade'] }
  ];
}

const S = {
  transactions: [],
  timeEntries: [],
  investments: [],
  budgets: [],
  credits: [],
  emergency: createEmergencyState(),
  patrimony: { items: [], categories: createDefaultPatrimonyCategories() },
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
    ],
    time: createDefaultTimeCategories()
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
    reserve: null,
    patrimony: null,
    credit: null
  }
};

function createDefaultCategories() {
  return {
    expense: [
      {icon:'ðŸ›’',name:'AlimentaÃ§Ã£o'},{icon:'ðŸš—',name:'Transporte'},{icon:'ðŸ ',name:'HabitaÃ§Ã£o'},
      {icon:'ðŸ’Š',name:'SaÃºde'},{icon:'ðŸŽ¬',name:'Lazer'},{icon:'ðŸ‘•',name:'VestuÃ¡rio'},
      {icon:'ðŸ“š',name:'EducaÃ§Ã£o'},{icon:'ðŸ’»',name:'Tecnologia'},{icon:'ðŸ½ï¸',name:'RestauraÃ§Ã£o'},
      {icon:'ðŸ“¦',name:'Outros'}
    ],
    income: [
      {icon:'ðŸ’¼',name:'SalÃ¡rio'},{icon:'ðŸ”§',name:'Freelance'},
      {icon:'ðŸ“ˆ',name:'Investimentos'},{icon:'ðŸŽ',name:'Presente'},{icon:'ðŸ“¦',name:'Outros'}
    ],
    time: createDefaultTimeCategories()
  };
}

const TIME_COLOR_PALETTE = ['var(--teal)','var(--gold)','var(--purple)','var(--blue)','#c8a96e','var(--red)','var(--text2)'];

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categoria';
}

function normalizeTimeCategories(input) {
  const legacyObject = input && !Array.isArray(input) && typeof input === 'object'
    ? Object.entries(input).map(([id, value]) => ({ id, ...value }))
    : null;
  const source = Array.isArray(input) ? input : (legacyObject || createDefaultTimeCategories());
  const used = new Set();
  const normalized = source.map((cat, index) => {
    const labelParts = String(cat?.label || '').trim().split(/\s+/).filter(Boolean);
    const fallback = createDefaultTimeCategories()[index] || {};
    const name = cat?.name || labelParts.slice(1).join(' ') || cat?.label || fallback.name || 'Categoria';
    const baseId = slugify(cat?.id || name);
    let id = baseId;
    let n = 2;
    while (used.has(id)) id = `${baseId}-${n++}`;
    used.add(id);
    const subs = Array.isArray(cat?.subs)
      ? cat.subs.map(s => String(s).trim()).filter(Boolean)
      : ['Geral'];
    return {
      id,
      icon: cat?.icon || labelParts[0] || fallback.icon || '⏱',
      name,
      color: cat?.color || fallback.color || TIME_COLOR_PALETTE[index % TIME_COLOR_PALETTE.length],
      subs: subs.length ? subs : ['Geral']
    };
  });
  return normalized.length ? normalized : [{ id: 'geral', icon: '⏱', name: 'Geral', color: 'var(--blue)', subs: ['Geral'] }];
}

function cleanFinanceCategoryName(name) {
  const fixes = {
    'AlimentaÃ§Ã£o': 'Alimentação',
    'HabitaÃ§Ã£o': 'Habitação',
    'SaÃºde': 'Saúde',
    'VestuÃ¡rio': 'Vestuário',
    'EducaÃ§Ã£o': 'Educação',
    'RestauraÃ§Ã£o': 'Restauração',
    'SalÃ¡rio': 'Salário'
  };
  return fixes[name] || name;
}

function normalizeFinanceCategories(input, fallback = []) {
  const iconFixes = {
    'ðŸ›’': '🛒',
    'ðŸš—': '🚗',
    'ðŸ ': '🏠',
    'ðŸ’Š': '💊',
    'ðŸŽ¬': '🎬',
    'ðŸ‘•': '👕',
    'ðŸ“š': '📚',
    'ðŸ’»': '💻',
    'ðŸ½ï¸': '🍽️',
    'ðŸ“¦': '📦',
    'ðŸ’¼': '💼',
    'ðŸ”§': '🔧',
    'ðŸ“ˆ': '📈',
    'ðŸŽ': '🎁'
  };
  const cleanIcon = icon => iconFixes[icon] || icon || '📦';
  const source = Array.isArray(input) ? input : fallback;
  const normalized = source.map((cat, index) => {
    const fb = fallback[index] || {};
    const rawName = typeof cat === 'string' ? cat : (cat?.name || fb.name || 'Categoria');
    const name = cleanFinanceCategoryName(rawName);
    const subs = Array.isArray(cat?.subs)
      ? cat.subs.map(s => String(s).trim()).filter(Boolean)
      : ['Geral'];
    return {
      icon: cleanIcon(cat?.icon || fb.icon),
      name,
      subs: subs.length ? subs : ['Geral']
    };
  });
  return normalized.length ? normalized : fallback.map(c => ({ ...c, icon: cleanIcon(c.icon), subs: ['Geral'] }));
}

function normalizeTransactions(input) {
  return Array.isArray(input) ? input.map(t => ({
    ...t,
    cat: cleanFinanceCategoryName(t?.cat || ''),
    subCat: t?.subCat || t?.subcat || 'Geral',
    creditId: t?.type === 'expense' ? (t?.creditId || '') : ''
  })) : [];
}

function normalizeEmergencyReserve(reserve, index = 0) {
  const fallbackId = index === 0 ? 'principal' : `reserva-${index + 1}`;
  return {
    id: reserve?.id || fallbackId,
    name: reserve?.name || reserve?.title || (index === 0 ? 'Reserva Principal' : `Reserva ${index + 1}`),
    monthlyExpenses: Math.max(0, Number(reserve?.monthlyExpenses) || 0),
    targetMonths: Math.max(1, parseInt(reserve?.targetMonths, 10) || 6),
    targetDate: reserve?.targetDate || '',
    currentAmount: Math.max(0, Number(reserve?.currentAmount) || 0),
    location: reserve?.location || '',
    moves: Array.isArray(reserve?.moves)
      ? reserve.moves.map((m, moveIndex) => ({
        id: m.id || `${fallbackId}-move-${moveIndex + 1}`,
        type: m.type === 'out' ? 'out' : 'in',
        amount: Math.max(0, Number(m.amount) || 0),
        date: m.date || today(),
        note: m.note || ''
      })).filter(m => m.amount > 0)
      : []
  };
}

function normalizeEmergencyState(input) {
  const data = input && typeof input === 'object' ? input : {};
  let reserves = Array.isArray(data.reserves) ? data.reserves : null;
  if (!reserves) {
    const hasLegacyReserve = 'monthlyExpenses' in data || 'targetMonths' in data || 'currentAmount' in data || 'location' in data || Array.isArray(data.moves);
    reserves = hasLegacyReserve ? [{
      id: 'principal',
      name: 'Reserva Principal',
      monthlyExpenses: data.monthlyExpenses,
      targetMonths: data.targetMonths,
      currentAmount: data.currentAmount,
      location: data.location,
      moves: data.moves
    }] : [];
  }
  return { reserves: reserves.map(normalizeEmergencyReserve) };
}

function normalizePatrimonyCategory(cat, index = 0) {
  const fallback = createDefaultPatrimonyCategories()[index] || {};
  const type = cat?.type === 'liability' ? 'liability' : 'asset';
  return {
    id: cat?.id || slugify(cat?.name || fallback.name || `categoria-${index + 1}`),
    type,
    icon: cat?.icon || fallback.icon || (type === 'asset' ? '💎' : '🏦'),
    name: cat?.name || fallback.name || 'Categoria',
    subs: Array.isArray(cat?.subs) && cat.subs.length ? cat.subs.map(s => String(s).trim()).filter(Boolean) : ['Geral']
  };
}

function normalizePatrimony(input) {
  const data = input && typeof input === 'object' ? input : {};
  const categories = Array.isArray(data.categories) && data.categories.length
    ? data.categories.map(normalizePatrimonyCategory)
    : createDefaultPatrimonyCategories();
  const validCategoryIds = new Set(categories.map(c => c.id));
  const fallbackAsset = categories.find(c => c.type === 'asset')?.id || categories[0]?.id || 'liquidez';
  const fallbackLiability = categories.find(c => c.type === 'liability')?.id || categories[0]?.id || 'dividas';
  const items = Array.isArray(data.items) ? data.items.map((item, index) => {
    const type = item?.type === 'liability' ? 'liability' : 'asset';
    const fallbackCat = type === 'liability' ? fallbackLiability : fallbackAsset;
    return {
      id: item?.id || `pat-${index + 1}`,
      type,
      name: item?.name || `Item ${index + 1}`,
      categoryId: validCategoryIds.has(item?.categoryId) ? item.categoryId : fallbackCat,
      subcat: item?.subcat || 'Geral',
      value: Math.max(0, Number(item?.value) || 0),
      date: item?.date || today(),
      note: item?.note || ''
    };
  }).filter(item => item.value > 0) : [];
  return { items, categories };
}

function normalizeState() {
  S.emergency = normalizeEmergencyState(S.emergency);
  S.patrimony = normalizePatrimony(S.patrimony);
  const defaultCategories = createDefaultCategories();
  if (!S.categories || typeof S.categories !== 'object') S.categories = defaultCategories;
  S.categories.expense = normalizeFinanceCategories(S.categories.expense, defaultCategories.expense);
  S.categories.income = normalizeFinanceCategories(S.categories.income, defaultCategories.income);
  S.categories.time = normalizeTimeCategories(S.categories.time);
  S.transactions = normalizeTransactions(S.transactions);
  S.budgets = Array.isArray(S.budgets) ? S.budgets.map(b => ({ ...b, cat: cleanFinanceCategoryName(b.cat || '') })) : [];
}

function storageKeyForUser(userId) {
  return userId ? `${STORAGE_KEY}:user:${userId}` : GUEST_STORAGE_KEY;
}

function setStorageUser(userId) {
  currentStorageKey = storageKeyForUser(userId);
}

function resetState(data = {}) {
  S.transactions = Array.isArray(data.transactions) ? data.transactions : [];
  S.timeEntries = Array.isArray(data.timeEntries) ? data.timeEntries : [];
  S.investments = Array.isArray(data.investments) ? data.investments : [];
  S.budgets = Array.isArray(data.budgets) ? data.budgets : [];
  S.credits = Array.isArray(data.credits) ? data.credits : [];
  S.emergency = data.emergency && typeof data.emergency === 'object' ? data.emergency : createEmergencyState();
  S.patrimony = data.patrimony && typeof data.patrimony === 'object' ? data.patrimony : { items: [], categories: createDefaultPatrimonyCategories() };
  S.categories = data.categories && typeof data.categories === 'object' ? data.categories : createDefaultCategories();
  S.finType = data.finType || 'expense';
  S.periods = { fin: 'month', time: 'month', ...(data.periods || {}) };
  S.months = { fin: new Date(), time: new Date(), inv: new Date() };
  normalizeState();
}

function migrateLegacyStorage() {
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (legacy && !localStorage.getItem(GUEST_STORAGE_KEY)) {
    localStorage.setItem(GUEST_STORAGE_KEY, legacy);
  }
}

function loadLocalForUser(userId = null) {
  setStorageUser(userId);
  try {
    const saved = localStorage.getItem(currentStorageKey);
    resetState(saved ? JSON.parse(saved) : {});
  } catch(e) {
    resetState();
  }
}

function switchLocalUser(userId = null, options = {}) {
  const { keepCurrentIfMissing = false } = options;
  const nextKey = storageKeyForUser(userId);
  if (localStorage.getItem(nextKey)) {
    loadLocalForUser(userId);
    return;
  }
  setStorageUser(userId);
  if (keepCurrentIfMissing) saveLocal();
  else resetState();
}

function stateSnapshot() {
  const d = { transactions: S.transactions, timeEntries: S.timeEntries, investments: S.investments, budgets: S.budgets, categories: S.categories, credits: S.credits, emergency: S.emergency, patrimony: S.patrimony };
  return d;
}

function saveLocal() {
  localStorage.setItem(currentStorageKey, JSON.stringify(stateSnapshot()));
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

migrateLegacyStorage();
loadLocalForUser();

// ══════════════════════════════════════
// TABS
// ══════════════════════════════════════
function showTab(tab, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'financeiro') renderFin();
  if (tab === 'tempo') renderTime();
  if (tab === 'investimentos') renderInv();
  if (tab === 'patrimonio') renderPatrimony();
  if (tab === 'dashboard') renderDashboard();
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
    reserve: { submit: 'res-submit', cancel: 'res-cancel-edit', add: 'Guardar Reserva', edit: 'Guardar alterações' },
    patrimony: { submit: 'pat-submit', cancel: 'pat-cancel-edit', add: '+ Registar', edit: 'Guardar alterações' },
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
  renderCreditLinkSelect();
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

function clearEmergencyForm() {
  ['res-name','res-monthly','res-months','res-current','res-location','res-target-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function clearPatrimonyForm() {
  ['pat-name','pat-value','pat-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const date = document.getElementById('pat-date');
  if (date) date.value = today();
  const type = document.getElementById('pat-type');
  if (type) type.value = 'asset';
  renderPatrimonyCategorySelects();
}

function cancelEdit(kind) {
  UI.editing[kind] = null;
  setEditMode(kind, false);
  if (kind === 'transaction') clearTransactionForm();
  if (kind === 'time') clearTimeForm();
  if (kind === 'investment') clearInvestmentForm();
  if (kind === 'reserve') clearEmergencyForm();
  if (kind === 'patrimony') clearPatrimonyForm();
  if (kind === 'credit') clearCreditForm();
}

function renderAll() {
  updateMonthLabels();
  renderTimeSubcats();
  renderTimeCategoryEditor();
  renderFin();
  renderTime();
  renderInv();
  renderPatrimony();
  renderDashboard();
  renderBudget();
  renderEmergency();
  renderCredits();
}

// ══════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════
function getCategories(type) {
  if (type === 'expense' || type === 'income') {
    const defaults = createDefaultCategories()[type] || [];
    S.categories[type] = normalizeFinanceCategories(S.categories[type], defaults);
  }
  return S.categories[type] || [];
}
function getCatIcon(type, name) {
  const c = getCategories(type).find(c => c.name === name);
  return c ? c.icon : '📦';
}

function getFinanceCat(type, name) {
  return getCategories(type).find(c => c.name === name) || { icon: '📦', name, subs: ['Geral'] };
}

function financeShort(type) {
  return type === 'expense' ? 'exp' : 'inc';
}

function financeCategoryInputIds(type, area = '') {
  const short = financeShort(type);
  const base = area ? `new-${area}-${short}` : `new-${short}`;
  return { icon: `${base}-icon`, name: `${base}-name`, subs: `${base}-subs` };
}

function addCategory(type, area = '') {
  const ids = financeCategoryInputIds(type, area);
  const iconEl = document.getElementById(ids.icon);
  const nameEl = document.getElementById(ids.name);
  const subsEl = document.getElementById(ids.subs);
  const icon = iconEl?.value.trim() || '📦';
  const name = nameEl?.value.trim();
  const subs = (subsEl?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!name) { if (nameEl) highlight(ids.name); return; }
  const cats = getCategories(type);
  if (cats.find(c => c.name.toLowerCase() === name.toLowerCase())) { toast('Categoria ja existe'); return; }
  cats.push({ icon, name, subs: subs.length ? subs : ['Geral'] });
  if (iconEl) iconEl.value = '';
  if (nameEl) nameEl.value = '';
  if (subsEl) subsEl.value = '';
  save();
  renderCategoryEditors();
  updateCatSelects();
  renderFin();
  renderBudget();
  toast('Categoria adicionada');
}
function removeCategory(type, name) {
  const used = S.transactions.some(t => t.type === type && t.cat === name) || S.budgets.some(b => b.type === type && b.cat === name);
  if (used && !confirm(`A categoria "${name}" tem registos/orcamentos. Remover mesmo assim?`)) return;
  S.categories[type] = S.categories[type].filter(c => c.name !== name);
  save();
  renderCategoryEditors();
  updateCatSelects();
  renderFin();
  renderBudget();
  toast('Categoria removida');
}

function addFinanceSubcategory(type, area = 'fin') {
  const short = financeShort(type);
  const select = document.getElementById(`${area}-${short}-sub-add-cat`);
  const input = document.getElementById(`new-${area}-${short}-sub`);
  const catName = select?.value;
  const name = input?.value.trim();
  const cat = getCategories(type).find(c => c.name === catName);
  if (!cat) { toast('Escolha uma categoria', 'var(--red)'); return; }
  if (!name) { highlight(`new-${area}-${short}-sub`); return; }
  cat.subs = Array.isArray(cat.subs) ? cat.subs : ['Geral'];
  if (cat.subs.some(s => s.toLowerCase() === name.toLowerCase())) {
    toast('Sub-categoria ja existe', 'var(--gold)');
    return;
  }
  cat.subs.push(name);
  if (input) input.value = '';
  save();
  renderCategoryEditors();
  updateCatSelects(catName, name);
  renderFin();
  renderBudget();
  toast('Sub-categoria adicionada', 'var(--blue)');
}

function removeFinanceSubcategory(type, catName, sub) {
  const cat = getCategories(type).find(c => c.name === catName);
  if (!cat) return;
  cat.subs = Array.isArray(cat.subs) ? cat.subs : ['Geral'];
  if (cat.subs.length <= 1 && sub === 'Geral') {
    toast('Mantem pelo menos uma sub-categoria', 'var(--red)');
    return;
  }
  const used = S.transactions.some(t => t.type === type && t.cat === catName && (t.subCat || 'Geral') === sub);
  if (used && !confirm(`A sub-categoria "${sub}" tem transacoes. Os registos passam para "Geral". Continuar?`)) return;
  cat.subs = cat.subs.filter(s => s !== sub);
  if (!cat.subs.length) cat.subs.push('Geral');
  if (used && !cat.subs.includes('Geral')) cat.subs.unshift('Geral');
  if (used) {
    S.transactions.forEach(t => {
      if (t.type === type && t.cat === catName && (t.subCat || 'Geral') === sub) t.subCat = 'Geral';
    });
  }
  save();
  renderCategoryEditors();
  updateCatSelects(catName);
  renderFin();
  renderBudget();
  toast('Sub-categoria removida');
}

function renderFinanceSubcategorySelects() {
  ['expense','income'].forEach(type => {
    const short = financeShort(type);
    const select = document.getElementById(`fin-${short}-sub-add-cat`);
    if (!select) return;
    const previous = select.value;
    const cats = getCategories(type);
    select.innerHTML = cats.map(c => `<option value="${esc(c.name)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
    if (previous && cats.some(c => c.name === previous)) select.value = previous;
    if (!select.value && cats[0]) select.value = cats[0].name;
  });
}

function renderCategoryEditors() {
  ['expense','income'].forEach(type => {
    const html = getCategories(type).map(c => `
      <div class="finance-cat-panel">
        <div class="finance-cat-panel-head">
          <div class="finance-cat-title">
            <span class="icon">${esc(c.icon)}</span>
            <span>${esc(c.name)}</span>
          </div>
          <span class="time-cat-count">${(c.subs || ['Geral']).length} sub</span>
          <button class="remove btn btn-danger btn-sm" onclick="removeCategory('${type}','${jsStr(c.name)}')" title="Remover">×</button>
        </div>
        <div class="time-sub-chip-list">
          ${(c.subs || ['Geral']).map(s => `<span class="finance-sub-chip">${esc(s)}<button class="sub-chip-remove" onclick="removeFinanceSubcategory('${type}','${jsStr(c.name)}','${jsStr(s)}')" title="Remover sub-categoria">×</button></span>`).join('')}
        </div>
      </div>
    `).join('');
    [`cat-${type}-editor`, `fin-cat-${type}-editor`].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  });
  renderFinanceSubcategorySelects();
}
function updateCatSelects(selectedCat = '', selectedSub = '') {
  const finCat = document.getElementById('fin-cat');
  const budCat = document.getElementById('bud-cat');
  const type = S.finType;
  if (finCat) {
    const previous = selectedCat || finCat.value;
    finCat.innerHTML = getCategories(type).map(c => `<option value="${esc(c.name)}">${c.icon} ${esc(c.name)}</option>`).join('');
    if (previous && getCategories(type).some(c => c.name === previous)) finCat.value = previous;
    if (!finCat.value && getCategories(type)[0]) finCat.value = getCategories(type)[0].name;
    renderFinSubcats(selectedSub);
  }
  if (budCat) {
    budCat.innerHTML = [...getCategories('expense'), ...getCategories('income')]
      .map(c => `<option value="${esc(c.name)}">${c.icon} ${esc(c.name)}</option>`).join('');
  }
}
function renderFinSubcats(selected = '') {
  const catSelect = document.getElementById('fin-cat');
  const subSelect = document.getElementById('fin-sub-cat');
  if (!catSelect || !subSelect) return;
  const cat = getFinanceCat(S.finType, catSelect.value);
  const subs = cat.subs?.length ? cat.subs : ['Geral'];
  const previous = selected || subSelect.value;
  subSelect.innerHTML = subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  if (previous && subs.includes(previous)) subSelect.value = previous;
  if (!subSelect.value && subs[0]) subSelect.value = subs[0];
}
function getCredit(id) {
  return S.credits.find(c => c.id === id) || null;
}
function creditLabel(c) {
  return c ? `${CRED_ICONS[c.type] || '🏦'} ${c.name}` : '';
}
function renderCreditLinkSelect(selected = '') {
  const select = document.getElementById('fin-credit');
  if (!select) return;
  const canLink = S.finType === 'expense' && S.credits.length > 0;
  const previous = selected || select.value;
  select.innerHTML = `<option value="">Sem ligação a crédito</option>` + S.credits.map(c => `<option value="${esc(c.id)}">${esc(creditLabel(c))}</option>`).join('');
  select.disabled = !canLink;
  if (canLink && previous && S.credits.some(c => c.id === previous)) select.value = previous;
  else select.value = '';
}
function showCatEditor(type) {
  showTab('orcamento', document.querySelector(".tab-btn[onclick*='orcamento']") || document.querySelectorAll('.tab-btn')[0]);
}

// ══════════════════════════════════════
// FINANCE
// ══════════════════════════════════════
function setFinType(t) {
  S.finType = t;
  document.getElementById('fin-btn-exp').className = 'type-btn' + (t==='expense' ? ' exp' : '');
  document.getElementById('fin-btn-inc').className = 'type-btn' + (t==='income' ? ' inc' : '');
  updateCatSelects();
  renderCreditLinkSelect();
  renderCategoryEditors();
}

function addTransaction() {
  const desc = document.getElementById('fin-desc').value.trim();
  const amount = num('fin-amount');
  const cat = document.getElementById('fin-cat').value;
  const subCat = document.getElementById('fin-sub-cat')?.value || 'Geral';
  const creditId = S.finType === 'expense' ? (document.getElementById('fin-credit')?.value || '') : '';
  const date = document.getElementById('fin-date').value;
  const note = document.getElementById('fin-note').value.trim();
  if (!desc) { highlight('fin-desc'); return; }
  if (!amount || amount <= 0) { highlight('fin-amount'); return; }
  if (!date) { highlight('fin-date'); return; }
  const payload = { id: UI.editing.transaction || uid(), type: S.finType, desc, amount, cat, subCat, creditId, date, note };
  const idx = S.transactions.findIndex(t => t.id === UI.editing.transaction);
  if (idx >= 0) S.transactions[idx] = payload;
  else S.transactions.push(payload);
  save(); renderFin(); renderBudget(); renderCredits(); renderDashboard();
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
  renderFinSubcats(t.subCat || 'Geral');
  renderCreditLinkSelect(t.creditId || '');
  document.getElementById('fin-date').value = t.date || today();
  document.getElementById('fin-note').value = t.note || '';
  setEditMode('transaction', true);
  document.getElementById('fin-desc').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteTransaction(id) {
  if (!confirm('Eliminar esta transação?')) return;
  S.transactions = S.transactions.filter(t => t.id !== id);
  save(); renderFin(); renderBudget(); renderCredits(); renderDashboard(); toast('Eliminado');
}

function renderFin() {
  updateMonthLabels();
  updateCatSelects();
  renderCreditLinkSelect();
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
  }).filter(t => !q || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q) || (t.subCat || 'Geral').toLowerCase().includes(q));

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
      const linkedCredit = getCredit(t.creditId);
      const creditTag = linkedCredit ? `<span class="tag credit-link">crédito: ${esc(linkedCredit.name)}</span>` : '';
      return `<div class="tx-row" style="grid-template-columns:34px 1fr auto auto">
        <div class="tx-icon ${t.type}" style="background:${t.type==='expense'?'var(--red-d)':'var(--teal-d)'}">${getCatIcon(t.type, t.cat)}</div>
        <div><div class="tx-desc">${esc(t.desc)}</div>
        <div class="tx-meta"><span>${fmtDate(t.date)}</span><span class="tag">${esc(t.cat)} · ${esc(t.subCat || 'Geral')}</span>${creditTag}${budTag}${t.note?`<span style="color:var(--text3);font-size:0.72rem">📝 ${esc(t.note.slice(0,30))}</span>`:''}</div></div>
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

  const subBars = document.getElementById('fin-subcat-bars');
  if (subBars) {
    const subTotals = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      const key = `${t.cat}|${t.subCat || 'Geral'}`;
      subTotals[key] = (subTotals[key] || 0) + t.amount;
    });
    const rows = Object.entries(subTotals).sort((a,b) => b[1] - a[1]);
    const maxVal = Math.max(...rows.map(([,v]) => v), 0.01);
    subBars.innerHTML = rows.length ? rows.map(([key, val], i) => {
      const [cat, sub] = key.split('|');
      return `<div class="bar-row">
        <div class="bar-label">${getCatIcon('expense', cat)} ${esc(sub)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(val / maxVal * 100).toFixed(1)}%;background:${CAT_COLORS[i % CAT_COLORS.length]}"></div></div>
        <div class="bar-val">${fmt(val)}</div>
      </div>`;
    }).join('') : '<div style="color:var(--text3);font-size:0.82rem;padding:8px 0">Sem dados</div>';
  }
}

// ══════════════════════════════════════
// TIME TRACKING
// ══════════════════════════════════════
function getTimeCategories() {
  S.categories.time = normalizeTimeCategories(S.categories.time);
  return S.categories.time;
}

function getTimeCat(id) {
  return getTimeCategories().find(c => c.id === id) || { id, icon: '⏱', name: id || 'Tempo', color: 'var(--blue)', subs: ['Geral'] };
}

function timeCatLabel(cat) {
  return `${cat.icon || '⏱'} ${cat.name || 'Tempo'}`;
}

function softTimeColor(color) {
  const map = {
    'var(--teal)': 'var(--teal-d)',
    'var(--gold)': 'var(--gold-d)',
    'var(--purple)': 'var(--purple-d)',
    'var(--blue)': 'var(--blue-d)',
    'var(--red)': 'var(--red-d)'
  };
  return map[color] || `${color}22`;
}

function renderTimeMainCats(selected = '') {
  const select = document.getElementById('time-main-cat');
  if (!select) return;
  const previous = selected || select.value;
  const cats = getTimeCategories();
  select.innerHTML = cats.map(c => `<option value="${esc(c.id)}">${esc(timeCatLabel(c))}</option>`).join('');
  if (previous && cats.some(c => c.id === previous)) select.value = previous;
  if (!select.value && cats[0]) select.value = cats[0].id;
}

function renderTimeSubcats(selected = '') {
  renderTimeMainCats();
  const main = document.getElementById('time-main-cat').value;
  const subSelect = document.getElementById('time-sub-cat');
  const previous = selected || subSelect.value;
  const subs = getTimeCat(main).subs || ['Geral'];
  subSelect.innerHTML = subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  if (previous && subs.includes(previous)) subSelect.value = previous;
}

function renderTimeSubcategorySelect(selected = '') {
  const select = document.getElementById('time-sub-add-cat');
  if (!select) return;
  const cats = getTimeCategories();
  const previous = selected || select.value;
  select.innerHTML = cats.map(c => `<option value="${esc(c.id)}">${esc(timeCatLabel(c))}</option>`).join('');
  if (previous && cats.some(c => c.id === previous)) select.value = previous;
  if (!select.value && cats[0]) select.value = cats[0].id;
}

function addTimeCategory() {
  const iconEl = document.getElementById('new-time-icon');
  const nameEl = document.getElementById('new-time-name');
  const subsEl = document.getElementById('new-time-subs');
  const icon = iconEl.value.trim() || '⏱';
  const name = nameEl.value.trim();
  const subs = subsEl.value.split(',').map(s => s.trim()).filter(Boolean);
  if (!name) { highlight('new-time-name'); return; }
  const cats = getTimeCategories();
  const baseId = slugify(name);
  let id = baseId;
  let n = 2;
  while (cats.some(c => c.id === id)) id = `${baseId}-${n++}`;
  if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast('Categoria de tempo já existe'); return; }
  cats.push({ id, icon, name, color: TIME_COLOR_PALETTE[cats.length % TIME_COLOR_PALETTE.length], subs: subs.length ? subs : ['Geral'] });
  iconEl.value = '';
  nameEl.value = '';
  subsEl.value = '';
  save();
  renderTimeMainCats(id);
  renderTimeSubcategorySelect(id);
  renderTimeSubcats();
  renderTimeCategoryEditor();
  renderTime();
  toast('Categoria de tempo adicionada', 'var(--blue)');
}

function addTimeSubcategory() {
  const select = document.getElementById('time-sub-add-cat');
  const input = document.getElementById('new-time-sub');
  const catId = select?.value;
  const name = input?.value.trim();
  const cats = getTimeCategories();
  const cat = cats.find(c => c.id === catId);
  if (!cat) { toast('Escolha uma categoria', 'var(--red)'); return; }
  if (!name) { highlight('new-time-sub'); return; }
  cat.subs = Array.isArray(cat.subs) ? cat.subs : ['Geral'];
  if (cat.subs.some(s => s.toLowerCase() === name.toLowerCase())) {
    toast('Sub-categoria ja existe', 'var(--gold)');
    return;
  }
  cat.subs.push(name);
  if (input) input.value = '';
  save();
  renderTimeSubcategorySelect(catId);
  if (document.getElementById('time-main-cat')?.value === catId) renderTimeSubcats(name);
  else renderTimeSubcats();
  renderTimeCategoryEditor();
  renderTime();
  toast('Sub-categoria adicionada', 'var(--blue)');
}

function removeTimeSubcategory(catId, sub) {
  const cat = getTimeCategories().find(c => c.id === catId);
  if (!cat) return;
  cat.subs = Array.isArray(cat.subs) ? cat.subs : ['Geral'];
  if (cat.subs.length <= 1 && sub === 'Geral') {
    toast('Mantem pelo menos uma sub-categoria', 'var(--red)');
    return;
  }
  const used = S.timeEntries.some(e => e.mainCat === catId && (e.subCat || 'Geral') === sub);
  if (used && !confirm(`A sub-categoria "${sub}" tem registos. Os registos passam para "Geral". Continuar?`)) return;
  cat.subs = cat.subs.filter(s => s !== sub);
  if (!cat.subs.length) cat.subs.push('Geral');
  if (used && !cat.subs.includes('Geral')) cat.subs.unshift('Geral');
  if (used) {
    S.timeEntries.forEach(e => {
      if (e.mainCat === catId && (e.subCat || 'Geral') === sub) e.subCat = 'Geral';
    });
  }
  save();
  renderTimeSubcategorySelect(catId);
  renderTimeSubcats();
  renderTimeCategoryEditor();
  renderTime();
  toast('Sub-categoria removida');
}

function removeTimeCategory(id) {
  const cat = getTimeCat(id);
  const isUsed = S.timeEntries.some(e => e.mainCat === id);
  if (isUsed && !confirm(`A categoria "${cat.name}" tem registos. Remover mesmo assim?`)) return;
  S.categories.time = getTimeCategories().filter(c => c.id !== id);
  save();
  renderTimeSubcategorySelect();
  renderTimeSubcats();
  renderTimeCategoryEditor();
  renderTime();
  toast('Categoria de tempo removida');
}

function renderTimeCategoryEditor() {
  const el = document.getElementById('cat-time-editor');
  if (!el) return;
  renderTimeSubcategorySelect();
  el.innerHTML = getTimeCategories().map(c => `
    <div class="time-cat-panel">
      <div class="time-cat-panel-head">
        <div class="time-cat-title">
          <span class="icon">${esc(c.icon)}</span>
          <span>${esc(c.name)}</span>
        </div>
        <span class="time-cat-count">${c.subs.length} sub</span>
        <button class="remove btn btn-danger btn-sm" onclick="removeTimeCategory('${jsStr(c.id)}')" title="Remover">×</button>
      </div>
      <div class="time-sub-chip-list">
        ${(c.subs || ['Geral']).map(s => `<span class="time-sub-chip">${esc(s)}<button class="sub-chip-remove" onclick="removeTimeSubcategory('${jsStr(c.id)}','${jsStr(s)}')" title="Remover sub-categoria">×</button></span>`).join('')}
      </div>
    </div>
  `).join('');
}

function addTimeEntry() {
  const mainCat = document.getElementById('time-main-cat').value;
  const subCat = document.getElementById('time-sub-cat').value || 'Geral';
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
  renderTimeMainCats(e.mainCat || 'familia');
  renderTimeSubcats(e.subCat || '');
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
  renderTimeCategoryEditor();
  const m = S.months.time.getMonth(), y = S.months.time.getFullYear();
  const entries = filterByMonth(S.timeEntries, 'date', m, y);
  const total = entries.reduce((s,e) => s + e.hours, 0);
  const cats = getTimeCategories();

  const byMain = {};
  cats.forEach(c => byMain[c.id] = 0);
  entries.forEach(e => byMain[e.mainCat] = (byMain[e.mainCat] || 0) + e.hours);

  // KPIs
  const kpis = document.getElementById('time-kpi-categories');
  if (kpis) {
    const totalCard = `<div class="kpi-card" style="--accent:var(--blue);--accent-bg:var(--blue-d)">
      <label>Horas Registadas</label>
      <div class="val">${fmtH(total)}</div>
      <div class="sub">este mês</div>
    </div>`;
    const categoryCards = cats.map(cat => {
      const h = byMain[cat.id] || 0;
      return `<div class="kpi-card" style="--accent:${cat.color};--accent-bg:${softTimeColor(cat.color)}">
        <label>${esc(cat.icon)} ${esc(cat.name)}</label>
        <div class="val">${fmtH(h)}</div>
        <div class="sub">${total ? pct(h, total) + ' do total' : '—'}</div>
      </div>`;
    }).join('');
    kpis.innerHTML = totalCard + categoryCards;
  }

  // Circles
  const circles = document.getElementById('time-circles');
  circles.innerHTML = cats.map(cat => {
    const h = byMain[cat.id] || 0;
    const p = total > 0 ? h / total : 0;
    const r = 38, cx = 44, cy = 44, stroke = 7;
    const circ = 2 * Math.PI * r;
    const dash = circ * p;
    return `<div class="time-circle-card">
      <div class="circle-label">${esc(timeCatLabel(cat))}</div>
      <svg class="circle-svg" width="88" height="88" viewBox="0 0 88 88">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cat.color}" stroke-width="${stroke}"
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
    const info = getTimeCat(main);
    return `<div class="bar-row">
      <div class="bar-label">${esc(info.icon || '⏱')} ${esc(sub)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(h/maxH*100).toFixed(1)}%;background:${info.color || 'var(--gold)'}"></div></div>
      <div class="bar-val">${fmtH(h)}</div>
    </div>`;
  }).join('') : '<div style="color:var(--text3);font-size:0.82rem">Sem dados</div>';

  // Dashboard by category and subcategory
  const categoryDash = document.getElementById('time-category-dashboard');
  if (categoryDash) {
    const groups = cats.map(cat => {
      const catEntries = entries.filter(e => e.mainCat === cat.id);
      const catTotal = catEntries.reduce((s,e) => s + e.hours, 0);
      const subMap = {};
      catEntries.forEach(e => {
        const sub = e.subCat || 'Geral';
        subMap[sub] = (subMap[sub] || 0) + e.hours;
      });
      const rows = Object.entries(subMap).sort((a,b) => b[1] - a[1]);
      return { cat, catTotal, rows };
    }).sort((a,b) => b.catTotal - a.catTotal);

    categoryDash.innerHTML = total ? groups.map(({ cat, catTotal, rows }) => {
      const maxSub = Math.max(...rows.map(([,h]) => h), 0.01);
      const rowHtml = rows.length ? rows.map(([sub, h]) => `
        <div class="time-dash-row">
          <div class="time-dash-label">${esc(sub)}</div>
          <div class="time-dash-track"><div class="time-dash-fill" style="width:${(h / maxSub * 100).toFixed(1)}%;background:${cat.color || 'var(--blue)'}"></div></div>
          <div class="time-dash-val">${fmtH(h)} · ${pct(h, total)}</div>
        </div>
      `).join('') : '<div class="time-dash-empty">Sem registos neste mes</div>';
      return `<div class="time-dash-group">
        <div class="time-dash-head">
          <div class="time-dash-title"><span>${esc(cat.icon || '⏱')}</span><span>${esc(cat.name)}</span></div>
          <strong style="color:${cat.color || 'var(--blue)'}">${fmtH(catTotal)}</strong>
        </div>
        <div class="time-dash-subrows">${rowHtml}</div>
      </div>`;
    }).join('') : '<div class="time-dash-empty">Sem dados neste mes</div>';
  }

  // List
  const list = document.getElementById('time-list');
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.length ? sorted.map(e => {
    const info = getTimeCat(e.mainCat);
    return `<div class="tx-row" style="grid-template-columns:34px 1fr auto auto">
      <div class="tx-icon" style="background:${softTimeColor(info.color || 'var(--blue)')}">${esc(info.icon || '⏱')}</div>
      <div>
        <div class="tx-desc">${e.desc ? esc(e.desc) : esc(e.subCat)}</div>
        <div class="tx-meta"><span>${fmtDate(e.date)}</span><span class="tag" style="background:${softTimeColor(info.color||'var(--blue)')};color:${info.color||'var(--blue)'}">${esc(e.subCat)}</span>${e.note?`<span style="color:var(--text3);font-size:0.72rem">📝 ${esc(e.note.slice(0,30))}</span>`:''}</div>
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
// PATRIMÓNIO
// ══════════════════════════════════════
function getPatrimonyCategories(type = '') {
  S.patrimony = normalizePatrimony(S.patrimony);
  return S.patrimony.categories.filter(c => !type || c.type === type);
}

function getPatrimonyCategory(id) {
  return S.patrimony.categories.find(c => c.id === id) || null;
}

function getPatrimonyTypeLabel(type) {
  return type === 'liability' ? 'Passivo' : 'Ativo';
}

function renderPatrimonyCategorySelects(selectedCat = '', selectedSub = '') {
  const typeEl = document.getElementById('pat-type');
  const catEl = document.getElementById('pat-category');
  const subEl = document.getElementById('pat-subcat');
  if (!typeEl || !catEl || !subEl) return;
  const type = typeEl.value || 'asset';
  const cats = getPatrimonyCategories(type);
  const previousCat = selectedCat || catEl.value;
  catEl.innerHTML = cats.map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  if (previousCat && cats.some(c => c.id === previousCat)) catEl.value = previousCat;
  if (!catEl.value && cats[0]) catEl.value = cats[0].id;
  const cat = getPatrimonyCategory(catEl.value) || cats[0];
  const subs = cat?.subs?.length ? cat.subs : ['Geral'];
  const previousSub = selectedSub || subEl.value;
  subEl.innerHTML = subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  if (previousSub && subs.includes(previousSub)) subEl.value = previousSub;
}

function addPatrimonyCategory() {
  const type = document.getElementById('new-pat-type').value;
  const iconEl = document.getElementById('new-pat-icon');
  const nameEl = document.getElementById('new-pat-name');
  const subsEl = document.getElementById('new-pat-subs');
  const icon = iconEl.value.trim() || (type === 'liability' ? '🏦' : '💎');
  const name = nameEl.value.trim();
  const subs = subsEl.value.split(',').map(s => s.trim()).filter(Boolean);
  if (!name) { highlight('new-pat-name'); return; }
  const cats = S.patrimony.categories;
  if (cats.some(c => c.type === type && c.name.toLowerCase() === name.toLowerCase())) {
    toast('Categoria de património já existe');
    return;
  }
  let id = slugify(name);
  let n = 2;
  while (cats.some(c => c.id === id)) id = `${slugify(name)}-${n++}`;
  cats.push({ id, type, icon, name, subs: subs.length ? subs : ['Geral'] });
  iconEl.value = '';
  nameEl.value = '';
  subsEl.value = '';
  save();
  renderPatrimonyCategorySelects(id);
  renderPatrimonyCategoryEditor();
  toast('Categoria criada', 'var(--blue)');
}

function removePatrimonyCategory(id) {
  const cat = getPatrimonyCategory(id);
  if (!cat) return;
  const sameTypeCats = getPatrimonyCategories(cat.type);
  if (sameTypeCats.length <= 1) {
    toast('Mantém pelo menos uma categoria por tipo', 'var(--red)');
    return;
  }
  const used = S.patrimony.items.some(i => i.categoryId === id);
  if (used && !confirm(`A categoria "${cat.name}" tem itens. Remover e mover para outra categoria?`)) return;
  const fallback = sameTypeCats.find(c => c.id !== id);
  S.patrimony.items.forEach(i => {
    if (i.categoryId === id) {
      i.categoryId = fallback.id;
      i.subcat = fallback.subs[0] || 'Geral';
    }
  });
  S.patrimony.categories = S.patrimony.categories.filter(c => c.id !== id);
  save();
  renderPatrimony();
  toast('Categoria removida');
}

function renderPatrimonyCategoryEditor() {
  const el = document.getElementById('pat-category-editor');
  if (!el) return;
  el.innerHTML = S.patrimony.categories.map(c => `
    <div class="cat-chip pat-cat-chip" title="${esc(c.subs.join(', '))}">
      <span class="icon">${esc(c.icon)}</span>
      <span>${esc(c.name)}</span>
      <small>${getPatrimonyTypeLabel(c.type)}</small>
      <button class="remove" onclick="removePatrimonyCategory('${jsStr(c.id)}')" title="Remover">×</button>
    </div>
  `).join('');
}

function addPatrimonyItem() {
  const type = document.getElementById('pat-type').value;
  const name = document.getElementById('pat-name').value.trim();
  const categoryId = document.getElementById('pat-category').value;
  const subcat = document.getElementById('pat-subcat').value || 'Geral';
  const value = num('pat-value');
  const date = document.getElementById('pat-date').value || today();
  const note = document.getElementById('pat-note').value.trim();
  if (!name) { highlight('pat-name'); return; }
  if (!categoryId) { highlight('pat-category'); return; }
  if (!value || value <= 0) { highlight('pat-value'); return; }
  const payload = { id: UI.editing.patrimony || uid(), type, name, categoryId, subcat, value, date, note };
  const idx = S.patrimony.items.findIndex(i => i.id === UI.editing.patrimony);
  if (idx >= 0) S.patrimony.items[idx] = payload;
  else S.patrimony.items.push(payload);
  const wasEditing = Boolean(UI.editing.patrimony);
  UI.editing.patrimony = null;
  setEditMode('patrimony', false);
  clearPatrimonyForm();
  save();
  renderPatrimony();
  renderDashboard();
  toast(wasEditing ? 'Património atualizado' : 'Item registado', type === 'asset' ? 'var(--teal)' : 'var(--red)');
}

function editPatrimonyItem(id) {
  const item = S.patrimony.items.find(i => i.id === id);
  if (!item) return;
  UI.editing.patrimony = id;
  document.getElementById('pat-type').value = item.type;
  renderPatrimonyCategorySelects(item.categoryId, item.subcat);
  document.getElementById('pat-name').value = item.name || '';
  document.getElementById('pat-value').value = item.value || '';
  document.getElementById('pat-date').value = item.date || today();
  document.getElementById('pat-note').value = item.note || '';
  setEditMode('patrimony', true);
  document.getElementById('pat-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deletePatrimonyItem(id) {
  if (!confirm('Eliminar este item de património?')) return;
  S.patrimony.items = S.patrimony.items.filter(i => i.id !== id);
  save();
  renderPatrimony();
  renderDashboard();
  toast('Item eliminado');
}

function patrimonyTotals() {
  const assets = S.patrimony.items.filter(i => i.type === 'asset').reduce((s,i) => s + i.value, 0);
  const liabilities = S.patrimony.items.filter(i => i.type === 'liability').reduce((s,i) => s + i.value, 0);
  return { assets, liabilities, net: assets - liabilities };
}

function renderPatrimony() {
  normalizeState();
  const root = document.getElementById('page-patrimonio');
  if (!root) return;
  renderPatrimonyCategorySelects();
  renderPatrimonyCategoryEditor();
  const totals = patrimonyTotals();
  document.getElementById('pat-kpi-assets').textContent = fmt(totals.assets);
  document.getElementById('pat-kpi-liabilities').textContent = fmt(totals.liabilities);
  document.getElementById('pat-kpi-net').textContent = fmt(totals.net);
  document.getElementById('pat-kpi-count').textContent = S.patrimony.items.length;

  const byCat = {};
  S.patrimony.items.forEach(item => {
    const cat = getPatrimonyCategory(item.categoryId);
    const key = `${item.type}|${item.categoryId}`;
    if (!byCat[key]) byCat[key] = { label: `${cat?.icon || ''} ${cat?.name || 'Categoria'}`, type: item.type, value: 0 };
    byCat[key].value += item.value;
  });
  const rows = Object.values(byCat).sort((a,b) => b.value - a.value);
  const maxVal = Math.max(...rows.map(r => r.value), 0.01);
  const bars = document.getElementById('pat-breakdown');
  bars.innerHTML = rows.length ? rows.map(r => {
    const color = r.type === 'asset' ? 'var(--teal)' : 'var(--red)';
    return `<div class="bar-row">
      <div class="bar-label">${esc(r.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.value/maxVal*100).toFixed(1)}%;background:${color}"></div></div>
      <div class="bar-val">${fmt(r.value)}</div>
    </div>`;
  }).join('') : '<div style="color:var(--text3);font-size:0.82rem">Sem dados</div>';

  const list = document.getElementById('pat-list');
  const sorted = [...S.patrimony.items].sort((a,b) => b.value - a.value);
  list.innerHTML = sorted.length ? sorted.map(item => {
    const cat = getPatrimonyCategory(item.categoryId);
    const isAsset = item.type === 'asset';
    return `<div class="tx-row pat-row">
      <div class="tx-icon" style="background:${isAsset ? 'var(--teal-d)' : 'var(--red-d)'}">${cat?.icon || (isAsset ? '💎' : '🏦')}</div>
      <div>
        <div class="tx-desc">${esc(item.name)}</div>
        <div class="tx-meta"><span>${getPatrimonyTypeLabel(item.type)}</span><span class="tag" style="background:${isAsset ? 'var(--teal-d)' : 'var(--red-d)'};color:${isAsset ? 'var(--teal)' : 'var(--red)'}">${esc(cat?.name || 'Categoria')} · ${esc(item.subcat)}</span><span>${fmtDate(item.date)}</span>${item.note?`<span style="color:var(--text3);font-size:0.72rem">${esc(item.note.slice(0,36))}</span>`:''}</div>
      </div>
      <div class="mono ${isAsset ? 'c-teal' : 'c-red'}">${fmt(item.value)}</div>
      <div class="row-actions">
        <button class="btn btn-ghost btn-sm" onclick="editPatrimonyItem('${item.id}')" title="Editar">✎</button>
        <button class="btn btn-danger btn-sm" onclick="deletePatrimonyItem('${item.id}')" title="Eliminar">×</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><div class="e-icon">◎</div>Sem itens de património</div>`;
}

// ══════════════════════════════════════
// DASHBOARD GERAL
// ══════════════════════════════════════
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function monthStats(date = new Date()) {
  const m = date.getMonth(), y = date.getFullYear();
  const tx = S.transactions.filter(t => {
    const d = toDate(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  const income = tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expenses = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const now = new Date();
  const isCurrent = m === now.getMonth() && y === now.getFullYear();
  const days = isCurrent ? Math.max(now.getDate(), 1) : daysInMonth(y, m);
  return { income, expenses, saved: income - expenses, days, tx };
}

function wealthSnapshot() {
  normalizeState();
  const pat = patrimonyTotals();
  const investments = S.investments.reduce((s,i) => s + i.qty * i.currPrice, 0);
  const reserves = getEmergencyReserves().reduce((s,r) => s + r.currentAmount, 0);
  const creditDebt = S.credits.reduce((s,c) => s + creditOutstanding(c), 0);
  const assets = pat.assets + investments + reserves;
  const liabilities = pat.liabilities + creditDebt;
  return { assets, liabilities, net: assets - liabilities, investments, reserves, patrimonyAssets: pat.assets, patrimonyLiabilities: pat.liabilities, creditDebt };
}

function renderDashboard() {
  const root = document.getElementById('page-dashboard');
  if (!root) return;
  normalizeState();
  const current = monthStats(new Date());
  const previousDate = new Date();
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previous = monthStats(previousDate);
  const spendPerDay = current.expenses / current.days;
  const savedPerDay = current.saved / current.days;
  const prevSavedPerDay = previous.saved / previous.days;
  const deltaSaved = savedPerDay - prevSavedPerDay;
  const hasPrevious = previous.tx.length > 0;
  const trendGood = hasPrevious ? deltaSaved >= 0 : current.saved >= 0;
  const wealth = wealthSnapshot();
  const savingRate = current.income > 0 ? (current.saved / current.income) * 100 : 0;
  const ratio = wealth.liabilities > 0 ? wealth.assets / wealth.liabilities : null;

  document.getElementById('dash-spend-day').textContent = fmt(spendPerDay);
  document.getElementById('dash-spend-day-sub').textContent = `${fmt(current.expenses)} gastos em ${current.days} dias`;
  document.getElementById('dash-saved-day').textContent = fmt(savedPerDay);
  document.getElementById('dash-saved-day-sub').textContent = `${savingRate.toFixed(1)}% de taxa de poupança`;
  document.getElementById('dash-assets-liabilities').textContent = `${fmt(wealth.assets)} / ${fmt(wealth.liabilities)}`;
  document.getElementById('dash-assets-liabilities-sub').textContent = ratio === null ? 'sem passivo registado' : `${ratio.toFixed(2)}x ativo/passivo`;
  document.getElementById('dash-trend').textContent = trendGood ? 'A evoluir' : 'A retroceder';
  document.getElementById('dash-trend').style.color = trendGood ? 'var(--teal)' : 'var(--red)';
  document.getElementById('dash-trend-sub').textContent = hasPrevious
    ? `${deltaSaved >= 0 ? '+' : ''}${fmt(deltaSaved)} vs mês anterior`
    : 'sem mês anterior para comparar';

  document.getElementById('dash-net-worth').textContent = fmt(wealth.net);
  document.getElementById('dash-month-income').textContent = fmt(current.income);
  document.getElementById('dash-month-expenses').textContent = fmt(current.expenses);
  document.getElementById('dash-credit-debt').textContent = fmt(wealth.creditDebt);
  document.getElementById('dash-reserves').textContent = fmt(wealth.reserves);
  document.getElementById('dash-investments').textContent = fmt(wealth.investments);

  const categoryTotals = {};
  current.tx.filter(t => t.type === 'expense').forEach(t => categoryTotals[t.cat] = (categoryTotals[t.cat] || 0) + t.amount);
  const topCats = Object.entries(categoryTotals).sort((a,b) => b[1]-a[1]).slice(0,5);
  const maxCat = Math.max(...topCats.map(([,v]) => v), 0.01);
  const topEl = document.getElementById('dash-top-expenses');
  topEl.innerHTML = topCats.length ? topCats.map(([cat, value]) => `<div class="bar-row">
    <div class="bar-label">${esc(cat)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(value/maxCat*100).toFixed(1)}%;background:var(--red)"></div></div>
    <div class="bar-val">${fmt(value)}</div>
  </div>`).join('') : '<div style="color:var(--text3);font-size:0.82rem">Sem despesas este mês</div>';

  const wealthRows = [
    { label: 'Património ativo', value: wealth.patrimonyAssets, color: 'var(--teal)' },
    { label: 'Investimentos', value: wealth.investments, color: 'var(--blue)' },
    { label: 'Reservas', value: wealth.reserves, color: 'var(--gold)' },
    { label: 'Créditos', value: wealth.creditDebt, color: 'var(--red)' },
    { label: 'Outros passivos', value: wealth.patrimonyLiabilities, color: 'var(--purple)' }
  ].filter(r => r.value > 0);
  const maxWealth = Math.max(...wealthRows.map(r => r.value), 0.01);
  document.getElementById('dash-wealth-breakdown').innerHTML = wealthRows.length ? wealthRows.map(r => `<div class="bar-row">
    <div class="bar-label">${r.label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(r.value/maxWealth*100).toFixed(1)}%;background:${r.color}"></div></div>
    <div class="bar-val">${fmt(r.value)}</div>
  </div>`).join('') : '<div style="color:var(--text3);font-size:0.82rem">Sem património registado</div>';

  const signals = document.getElementById('dash-signals');
  const emergency = emergencyCalc();
  signals.innerHTML = [
    { label: 'Reserva', value: emergency.target > 0 ? `${emergency.progress.toFixed(0)}% concluído` : 'sem objetivo', tone: emergency.progress >= 100 ? 'good' : emergency.progress >= 50 ? 'warn' : 'bad' },
    { label: 'Créditos ativos', value: `${S.credits.length}`, tone: S.credits.length ? 'warn' : 'good' },
    { label: 'Registos de tempo', value: `${S.timeEntries.length}`, tone: S.timeEntries.length ? 'good' : 'warn' },
    { label: 'Itens de património', value: `${S.patrimony.items.length}`, tone: S.patrimony.items.length ? 'good' : 'warn' }
  ].map(s => `<div class="dash-signal ${s.tone}"><span>${s.label}</span><strong>${s.value}</strong></div>`).join('');
}

// ══════════════════════════════════════
// EMERGENCY RESERVE
function emergencyCalc() {
  const reserves = getEmergencyReserves();
  const current = reserves.reduce((s,r) => s + r.currentAmount, 0);
  const monthly = reserves.reduce((s,r) => s + r.monthlyExpenses, 0);
  const target = reserves.reduce((s,r) => s + r.monthlyExpenses * r.targetMonths, 0);
  const missing = Math.max(target - current, 0);
  const covered = monthly > 0 ? current / monthly : 0;
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const targetDates = reserves.map(r => r.targetDate).filter(Boolean).sort();
  return { reserves, monthly, current, target, covered, missing, progress, nextTargetDate: targetDates[0] || '' };
}

function getEmergencyReserves() {
  normalizeState();
  return S.emergency.reserves;
}

function getEmergencyReserve(id) {
  return getEmergencyReserves().find(r => r.id === id) || null;
}

function reserveCalc(reserve) {
  const target = reserve.monthlyExpenses * reserve.targetMonths;
  const missing = Math.max(target - reserve.currentAmount, 0);
  const progress = target > 0 ? Math.min((reserve.currentAmount / target) * 100, 100) : 0;
  const covered = reserve.monthlyExpenses > 0 ? reserve.currentAmount / reserve.monthlyExpenses : 0;
  const daysLeft = reserve.targetDate ? Math.ceil((toDate(reserve.targetDate) - toDate(today())) / 86400000) : null;
  const monthsLeft = daysLeft !== null ? Math.max(daysLeft / 30.44, 0) : null;
  const monthlyNeeded = missing > 0
    ? monthsLeft && monthsLeft > 0
      ? missing / monthsLeft
      : missing / 12
    : 0;
  return { target, missing, progress, covered, daysLeft, monthsLeft, monthlyNeeded };
}

function renderEmergencyMoveReserveOptions(selected = '') {
  const select = document.getElementById('res-move-reserve');
  if (!select) return;
  const reserves = getEmergencyReserves();
  select.innerHTML = reserves.length
    ? reserves.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')
    : '<option value="">Crie uma reserva primeiro</option>';
  if (selected && reserves.some(r => r.id === selected)) select.value = selected;
}

function saveEmergencySettings() {
  normalizeState();
  const name = document.getElementById('res-name').value.trim();
  const monthly = num('res-monthly');
  const months = parseInt(document.getElementById('res-months').value, 10);
  const current = num('res-current');
  const targetDate = document.getElementById('res-target-date').value;
  const location = document.getElementById('res-location').value.trim();
  if (!name) { highlight('res-name'); return; }
  if (Number.isNaN(monthly) || monthly < 0) { highlight('res-monthly'); return; }
  if (!months || months < 1) { highlight('res-months'); return; }
  if (Number.isNaN(current) || current < 0) { highlight('res-current'); return; }
  const editingId = UI.editing.reserve;
  const existing = editingId ? getEmergencyReserve(editingId) : null;
  const reserve = {
    id: existing?.id || uid(),
    name,
    monthlyExpenses: monthly,
    targetMonths: months,
    targetDate,
    currentAmount: current,
    location,
    moves: existing?.moves || []
  };
  const idx = S.emergency.reserves.findIndex(r => r.id === reserve.id);
  if (idx >= 0) S.emergency.reserves[idx] = reserve;
  else S.emergency.reserves.push(reserve);
  const wasEditing = Boolean(UI.editing.reserve);
  UI.editing.reserve = null;
  setEditMode('reserve', false);
  clearEmergencyForm();
  save();
  renderEmergency();
  toast(wasEditing ? 'Reserva atualizada' : 'Reserva criada', 'var(--teal)');
}

function editEmergencyReserve(id) {
  const reserve = getEmergencyReserve(id);
  if (!reserve) return;
  UI.editing.reserve = id;
  document.getElementById('res-name').value = reserve.name || '';
  document.getElementById('res-monthly').value = reserve.monthlyExpenses || '';
  document.getElementById('res-months').value = reserve.targetMonths || 6;
  document.getElementById('res-current').value = reserve.currentAmount || '';
  document.getElementById('res-target-date').value = reserve.targetDate || '';
  document.getElementById('res-location').value = reserve.location || '';
  setEditMode('reserve', true);
  document.getElementById('res-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteEmergencyReserve(id) {
  const reserve = getEmergencyReserve(id);
  if (!reserve || !confirm(`Eliminar a reserva "${reserve.name}" e os seus movimentos?`)) return;
  S.emergency.reserves = S.emergency.reserves.filter(r => r.id !== id);
  if (UI.editing.reserve === id) {
    UI.editing.reserve = null;
    setEditMode('reserve', false);
    clearEmergencyForm();
  }
  save();
  renderEmergency();
  toast('Reserva eliminada');
}

function addEmergencyMove() {
  normalizeState();
  const reserveId = document.getElementById('res-move-reserve').value;
  const reserve = getEmergencyReserve(reserveId);
  const type = document.getElementById('res-move-type').value;
  const amount = num('res-move-amount');
  const date = document.getElementById('res-move-date').value || today();
  const note = document.getElementById('res-move-note').value.trim();
  if (!reserve) { toast('Crie uma reserva antes de adicionar movimentos', 'var(--red)'); return; }
  if (!amount || amount <= 0) { highlight('res-move-amount'); return; }
  if (type === 'out' && amount > reserve.currentAmount) {
    toast('A saída é maior do que o saldo desta reserva', 'var(--red)');
    highlight('res-move-amount');
    return;
  }
  const move = { id: uid(), type, amount, date, note };
  reserve.moves.push(move);
  reserve.currentAmount = Math.max(0, reserve.currentAmount + (type === 'in' ? amount : -amount));
  document.getElementById('res-move-amount').value = '';
  document.getElementById('res-move-note').value = '';
  document.getElementById('res-move-date').value = today();
  save();
  renderEmergency();
  toast(type === 'in' ? 'Entrada adicionada' : 'Saída adicionada', type === 'in' ? 'var(--teal)' : 'var(--red)');
}

function deleteEmergencyMove(reserveId, id) {
  normalizeState();
  let reserve = getEmergencyReserve(reserveId);
  let move = reserve?.moves.find(m => m.id === id);
  if (!move && !id) {
    id = reserveId;
    reserve = getEmergencyReserves().find(r => r.moves.some(m => m.id === id));
    move = reserve?.moves.find(m => m.id === id);
  }
  if (!move || !confirm('Eliminar este movimento da reserva?')) return;
  reserve.moves = reserve.moves.filter(m => m.id !== id);
  reserve.currentAmount = Math.max(0, reserve.currentAmount + (move.type === 'in' ? -move.amount : move.amount));
  save();
  renderEmergency();
  toast('Movimento eliminado');
}

function renderEmergency() {
  normalizeState();
  const els = ['res-kpi-current','res-kpi-target','res-kpi-covered','res-kpi-missing','res-move-list','res-reserve-list'];
  if (!els.every(id => document.getElementById(id))) return;

  const calc = emergencyCalc();
  const reserves = calc.reserves;
  const status = calc.target > 0 && calc.current >= calc.target
    ? 'Reservas completas'
    : calc.covered >= 3
      ? 'Base sólida'
      : calc.target > 0
        ? 'Prioridade alta'
        : 'Defina despesas mensais';

  if (!document.getElementById('res-move-date').value) document.getElementById('res-move-date').value = today();
  renderEmergencyMoveReserveOptions(document.getElementById('res-move-reserve')?.value || reserves[0]?.id || '');

  document.getElementById('res-kpi-current').textContent = fmt(calc.current);
  document.getElementById('res-kpi-location').textContent = reserves.length ? `${reserves.length} reserva${reserves.length === 1 ? '' : 's'}` : 'nenhuma reserva criada';
  document.getElementById('res-kpi-target').textContent = fmt(calc.target);
  document.getElementById('res-kpi-target-months').textContent = calc.nextTargetDate ? `próxima meta: ${fmtDate(calc.nextTargetDate)}` : 'sem data alvo';
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

  const nextDue = reserves
    .filter(r => r.targetDate)
    .sort((a,b) => a.targetDate.localeCompare(b.targetDate))[0];
  const nextDueCalc = nextDue ? reserveCalc(nextDue) : null;
  const plan = document.getElementById('res-plan');
  if (plan) {
    plan.innerHTML = [
      { label: 'Estado', value: status, pct: calc.progress, color: calc.progress >= 100 ? 'var(--teal)' : 'var(--gold)' },
      { label: 'Objetivo total', value: fmt(calc.target), pct: 100, color: 'var(--blue)' },
      { label: 'Próxima meta', value: nextDue ? `${nextDue.name} · ${fmtDate(nextDue.targetDate)}` : 'sem data alvo', pct: nextDueCalc ? nextDueCalc.progress : calc.progress, color: 'var(--teal)' }
    ].map(row => `<div class="bar-row">
      <div class="bar-label">${row.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(Math.max(row.pct, 0), 100)}%;background:${row.color}"></div></div>
      <div class="bar-val">${row.value}</div>
    </div>`).join('');
  }

  const reserveList = document.getElementById('res-reserve-list');
  if (reserveList) {
    reserveList.innerHTML = reserves.length ? reserves.map(r => {
      const rc = reserveCalc(r);
      const dateText = r.targetDate ? fmtDate(r.targetDate) : 'sem data alvo';
      const targetText = `${r.targetMonths} meses · ${fmt(rc.target)}`;
      const monthlyText = rc.missing > 0 ? `${fmt(rc.monthlyNeeded)}/mês` : 'concluída';
      const urgency = rc.daysLeft === null
        ? 'sem prazo'
        : rc.daysLeft < 0 && rc.missing > 0
          ? `${Math.abs(rc.daysLeft)} dias atrasada`
          : rc.daysLeft >= 0
            ? `${rc.daysLeft} dias restantes`
            : 'concluída';
      return `<div class="reserve-card">
        <div class="reserve-card-head">
          <div>
            <div class="reserve-card-title">${esc(r.name)}</div>
            <div class="reserve-card-meta">${esc(r.location || 'sem local definido')} · ${dateText}</div>
          </div>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" onclick="editEmergencyReserve('${r.id}')" title="Editar">✎</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEmergencyReserve('${r.id}')" title="Eliminar">×</button>
          </div>
        </div>
        <div class="reserve-card-stats">
          <div><span>Saldo</span><strong>${fmt(r.currentAmount)}</strong></div>
          <div><span>Objetivo</span><strong>${targetText}</strong></div>
          <div><span>Falta</span><strong>${fmt(rc.missing)}</strong></div>
          <div><span>Aporte</span><strong>${monthlyText}</strong></div>
        </div>
        <div class="reserve-card-progress"><div style="width:${rc.progress.toFixed(1)}%"></div></div>
        <div class="reserve-card-footer"><span>${rc.progress.toFixed(0)}% concluído</span><span>${urgency}</span></div>
      </div>`;
    }).join('') : `<div class="empty"><div class="e-icon">◎</div>Crie a primeira reserva</div>`;
  }

  const list = document.getElementById('res-move-list');
  const moves = reserves.flatMap(r => r.moves.map(m => ({ ...m, reserveId: r.id, reserveName: r.name }))).sort((a,b) => b.date.localeCompare(a.date));
  if (!moves.length) {
    list.innerHTML = `<div class="empty"><div class="e-icon">â—Ž</div>Nenhum movimento registado</div>`;
  } else {
    list.innerHTML = moves.map(m => {
      const isIn = m.type === 'in';
      return `<div class="tx-row" style="grid-template-columns:34px 1fr auto auto">
        <div class="tx-icon" style="background:${isIn ? 'var(--teal-d)' : 'var(--red-d)'}">${isIn ? '+' : '&minus;'}</div>
        <div>
          <div class="tx-desc">${isIn ? 'Entrada' : 'Saída'} · ${esc(m.reserveName)}</div>
          <div class="tx-meta"><span>${fmtDate(m.date)}</span>${m.note ? `<span style="color:var(--text3);font-size:0.72rem">${esc(m.note.slice(0,40))}</span>` : ''}</div>
        </div>
        <div class="mono ${isIn ? 'c-teal' : 'c-red'}">${isIn ? '+' : '&minus;'}${fmt(m.amount)}</div>
        <div class="row-actions"><button class="btn btn-danger btn-sm" onclick="deleteEmergencyMove('${m.reserveId}','${m.id}')" title="Eliminar">&times;</button></div>
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
  const normCat = cat => String(cat || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const lazerCats = ['lazer'];
  const poupancaCats = ['poupanca','poupancas','reserva','reserva de emergencia'];
  const investCats = ['investir','investimento','investimentos'];
  const expenseTx = monthTx.filter(t=>t.type==='expense');
  const isLazer = t => lazerCats.includes(normCat(t.cat));
  const isPoupanca = t => poupancaCats.includes(normCat(t.cat));
  const isInvest = t => investCats.includes(normCat(t.cat));
  const lazer    = expenseTx.filter(isLazer).reduce((s,t)=>s+t.amount,0);
  const poupanca = expenseTx.filter(isPoupanca).reduce((s,t)=>s+t.amount,0);
  const investTx = expenseTx.filter(isInvest).reduce((s,t)=>s+t.amount,0);
  const investPort = S.investments.filter(i=>{ const d=toDate(i.date); return d.getMonth()===m&&d.getFullYear()===y; }).reduce((s,i)=>s+i.qty*i.buyPrice,0);
  const invest   = investTx + investPort;
  const despGerais = expenseTx.filter(t=>!isInvest(t)&&!isLazer(t)&&!isPoupanca(t)).reduce((s,t)=>s+t.amount,0);
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
const CAT_COLORS = ['#c94040','#b98718','#138b73','#2f68d8','#7a55c7','#a36f3f','#cf6b4a','#2487b4','#2a9563','#b14f84'];

function drawDonut(canvasId, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const entries = Object.entries(data).filter(([,v]) => v > 0);
  if (!entries.length) {
    ctx.fillStyle = '#e7eaf1';
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
  ctx.strokeStyle = '#d9deea'; ctx.lineWidth = 1;
  for (let i=0;i<=4;i++) {
    const y2 = pad.t + chartH - (i/4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.l, y2); ctx.lineTo(W - pad.r, y2); ctx.stroke();
    ctx.fillStyle = '#9aa3b5'; ctx.font = '11px Courier New,monospace';
    ctx.fillText(Math.round((i/4)*maxVal) + '€', 4, y2 + 4);
  }

  // X labels
  ctx.fillStyle = '#9aa3b5'; ctx.font = '11px Courier New,monospace';
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

  drawLine(expenseData, '#c94040', 'rgba(201,64,64,0.08)');
  drawLine(incomeData, '#138b73', 'rgba(19,139,115,0.08)');

  // Legend
  ctx.fillStyle = '#138b73'; ctx.fillRect(W-100, 10, 10, 3);
  ctx.fillStyle = '#667085'; ctx.font = '11px Arial,sans-serif'; ctx.fillText('Receitas', W-86, 14);
  ctx.fillStyle = '#c94040'; ctx.fillRect(W-100, 22, 10, 3);
  ctx.fillStyle = '#667085'; ctx.fillText('Despesas', W-86, 26);
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

function creditLinkedPaid(c) {
  return S.transactions
    .filter(t => t.type === 'expense' && t.creditId === c.id)
    .reduce((sum,t) => sum + (Number(t.amount) || 0), 0);
}

function creditPaid(c) {
  return Math.min(Number(c.total) || 0, (Number(c.paid) || 0) + creditLinkedPaid(c));
}

function creditOutstanding(c) {
  return Math.max((Number(c.total) || 0) - creditPaid(c), 0);
}

function addCredit() {
  const name     = document.getElementById('cred-name').value.trim();
  const type     = document.getElementById('cred-type').value;
  const total    = num('cred-total');
  const paid     = num('cred-paid') || 0;
  const monthly  = num('cred-monthly');
  const remaining= parseInt(document.getElementById('cred-remaining').value, 10);
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
  save(); renderCredits(); renderFin(); renderDashboard();
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
  const linked = S.transactions.filter(t => t.creditId === id).length;
  const msg = linked
    ? `Eliminar este crédito? ${linked} transação(ões) financeira(s) vão ficar sem ligação ao crédito.`
    : 'Eliminar este crédito?';
  if (!confirm(msg)) return;
  S.credits = S.credits.filter(c => c.id !== id);
  S.transactions.forEach(t => { if (t.creditId === id) t.creditId = ''; });
  save(); renderCredits(); renderFin(); renderDashboard(); toast('Crédito eliminado');
}

function renderCredits() {
  // KPIs
  const totalDebt    = S.credits.reduce((s,c) => s + creditOutstanding(c), 0);
  const totalPaid    = S.credits.reduce((s,c) => s + creditPaid(c), 0);
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
    const linkedPaid = creditLinkedPaid(c);
    const paid = creditPaid(c);
    const outstanding = creditOutstanding(c);
    const pctPaid = c.total > 0 ? Math.min((paid / c.total) * 100, 100) : 0;
    const endDate = creditEndDate(c);
    const endStr  = endDate ? endDate.toLocaleDateString('pt-PT', { month:'long', year:'numeric' }) : '—';
    const yearsLeft = creditYearsLeft(c);
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
        <div class="cred-stat"><label>Total Pago</label><div class="v" style="color:var(--teal)">${fmt(paid)}</div></div>
        <div class="cred-stat"><label>Em Dívida</label><div class="v" style="color:var(--red)">${fmt(outstanding)}</div></div>
        <div class="cred-stat"><label>Prestação</label><div class="v" style="color:var(--gold)">${fmt(c.monthly)}/mês</div></div>
        <div class="cred-stat"><label>Prestações Falta</label><div class="v">${remainingInstallments(c)}</div></div>
        <div class="cred-stat"><label>Anos Restantes</label><div class="v" style="color:var(--blue)">${yearsLeft !== '—' ? yearsLeft + ' anos' : '—'}</div></div>
      </div>
      <div class="cred-card-footer">
        <div>
          <div class="cred-progress-label"><span>Progresso de amortização</span><span>${pctPaid.toFixed(1)}%</span></div>
          <div class="cred-bar-track"><div class="cred-bar-fill" style="width:${pctPaid.toFixed(1)}%;background:linear-gradient(90deg,${color}88,${color})"></div></div>
        </div>
        <div class="cred-end-date">Liquidação prevista: <span>${endStr}</span></div>
        ${linkedPaid ? `<div class="cred-linked-note">Inclui ${fmt(linkedPaid)} vindo de despesas financeiras ligadas.</div>` : ''}
        ${c.note ? `<div style="font-size:0.8rem;color:var(--text2);border-top:1px solid var(--border);padding-top:8px;margin-top:4px">📝 ${esc(c.note)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function creditEndDate(c) {
  if (!c.remaining) return null;
  const d = toDate(today());
  d.setMonth(d.getMonth() + remainingInstallments(c));
  return d;
}

function remainingInstallments(c) {
  if (creditOutstanding(c) <= 0) return 0;
  const base = Math.max(0, parseInt(c?.remaining, 10) || 0);
  const monthly = Number(c?.monthly) || 0;
  if (!monthly) return base;
  const linkedInstallments = Math.floor(creditLinkedPaid(c) / monthly);
  return Math.max(0, base - linkedInstallments);
}

function creditYearsLeft(c) {
  const remaining = remainingInstallments(c);
  return remaining > 0 ? (remaining / 12).toFixed(1) : '0.0';
}

function drawCreditTimeline() {
  const canvas = document.getElementById('chart-timeline');
  if (!canvas) return;
  const container = canvas.parentElement;
  const summary = document.getElementById('cred-timeline-summary');
  const credits = [...S.credits].sort((a,b) => {
    const aEnd = creditEndDate(a);
    const bEnd = creditEndDate(b);
    return (aEnd ? aEnd.getTime() : Infinity) - (bEnd ? bEnd.getTime() : Infinity);
  });
  const minW = Math.max(container.offsetWidth || 1100, 1100);
  const laneGap = 58;
  const minH = 360;
  const dynamicH = credits.length ? 150 + credits.length * laneGap : minH;
  canvas.width  = minW;
  canvas.height = Math.max(minH, dynamicH);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);       // Jan this year
  const end   = new Date(now.getFullYear() + 10, 11, 31); // 10 years ahead
  const totalMs = end - start;

  if (summary) {
    const totalDebt = S.credits.reduce((s,c) => s + creditOutstanding(c), 0);
    const totalMonthly = S.credits.reduce((s,c) => s + (c.monthly || 0), 0);
    const soonest = credits.map(creditEndDate).filter(Boolean)[0];
    summary.innerHTML = `
      <div class="summary-pill"><label>Encargo mensal</label><strong>${fmt(totalMonthly)}</strong></div>
      <div class="summary-pill"><label>Dívida no gráfico</label><strong>${fmt(totalDebt)}</strong></div>
      <div class="summary-pill"><label>Próxima liquidação</label><strong>${soonest ? soonest.toLocaleDateString('pt-PT', { month:'short', year:'numeric' }) : '—'}</strong></div>
    `;
  }

  const pad = { l: 230, r: 90, t: 72, b: 54 };
  const axisY = pad.t - 24;
  const chartBottom = H - pad.b;
  const trackW = W - pad.l - pad.r;
  const shortMoney = value => {
    const n = Number(value) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')}M€`;
    if (n >= 1000) return `${Math.round(n / 1000)}k€`;
    return `${Math.round(n)}€`;
  };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const xForDate = d => pad.l + ((d - start) / totalMs) * trackW;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, W, H, 12);
  ctx.fill();

  // ── background track ──
  ctx.fillStyle = '#e7eaf1';
  roundRect(ctx, pad.l, axisY, trackW, 5, 3);
  ctx.fill();

  // ── year ticks ──
  ctx.fillStyle = '#9aa3b5';
  ctx.font = '13px Courier New,monospace';
  ctx.textAlign = 'center';
  for (let y = now.getFullYear(); y <= now.getFullYear() + 10; y++) {
    const d = new Date(y, 0, 1);
    const x = xForDate(d);
    ctx.fillStyle = y === now.getFullYear() ? '#c6cfdf' : '#e7eaf1';
    ctx.fillRect(x, pad.t - 12, 1, chartBottom - pad.t + 22);
    ctx.fillStyle = y === now.getFullYear() ? '#b98718' : '#667085';
    ctx.fillText(y, x, axisY - 12);
  }

  // ── "today" marker ──
  const nowX = xForDate(now);
  ctx.strokeStyle = '#b98718';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(nowX, pad.t - 18); ctx.lineTo(nowX, chartBottom + 12); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#b98718';
  ctx.font = '12px Courier New,monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HOJE', nowX, chartBottom + 34);

  if (!credits.length) {
    ctx.fillStyle = '#9aa3b5';
    ctx.font = '16px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Adicione créditos para ver a linha temporal', W/2, H/2);
    return;
  }

  // ── credit bars ──
  const laneH = 34;
  const laneStartY = pad.t + 18;

  credits.forEach((c, idx) => {
    const color = CRED_COLORS[idx % CRED_COLORS.length];
    const startD = c.start ? toDate(c.start) : now;
    const endD   = creditEndDate(c) || now;
    const sx = clamp(xForDate(startD), pad.l, pad.l + trackW);
    const ex = clamp(xForDate(endD), pad.l, pad.l + trackW);
    const barW = Math.max(ex - sx, 8);
    const y2 = laneStartY + idx * laneGap;
    const paid = creditPaid(c);
    const pctPaid = c.total > 0 ? Math.min(paid / c.total, 1) : 0;
    const paidW = barW * pctPaid;
    const outstanding = creditOutstanding(c);

    ctx.fillStyle = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    roundRect(ctx, pad.l - 12, y2 - 9, trackW + 24, laneH + 18, 10);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#182033';
    ctx.font = '600 14px Arial,sans-serif';
    ctx.fillText(`${CRED_ICONS[c.type]||'📦'} ${c.name.slice(0,24)}`, 18, y2 + 7);
    ctx.fillStyle = '#667085';
    ctx.font = '12px Courier New,monospace';
    ctx.fillText(`${shortMoney(outstanding)} em dívida · ${fmt(c.monthly).replace(',00 €','€')}/mês`, 18, y2 + 27);

    // full bar (remaining)
    ctx.fillStyle = color + '36';
    roundRect(ctx, sx, y2, barW, laneH, 8);
    ctx.fill();

    // paid portion
    if (paidW > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, sx, y2, Math.max(paidW, 3), laneH, 8);
      ctx.fill();
    }

    ctx.font = '12px Courier New,monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#182033';
    if (barW > 150) ctx.fillText(`${(pctPaid * 100).toFixed(0)}% pago`, sx + 12, y2 + 21);
    ctx.fillStyle = '#667085';
    ctx.textAlign = 'right';
    if (barW > 230) ctx.fillText(`${shortMoney(outstanding)} por pagar`, ex - 12, y2 + 21);

    // end dot
    ctx.beginPath();
    ctx.arc(Math.min(ex, pad.l + trackW), y2 + laneH/2, 7, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // end date label
    if (endD) {
      const eStr = endD.toLocaleDateString('pt-PT', { month:'short', year:'numeric' });
      ctx.fillStyle = color;
      ctx.font = '12px Courier New,monospace';
      ctx.textAlign = 'left';
      ctx.fillText(eStr, Math.min(ex + 12, W - 78), y2 + laneH/2 + 4);
    }
  });

  const legendY = H - 24;
  ctx.textAlign = 'left';
  ctx.font = '12px Arial,sans-serif';
  ctx.fillStyle = '#667085';
  ctx.fillText('Legenda:', 18, legendY);
  ctx.fillStyle = '#138b73';
  roundRect(ctx, 82, legendY - 10, 24, 8, 4); ctx.fill();
  ctx.fillStyle = '#667085';
  ctx.fillText('pago', 112, legendY);
  ctx.fillStyle = '#138b7336';
  roundRect(ctx, 160, legendY - 10, 24, 8, 4); ctx.fill();
  ctx.fillStyle = '#667085';
  ctx.fillText('por pagar', 190, legendY);
  ctx.fillStyle = '#b98718';
  ctx.beginPath(); ctx.arc(284, legendY - 6, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#667085';
  ctx.fillText('data prevista de liquidação', 296, legendY);
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
    appVersion: '1.3.0'
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
  S.patrimony.items.forEach(i => {
    const cat = getPatrimonyCategory(i.categoryId);
    rows.push(['patrimonio', i.id, i.type, cat?.name || '', i.name, i.date, i.value, '', i.subcat, '', '', '', '', '', '', '', '', '', i.note]);
  });
  getEmergencyReserves().forEach(r => {
    rows.push(['reserva', r.id, 'config', '', r.name, r.targetDate, r.currentAmount, '', r.location, '', '', '', '', r.monthlyExpenses, '', '', r.targetMonths, '', 'configuracao']);
    r.moves.forEach(m => rows.push(['reserva', m.id, m.type, r.name, m.note || '', m.date, m.amount, '', '', '', '', '', '', '', '', '', '', '', 'movimento']));
  });
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
  if (data.patrimony && typeof data.patrimony === 'object') S.patrimony = data.patrimony;
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
    switchLocalUser(CLOUD.user.id, { keepCurrentIfMissing: true });
    renderAll();
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
      setStorageUser(CLOUD.user.id);
      saveLocal();
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
  loadLocalForUser();
  renderAll();
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
      appVersion: '1.3.0'
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
      resetState(snapshot);
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
    if (CLOUD.user) {
      switchLocalUser(CLOUD.user.id, { keepCurrentIfMissing: true });
      renderAll();
      cloudLoad({ silent: true });
    }
  });
  CLOUD.client.auth.onAuthStateChange((_event, session) => {
    const nextUser = session?.user || null;
    const changedUser = nextUser?.id !== CLOUD.user?.id;
    CLOUD.user = nextUser;
    cloudSetStatus(CLOUD.user ? 'ok' : 'ready');
    if (_event === 'PASSWORD_RECOVERY') finishCloudPasswordRecovery();
    if (CLOUD.user && changedUser) {
      switchLocalUser(CLOUD.user.id, { keepCurrentIfMissing: true });
      renderAll();
      cloudLoad({ silent: true });
    }
    if (!CLOUD.user && changedUser) {
      loadLocalForUser();
      renderAll();
    }
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
      resetState(data);
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
document.getElementById('pat-date').value = today();
document.getElementById('cred-start').value = today();
document.getElementById('res-move-date').value = today();
renderTimeSubcats();
renderTimeSubcategorySelect();
renderFin();
renderInv();
renderPatrimony();
renderDashboard();
renderBudget();
renderEmergency();
renderCredits();

window.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['fin-desc','fin-amount'].includes(e.target.id)) addTransaction();
  if (e.key === 'Enter' && ['time-hours','time-desc'].includes(e.target.id)) addTimeEntry();
  if (e.key === 'Enter' && ['pat-name','pat-value'].includes(e.target.id)) addPatrimonyItem();
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
  addFinanceSubcategory,
  addInvestment,
  addPatrimonyCategory,
  addPatrimonyItem,
  addTimeCategory,
  addTimeEntry,
  addTimeSubcategory,
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
  deleteEmergencyReserve,
  deleteInvestment,
  deletePatrimonyItem,
  deleteTimeEntry,
  deleteTransaction,
  driveAuth,
  driveLoad,
  driveSave,
  editBudget,
  editCredit,
  editEmergencyReserve,
  editInvestment,
  editPatrimonyItem,
  editTimeEntry,
  editTransaction,
  exportBackup,
  exportCsv,
  importBackup,
  lockApp,
  removeCategory,
  removeFinanceSubcategory,
  removePatrimonyCategory,
  removeTimeCategory,
  removeTimeSubcategory,
  renderDashboard,
  renderFin,
  renderFinSubcats,
  renderFinanceSubcategorySelects,
  renderEmergency,
  renderPatrimony,
  renderPatrimonyCategorySelects,
  renderTimeCategoryEditor,
  renderTimeMainCats,
  renderTimeSubcategorySelect,
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
