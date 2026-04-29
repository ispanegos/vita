// ============================================================
// VITA — Attività Module
// ============================================================
import { getData, setData, today, uid, fmtNum, openModal, closeModal, setupModalClose } from '../core.js';

const ROOT = 'attivita-root';

export function init() {
  injectModals();
  document.addEventListener('vita:navigate', (e) => {
    if (e.detail.page === 'attivita') render();
  });
}

function render() {
  const root = document.getElementById(ROOT);
  if (!root) return;

  const data   = getData();
  const sports = data.activity?.sports || [];
  const logs   = data.activity.logs   || [];
  const totalKcal = logs.reduce((s, l) => s + (l.kcal||0), 0);

  root.innerHTML = `
    <div class="page-header">
      <div class="page-title">Attività</div>
      <button class="btn btn-dark btn-sm" onclick="openSportModal()">+ Sport</button>
    </div>

    <!-- Totale calorie sempre -->
    <div class="card-lime mb-12">
      <div style="font-size:13px;font-weight:700;color:var(--olive)">🔥 Totale kcal bruciate</div>
      <div style="font-size:48px;font-weight:900;color:var(--black);margin-top:4px;line-height:1">
        ${fmtNum(totalKcal)}<span style="font-size:16px;color:var(--olive)"> kcal</span>
      </div>
      <div style="font-size:11px;color:var(--olive);margin-top:4px">da tutti gli allenamenti</div>
    </div>

    <!-- Sport cards -->
    ${sports.length === 0
      ? `<div class="card-dark" style="text-align:center;padding:40px 20px">
           <div style="font-size:40px;margin-bottom:12px">🏃</div>
           <div style="color:var(--gray2);font-size:14px">Nessuno sport ancora.<br>Aggiungine uno con "+ Sport"</div>
         </div>`
      : sports.map(s => renderSportCard(s, logs)).join('')
    }
  `;
}

function renderSportCard(sport, logs) {
  const sportLogs = logs.filter(l => l.sportId === sport.id);
  const totalKcal = sportLogs.reduce((s,l) => s+(l.kcal||0), 0);
  const totalKm   = sportLogs.reduce((s,l) => s+(l.distance||0), 0);
  const totalMin  = sportLogs.reduce((s,l) => s+(l.duration||0), 0);
  const hrs = Math.floor(totalMin/60);
  const min = totalMin % 60;

  return `
    <div class="card-dark mb-12">
      <div class="flex-between mb-12">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:32px">${sport.emoji}</div>
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--white)">${sport.name}</div>
            <div style="font-size:11px;color:var(--gray2)">
              ${sport.calcType === 'kcal_km' ? `${sport.rate} kcal/km` : `${sport.rate} kcal/kg/h`}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="openActivityLogModal('${sport.id}')" class="btn btn-lime btn-sm">+ Log</button>
          <button onclick="openEditSportModal('${sport.id}')" style="background:none;border:none;color:var(--gray2);font-size:14px;cursor:pointer">✏️</button>
          <button onclick="moveSport('${sport.id}',-1)" style="background:none;border:none;color:var(--gray2);font-size:16px;cursor:pointer">↑</button>
          <button onclick="moveSport('${sport.id}',1)" style="background:none;border:none;color:var(--gray2);font-size:16px;cursor:pointer">↓</button>
          <button onclick="deleteSportById('${sport.id}')" style="background:none;border:none;color:#FF6B6B;font-size:14px;cursor:pointer">🗑️</button>
        </div>
      </div>

      <div class="grid-3" style="margin-bottom:12px">
        <div style="text-align:center;padding:10px;background:var(--black3);border-radius:var(--radius-md)">
          <div style="font-size:18px;font-weight:800;color:var(--lime)">${fmtNum(totalKm,1)}</div>
          <div style="font-size:10px;color:var(--gray2)">km tot.</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--black3);border-radius:var(--radius-md)">
          <div style="font-size:18px;font-weight:800;color:var(--lime)">${fmtNum(totalKcal)}</div>
          <div style="font-size:10px;color:var(--gray2)">kcal tot.</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--black3);border-radius:var(--radius-md)">
          <div style="font-size:18px;font-weight:800;color:var(--lime)">${hrs}h${min?min+'m':''}</div>
          <div style="font-size:10px;color:var(--gray2)">ore tot.</div>
        </div>
      </div>

      ${sportLogs.length > 0 ? `
        <div>
          ${[...sportLogs].reverse().slice(0,3).map(l => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--black3)">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--white)">${formatDateShort(l.date)}</div>
                <div style="font-size:11px;color:var(--gray2)">${l.duration} min${l.distance ? ` · ${l.distance} km` : ''}</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <div style="font-size:14px;font-weight:700;color:var(--lime)">${fmtNum(l.kcal)} kcal</div>
                <button onclick="deleteActivityLogById('${l.id}')" style="background:none;border:none;color:#FF6B6B;font-size:12px;cursor:pointer">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

window.deleteSportById = function(id) {
  if (!confirm('Eliminare questo sport e tutti i suoi log?')) return;
  setData(d => ({
    ...d,
    activity: {
      sports: (d.activity.sports||[]).filter(s => s.id !== id),
      logs:   (d.activity.logs||[]).filter(l => l.sportId !== id),
    }
  }));
  render();
};

window.deleteActivityLogById = function(id) {
  setData(d => ({
    ...d,
    activity: { ...d.activity, logs: (d.activity.logs||[]).filter(l => l.id !== id) }
  }));
  render();
};

// ── Modals ────────────────────────────────────────────────────

function injectModals() {
  const container = document.getElementById('modals-container');

  addModal(container, 'modal-sport', `
    <div class="modal-handle"></div>
    <div class="modal-title">Nuovo Sport</div>
    <div class="form-group">
      <label class="form-label">Emoji</label>
      <input type="text" class="form-input" id="sp-emoji" placeholder="🏃" maxlength="2" style="font-size:28px;text-align:center"/>
    </div>
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input type="text" class="form-input" id="sp-name" placeholder=""/>
    </div>
    <div class="form-group">
      <label class="form-label">Tipo calcolo calorie</label>
      <select class="form-input" id="sp-calc" onchange="updateSportCalcLabel()">
        <option value="kcal_km">kcal/kg/km</option>
        <option value="kcal_kg_h">kcal/kg/ora</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" id="sp-rate-label">Valore kcal/kg/km</label>
      <input type="number" class="form-input" id="sp-rate" placeholder="" step="0.001"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveSportNew()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-sport')">Annulla</button>
  `);

  addModal(container, 'modal-activity-log', `
    <div class="modal-handle"></div>
    <div class="modal-title" id="al-modal-title">Log Allenamento</div>
    <input type="hidden" id="al-sport-id"/>
    <div class="form-group">
      <label class="form-label">Data</label>
      <input type="date" class="form-input" id="al-date"/>
    </div>
    <div class="form-group">
      <label class="form-label">Durata (minuti)</label>
      <input type="number" class="form-input" id="al-duration" placeholder="es. 45" oninput="updateKcalPreview()"/>
    </div>
    <div class="form-group" id="al-distance-group">
      <label class="form-label">Distanza (km)</label>
      <input type="number" class="form-input" id="al-distance" step="0.1" placeholder="es. 5.2" oninput="updateKcalPreview()"/>
    </div>
    <div style="padding:12px;background:var(--black3);border-radius:var(--radius-md);font-size:13px;color:var(--gray2);margin-bottom:12px">
      Kcal stimate: <strong id="al-kcal-preview" style="color:var(--lime)">—</strong>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center" onclick="saveActivityLogNew()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-activity-log')">Annulla</button>
  `);

  addModal(container, 'modal-edit-sport', `
    <div class="modal-handle"></div>
    <div class="modal-title">Modifica Sport</div>
    <input type="hidden" id="es-id"/>
    <div class="form-group">
      <label class="form-label">Emoji</label>
      <input type="text" class="form-input" id="es-emoji" placeholder="🏃" maxlength="2" style="font-size:28px;text-align:center"/>
    </div>
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input type="text" class="form-input" id="es-name" placeholder=""/>
    </div>
    <div class="form-group">
      <label class="form-label">Tipo calcolo calorie</label>
      <select class="form-input" id="es-calc" onchange="updateEditSportLabel()">
        <option value="kcal_km">kcal/kg/km</option>
        <option value="kcal_kg_h">kcal/kg/ora</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" id="es-rate-label">Valore</label>
      <input type="number" class="form-input" id="es-rate" step="0.001"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center;margin-top:8px" onclick="saveEditSport()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-edit-sport')">Annulla</button>
  `);

  setupModalClose('modal-sport');
  setupModalClose('modal-activity-log');
  setupModalClose('modal-edit-sport');
}

function addModal(container, id, inner) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.id = id;
  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';
  sheet.innerHTML = inner;
  wrap.appendChild(sheet);
  container.appendChild(wrap);
}

window.openSportModal = () => {
  document.getElementById('sp-emoji').value = '';
  document.getElementById('sp-name').value  = '';
  document.getElementById('sp-rate').value  = '';
  openModal('modal-sport');
};

window.updateSportCalcLabel = () => {
  const calc = document.getElementById('sp-calc').value;
  document.getElementById('sp-rate-label').textContent =
    calc === 'kcal_km' ? 'Valore kcal/kg/km' : 'Valore kcal/kg/ora';
};

window.saveSportNew = () => {
  const emoji    = document.getElementById('sp-emoji').value.trim() || '🏃';
  const name     = document.getElementById('sp-name').value.trim();
  const calcType = document.getElementById('sp-calc').value;
  const rate     = parseFloat(document.getElementById('sp-rate').value);
  if (!name || isNaN(rate)) { alert('Compila tutti i campi'); return; }
  setData(d => ({
    ...d,
    activity: { ...d.activity, sports: [...(d.activity.sports||[]), { id: uid(), name, emoji, calcType, rate }] }
  }));
  closeModal('modal-sport');
  render();
};

let currentSport = null;

window.openActivityLogModal = (sportId) => {
  const data  = getData();
  const sport = (data.activity.sports||[]).find(s => s.id === sportId);
  if (!sport) return;
  currentSport = sport;
  document.getElementById('al-modal-title').textContent = `Log ${sport.name}`;
  document.getElementById('al-sport-id').value = sportId;
  document.getElementById('al-date').value     = today();
  document.getElementById('al-duration').value = '';
  document.getElementById('al-distance').value = '';
  document.getElementById('al-kcal-preview').textContent = '—';
  document.getElementById('al-distance-group').style.display =
    sport.calcType === 'kcal_km' ? 'block' : 'none';
  openModal('modal-activity-log');
};

window.updateKcalPreview = () => {
  if (!currentSport) return;
  const data     = getData();
  const duration = parseFloat(document.getElementById('al-duration').value) || 0;
  const distance = parseFloat(document.getElementById('al-distance').value) || 0;
  const weight   = data.health.weightLogs?.slice(-1)[0]?.value || 75;
  const kcal     = calcKcal(currentSport, duration, distance, weight);
  document.getElementById('al-kcal-preview').textContent = kcal ? `${Math.round(kcal)} kcal` : '—';
};

window.saveActivityLogNew = () => {
  const sportId  = document.getElementById('al-sport-id').value;
  const date     = document.getElementById('al-date').value;
  const duration = parseFloat(document.getElementById('al-duration').value);
  const distance = parseFloat(document.getElementById('al-distance').value) || 0;
  if (!date || isNaN(duration)) { alert('Inserisci data e durata'); return; }
  const data   = getData();
  const sport  = (data.activity.sports||[]).find(s => s.id === sportId);
  const weight = data.health.weightLogs?.slice(-1)[0]?.value || 75;
  const kcal   = Math.round(calcKcal(sport, duration, distance, weight));
  setData(d => ({
    ...d,
    activity: { ...d.activity, logs: [...(d.activity.logs||[]), { id: uid(), sportId, date, duration, distance, kcal }] }
  }));
  closeModal('modal-activity-log');
  render();
};

function calcKcal(sport, duration, distance, weight) {
  if (!sport) return 0;
  if (sport.calcType === 'kcal_km') return sport.rate * weight * distance;
  return sport.rate * weight * (duration / 60);
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

window.openEditSportModal = (id) => {
  const data  = getData();
  const sport = (data.activity.sports||[]).find(s => s.id === id);
  if (!sport) return;
  document.getElementById('es-id').value    = id;
  document.getElementById('es-emoji').value = sport.emoji || '🏃';
  document.getElementById('es-name').value  = sport.name;
  document.getElementById('es-calc').value = sport.calcType;
  document.getElementById('es-rate').value = sport.rate;
  document.getElementById('es-rate-label').textContent =
    sport.calcType === 'kcal_km' ? 'Valore kcal/kg/km' : 'Valore kcal/kg/ora';
  openModal('modal-edit-sport');
};

window.updateEditSportLabel = () => {
  const calc = document.getElementById('es-calc').value;
  document.getElementById('es-rate-label').textContent =
    calc === 'kcal_km' ? 'Valore kcal/kg/km' : 'Valore kcal/kg/ora';
};

window.saveEditSport = () => {
  const id       = document.getElementById('es-id').value;
  const emoji    = document.getElementById('es-emoji').value.trim() || '🏃';
  const name     = document.getElementById('es-name').value.trim();
  const calcType = document.getElementById('es-calc').value;
  const rate     = parseFloat(document.getElementById('es-rate').value);
  if (!name || isNaN(rate)) { alert('Compila tutti i campi'); return; }
  setData(d => ({
    ...d,
    activity: {
      ...d.activity,
      sports: (d.activity.sports||[]).map(s => s.id === id ? { ...s, emoji, name, calcType, rate } : s)
    }
  }));
  closeModal('modal-edit-sport');
  render();
};

window.moveSport = function(id, dir) {
  setData(d => {
    const sports = [...(d.activity.sports || [])];
    const idx = sports.findIndex(s => s.id === id);
    if (idx === -1) return d;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sports.length) return d;
    // Swap
    [sports[idx], sports[newIdx]] = [sports[newIdx], sports[idx]];
    return { ...d, activity: { ...d.activity, sports } };
  });
  render();
};

window.closeModal = closeModal;
