// ============================================================
// VITA — Dashboard Module
// ============================================================
import { getData, today, currentWeekDays, fmtNum, totalActivityKcal } from '../core.js';

const ROOT = 'dashboard-root';

export function init() {
  document.addEventListener('vita:navigate', (e) => {
    if (e.detail.page === 'dashboard') render();
  });
}

function render() {
  const data = getData();
  const root = document.getElementById(ROOT);
  if (!root) return;

  const weekDays = currentWeekDays();
  const todayStr = today();
  const daysIT   = ['L','M','M','G','V','S','D'];

  // ── Calorie Summary ──────────────────────────────────────
  const weightLogs   = data.health?.weightLogs || [];
  const firstWeight  = weightLogs.length ? weightLogs[0].value : null;
  const lastWeight   = weightLogs.length ? weightLogs[weightLogs.length-1].value : null;
  const weightGoal   = data.health?.weightGoal;
  const deficit      = data.health?.caloricDeficit || 0;
  const activityKcal = totalActivityKcal(data);
  const nutritionLogs = data.nutrition?.dailyLogs || [];
  const nutritionDeficit = nutritionLogs.length * deficit;
  const totalKcalBurned  = activityKcal + nutritionDeficit;
  const kcalToGoal = firstWeight && weightGoal
    ? Math.max(0, (firstWeight - weightGoal) * 7800) : null;
  const progressPct = kcalToGoal
    ? Math.min(100, Math.round((totalKcalBurned / kcalToGoal) * 100)) : 0;

  // ── Sleep today ──────────────────────────────────────────
  const sleepLogs = data.sleep?.logs || [];
  const todaySleep = sleepLogs.find(l => l.date === todayStr);
  const sleepDisplay = todaySleep
    ? `${Math.floor(todaySleep.hours)}h ${Math.round((todaySleep.hours % 1) * 60)}'`
    : '—';

  // ── Habits today ─────────────────────────────────────────
  const habits = data.habits?.list || [];
  const habitsToday = habits.map(h => ({ ...h, done: (h.logs||[]).includes(todayStr) }));

  // ── Activity today ───────────────────────────────────────
  const actLogs = (data.activity?.logs || []).filter(l => l.date === todayStr);
  const todayKcal = actLogs.reduce((s, l) => s + (l.kcal||0), 0);

  // ── Nutrition today ──────────────────────────────────────
  const todayNutr  = nutritionLogs.find(l => l.date === todayStr);
  const todayEaten = todayNutr ? (todayNutr.meals||[]).reduce((s,m) => {
    const mKcal = (m.ingredients||[]).reduce((si,i) => si + Math.round((i.kcalPer100||0)*(i.grams||0)/100), 0);
    return s + (m.kcal || mKcal);
  }, 0) : 0;
  const calorieGoal = data.health?.bmr ? data.health?.bmr - deficit : null;
  const caloriesPct = calorieGoal ? Math.min(100, Math.round((todayEaten / calorieGoal) * 100)) : 0;

  // ── Profile initial ──────────────────────────────────────
  const name = data.profile?.name || 'Ricky';
  const initial = name[0].toUpperCase();

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div style="font-size:22px;font-weight:900;color:var(--black)">Ciao, ${name} 👋</div>
        <div style="font-size:13px;color:var(--gray);font-weight:500">${formatDateIT(todayStr)}</div>
      </div>
      <button onclick="openImpostazioni()" style="width:44px;height:44px;border-radius:50%;background:var(--black);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:var(--lime);border:none;cursor:pointer;flex-shrink:0">
        ${initial}
      </button>
    </div>

    <!-- Week dots -->
    <div class="card-dark mb-12">
      <div class="card-title">Settimana</div>
      <div class="days-row mt-8">
        ${weekDays.map((d, i) => {
          const anyHabit = habits.some(h => (h.logs||[]).includes(d));
          const isToday  = d === todayStr;
          return `<div class="day-dot ${isToday ? 'today' : anyHabit ? 'done' : ''}">${daysIT[i]}</div>`;
        }).join('')}
      </div>
    </div>

    <!-- Obiettivo calorico (box principale) -->
    <div class="card-dark mb-12" onclick="window.vitaNavigate('alimentazione')" style="cursor:pointer">
      <div class="card-title">🔥 Obiettivo calorico</div>
      ${kcalToGoal ? `
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:12px;color:var(--gray2)">Peso inizio → Obiettivo</div>
            <div style="font-size:16px;font-weight:800;color:var(--white);margin-top:2px">${fmtNum(firstWeight,1)} kg → ${fmtNum(weightGoal,1)} kg</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:var(--gray2)">Da bruciare</div>
            <div style="font-size:16px;font-weight:800;color:var(--lime)">${fmtNum(kcalToGoal)} kcal</div>
          </div>
        </div>
        <div style="margin-top:14px">
          <div class="flex-between mb-4">
            <span style="font-size:12px;color:var(--gray2)">Bruciate: <strong style="color:var(--lime)">${fmtNum(totalKcalBurned)} kcal</strong></span>
            <span style="font-size:13px;font-weight:700;color:var(--lime)">${progressPct}%</span>
          </div>
          <div class="progress-wrap"><div class="progress-bar" style="width:${progressPct}%"></div></div>
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
          <div style="font-size:11px;color:var(--gray2)">🏃 Attività: <strong style="color:var(--white)">${fmtNum(activityKcal)} kcal</strong></div>
          <div style="font-size:11px;color:var(--gray2)">🥗 Deficit: <strong style="color:var(--white)">${fmtNum(nutritionDeficit)} kcal</strong></div>
        </div>
      ` : `
        <div style="margin-top:12px;color:var(--gray2);font-size:13px">
          Imposta peso e obiettivo in <strong style="color:var(--lime)">Salute</strong> per attivare il tracker.
        </div>
      `}
    </div>

    <!-- Calorie oggi -->
    <div class="card-dark mb-12" onclick="window.vitaNavigate('alimentazione')" style="cursor:pointer">
      <div class="card-title">🥗 Calorie oggi</div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:6px">
        <div>
          <span style="font-size:36px;font-weight:900;color:var(--white)">${fmtNum(todayEaten)}</span>
          <span style="font-size:14px;color:var(--gray2)"> / ${calorieGoal ? fmtNum(calorieGoal) : '—'} kcal</span>
        </div>
        <span style="font-size:18px;font-weight:800;color:var(--lime)">${caloriesPct}%</span>
      </div>
      <div class="progress-wrap mt-8"><div class="progress-bar" style="width:${caloriesPct}%"></div></div>
    </div>

    <!-- Sonno + Attività -->
    <div class="grid-2">
      <div class="card" onclick="window.vitaNavigate('sonno')" style="cursor:pointer">
        <div style="font-size:12px;font-weight:600;color:var(--gray)">😴 Sonno</div>
        <div style="font-size:28px;font-weight:900;color:var(--black);margin-top:4px">${sleepDisplay}</div>
        <div style="font-size:11px;color:var(--gray)">stanotte</div>
      </div>
      <div class="card-lime" onclick="window.vitaNavigate('attivita')" style="cursor:pointer">
        <div style="font-size:12px;font-weight:600;color:var(--olive)">🏃 Attività</div>
        <div style="font-size:28px;font-weight:900;color:var(--black);margin-top:4px">${fmtNum(todayKcal)}</div>
        <div style="font-size:11px;color:var(--olive)">kcal oggi</div>
      </div>
    </div>

    <!-- Abitudini oggi -->
    ${habits.length > 0 ? `
    <div class="card mb-12" onclick="window.vitaNavigate('abitudini')" style="cursor:pointer">
      <div style="font-weight:800;font-size:16px;margin-bottom:12px">📋 Abitudini oggi</div>
      ${habitsToday.slice(0,4).map(h => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F0F0">
          <span style="font-size:14px;font-weight:500">${h.emoji} ${h.name}</span>
          <div style="width:20px;height:20px;border-radius:50%;background:${h.done ? 'var(--lime)' : '#E0E0E0'}"></div>
        </div>
      `).join('')}
    </div>
    ` : ''}


  `;
}

function formatDateIT(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days   = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
