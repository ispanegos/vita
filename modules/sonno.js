// ============================================================
// VITA — Sonno (Sleep Tracker) Module
// ============================================================
import { getData, setData, today, currentWeekDays, uid, fmtNum, openModal, closeModal, setupModalClose } from '../core.js';

const ROOT = 'sonno-root';
const MODAL_ID = 'modal-sonno';

export function init() {
  injectModal();
  document.addEventListener('vita:navigate', (e) => {
    if (e.detail.page === 'sonno') render();
  });
}

// ── Render ───────────────────────────────────────────────────

function render() {
  const data = getData();
  const root = document.getElementById(ROOT);
  if (!root) return;

  const todayStr = today();
  const weekDays = currentWeekDays();
  const daysIT   = ['L','M','M','G','V','S','D'];
  const sleepLogs = data.sleep?.logs || [];
  const goal = data.sleep?.goal || 8;

  // Today's log
  const todayLog = sleepLogs.find(l => l.date === todayStr);

  // Weekly average
  const weekLogs = weekDays.map(d => sleepLogs.find(l => l.date === d)).filter(Boolean);
  const weekAvg  = weekLogs.length
    ? weekLogs.reduce((s, l) => s + l.hours, 0) / weekLogs.length
    : null;

  // Sleep deficit (goal - actual today)
  const sleepDeficit = todayLog ? goal - todayLog.hours : null;

  // Rest score (0–100)
  const restScore = computeRestScore(data);

  // Circle SVG
  const R = 54, CIRC = 2 * Math.PI * R;
  const offset = CIRC - (CIRC * restScore / 100);

  root.innerHTML = `
    <div class="page-header">
      <div class="page-title">Tracker Riposo</div>
      <button class="btn btn-lime btn-sm" onclick="openSonnoModal()">+ Log</button>
    </div>

    <!-- Rest Score Circle -->
    <div class="card-dark" style="text-align:center;padding:28px 20px">
      <div class="card-title" style="text-align:center;margin-bottom:16px">Stato riposo generale</div>
      <div style="position:relative;display:inline-flex;align-items:center;justify-content:center;margin:0 auto">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--black3)" stroke-width="10"/>
          <circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--lime)" stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${CIRC}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 70 70)"
            style="transition:stroke-dashoffset 0.6s ease"/>
        </svg>
        <div style="position:absolute;text-align:center">
          <div style="font-size:36px;font-weight:900;color:var(--white)">${restScore}%</div>
          <div style="font-size:12px;color:var(--gray2)">${restLabel(restScore)}</div>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid-2">
      <div class="card-dark">
        <div class="card-title">Media sett.</div>
        <div style="font-size:28px;font-weight:900;color:var(--white);margin-top:4px">
          ${weekAvg !== null ? `${Math.floor(weekAvg)}h ${Math.round((weekAvg%1)*60)}'` : '—'}
        </div>
      </div>
      <div class="card-dark">
        <div class="card-title">Deficit oggi</div>
        <div style="font-size:28px;font-weight:900;color:${sleepDeficit > 0 ? '#FF6B6B' : 'var(--lime)'};margin-top:4px">
          ${sleepDeficit !== null
            ? sleepDeficit > 0
              ? `-${Math.floor(sleepDeficit)}h${Math.round((sleepDeficit%1)*60) ? Math.round((sleepDeficit%1)*60)+"'" : ''}`
              : '✓ OK'
            : '—'}
        </div>
      </div>
    </div>

    <!-- Goal setting -->
    <div class="card-dark mb-12">
      <div class="flex-between">
        <div class="card-title">Obiettivo riposo</div>
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="adjustGoal(-0.5)" style="width:30px;height:30px;border-radius:50%;background:var(--black3);color:var(--white);border:none;font-size:18px;cursor:pointer;font-weight:700">−</button>
          <span style="font-size:20px;font-weight:800;color:var(--lime);min-width:50px;text-align:center">${goal}h</span>
          <button onclick="adjustGoal(0.5)" style="width:30px;height:30px;border-radius:50%;background:var(--black3);color:var(--white);border:none;font-size:18px;cursor:pointer;font-weight:700">+</button>
        </div>
      </div>
    </div>

    <!-- Weekly bars -->
    <div class="card-dark mb-12">
      <div class="card-title mb-8">Settimana</div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;height:80px;gap:4px">
        ${weekDays.map((d, i) => {
          const log = sleepLogs.find(l => l.date === d);
          const hrs  = log ? log.hours : 0;
          const pct  = Math.min(100, (hrs / (goal * 1.2)) * 100);
          const isToday = d === todayStr;
          return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
              <div style="font-size:10px;color:var(--gray2);font-weight:600">${hrs ? Math.floor(hrs)+'h' : ''}</div>
              <div style="width:100%;border-radius:6px 6px 0 0;background:${isToday ? 'var(--lime)' : hrs ? 'var(--olive)' : 'var(--black3)'};height:${pct}%;min-height:4px;transition:height 0.4s ease"></div>
              <div style="font-size:10px;color:${isToday?'var(--lime)':'var(--gray2)'};font-weight:${isToday?'700':'400'}">${daysIT[i]}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Recent logs -->
    <div class="card-dark mb-12">
      <div class="card-title mb-8">Log recenti</div>
      ${sleepLogs.length === 0
        ? '<div style="color:var(--gray2);font-size:14px">Nessun log ancora.</div>'
        : [...sleepLogs].reverse().slice(0,7).map(log => `
          <div class="list-item">
            <div class="list-icon">😴</div>
            <div class="list-info">
              <div class="list-name">${formatDateShort(log.date)}</div>
              <div class="list-sub">${log.nap ? `Pisolino: ${log.nap}'` : ''} ${log.tiredness ? `· Stanchezza: ${log.tiredness}/5` : ''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:16px;font-weight:800;color:var(--lime)">${Math.floor(log.hours)}h ${Math.round((log.hours%1)*60)}'</div>
              <div style="font-size:11px;color:var(--gray2)">${'★'.repeat(log.quality||0)}${'☆'.repeat(5-(log.quality||0))}</div>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
}

// ── Score computation ─────────────────────────────────────────

function computeRestScore(data) {
  const logs = (data.sleep?.logs || []).slice(-14); // last 14 days
  if (!logs.length) return 0;
  const goal = data.sleep?.goal || 8;

  const scores = logs.map(log => {
    const hourScore    = Math.min(1, log.hours / goal);
    const qualityScore = (log.quality || 3) / 5;
    const napBonus     = log.nap ? Math.min(0.1, log.nap / 600) : 0; // max 10% bonus
    const tirednessScore = log.tiredness ? 1 - ((log.tiredness - 1) / 4) : 0.6;
    const raw = hourScore * 0.5 + qualityScore * 0.3 + tirednessScore * 0.15 + napBonus * 0.05;
    return raw;
  });

  // Weighted avg: recent days count more
  let weighted = 0, totalW = 0;
  scores.forEach((s, i) => {
    const w = i + 1;
    weighted += s * w;
    totalW += w;
  });
  return Math.round((weighted / totalW) * 100);
}

function restLabel(score) {
  if (score >= 85) return 'Ottimo';
  if (score >= 70) return 'Buono';
  if (score >= 50) return 'Sufficiente';
  if (score >= 30) return 'Scarso';
  return 'Insufficiente';
}

// ── Modal ─────────────────────────────────────────────────────

function injectModal() {
  const container = document.getElementById('modals-container');
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="modal-overlay" id="${MODAL_ID}">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Log Riposo</div>

        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" class="form-input" id="sl-date" value="${today()}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Ore dormite</label>
          <input type="number" class="form-input" id="sl-hours" min="0" max="24" step="0.25" placeholder="es. 7.5"/>
        </div>
        <div class="form-group">
          <label class="form-label">Qualità (1–5)</label>
          <div style="display:flex;gap:10px;margin-top:4px" id="sl-quality-stars">
            ${[1,2,3,4,5].map(n => `
              <button onclick="setSleepQuality(${n})" id="sq-${n}"
                style="width:44px;height:44px;border-radius:50%;background:var(--black3);color:var(--gray2);border:none;font-size:20px;cursor:pointer;transition:all 0.15s">
                ${n <= 3 ? '★' : '★'}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Pisolino (minuti)</label>
          <input type="number" class="form-input" id="sl-nap" min="0" max="240" placeholder="0"/>
        </div>
        <div class="form-group">
          <label class="form-label">Sensazione stanchezza (1=fresco, 5=esausto)</label>
          <input type="range" id="sl-tiredness" min="1" max="5" step="1" value="2"
            style="width:100%;accent-color:var(--lime);margin-top:8px"/>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray2);margin-top:4px">
            <span>Fresco</span><span id="sl-tiredness-val">2</span><span>Esausto</span>
          </div>
        </div>

        <button class="btn btn-lime w-full" style="margin-top:8px;justify-content:center" onclick="saveSleepLog()">Salva</button>
        <button class="btn btn-ghost w-full" style="margin-top:8px;justify-content:center" onclick="closeSonnoModal()">Annulla</button>
      </div>
    </div>
  `;
  container.appendChild(div.firstElementChild);
  setupModalClose(MODAL_ID);

  // tiredness label
  document.getElementById('sl-tiredness')?.addEventListener('input', (e) => {
    document.getElementById('sl-tiredness-val').textContent = e.target.value;
  });
}

let selectedQuality = 3;

window.setSleepQuality = function(n) {
  selectedQuality = n;
  [1,2,3,4,5].forEach(i => {
    const btn = document.getElementById(`sq-${i}`);
    if (btn) {
      btn.style.background = i <= n ? 'var(--lime)' : 'var(--black3)';
      btn.style.color      = i <= n ? 'var(--black)' : 'var(--gray2)';
    }
  });
};

window.openSonnoModal = function() {
  document.getElementById('sl-date').value = today();
  document.getElementById('sl-hours').value = '';
  document.getElementById('sl-nap').value = '';
  document.getElementById('sl-tiredness').value = 2;
  document.getElementById('sl-tiredness-val').textContent = '2';
  setSleepQuality(3);
  openModal(MODAL_ID);
};

window.closeSonnoModal = function() {
  closeModal(MODAL_ID);
};

window.saveSleepLog = function() {
  const date      = document.getElementById('sl-date').value;
  const hours     = parseFloat(document.getElementById('sl-hours').value);
  const nap       = parseInt(document.getElementById('sl-nap').value) || 0;
  const tiredness = parseInt(document.getElementById('sl-tiredness').value);

  if (!date || isNaN(hours)) {
    alert('Inserisci data e ore di sonno.');
    return;
  }

  setData(data => {
    const logs = data.sleep.logs.filter(l => l.date !== date);
    logs.push({ date, hours, quality: selectedQuality, nap, tiredness });
    logs.sort((a, b) => a.date.localeCompare(b.date));
    return { ...data, sleep: { ...data.sleep, logs } };
  });

  closeModal(MODAL_ID);
  render();
};

window.adjustGoal = function(delta) {
  setData(data => ({
    ...data,
    sleep: { ...data.sleep, goal: Math.max(4, Math.min(12, (data.sleep?.goal || 8) + delta)) }
  }));
  render();
};

// ── Utils ─────────────────────────────────────────────────────

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
