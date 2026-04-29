// ============================================================
// VITA — Core: Storage, Utilities, Shared State
// ============================================================

const STORAGE_KEY = 'vitaApp_v1';

// ── Storage ─────────────────────────────────────────────────

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // Always deep merge with defaults to repair missing/corrupted sections
    return deepMerge(defaultData(), parsed);
  } catch {
    return defaultData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save failed', e);
  }
}

export function getData() {
  return loadData();
}

export function setData(updater) {
  const current = loadData();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  saveData(next);
  return next;
}

// ── Default structure ────────────────────────────────────────

function defaultData() {
  return {
    profile: {
      name: 'Ricky',
    },
    sleep: {
      goal: 8,           // ore
      logs: [],          // { date, hours, quality, nap, tiredness }
    },
    habits: {
      list: [],          // { id, name, emoji, goalDays, logs: [date] }
    },
    health: {
      height: null,      // cm
      weightGoal: null,  // kg
      weightLogs: [],    // { date, value }
      measurements: [],  // { id, name, unit, logs: [{date, value}] }
      bmr: null,
      bmrParams: null,   // { age, gender, activity }
      caloricDeficit: 0, // kcal/day
    },
    nutrition: {
      menus: [],         // { id, name, meals: [{type, name, kcal, protein, carbs, fat}] }
      dailyLogs: [],     // { date, meals: [{type, name, kcal, protein, carbs, fat}] }
    },
    activity: {
      sports: [],        // { id, name, emoji, calcType, rate }
      logs: [],          // { id, sportId, date, duration, distance, kcal }
    },
  };
}

// ── Date Utilities ───────────────────────────────────────────

export function today() {
  return toDateStr(new Date());
}

export function toDateStr(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateIT(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDayShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['D','L','M','M','G','V','S'][d.getDay()];
}

// Returns last N days as dateStrings, newest last
export function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

// Current week Mon→Sun
export function currentWeekDays() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return toDateStr(d);
  });
}

export function italianDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d.getDay()];
}

// ── ID Generator ─────────────────────────────────────────────

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Number Formatting ────────────────────────────────────────

export function fmtNum(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── DOM Helpers ──────────────────────────────────────────────

export function el(id) {
  return document.getElementById(id);
}

export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function html(strings, ...values) {
  return strings.reduce((acc, str, i) =>
    acc + str + (values[i] !== undefined ? String(values[i]) : ''), '');
}

// ── Modal Helpers ─────────────────────────────────────────────

export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

export function setupModalClose(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
}

// ── Export / Import ──────────────────────────────────────────

export function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vita-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        // Deep merge with default structure so missing keys don't crash the app
        const base = defaultData();
        const merged = deepMerge(base, imported);
        saveData(merged);
        resolve(merged);
      } catch {
        reject(new Error('File non valido'));
      }
    };
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsText(file);
  });
}

function deepMerge(base, imported) {
  const result = { ...base };
  for (const key of Object.keys(imported)) {
    if (imported[key] !== null && typeof imported[key] === 'object' && !Array.isArray(imported[key])) {
      result[key] = deepMerge(base[key] || {}, imported[key]);
    } else {
      result[key] = imported[key];
    }
  }
  return result;
}

// ── Calorie Utilities ─────────────────────────────────────────

// Total kcal burned from activity logs (all time)
export function totalActivityKcal(data) {
  return (data.activity?.logs || []).reduce((sum, l) => sum + (l.kcal || 0), 0);
}

// Total kcal deficit from nutrition (all time)
// Per ogni giorno loggato: deficit reale = BMR - calorie mangiate (solo se positivo)
export function totalNutritionDeficit(data) {
  const bmr  = data.health.bmr || 0;
  const logs = data.nutrition.dailyLogs || [];
  if (!bmr) return 0;
  return logs.reduce((sum, log) => {
    const eaten = (log.meals || []).reduce((s, m) => s + (m.kcal || 0), 0);
    const dayDeficit = bmr - eaten;
    return sum + Math.max(0, dayDeficit); // conta solo i giorni in deficit reale
  }, 0);
}
