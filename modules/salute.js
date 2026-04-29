// ============================================================
// VITA — Salute (Health) Module
// ============================================================
import { getData, setData, today, uid, fmtNum, openModal, closeModal, setupModalClose } from '../core.js';

const ROOT = 'salute-root';

export function init() {
  injectModals();
  document.addEventListener('vita:navigate', (e) => {
    if (e.detail.page === 'salute') render();
  });
}

// ── Render ───────────────────────────────────────────────────

function render() {
  const data = getData();
  const root = document.getElementById(ROOT);
  if (!root) return;

  const health = data.health;
  const weightLogs = health?.weightLogs || [];
  const lastWeight = weightLogs.length ? weightLogs[weightLogs.length-1].value : null;
  const firstWeight = weightLogs.length ? weightLogs[0].value : null;
  const bmr = health?.bmr;
  const deficit = health?.caloricDeficit || 0;
  const calorieTarget = bmr ? bmr - deficit : null;

  // Days to goal
  let daysToGoal = null;
  if (bmr && deficit > 0 && lastWeight && health?.weightGoal) {
    const kgToLose = Math.max(0, lastWeight - health?.weightGoal);
    const kcalToLose = kgToLose * 7800;
    daysToGoal = Math.ceil(kcalToLose / deficit);
  }

  root.innerHTML = `
    <div class="page-header">
      <div class="page-title">Salute</div>
    </div>

    <!-- ═══ PESO ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div class="card-title">⚖️ Peso corporeo</div>
        <button class="btn btn-lime btn-sm" onclick="openWeightModal()">+ Log</button>
      </div>
      <div style="display:flex;gap:16px;align-items:flex-end;margin-bottom:16px">
        <div>
          <div style="font-size:12px;color:var(--gray2)">Attuale</div>
          <div style="font-size:40px;font-weight:900;color:var(--white)">${lastWeight ? fmtNum(lastWeight,1) : '—'}<span style="font-size:16px;color:var(--gray2)"> kg</span></div>
        </div>
        ${health?.weightGoal ? `
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:12px;color:var(--gray2)">Obiettivo</div>
          <div style="font-size:24px;font-weight:800;color:var(--lime)">${fmtNum(health?.weightGoal,1)} kg</div>
          ${firstWeight && lastWeight ? `<div style="font-size:11px;color:${lastWeight<=health?.weightGoal?'var(--lime)':'#FF6B6B'}">${fmtNum(Math.abs(lastWeight-health?.weightGoal),1)} kg ${lastWeight>health?.weightGoal?'ancora':'in meno 🎉'}</div>` : ''}
        </div>
        ` : `<button onclick="openWeightGoalModal()" style="margin-left:auto;background:var(--black3);border:none;color:var(--gray2);padding:8px 14px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer">+ Obiettivo</button>`}
      </div>

      <!-- Mini chart -->
      ${renderWeightChart(weightLogs)}

      <!-- Period selector -->
      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
        ${['Sett.','Mese','3 Mesi','Anno','Sempre'].map((p,i)=>`
          <button onclick="setWeightPeriod(${i})" id="wp-${i}"
            class="chip ${i===0?'chip-active':'chip-dark'}" style="font-size:11px;padding:4px 10px">${p}</button>
        `).join('')}
      </div>
    </div>

    <!-- ═══ MISURE ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div class="card-title">📏 Misure corporee</div>
        <button class="btn btn-lime btn-sm" onclick="openMeasureModal()">+ Misura</button>
      </div>

      <!-- Altezza -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--black3)">
        <div style="font-size:14px;font-weight:600;color:var(--white)">📐 Altezza</div>
        <div style="display:flex;align-items:center;gap:10px">
          ${health?.height
            ? `<span style="font-size:18px;font-weight:800;color:var(--lime)">${health?.height} cm</span>`
            : `<span style="font-size:13px;color:var(--gray2)">Non impostata</span>`}
          <button onclick="openHeightModal()" style="background:var(--black3);border:none;color:var(--gray2);padding:4px 10px;border-radius:99px;font-size:11px;cursor:pointer">✏️</button>
        </div>
      </div>

      <!-- Custom measurements -->
      ${(health.measurements||[]).length === 0
        ? `<div style="color:var(--gray2);font-size:13px;margin-top:12px">Nessuna misura. Creane una con "+ Misura"</div>`
        : (health.measurements||[]).map(m => renderMeasurement(m)).join('')
      }
    </div>

    <!-- ═══ METABOLISMO BASALE ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-8">
        <div class="card-title">🔬 Metabolismo Basale</div>
        <button class="btn btn-lime btn-sm" onclick="openBmrModal()">Calcola</button>
      </div>
      ${bmr
        ? `<div style="font-size:48px;font-weight:900;color:var(--white)">${fmtNum(bmr)}<span style="font-size:16px;color:var(--gray2)"> kcal/giorno</span></div>
           ${health?.bmrParams ? `<div style="font-size:12px;color:var(--gray2);margin-top:8px">Formula Mifflin-St Jeor · ${health?.bmrParams.gender==='M'?'Uomo':'Donna'} · ${health?.bmrParams.age} anni</div>` : ''}`
        : `<div style="color:var(--gray2);font-size:14px">Premi "Calcola" per determinare il tuo fabbisogno calorico di base.</div>`
      }
    </div>

    <!-- ═══ DEFICIT CALORICO ═══ -->
    <div class="card-dark mb-12">
      <div class="flex-between mb-8">
        <div class="card-title">📉 Deficit Calorico</div>
        <button class="btn btn-lime btn-sm" onclick="openDeficitModal()">Imposta</button>
      </div>
      ${bmr ? `
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <div>
            <div style="font-size:12px;color:var(--gray2)">BMR</div>
            <div style="font-size:22px;font-weight:800;color:var(--white)">${fmtNum(bmr)} kcal</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--gray2)">Deficit</div>
            <div style="font-size:22px;font-weight:800;color:${deficit>0?'#FF6B6B':'var(--gray2)'}">−${fmtNum(deficit)} kcal</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--gray2)">Target giorno</div>
            <div style="font-size:22px;font-weight:800;color:var(--lime)">${fmtNum(calorieTarget)} kcal</div>
          </div>
        </div>
        ${daysToGoal ? `
          <div style="margin-top:14px;padding:12px;background:var(--black3);border-radius:var(--radius-md)">
            <div style="font-size:12px;color:var(--gray2)">Tempo stimato all'obiettivo</div>
            <div style="font-size:20px;font-weight:800;color:var(--lime);margin-top:4px">
              ${daysToGoal < 30 ? `${daysToGoal} giorni` : `${Math.round(daysToGoal/30)} ${Math.round(daysToGoal/30)===1?'mese':'mesi'}`}
            </div>
            <div style="font-size:11px;color:var(--gray2);margin-top:2px">Con ${fmtNum(deficit)} kcal/giorno di deficit</div>
          </div>
        ` : ''}
      ` : `<div style="color:var(--gray2);font-size:14px">Calcola prima il metabolismo basale.</div>`}
    </div>
  `;

  // Init period selector
  window.setWeightPeriod = function(i) {
    document.querySelectorAll('[id^="wp-"]').forEach((b,j) => {
      b.className = `chip ${j===i?'chip-active':'chip-dark'}`;
      b.style.fontSize = '11px';
      b.style.padding  = '4px 10px';
    });
    // TODO: filter chart by period (simplified for now)
  };
}

function renderMeasurement(m) {
  const logs = m.logs || [];
  const first = logs[0];
  const last  = logs[logs.length-1];
  const diff  = first && last ? (last.value - first.value) : null;
  return `
    <div style="padding:12px 0;border-bottom:1px solid var(--black3)">
      <div class="flex-between mb-4">
        <div style="font-size:14px;font-weight:700;color:var(--white)">${m.name}</div>
        <div style="display:flex;gap:8px;align-items:center">
          ${last ? `<span style="font-size:18px;font-weight:800;color:var(--lime)">${fmtNum(last.value,1)} ${m.unit}</span>` : '—'}
          <button onclick="openLogMeasureModal('${m.id}')" style="background:var(--black3);border:none;color:var(--lime);padding:4px 10px;border-radius:99px;font-size:11px;cursor:pointer">+ Log</button>
          <button onclick="deleteMeasure('${m.id}')" style="background:none;border:none;color:#FF6B6B;font-size:11px;cursor:pointer">🗑️</button>
        </div>
      </div>
      ${first && last && first.date !== last.date ? `
        <div style="display:flex;gap:16px">
          <div style="font-size:11px;color:var(--gray2)">Inizio: ${fmtNum(first.value,1)} ${m.unit}</div>
          <div style="font-size:11px;color:${diff<0?'var(--lime)':diff>0?'#FF6B6B':'var(--gray2)'}">
            ${diff > 0 ? '▲' : diff < 0 ? '▼' : '─'} ${fmtNum(Math.abs(diff),1)} ${m.unit}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderWeightChart(logs) {
  if (logs.length < 2) {
    return `<div style="height:80px;display:flex;align-items:center;justify-content:center;color:var(--gray2);font-size:13px">
      ${logs.length === 0 ? 'Nessun dato. Inizia a loggare il peso.' : 'Aggiungi altri log per vedere il grafico.'}
    </div>`;
  }
  const recent = logs.slice(-7);
  const values = recent.map(l => l.value);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const W = 280, H = 70;
  const px = (i) => (i / (recent.length - 1)) * W;
  const py = (v) => H - ((v - min) / (max - min)) * H;

  const points = recent.map((l, i) => `${px(i)},${py(l.value)}`).join(' ');
  const area = `${px(0)},${H} ${points} ${px(recent.length-1)},${H}`;

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H+10}" style="overflow:visible;margin-top:8px">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--lime)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--lime)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${area}" fill="url(#wg)"/>
      <polyline points="${points}" fill="none" stroke="var(--lime)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${recent.map((l,i)=>`<circle cx="${px(i)}" cy="${py(l.value)}" r="4" fill="var(--lime)"/>`).join('')}
    </svg>
  `;
}

function activityLabel(v) {
  return {sedentario:'Sedentario',leggero:'Leggero',moderato:'Moderato',intenso:'Intenso',molto_intenso:'Molto intenso'}[v] || v;
}

// ── Modals ────────────────────────────────────────────────────

function injectModals() {
  const container = document.getElementById('modals-container');

  // Weight log modal
  addModal(container, 'modal-weight', `
    <div class="modal-handle"></div>
    <div class="modal-title">Log Peso</div>
    <div class="form-group">
      <label class="form-label">Data</label>
      <input type="date" class="form-input" id="wl-date"/>
    </div>
    <div class="form-group">
      <label class="form-label">Peso (kg)</label>
      <input type="number" class="form-input" id="wl-value" step="0.1" placeholder="es. 78.5"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveWeightLog()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-weight')">Annulla</button>
  `);

  // Weight goal modal
  addModal(container, 'modal-weight-goal', `
    <div class="modal-handle"></div>
    <div class="modal-title">Obiettivo Peso</div>
    <div class="form-group">
      <label class="form-label">Peso obiettivo (kg)</label>
      <input type="number" class="form-input" id="wg-value" step="0.1" placeholder="es. 72.0"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveWeightGoal()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-weight-goal')">Annulla</button>
  `);

  // Height modal
  addModal(container, 'modal-height', `
    <div class="modal-handle"></div>
    <div class="modal-title">Altezza</div>
    <div class="form-group">
      <label class="form-label">Altezza (cm)</label>
      <input type="number" class="form-input" id="ht-value" placeholder="es. 178"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveHeight()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-height')">Annulla</button>
  `);

  // New measurement modal
  addModal(container, 'modal-new-measure', `
    <div class="modal-handle"></div>
    <div class="modal-title">Nuova Misura</div>
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input type="text" class="form-input" id="nm-name" placeholder="es. Vita, Bicipite…"/>
    </div>
    <div class="form-group">
      <label class="form-label">Unità</label>
      <select class="form-input" id="nm-unit">
        <option value="cm">cm</option>
        <option value="mm">mm</option>
        <option value="%">%</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Valore iniziale</label>
      <input type="number" class="form-input" id="nm-value" step="0.1" placeholder="es. 85"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveNewMeasure()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-new-measure')">Annulla</button>
  `);

  // Log measurement modal
  addModal(container, 'modal-log-measure', `
    <div class="modal-handle"></div>
    <div class="modal-title">Log Misura</div>
    <input type="hidden" id="lm-id"/>
    <div class="form-group">
      <label class="form-label">Data</label>
      <input type="date" class="form-input" id="lm-date"/>
    </div>
    <div class="form-group">
      <label class="form-label">Valore</label>
      <input type="number" class="form-input" id="lm-value" step="0.1"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveLogMeasure()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-log-measure')">Annulla</button>
  `);

  // BMR modal
  addModal(container, 'modal-bmr', `
    <div class="modal-handle"></div>
    <div class="modal-title">Calcola Metabolismo Basale</div>
    <div class="form-group">
      <label class="form-label">Sesso</label>
      <select class="form-input" id="bmr-gender">
        <option value="M">Uomo</option>
        <option value="F">Donna</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Età</label>
      <input type="number" class="form-input" id="bmr-age" placeholder="es. 30"/>
    </div>
    <div style="padding:12px;background:var(--black3);border-radius:var(--radius-md);font-size:12px;color:var(--gray2);margin-bottom:16px">
      Formula Mifflin-St Jeor · BMR puro senza fattore attività.<br/>
      Peso e altezza vengono presi automaticamente dai tuoi dati.
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center" onclick="calculateBmr()">Calcola</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-bmr')">Annulla</button>
  `);

  // Deficit modal
  addModal(container, 'modal-deficit', `
    <div class="modal-handle"></div>
    <div class="modal-title">Deficit Calorico</div>
    <div class="form-group">
      <label class="form-label">Deficit giornaliero (kcal)</label>
      <input type="number" class="form-input" id="def-value" placeholder="es. 400" step="50"/>
    </div>
    <div style="padding:12px;background:var(--black3);border-radius:var(--radius-md);font-size:12px;color:var(--gray2);margin-bottom:16px">
      Raccomandato: 300–600 kcal/giorno per una perdita di peso sana e sostenibile.
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center" onclick="saveDeficit()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-deficit')">Annulla</button>
  `);
}

function addModal(container, id, inner) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.id = id;
  wrap.innerHTML = `<div class="modal-sheet">${inner}</div>`;
  container.appendChild(wrap);
  setupModalClose(id);
}

// ── Window handlers ───────────────────────────────────────────

window.openWeightModal = () => {
  document.getElementById('wl-date').value = today();
  document.getElementById('wl-value').value = '';
  openModal('modal-weight');
};
window.openWeightGoalModal = () => openModal('modal-weight-goal');
window.openHeightModal = () => {
  document.getElementById('ht-value').value = getData().health?.height || '';
  openModal('modal-height');
};
window.openMeasureModal = () => {
  document.getElementById('nm-name').value = '';
  document.getElementById('nm-value').value = '';
  openModal('modal-new-measure');
};
window.openLogMeasureModal = (id) => {
  document.getElementById('lm-id').value = id;
  document.getElementById('lm-date').value = today();
  document.getElementById('lm-value').value = '';
  openModal('modal-log-measure');
};
window.openBmrModal = () => openModal('modal-bmr');
window.openDeficitModal = () => {
  document.getElementById('def-value').value = getData().health.caloricDeficit || '';
  openModal('modal-deficit');
};

window.saveWeightLog = () => {
  const date  = document.getElementById('wl-date').value;
  const value = parseFloat(document.getElementById('wl-value').value);
  if (!date || isNaN(value)) { alert('Dati mancanti'); return; }
  setData(d => {
    const logs = d.health.weightLogs.filter(l => l.date !== date);
    logs.push({ date, value });
    logs.sort((a,b) => a.date.localeCompare(b.date));
    return { ...d, health: { ...d.health, weightLogs: logs } };
  });
  closeModal('modal-weight');
  render();
};

window.saveWeightGoal = () => {
  const value = parseFloat(document.getElementById('wg-value').value);
  if (isNaN(value)) { alert('Inserisci un valore valido'); return; }
  setData(d => ({ ...d, health: { ...d.health, weightGoal: value } }));
  closeModal('modal-weight-goal');
  render();
};

window.saveHeight = () => {
  const value = parseFloat(document.getElementById('ht-value').value);
  if (isNaN(value)) { alert('Inserisci un valore valido'); return; }
  setData(d => ({ ...d, health: { ...d.health, height: value } }));
  closeModal('modal-height');
  render();
};

window.saveNewMeasure = () => {
  const name  = document.getElementById('nm-name').value.trim();
  const unit  = document.getElementById('nm-unit').value;
  const value = parseFloat(document.getElementById('nm-value').value);
  if (!name) { alert('Inserisci un nome'); return; }
  const log = !isNaN(value) ? [{ date: today(), value }] : [];
  setData(d => ({
    ...d,
    health: { ...d.health, measurements: [...(d.health.measurements||[]), { id: uid(), name, unit, logs: log }] }
  }));
  closeModal('modal-new-measure');
  render();
};

window.saveLogMeasure = () => {
  const id    = document.getElementById('lm-id').value;
  const date  = document.getElementById('lm-date').value;
  const value = parseFloat(document.getElementById('lm-value').value);
  if (!date || isNaN(value)) { alert('Dati mancanti'); return; }
  setData(d => ({
    ...d,
    health: {
      ...d.health,
      measurements: (d.health.measurements||[]).map(m => {
        if (m.id !== id) return m;
        const logs = m.logs.filter(l => l.date !== date);
        logs.push({ date, value });
        logs.sort((a,b) => a.date.localeCompare(b.date));
        return { ...m, logs };
      })
    }
  }));
  closeModal('modal-log-measure');
  render();
};

window.deleteMeasure = (id) => {
  if (!confirm('Eliminare questa misura?')) return;
  setData(d => ({ ...d, health: { ...d.health, measurements: (d.health.measurements||[]).filter(m => m.id !== id) } }));
  render();
};

window.calculateBmr = () => {
  const data   = getData();
  const weight = data.health.weightLogs?.slice(-1)[0]?.value;
  const height = data.health?.height;
  const gender = document.getElementById('bmr-gender').value;
  const age    = parseInt(document.getElementById('bmr-age').value);

  if (!weight || !height) { alert('Inserisci prima peso e altezza.'); return; }
  if (isNaN(age)) { alert("Inserisci l'età."); return; }

  // Mifflin-St Jeor — BMR puro, senza moltiplicatore attività
  const bmr = Math.round(gender === 'M'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161);

  setData(d => ({ ...d, health: { ...d.health, bmr, bmrParams: { gender, age } } }));
  closeModal('modal-bmr');
  render();
};

window.saveDeficit = () => {
  const value = parseInt(document.getElementById('def-value').value);
  if (isNaN(value)) { alert('Inserisci un valore valido'); return; }
  setData(d => ({ ...d, health: { ...d.health, caloricDeficit: value } }));
  closeModal('modal-deficit');
  render();
};

window.closeModal = closeModal;
