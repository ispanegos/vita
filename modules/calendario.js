// ============================================================
// VITA — Calendario Module
// ============================================================
import { getData, setData, today, toDateStr, uid, openModal, closeModal, setupModalClose } from '../core.js';

const ROOT = 'calendario-root';
let currentView = 'day'; // 'day' | 'week' | 'month'
let currentDate = new Date();

// Touch swipe state
let touchStartX = 0;
let touchStartY = 0;

export function init() {
  injectModals();
  document.addEventListener('vita:navigate', (e) => {
    if (e.detail.page === 'calendario') {
      currentDate = new Date();
      render();
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────

function ds(date) { return toDateStr(date); }

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function parseTime(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmtDuration(minutes) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatDayHeader(date) {
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatMonthYear(date) {
  const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getEventsForDate(data, dateStr) {
  return (data.calendario?.events || []).filter(e => e.dates?.includes(dateStr));
}

function getCategories(data) {
  return data.calendario?.categories || [];
}

function getCategoryById(data, id) {
  return getCategories(data).find(c => c.id === id);
}

// ── Main Render ───────────────────────────────────────────────

function render() {
  const root = document.getElementById(ROOT);
  if (!root) return;

  root.innerHTML = `
    <div class="page-header" style="margin-bottom:12px">
      <div class="page-title">Calendario</div>
      <div style="display:flex;gap:6px">
        <button onclick="openCatModal()" style="background:var(--black3);border:none;border-radius:99px;padding:6px 12px;font-size:11px;font-weight:700;color:var(--gray2);cursor:pointer">🏷 Cat.</button>
        <button onclick="openNewEventModal()" class="btn btn-lime btn-sm">+ Evento</button>
      </div>
    </div>

    <!-- View toggle -->
    <div style="display:flex;gap:6px;margin-bottom:14px">
      ${['day','week','month'].map(v => `
        <button onclick="setCalView('${v}')"
          style="flex:1;padding:7px 4px;border-radius:99px;border:none;font-size:12px;font-weight:700;cursor:pointer;
          background:${currentView===v?'var(--lime)':'var(--black3)'};
          color:${currentView===v?'var(--black)':'var(--gray2)'}">
          ${v==='day'?'Giorno':v==='week'?'Settimana':'Mese'}
        </button>
      `).join('')}
    </div>

    <div id="cal-content" style="touch-action:pan-y"></div>
  `;

  if (currentView === 'day')   renderDay();
  else if (currentView === 'week') renderWeek();
  else renderMonth();

  // Swipe
  const content = document.getElementById('cal-content');
  content.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  content.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (Math.abs(dx) > 50 && dy < 60) {
      if (dx < 0) navigateCal(1);
      else navigateCal(-1);
    }
  }, { passive: true });
}

window.setCalView = function(v) {
  currentView = v;
  render();
};

window.navigateCal = function(dir) {
  if (currentView === 'day') currentDate = addDays(currentDate, dir);
  else if (currentView === 'week') currentDate = addDays(currentDate, dir * 7);
  else {
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + dir);
  }
  render();
};

// ── DAY VIEW ──────────────────────────────────────────────────

function renderDay() {
  const data = getData();
  const dateStr = ds(currentDate);
  const events  = getEventsForDate(data, dateStr);
  const isToday = dateStr === today();

  const content = document.getElementById('cal-content');

  // Nav header
  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button onclick="navigateCal(-1)" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">‹</button>
      <div style="text-align:center">
        <div style="font-size:17px;font-weight:800;color:var(--black)">${formatDayHeader(currentDate)}</div>
        ${isToday ? '<div style="font-size:11px;color:var(--olive);font-weight:600">Oggi</div>' : ''}
      </div>
      <button onclick="navigateCal(1)" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">›</button>
    </div>

    ${events.length === 0
      ? `<div class="card" style="text-align:center;padding:40px 20px;color:var(--gray)">
           <div style="font-size:32px;margin-bottom:8px">📅</div>
           Nessun evento. Premi "+ Evento" per aggiungerne uno.
         </div>`
      : renderDayTimeline(events, data, dateStr)
    }
  `;
}

function renderDayTimeline(events, data, dateStr) {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin);
  const TOTAL_MIN   = 24 * 60;
  const TIMELINE_VH = 68;

  let html = '<div style="position:relative;padding-left:40px;height:' + TIMELINE_VH + 'vh;overflow:hidden">';

  // Hour lines — all 24
  for (let h = 0; h < 24; h++) {
    const top = (h * 60 / TOTAL_MIN * 100).toFixed(3);
    const label = String(h).padStart(2,'0');
    html += '<div style="position:absolute;left:0;right:0;top:' + top + '%;display:flex;align-items:center;gap:4px;pointer-events:none">'
          + '<div style="font-size:9px;color:var(--gray2);width:32px;text-align:right;flex-shrink:0;line-height:1">' + label + '</div>'
          + '<div style="flex:1;height:1px;background:var(--black3)"></div>'
          + '</div>';
  }

  // Current time line
  const nowStr = today();
  if (dateStr === nowStr) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const topNow = (nowMin / TOTAL_MIN * 100).toFixed(3);
    html += '<div style="position:absolute;left:32px;right:0;top:' + topNow + '%;height:2px;background:var(--lime);z-index:10">'
          + '<div style="position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--lime)"></div>'
          + '</div>';
  }

  // Events
  sorted.forEach(function(ev) {
    const cat      = getCategoryById(data, ev.categoryId);
    const color    = (cat && cat.color) ? cat.color : '#A8CF3A';
    const topPct   = (ev.startMin / TOTAL_MIN * 100).toFixed(3);
    const heightPct = Math.max((ev.endMin - ev.startMin) / TOTAL_MIN * 100, 1.5).toFixed(3);
    const isShort  = (ev.endMin - ev.startMin) < 30;
    const fs       = isShort ? '10' : '12';
    const pad      = isShort ? '2px 6px' : '4px 8px';
    const timeStr  = fmtTime(ev.startMin) + '–' + fmtTime(ev.endMin);
    html += '<div onclick="openEditEventModal(\'' + ev.id + '\',\'' + dateStr + '\')"'
          + ' style="position:absolute;left:40px;right:2px;top:' + topPct + '%;height:' + heightPct + '%;'
          + 'background:' + color + ';border-radius:6px;padding:' + pad + ';cursor:pointer;'
          + 'box-shadow:0 1px 4px rgba(0,0,0,0.2);overflow:hidden;z-index:5">'
          + '<div style="font-size:' + fs + 'px;font-weight:800;color:#1A1A1A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2">' + ev.title + '</div>'
          + (isShort ? '' : '<div style="font-size:10px;color:rgba(0,0,0,0.6);line-height:1.2">' + timeStr + '</div>')
          + '</div>';
  });

  html += '</div>';
  return html;
}

// ── WEEK VIEW ─────────────────────────────────────────────────

function renderWeek() {
  const data    = getData();
  const mon     = startOfWeek(currentDate);
  const days    = Array.from({length:7}, (_,i) => addDays(mon, i));
  const daysIT  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  const todayStr = today();

  const content = document.getElementById('cal-content');

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button onclick="navigateCal(-1)" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">‹</button>
      <div style="font-size:15px;font-weight:800;color:var(--black)">${formatMonthYear(mon)}</div>
      <button onclick="navigateCal(1)" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">›</button>
    </div>

    <!-- Copy prev week -->
    <button onclick="copyPrevWeek('${ds(mon)}')"
      style="width:100%;background:var(--black3);border:none;border-radius:var(--radius-md);padding:10px;font-size:12px;font-weight:700;color:var(--gray2);cursor:pointer;margin-bottom:12px">
      📋 Copia settimana precedente
    </button>

    <!-- Day columns header -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">
      ${days.map((d,i) => {
        const isToday = ds(d) === todayStr;
        const evCount = getEventsForDate(data, ds(d)).length;
        return `
          <button onclick="goToDay('${ds(d)}')"
            style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px;
            border-radius:var(--radius-md);border:none;cursor:pointer;
            background:${isToday?'var(--lime)':'var(--black3)'};
            color:${isToday?'var(--black)':'var(--gray2)'}">
            <div style="font-size:9px;font-weight:700">${daysIT[i]}</div>
            <div style="font-size:16px;font-weight:900">${d.getDate()}</div>
            ${evCount > 0 ? `<div style="width:5px;height:5px;border-radius:50%;background:${isToday?'var(--black)':'var(--lime)'}"></div>` : '<div style="width:5px;height:5px"></div>'}
          </button>`;
      }).join('')}
    </div>

    <!-- Events per day -->
    ${days.map(d => {
      const evs = getEventsForDate(data, ds(d));
      if (!evs.length) return '';
      return `
        <div style="margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--gray2);margin-bottom:4px">${formatDayHeader(d)}</div>
          ${evs.sort((a,b)=>a.startMin-b.startMin).map(ev => {
            const cat   = getCategoryById(data, ev.categoryId);
            const color = cat?.color || 'var(--lime)';
            return `
              <div onclick="openEditEventModal('${ev.id}','${ds(d)}')"
                style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--radius-md);
                background:var(--black);margin-bottom:4px;cursor:pointer">
                <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
                <div style="flex:1;font-size:13px;font-weight:700;color:var(--white)">${ev.title}</div>
                <div style="font-size:11px;color:var(--gray2)">${fmtTime(ev.startMin)}–${fmtTime(ev.endMin)}</div>
              </div>`;
          }).join('')}
        </div>`;
    }).join('')}
  `;

  content.innerHTML = html;
}

window.goToDay = function(dateStr) {
  currentDate = new Date(dateStr + 'T00:00:00');
  currentView = 'day';
  render();
};

window.copyPrevWeek = function(monDateStr) {
  const data = getData();
  const mon  = new Date(monDateStr + 'T00:00:00');
  const prevMon = addDays(mon, -7);

  // Get this week and prev week date strings
  const thisWeek = Array.from({length:7}, (_,i) => ds(addDays(mon, i)));
  const prevWeek = Array.from({length:7}, (_,i) => ds(addDays(prevMon, i)));

  const events = data.calendario?.events || [];

  // Find events from prev week and clone them for this week
  let newEvents = [...events];
  prevWeek.forEach((prevDs, i) => {
    const thisDs = thisWeek[i];
    events.forEach(ev => {
      if (ev.dates?.includes(prevDs) && !ev.dates?.includes(thisDs)) {
        // Check if already exists (same title, same time, this week)
        const exists = events.some(e => e.title === ev.title && e.startMin === ev.startMin && e.dates?.includes(thisDs));
        if (!exists) {
          const newEv = { ...ev, id: uid(), dates: [thisDs] };
          newEvents.push(newEv);
        }
      }
    });
  });

  setData(d => ({ ...d, calendario: { ...(d.calendario||{}), events: newEvents } }));
  render();
};

// ── MONTH VIEW ────────────────────────────────────────────────

function renderMonth() {
  const data     = getData();
  const todayStr = today();
  const year     = currentDate.getFullYear();
  const month    = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const daysIT   = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

  // Grid start: Monday of first week
  const gridStart = startOfWeek(firstDay);
  const gridEnd   = addDays(startOfWeek(lastDay), 6);

  const content = document.getElementById('cal-content');

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button onclick="navigateCal(-1)" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">‹</button>
      <div style="font-size:17px;font-weight:800;color:var(--black)">${formatMonthYear(currentDate)}</div>
      <button onclick="navigateCal(1)" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">›</button>
    </div>

    <!-- Day headers -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
      ${daysIT.map(d => `<div style="text-align:center;font-size:10px;font-weight:700;color:var(--gray2);padding:4px 0">${d}</div>`).join('')}
    </div>

    <!-- Grid -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
  `;

  let d = new Date(gridStart);
  while (d <= gridEnd) {
    const dateStr   = ds(d);
    const inMonth   = d.getMonth() === month;
    const isToday   = dateStr === todayStr;
    const evs       = getEventsForDate(data, dateStr);
    const colors    = evs.slice(0,3).map(e => getCategoryById(data, e.categoryId)?.color || 'var(--lime)');

    html += `
      <button onclick="goToDay('${dateStr}')"
        style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:2px;border-radius:var(--radius-sm);border:none;cursor:pointer;
        background:${isToday?'var(--lime)':inMonth?'var(--black3)':'transparent'};
        color:${isToday?'var(--black)':inMonth?'var(--white)':'var(--gray2)'}">
        <div style="font-size:14px;font-weight:${isToday?'900':'600'}">${d.getDate()}</div>
        <div style="display:flex;gap:2px">
          ${colors.map(c => `<div style="width:4px;height:4px;border-radius:50%;background:${isToday?'var(--black)':c}"></div>`).join('')}
        </div>
      </button>`;
    d = addDays(d, 1);
  }

  html += '</div>';
  content.innerHTML = html;
}

// ── MODALS ────────────────────────────────────────────────────

function injectModals() {
  const container = document.getElementById('modals-container');

  // New/Edit event modal
  addModal(container, 'modal-event', `
    <div class="modal-handle"></div>
    <div class="modal-title" id="ev-modal-title">Nuovo Evento</div>
    <input type="hidden" id="ev-id"/>
    <input type="hidden" id="ev-edit-date"/>

    <div class="form-group">
      <label class="form-label">Titolo</label>
      <input type="text" class="form-input" id="ev-title" placeholder="Es. Palestra"/>
    </div>

    <div class="form-group">
      <label class="form-label">Categoria</label>
      <select class="form-input" id="ev-category">
        <option value="">— Nessuna —</option>
      </select>
    </div>

    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Ora inizio</label>
        <input type="time" class="form-input" id="ev-start" value="09:00" oninput="onTimeChange()"/>
      </div>
      <div class="form-group">
        <label class="form-label">Ora fine</label>
        <input type="time" class="form-input" id="ev-end" value="10:00" oninput="onEndChange()"/>
      </div>
    </div>

    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Durata (min)</label>
        <input type="number" class="form-input" id="ev-duration" value="60" oninput="onDurationChange()"/>
      </div>
      <div class="form-group">
        <label class="form-label">Pausa (min)</label>
        <input type="number" class="form-input" id="ev-pause" value="0" oninput="onTimeChange()"/>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Ripeti questa settimana</label>
      <div style="display:flex;gap:6px;margin-top:6px" id="ev-repeat-days">
        ${['L','M','M','G','V','S','D'].map((d,i) => `
          <button type="button" onclick="toggleRepeatDay(${i})" id="rd-${i}"
            style="flex:1;height:36px;border-radius:50%;border:none;font-size:12px;font-weight:700;
            background:var(--black3);color:var(--gray2);cursor:pointer;transition:all 0.15s">
            ${d}
          </button>`).join('')}
      </div>
    </div>

    <div id="ev-actions" style="margin-top:8px">
      <button class="btn btn-lime w-full" style="justify-content:center" onclick="saveEvent()">Salva</button>
      <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-event')">Annulla</button>
    </div>
  `);

  // Categories modal
  addModal(container, 'modal-categories', `
    <div class="modal-handle"></div>
    <div class="modal-title">Categorie</div>
    <div id="cat-list" style="margin-bottom:16px"></div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input type="text" class="form-input" id="cat-name" placeholder="Nome categoria" style="flex:1"/>
      <input type="color" id="cat-color" value="#A8CF3A"
        style="width:44px;height:44px;border:none;border-radius:var(--radius-md);cursor:pointer;padding:2px;background:var(--black3)"/>
    </div>
    <button class="btn btn-lime w-full" style="justify-content:center" onclick="saveNewCategory()">+ Aggiungi</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-categories')">Chiudi</button>
  `);

  setupModalClose('modal-event');
  setupModalClose('modal-categories');
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

// ── Event modal logic ─────────────────────────────────────────

let selectedRepeatDays = [];

window.toggleRepeatDay = function(i) {
  const btn = document.getElementById(`rd-${i}`);
  if (selectedRepeatDays.includes(i)) {
    selectedRepeatDays = selectedRepeatDays.filter(d => d !== i);
    btn.style.background = 'var(--black3)';
    btn.style.color = 'var(--gray2)';
  } else {
    selectedRepeatDays.push(i);
    btn.style.background = 'var(--lime)';
    btn.style.color = 'var(--black)';
  }
};

window.onTimeChange = function() {
  const start   = parseTime(document.getElementById('ev-start').value);
  const pause   = parseInt(document.getElementById('ev-pause').value) || 0;
  const duration = parseInt(document.getElementById('ev-duration').value) || 0;
  const end     = start + duration + pause;
  document.getElementById('ev-end').value = fmtTime(end);
};

window.onEndChange = function() {
  const start = parseTime(document.getElementById('ev-start').value);
  const end   = parseTime(document.getElementById('ev-end').value);
  const pause = parseInt(document.getElementById('ev-pause').value) || 0;
  const duration = Math.max(0, end - start - pause);
  document.getElementById('ev-duration').value = duration;
};

window.onDurationChange = function() {
  const start    = parseTime(document.getElementById('ev-start').value);
  const duration = parseInt(document.getElementById('ev-duration').value) || 0;
  const pause    = parseInt(document.getElementById('ev-pause').value) || 0;
  document.getElementById('ev-end').value = fmtTime(start + duration + pause);
};

function populateCategorySelect(selectedId) {
  const data = getData();
  const sel  = document.getElementById('ev-category');
  sel.innerHTML = '<option value="">— Nessuna —</option>';
  getCategories(data).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

window.openNewEventModal = function() {
  document.getElementById('ev-modal-title').textContent = 'Nuovo Evento';
  document.getElementById('ev-id').value = '';
  document.getElementById('ev-edit-date').value = '';
  document.getElementById('ev-title').value = '';
  document.getElementById('ev-start').value = '09:00';
  document.getElementById('ev-end').value = '10:00';
  document.getElementById('ev-duration').value = '60';
  document.getElementById('ev-pause').value = '0';
  selectedRepeatDays = [];
  [0,1,2,3,4,5,6].forEach(i => {
    const btn = document.getElementById(`rd-${i}`);
    if (btn) { btn.style.background = 'var(--black3)'; btn.style.color = 'var(--gray2)'; }
  });
  // Pre-select current day
  const dayOfWeek = currentDate.getDay();
  const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  toggleRepeatDay(idx);
  populateCategorySelect('');
  // Hide delete button
  document.getElementById('ev-actions').innerHTML = `
    <button class="btn btn-lime w-full" style="justify-content:center" onclick="saveEvent()">Salva</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-event')">Annulla</button>
  `;
  openModal('modal-event');
};

window.openEditEventModal = function(id, dateStr) {
  const data  = getData();
  const ev    = (data.calendario?.events || []).find(e => e.id === id);
  if (!ev) return;

  document.getElementById('ev-modal-title').textContent = 'Modifica Evento';
  document.getElementById('ev-id').value = id;
  document.getElementById('ev-edit-date').value = dateStr;
  document.getElementById('ev-title').value = ev.title;
  document.getElementById('ev-start').value = fmtTime(ev.startMin);
  document.getElementById('ev-end').value = fmtTime(ev.endMin);
  document.getElementById('ev-duration').value = ev.endMin - ev.startMin - (ev.pauseMin || 0);
  document.getElementById('ev-pause').value = ev.pauseMin || 0;
  populateCategorySelect(ev.categoryId);

  // Show repeat days based on existing dates in current week
  selectedRepeatDays = [];
  const mon = startOfWeek(new Date(dateStr + 'T00:00:00'));
  [0,1,2,3,4,5,6].forEach(i => {
    const d = ds(addDays(mon, i));
    const btn = document.getElementById(`rd-${i}`);
    if (ev.dates?.includes(d)) {
      selectedRepeatDays.push(i);
      if (btn) { btn.style.background = 'var(--lime)'; btn.style.color = 'var(--black)'; }
    } else {
      if (btn) { btn.style.background = 'var(--black3)'; btn.style.color = 'var(--gray2)'; }
    }
  });

  document.getElementById('ev-actions').innerHTML = `
    <button class="btn btn-lime w-full" style="justify-content:center" onclick="saveEvent()">Salva modifiche</button>
    <button class="btn w-full" style="justify-content:center;margin-top:8px;background:#FF6B6B;color:white" onclick="deleteEvent('${id}')">Elimina evento</button>
    <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal('modal-event')">Annulla</button>
  `;
  openModal('modal-event');
};

window.saveEvent = function() {
  const id       = document.getElementById('ev-id').value;
  const editDate = document.getElementById('ev-edit-date').value;
  const title    = document.getElementById('ev-title').value.trim();
  const catId    = document.getElementById('ev-category').value;
  const startMin = parseTime(document.getElementById('ev-start').value);
  const endMin   = parseTime(document.getElementById('ev-end').value);
  const pauseMin = parseInt(document.getElementById('ev-pause').value) || 0;

  if (!title) { alert('Inserisci un titolo'); return; }
  if (endMin <= startMin) { alert('L\'ora di fine deve essere dopo l\'inizio'); return; }

  // Build dates from selected repeat days in current week
  const refDate = editDate ? new Date(editDate + 'T00:00:00') : currentDate;
  const mon = startOfWeek(refDate);
  const dates = selectedRepeatDays.map(i => ds(addDays(mon, i)));
  if (dates.length === 0) { alert('Seleziona almeno un giorno'); return; }

  const ev = { id: id || uid(), title, categoryId: catId, startMin, endMin, pauseMin, dates };

  setData(d => {
    let events = [...(d.calendario?.events || [])];
    if (id) events = events.filter(e => e.id !== id);
    events.push(ev);
    return { ...d, calendario: { ...(d.calendario||{}), events } };
  });

  closeModal('modal-event');
  render();
};

window.deleteEvent = function(id) {
  if (!confirm('Eliminare questo evento?')) return;
  setData(d => ({
    ...d,
    calendario: { ...(d.calendario||{}), events: (d.calendario?.events||[]).filter(e => e.id !== id) }
  }));
  closeModal('modal-event');
  render();
};

// ── Category modal logic ──────────────────────────────────────

window.openCatModal = function() {
  renderCatList();
  openModal('modal-categories');
};

function renderCatList() {
  const data = getData();
  const list = document.getElementById('cat-list');
  const cats = getCategories(data);
  list.innerHTML = cats.length === 0
    ? '<div style="color:var(--gray2);font-size:13px;margin-bottom:8px">Nessuna categoria ancora.</div>'
    : cats.map(c => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--black3)">
          <div style="width:20px;height:20px;border-radius:50%;background:${c.color};flex-shrink:0"></div>
          <div style="flex:1;font-size:14px;font-weight:600;color:var(--white)">${c.name}</div>
          <button onclick="deleteCategory('${c.id}')" style="background:none;border:none;color:#FF6B6B;font-size:13px;cursor:pointer">🗑️</button>
        </div>
      `).join('');
}

window.saveNewCategory = function() {
  const name  = document.getElementById('cat-name').value.trim();
  const color = document.getElementById('cat-color').value;
  if (!name) { alert('Inserisci un nome'); return; }
  setData(d => ({
    ...d,
    calendario: {
      ...(d.calendario||{}),
      categories: [...((d.calendario||{}).categories||[]), { id: uid(), name, color }]
    }
  }));
  document.getElementById('cat-name').value = '';
  renderCatList();
};

window.deleteCategory = function(id) {
  setData(d => ({
    ...d,
    calendario: {
      ...(d.calendario||{}),
      categories: ((d.calendario||{}).categories||[]).filter(c => c.id !== id)
    }
  }));
  renderCatList();
};

window.closeModal = closeModal;
