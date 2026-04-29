// ============================================================
// VITA — Alimentazione
// ============================================================
import { getData, setData, today, uid, fmtNum, openModal, closeModal, setupModalClose } from '../core.js';

const MEAL_TYPES = ['Colazione','Pranzo','Cena','Snack'];
const MEAL_EMOJI = { Colazione:'☕', Pranzo:'🍽️', Cena:'🌙', Snack:'🍎' };
const DAYS_IT    = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

let tab      = 'log';
let libSub   = 'pasti';
let ingQ     = '';
let collapsed = new Set();
let pianoDay  = 0;
let pianoWeek = 0;
let mIngreds  = [];
let mMealType = 'Pranzo';
let mMealId   = null;

export function init() {
  buildModals();
  document.addEventListener('vita:navigate', e => {
    if (e.detail.page === 'alimentazione') render();
  });
}

// ── helpers ───────────────────────────────────────────────────

function nut(ing) {
  const f = (ing.grams||0)/100;
  return {
    kcal:    Math.round((ing.kcalPer100||0)*f),
    protein: +((ing.proteinPer100||0)*f).toFixed(1),
    carbs:   +((ing.carbsPer100||0)*f).toFixed(1),
    fat:     +((ing.fatPer100||0)*f).toFixed(1),
    fiber:   +((ing.fiberPer100||0)*f).toFixed(1),
  };
}

function totals(ings) {
  return (ings||[]).reduce((a,i)=>{
    const n=nut(i);
    return {kcal:a.kcal+n.kcal,protein:+(a.protein+n.protein).toFixed(1),carbs:+(a.carbs+n.carbs).toFixed(1),fat:+(a.fat+n.fat).toFixed(1),fiber:+(a.fiber+n.fiber).toFixed(1)};
  },{kcal:0,protein:0,carbs:0,fat:0,fiber:0});
}

const D        = () => getData();
const ings     = d => d.nutrition?.ingredients||[];
const meals    = d => d.nutrition?.meals||[];
const logs     = d => d.nutrition?.dailyLogs||[];
const plan     = d => d.nutrition?.plan||{};
const ingCats  = d => d.nutrition?.ingredientCategories||[];
const cat      = (d,id) => ingCats(d).find(c=>c.id===id)||{name:'Altro',emoji:'📦'};

function wKey(off) {
  const d=new Date(); d.setDate(d.getDate()-(d.getDay()||7)+1+off*7);
  const y=d.getFullYear(), w=Math.ceil((((d-new Date(y,0,1))/864e5)+1)/7);
  return y+'-W'+String(w).padStart(2,'0');
}
const pKey = (off,day) => wKey(off)+'-'+day;
function monOf(off) {
  const d=new Date(); d.setDate(d.getDate()-(d.getDay()||7)+1+off*7); d.setHours(0,0,0,0); return d;
}

// ── render shell ──────────────────────────────────────────────

function render() {
  const root = document.getElementById('alimentazione-root');
  if (!root) return;
  root.innerHTML =
    '<div class="page-header" style="margin-bottom:12px"><div class="page-title">Alimentazione</div></div>'+
    '<div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;padding-bottom:2px">'+
    [['log','📋 Log'],['libreria','📚 Lib.'],['piano','📅 Piano'],['spesa','🛒 Spesa']].map(([k,l])=>
      '<button onclick="alimTab(\''+k+'\')" class="chip '+(tab===k?'chip-active':'chip-dark')+'" style="white-space:nowrap;flex-shrink:0;font-size:11px">'+l+'</button>'
    ).join('')+
    '</div><div id="alim-c"></div>';
  if      (tab==='log')      rLog();
  else if (tab==='libreria') rLib();
  else if (tab==='piano')    rPiano();
  else                       rSpesa();
}
window.alimTab = t => { tab=t; render(); };

// ══ LOG ══════════════════════════════════════════════════════

function rLog() {
  const el=document.getElementById('alim-c'), data=D(), ts=today();
  const logDay = logs(data).find(l=>l.date===ts)||{date:ts,meals:[]};
  const dayMeals = meals(data);
  const tot = logDay.meals.reduce((a,m)=>{const t=totals(m.ingredients);return{kcal:a.kcal+t.kcal,protein:+(a.protein+t.protein).toFixed(1),carbs:+(a.carbs+t.carbs).toFixed(1),fat:+(a.fat+t.fat).toFixed(1),fiber:+(a.fiber+t.fiber).toFixed(1)};},{kcal:0,protein:0,carbs:0,fat:0,fiber:0});
  const bmr=data.health?.bmr||0, def=data.health?.caloricDeficit||0, goal=bmr?bmr-def:null;
  const pct=goal?Math.min(100,Math.round(tot.kcal/goal*100)):0, diff=goal?goal-tot.kcal:0;
  const R=40,C=2*Math.PI*R;

  let h = '<div class="card-dark mb-12">'+
    '<div class="card-title mb-8">Calorie oggi</div>'+
    '<div style="display:flex;align-items:center;gap:20px">'+
    '<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">'+
    '<svg width="96" height="96"><circle cx="48" cy="48" r="'+R+'" fill="none" stroke="var(--black3)" stroke-width="8"/>'+
    '<circle cx="48" cy="48" r="'+R+'" fill="none" stroke="var(--lime)" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C-C*pct/100)+'" transform="rotate(-90 48 48)"/></svg>'+
    '<div style="position:absolute;font-size:17px;font-weight:900;color:var(--white)">'+pct+'%</div></div>'+
    '<div style="flex:1"><div style="font-size:38px;font-weight:900;color:var(--white);line-height:1">'+fmtNum(tot.kcal)+'</div>'+
    '<div style="font-size:13px;color:var(--gray2)">/ '+(goal?fmtNum(goal):'—')+' kcal</div>'+
    (goal?'<div style="font-size:12px;margin-top:4px;color:'+(diff>0?'var(--lime)':'#FF6B6B')+'">'+
      (diff>0?'−'+fmtNum(diff)+' kcal deficit':'+'+fmtNum(-diff)+' kcal surplus')+'</div>':'')+
    '</div></div></div>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'+
    [['Proteine',tot.protein],['Carb.',tot.carbs],['Grassi',tot.fat],['Fibre',tot.fiber]].map(([n,v])=>
      '<div class="card-dark" style="padding:12px;text-align:center;margin-bottom:0">'+
      '<div style="font-size:20px;font-weight:900;color:var(--lime)">'+fmtNum(v,0)+'<span style="font-size:10px;color:var(--gray2)">g</span></div>'+
      '<div style="font-size:10px;color:var(--gray2)">'+n+'</div></div>'
    ).join('')+'</div>';

  MEAL_TYPES.forEach(type => {
    const tm  = logDay.meals.filter(m=>m.type===type);
    const lm  = dayMeals.filter(m=>m.type===type);
    const tkcal = tm.reduce((a,m)=>a+totals(m.ingredients).kcal,0);
    h += '<div class="card-dark mb-12"><div class="flex-between mb-10"><div>'+
      '<div style="font-size:15px;font-weight:800;color:var(--white)">'+MEAL_EMOJI[type]+' '+type+'</div>'+
      (tm.length?'<div style="font-size:11px;color:var(--lime)">'+tkcal+' kcal</div>':'')+
      '</div><button onclick="openAddMealM(\''+type+'\')" class="btn btn-lime btn-sm">+ Pasto</button></div>';
    if (lm.length) {
      h += '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--gray2);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Dalla libreria</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
        lm.map(m=>{const t=totals(m.ingredients);return '<button onclick="logLibM(\''+type+'\',\''+m.id+'\')" style="background:var(--black3);border:none;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--white);cursor:pointer">'+m.name+' <span style="color:var(--lime)">'+t.kcal+' kcal</span></button>';}).join('')+
        '</div></div>';
    }
    if (tm.length) {
      h += '<div style="border-top:1px solid var(--black3);padding-top:8px">'+
        tm.map(m=>{
          const t=totals(m.ingredients), idx=logDay.meals.indexOf(m);
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--black3)">'+
            '<div><div style="font-size:13px;font-weight:700;color:var(--white)">'+m.name+'</div>'+
            '<div style="font-size:11px;color:var(--gray2)">P:'+t.protein+'g C:'+t.carbs+'g G:'+t.fat+'g F:'+t.fiber+'g</div></div>'+
            '<div style="display:flex;align-items:center;gap:8px">'+
            '<div style="font-size:13px;font-weight:700;color:var(--lime)">'+fmtNum(t.kcal)+' kcal</div>'+
            '<button onclick="removeLog(\''+ts+'\','+idx+')" style="background:none;border:none;color:#FF6B6B;font-size:13px;cursor:pointer">✕</button></div></div>';
        }).join('')+'</div>';
    } else {
      h += '<div style="font-size:12px;color:var(--gray2)">Nessun pasto loggato.</div>';
    }
    h += '</div>';
  });
  el.innerHTML = h;
}

window.removeLog = function(date,index) {
  setData(d=>({...d,nutrition:{...d.nutrition,dailyLogs:logs(d).map(l=>{
    if(l.date!==date) return l;
    const ms=[...l.meals]; ms.splice(index,1); return {...l,meals:ms};
  })}}));
  rLog();
};
window.logLibM = function(type,id) {
  const m=meals(D()).find(m=>m.id===id); if(!m) return;
  addToLog({...m,type}); rLog();
};
function addToLog(meal) {
  const ts=today();
  setData(d=>{
    const ls=[...logs(d)], idx=ls.findIndex(l=>l.date===ts);
    if(idx===-1) ls.push({date:ts,meals:[meal]});
    else ls[idx]={...ls[idx],meals:[...ls[idx].meals,meal]};
    return {...d,nutrition:{...d.nutrition,dailyLogs:ls}};
  });
}

// ══ LIBRERIA ═════════════════════════════════════════════════

function rLib() {
  const el=document.getElementById('alim-c');
  el.innerHTML =
    '<div style="display:flex;gap:6px;margin-bottom:16px">'+
    '<button onclick="libTab(\'pasti\')" class="chip '+(libSub==='pasti'?'chip-active':'chip-dark')+'" style="flex:1;justify-content:center;font-size:11px">🍽️ Pasti</button>'+
    '<button onclick="libTab(\'ingredienti\')" class="chip '+(libSub==='ingredienti'?'chip-active':'chip-dark')+'" style="flex:1;justify-content:center;font-size:11px">🥦 Ingredienti</button>'+
    '<button onclick="libTab(\'categorie\')" class="chip '+(libSub==='categorie'?'chip-active':'chip-dark')+'" style="flex:1;justify-content:center;font-size:11px">🏷️ Categorie</button>'+
    '</div><div id="lib-c"></div>';
  if      (libSub==='pasti')       rPasti();
  else if (libSub==='ingredienti') rIngredienti();
  else                             rCategorie();
}
window.libTab = s => { libSub=s; rLib(); };

// ── pasti ─────────────────────────────────────────────────────

function rPasti() {
  const data=D(), ms=meals(data);
  const lc=document.getElementById('lib-c');
  let h='<div class="flex-between mb-12"><div style="font-size:16px;font-weight:800;color:var(--black)">Pasti salvati</div><button onclick="openNewMealM()" class="btn btn-dark btn-sm">+ Nuovo</button></div>';
  if (!ms.length) {
    h+='<div class="card-dark" style="text-align:center;padding:32px"><div style="font-size:32px;margin-bottom:8px">🍽️</div><div style="color:var(--gray2);font-size:13px">Nessun pasto salvato.</div></div>';
  } else {
    MEAL_TYPES.forEach(type=>{
      const tm=ms.filter(m=>m.type===type); if(!tm.length) return;
      h+='<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">'+MEAL_EMOJI[type]+' '+type+'</div>';
      tm.forEach(m=>{
        const t=totals(m.ingredients);
        h+='<div class="card-dark" style="margin-bottom:8px">'+
          '<div class="flex-between mb-6"><div style="font-size:15px;font-weight:700;color:var(--white)">'+m.name+'</div>'+
          '<div style="display:flex;gap:8px">'+
          '<button onclick="openEditMealM(\''+m.id+'\')" style="background:var(--black3);border:none;color:var(--gray2);padding:4px 10px;border-radius:99px;font-size:11px;cursor:pointer">✏️</button>'+
          '<button onclick="delMeal(\''+m.id+'\')" style="background:none;border:none;color:#FF6B6B;font-size:13px;cursor:pointer">🗑️</button></div></div>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px"><span style="font-size:13px;font-weight:700;color:var(--lime)">'+t.kcal+' kcal</span>'+
          '<span style="font-size:12px;color:var(--gray2)">P:'+t.protein+'g C:'+t.carbs+'g G:'+t.fat+'g F:'+t.fiber+'g</span></div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:4px">'+
          (m.ingredients||[]).map(i=>'<span style="font-size:10px;color:var(--gray2);background:var(--black3);padding:2px 8px;border-radius:99px">'+i.name+' '+i.grams+'g</span>').join('')+
          '</div></div>';
      });
      h+='</div>';
    });
  }
  lc.innerHTML=h;
}
window.delMeal = function(id) {
  if(!confirm('Eliminare questo pasto?')) return;
  setData(d=>({...d,nutrition:{...d.nutrition,meals:meals(d).filter(m=>m.id!==id)}}));
  rPasti();
};

// ── ingredienti ───────────────────────────────────────────────

function rIngredienti() {
  const data=D(), all=ings(data);
  const lc=document.getElementById('lib-c');
  const q=ingQ.toLowerCase().trim();
  const filtered=q?all.filter(i=>i.name.toLowerCase().includes(q)):all;

  // group by category
  const grouped={};
  filtered.forEach(i=>{ const k=i.categoryId||'__none'; if(!grouped[k]) grouped[k]=[]; grouped[k].push(i); });

  let h='<div class="flex-between mb-12">'+
    '<div style="font-size:16px;font-weight:800;color:var(--black)">Ingredienti</div>'+
    '<button onclick="openNewIngM()" class="btn btn-dark btn-sm">+ Nuovo</button></div>'+
    '<div style="position:relative;margin-bottom:14px">'+
    '<input type="text" class="form-input light" id="ing-lib-search" placeholder="🔍 Cerca..." value="'+ingQ.replace(/"/g,'&quot;')+'" oninput="setIngQ(this.value)" style="padding-left:16px"/>'+
    (ingQ?'<button onclick="setIngQ(\'\')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--gray);font-size:16px;cursor:pointer">✕</button>':'')+
    '</div>';

  if (!all.length) {
    h+='<div class="card-dark" style="text-align:center;padding:32px"><div style="font-size:32px;margin-bottom:8px">🥦</div><div style="color:var(--gray2);font-size:13px">Nessun ingrediente.</div></div>';
  } else if (!filtered.length) {
    h+='<div style="text-align:center;padding:24px;color:var(--gray)">Nessun risultato per "'+ingQ+'"</div>';
  } else if (q) {
    h+='<div style="font-size:11px;font-weight:700;color:var(--gray);margin-bottom:8px">'+filtered.length+' risultati</div>';
    filtered.forEach(i=>{ h+=ingRow(i); });
  } else {
    Object.entries(grouped).forEach(function([catId,items]) {
      const c=cat(data,catId);
      const isCollapsed=collapsed.has(catId);
      h+='<div style="margin-bottom:4px">'+
        '<div onclick="toggleCat(\''+catId+'\')" style="display:flex;align-items:center;gap:8px;padding:10px 0;cursor:pointer;border-bottom:2px solid #E0E0E0;user-select:none">'+
        '<span style="font-size:16px">'+c.emoji+'</span>'+
        '<span style="font-size:12px;font-weight:700;color:var(--black);text-transform:uppercase;letter-spacing:0.05em;flex:1">'+c.name+'</span>'+
        '<span style="font-size:11px;color:var(--gray2);margin-right:4px">'+items.length+'</span>'+
        '<span style="font-size:16px;color:var(--gray2);display:inline-block;transform:rotate('+(isCollapsed?'0':'90')+'deg);transition:transform 0.2s">›</span>'+
        '</div>';
      if (!isCollapsed) { items.forEach(function(i){ h+=ingRow(i); }); }
      h+='</div>';
    });
  }
  lc.innerHTML=h;
  if (ingQ) { const el=document.getElementById('ing-lib-search'); if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);} }
}

function ingRow(i) {
  const fiber=i.fiberPer100?' F:'+i.fiberPer100+'g':'';
  return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #EEEEEE">'+
    '<div style="flex:1;min-width:0">'+
    '<div style="font-size:13px;font-weight:700;color:var(--black);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+i.name+'</div>'+
    '<div style="font-size:10px;color:var(--gray)">per 100g · '+i.kcalPer100+' kcal · P:'+i.proteinPer100+'g C:'+i.carbsPer100+'g G:'+i.fatPer100+'g'+fiber+'</div>'+
    '</div>'+
    '<button onclick="openEditIngM(\''+i.id+'\')" style="background:var(--black3);border:none;color:var(--gray2);padding:4px 8px;border-radius:99px;font-size:11px;cursor:pointer;flex-shrink:0">✏️</button>'+
    '<button onclick="delIng(\''+i.id+'\')" style="background:none;border:none;color:#FF6B6B;font-size:13px;cursor:pointer;flex-shrink:0">🗑️</button>'+
    '</div>';
}

window.setIngQ = function(v) { ingQ=v; rIngredienti(); };
window.toggleCat = function(id) { if(collapsed.has(id)) collapsed.delete(id); else collapsed.add(id); rIngredienti(); };
window.delIng = function(id) {
  if(!confirm('Eliminare?')) return;
  setData(d=>({...d,nutrition:{...d.nutrition,ingredients:ings(d).filter(i=>i.id!==id)}}));
  rIngredienti();
};

// ── categorie ─────────────────────────────────────────────────

function rCategorie() {
  const data=D(), cats=ingCats(data);
  const lc=document.getElementById('lib-c');
  let h='<div class="flex-between mb-12"><div style="font-size:16px;font-weight:800;color:var(--black)">Categorie</div>'+
    '<button onclick="openNewCatM()" class="btn btn-dark btn-sm">+ Nuova</button></div>';
  if (!cats.length) {
    h+='<div class="card" style="text-align:center;padding:32px;color:var(--gray)">Nessuna categoria.</div>';
  } else {
    cats.forEach(function(c) {
      h+='<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #EEEEEE">'+
        '<span style="font-size:22px;width:32px;text-align:center">'+c.emoji+'</span>'+
        '<div style="flex:1;font-size:14px;font-weight:700;color:var(--black)">'+c.name+'</div>'+
        '<button onclick="openEditCatM(\''+c.id+'\')" style="background:var(--black3);border:none;color:var(--gray2);padding:4px 10px;border-radius:99px;font-size:11px;cursor:pointer">✏️</button>'+
        '<button onclick="delCat(\''+c.id+'\')" style="background:none;border:none;color:#FF6B6B;font-size:13px;cursor:pointer">🗑️</button>'+
        '</div>';
    });
  }
  lc.innerHTML=h;
}

window.openNewCatM = function() {
  document.getElementById('cat-modal-title').textContent='Nuova Categoria';
  document.getElementById('cat-edit-id').value='';
  document.getElementById('cat-emoji').value='';
  document.getElementById('cat-name').value='';
  openModal('modal-cat');
};
window.openEditCatM = function(id) {
  const c=ingCats(D()).find(c=>c.id===id); if(!c) return;
  document.getElementById('cat-modal-title').textContent='Modifica Categoria';
  document.getElementById('cat-edit-id').value=id;
  document.getElementById('cat-emoji').value=c.emoji;
  document.getElementById('cat-name').value=c.name;
  openModal('modal-cat');
};
window.saveCat = function() {
  const id=document.getElementById('cat-edit-id').value;
  const emoji=document.getElementById('cat-emoji').value.trim()||'📦';
  const name=document.getElementById('cat-name').value.trim();
  if(!name){alert('Inserisci un nome');return;}
  const c={id:id||uid(),name,emoji};
  setData(d=>{
    const list=[...ingCats(d)], idx=list.findIndex(x=>x.id===c.id);
    if(idx!==-1) list[idx]=c; else list.push(c);
    return {...d,nutrition:{...d.nutrition,ingredientCategories:list}};
  });
  closeModal('modal-cat'); rCategorie();
};
window.delCat = function(id) {
  if(!confirm('Eliminare questa categoria?')) return;
  setData(d=>({...d,nutrition:{...d.nutrition,
    ingredientCategories:ingCats(d).filter(c=>c.id!==id),
    ingredients:ings(d).map(i=>i.categoryId===id?{...i,categoryId:null}:i)
  }}));
  rCategorie();
};

// ══ PIANO ════════════════════════════════════════════════════

function rPiano() {
  const el=document.getElementById('alim-c'), data=D();
  const pl=plan(data), ms=meals(data);
  const mon=monOf(pianoWeek);
  const monS=mon.toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  const sunS=new Date(mon.getTime()+6*864e5).toLocaleDateString('it-IT',{day:'numeric',month:'short'});

  let h='<div class="flex-between mb-14">'+
    '<button onclick="setPW('+(pianoWeek-1)+')" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">‹</button>'+
    '<div style="text-align:center"><div style="font-size:14px;font-weight:800;color:var(--black)">'+monS+' – '+sunS+'</div>'+
    '<div style="font-size:11px;color:var(--gray)">'+(pianoWeek===0?'Questa settimana':pianoWeek===-1?'Settimana scorsa':Math.abs(pianoWeek)+' sett. fa')+'</div></div>'+
    '<button onclick="setPW('+(pianoWeek+1)+')" style="background:var(--black3);border:none;border-radius:50%;width:36px;height:36px;color:var(--white);font-size:18px;cursor:pointer">›</button>'+
    '</div>'+
    '<button onclick="copyPrevPiano()" style="width:100%;background:var(--black3);border:none;border-radius:var(--radius-md);padding:10px;font-size:12px;font-weight:700;color:var(--gray2);cursor:pointer;margin-bottom:14px">📋 Copia settimana precedente</button>'+
    '<div style="display:flex;gap:4px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px">'+
    DAYS_SHORT.map((d,i)=>'<button onclick="setPD('+i+')" style="flex-shrink:0;padding:6px 10px;border-radius:99px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:'+(pianoDay===i?'var(--lime)':'var(--black3)')+';color:'+(pianoDay===i?'var(--black)':'var(--gray2)')+'">'+d+'</button>').join('')+
    '</div><div style="font-size:16px;font-weight:800;color:var(--black);margin-bottom:12px">'+DAYS_IT[pianoDay]+'</div>';

  const key=pKey(pianoWeek,pianoDay);
  MEAL_TYPES.forEach(type=>{
    const slot=(pl[key]||[]).filter(e=>e.type===type);
    const slotMs=slot.map(e=>ms.find(m=>m.id===e.mealId)).filter(Boolean);
    const skcal=slotMs.reduce((a,m)=>a+totals(m.ingredients).kcal,0);
    h+='<div class="card mb-8" style="padding:14px"><div class="flex-between mb-8"><div>'+
      '<div style="font-size:13px;font-weight:700;color:var(--black)">'+MEAL_EMOJI[type]+' '+type+'</div>'+
      (slotMs.length?'<div style="font-size:11px;color:var(--olive)">'+skcal+' kcal</div>':'')+
      '</div><button onclick="openPianoPicker(\''+type+'\')" style="background:var(--black);border:none;border-radius:99px;padding:5px 12px;font-size:11px;font-weight:700;color:var(--lime);cursor:pointer">+ Aggiungi</button></div>'+
      (slotMs.length?slotMs.map(m=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F0F0">'+
        '<div style="font-size:13px;font-weight:600;color:var(--black)">'+m.name+'</div>'+
        '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:12px;color:var(--olive)">'+totals(m.ingredients).kcal+' kcal</div>'+
        '<button onclick="removePM(\''+type+'\',\''+m.id+'\')" style="background:none;border:none;color:#FF6B6B;font-size:12px;cursor:pointer">✕</button></div></div>').join('')
      :'<div style="font-size:12px;color:var(--gray)">Nessun pasto.</div>')+
      '</div>';
  });
  el.innerHTML=h;
}

window.setPD=i=>{pianoDay=i;rPiano();};
window.setPW=o=>{pianoWeek=o;rPiano();};
window.removePM=function(type,mid){
  const key=pKey(pianoWeek,pianoDay);
  setData(d=>{const pl={...plan(d)};pl[key]=(pl[key]||[]).filter(e=>!(e.type===type&&e.mealId===mid));return{...d,nutrition:{...d.nutrition,plan:pl}};});
  rPiano();
};
window.copyPrevPiano=function(){
  setData(d=>{
    const pl={...plan(d)};
    for(let i=0;i<7;i++){const f=pKey(pianoWeek-1,i),t=pKey(pianoWeek,i);if(pl[f]&&!pl[t]?.length)pl[t]=[...pl[f]];}
    return{...d,nutrition:{...d.nutrition,plan:pl}};
  });
  rPiano();
};
window.openPianoPicker=function(type){
  const data=D(), ms=meals(data).filter(m=>m.type===type);
  const key=pKey(pianoWeek,pianoDay), exist=(plan(data)[key]||[]).map(e=>e.mealId);
  document.getElementById('piano-type').value=type;
  const list=document.getElementById('piano-list');
  list.innerHTML=!ms.length?'<div style="color:var(--gray2);font-size:13px;padding:12px 0">Nessun pasto di tipo '+type+'.</div>':
    ms.map(m=>{
      const t=totals(m.ingredients),done=exist.includes(m.id);
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--black3)">'+
        '<div><div style="font-size:14px;font-weight:700;color:var(--white)">'+m.name+'</div>'+
        '<div style="font-size:11px;color:var(--gray2)">'+t.kcal+' kcal · P:'+t.protein+'g C:'+t.carbs+'g G:'+t.fat+'g</div></div>'+
        '<button onclick="addToPiano(\''+type+'\',\''+m.id+'\')" '+(done?'disabled':'')+' style="background:'+(done?'var(--black3)':'var(--lime)')+';border:none;border-radius:99px;padding:5px 14px;font-size:12px;font-weight:700;color:'+(done?'var(--gray2)':'var(--black)')+';cursor:'+(done?'default':'pointer')+'">'+(done?'✓':'+ Aggiungi')+'</button>'+
        '</div>';
    }).join('');
  openModal('modal-piano');
};
window.addToPiano=function(type,mid){
  const key=pKey(pianoWeek,pianoDay);
  setData(d=>{const pl={...plan(d)},list=[...(pl[key]||[])];if(!list.find(e=>e.type===type&&e.mealId===mid))list.push({type,mealId:mid});pl[key]=list;return{...d,nutrition:{...d.nutrition,plan:pl}};});
  closeModal('modal-piano'); rPiano();
};

// ══ SPESA ════════════════════════════════════════════════════

function rSpesa() {
  const el=document.getElementById('alim-c'), data=D();
  const pl=plan(data), ms=meals(data);
  const ingMap={};
  for(let i=0;i<7;i++) {
    (pl[pKey(pianoWeek,i)]||[]).forEach(e=>{
      const m=ms.find(m=>m.id===e.mealId); if(!m) return;
      (m.ingredients||[]).forEach(i=>{if(!ingMap[i.name])ingMap[i.name]=0;ingMap[i.name]+=i.grams||0;});
    });
  }
  const items=Object.entries(ingMap).sort((a,b)=>a[0].localeCompare(b[0]));
  const mon=monOf(pianoWeek);
  const monS=mon.toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  const sunS=new Date(mon.getTime()+6*864e5).toLocaleDateString('it-IT',{day:'numeric',month:'short'});

  let h='<div class="flex-between mb-14">'+
    '<div><div style="font-size:16px;font-weight:800;color:var(--black)">Lista della spesa</div>'+
    '<div style="font-size:11px;color:var(--gray)">'+monS+' – '+sunS+'</div></div>'+
    '<div style="display:flex;gap:6px">'+
    '<button onclick="setSW('+(pianoWeek-1)+')" style="background:var(--black3);border:none;border-radius:99px;padding:6px 10px;color:var(--white);font-size:14px;cursor:pointer">‹</button>'+
    '<button onclick="setSW('+(pianoWeek+1)+')" style="background:var(--black3);border:none;border-radius:99px;padding:6px 10px;color:var(--white);font-size:14px;cursor:pointer">›</button>'+
    (items.length?'<button onclick="exportSpesa()" class="btn btn-lime btn-sm">📸 Esporta</button>':'')+
    '</div></div>';

  if(!items.length) {
    h+='<div class="card" style="text-align:center;padding:32px"><div style="font-size:32px;margin-bottom:8px">🛒</div><div style="color:var(--gray);font-size:13px">Nessun ingrediente nel piano.</div></div>';
  } else {
    h+='<div class="card" style="padding:16px" id="spesa-card">'+
      '<div style="font-size:14px;font-weight:800;color:var(--black);margin-bottom:14px">🛒 Lista della spesa</div>'+
      items.map(([name,grams],idx)=>
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F0F0F0">'+
        '<div onclick="tgSpesa('+idx+')" id="sc'+idx+'" style="width:22px;height:22px;border-radius:6px;border:2px solid var(--lime);flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center"></div>'+
        '<div id="sn'+idx+'" style="flex:1;font-size:14px;font-weight:600;color:var(--black)">'+name+'</div>'+
        '<div style="font-size:14px;font-weight:700;color:var(--olive)">'+Math.round(grams)+'g</div></div>'
      ).join('')+'</div>';
  }
  el.innerHTML=h;
}

window.setSW=o=>{pianoWeek=o;rSpesa();};
window.tgSpesa=function(idx){
  const c=document.getElementById('sc'+idx),n=document.getElementById('sn'+idx);
  const done=c.dataset.done==='1'; c.dataset.done=done?'0':'1';
  c.innerHTML=done?'':'✓'; c.style.background=done?'transparent':'var(--lime)'; c.style.color='var(--black)';
  n.style.textDecoration=done?'none':'line-through'; n.style.color=done?'var(--black)':'var(--gray2)';
};
window.exportSpesa=function(){
  const card=document.getElementById('spesa-card'); if(!card) return;
  const go=()=>html2canvas(card,{scale:3,backgroundColor:'#ffffff'}).then(c=>{const a=document.createElement('a');a.download='lista-spesa.png';a.href=c.toDataURL('image/png');a.click();});
  if(typeof html2canvas!=='undefined'){go();}
  else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=go;document.head.appendChild(s);}
};

// ══ MODALS ════════════════════════════════════════════════════

function buildModals() {
  const c=document.getElementById('modals-container');

  // ingredient
  addM(c,'modal-ing',
    '<div class="modal-handle"></div>'+
    '<div class="modal-title" id="ing-mtitle">Nuovo Ingrediente</div>'+
    '<input type="hidden" id="ing-mid"/>'+
    '<div class="form-group"><label class="form-label">Nome</label><input type="text" class="form-input" id="ing-mname" placeholder="Es. Petto di pollo"/></div>'+
    '<div class="form-group"><label class="form-label">Categoria</label><select class="form-input" id="ing-mcat"><option value="">— Nessuna —</option></select></div>'+
    '<div style="font-size:11px;font-weight:700;color:var(--gray2);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Valori per 100g</div>'+
    '<div class="grid-2">'+
    '<div class="form-group"><label class="form-label">Kcal</label><input type="number" class="form-input" id="ing-mkcal" placeholder="0"/></div>'+
    '<div class="form-group"><label class="form-label">Proteine (g)</label><input type="number" class="form-input" id="ing-mprot" placeholder="0"/></div>'+
    '</div><div class="grid-2">'+
    '<div class="form-group"><label class="form-label">Carboidrati (g)</label><input type="number" class="form-input" id="ing-mcarb" placeholder="0"/></div>'+
    '<div class="form-group"><label class="form-label">Grassi (g)</label><input type="number" class="form-input" id="ing-mfat" placeholder="0"/></div>'+
    '</div>'+
    '<div class="form-group"><label class="form-label">Fibre (g)</label><input type="number" class="form-input" id="ing-mfib" placeholder="0"/></div>'+
    '<button class="btn btn-lime w-full" style="justify-content:center;margin-top:4px" onclick="saveIng()">Salva</button>'+
    '<button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal(\'modal-ing\')">Annulla</button>'
  );

  // categoria
  addM(c,'modal-cat',
    '<div class="modal-handle"></div>'+
    '<div class="modal-title" id="cat-modal-title">Nuova Categoria</div>'+
    '<input type="hidden" id="cat-edit-id"/>'+
    '<div class="form-group"><label class="form-label">Emoji</label><input type="text" class="form-input" id="cat-emoji" placeholder="🥦" maxlength="2" style="font-size:28px;text-align:center"/></div>'+
    '<div class="form-group"><label class="form-label">Nome</label><input type="text" class="form-input" id="cat-name" placeholder="Es. Verdure"/></div>'+
    '<button class="btn btn-lime w-full" style="justify-content:center;margin-top:4px" onclick="saveCat()">Salva</button>'+
    '<button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal(\'modal-cat\')">Annulla</button>'
  );

  // pasto
  addM(c,'modal-meal',
    '<div class="modal-handle"></div>'+
    '<div class="modal-title" id="meal-mtitle">Nuovo Pasto</div>'+
    '<input type="hidden" id="meal-mid"/>'+
    '<div class="form-group"><label class="form-label">Nome pasto</label><input type="text" class="form-input" id="meal-mname" placeholder="Es. Pasta al pomodoro"/></div>'+
    '<div class="form-group"><label class="form-label">Tipo</label><select class="form-input" id="meal-mtype">'+
    MEAL_TYPES.map(t=>'<option value="'+t+'">'+t+'</option>').join('')+
    '</select></div>'+
    '<div style="display:flex;gap:6px;margin-bottom:14px">'+
    ['kcal','prot','carb','fat','fib'].map((k,i)=>
      '<div style="flex:1;background:var(--black3);border-radius:var(--radius-md);padding:8px;text-align:center">'+
      '<div style="font-size:15px;font-weight:900;color:'+(i===0?'var(--lime)':'var(--white)')+'" id="mt-'+k+'">0'+(i>0?'g':'')+'</div>'+
      '<div style="font-size:9px;color:var(--gray2)">'+['Kcal','Prot','Carb','Gras','Fib'][i]+'</div></div>'
    ).join('')+
    '</div>'+
    '<div class="form-group"><label class="form-label">Cerca ingrediente</label><input type="text" class="form-input" id="ing-search" placeholder="Digita per cercare..." oninput="onIngS(this.value)"/></div>'+
    '<div id="ing-res" style="margin-bottom:10px"></div>'+
    '<div class="form-label" style="margin-bottom:6px">Ingredienti</div>'+
    '<div id="meal-ings" style="margin-bottom:12px"></div>'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px" id="meal-logwrap">'+
    '<input type="checkbox" id="meal-addlog" style="width:18px;height:18px;accent-color:var(--lime)" checked/>'+
    '<label for="meal-addlog" style="font-size:13px;color:var(--gray2);cursor:pointer">Aggiungi anche al log di oggi</label></div>'+
    '<button class="btn btn-lime w-full" style="justify-content:center" onclick="saveMeal()">Salva pasto</button>'+
    '<button class="btn btn-ghost w-full" style="justify-content:center;margin-top:8px" onclick="closeModal(\'modal-meal\')">Annulla</button>'
  );

  // piano picker
  addM(c,'modal-piano',
    '<div class="modal-handle"></div>'+
    '<div class="modal-title">Aggiungi al piano</div>'+
    '<input type="hidden" id="piano-type"/>'+
    '<div id="piano-list" style="max-height:60vh;overflow-y:auto"></div>'+
    '<button class="btn btn-ghost w-full" style="justify-content:center;margin-top:12px" onclick="closeModal(\'modal-piano\')">Chiudi</button>'
  );
}

function addM(c,id,inner){
  const w=document.createElement('div'); w.className='modal-overlay'; w.id=id;
  const s=document.createElement('div'); s.className='modal-sheet'; s.innerHTML=inner;
  w.appendChild(s); c.appendChild(w); setupModalClose(id);
}

// ── ingredient modal ──────────────────────────────────────────

function fillCatSel(selId) {
  const sel=document.getElementById('ing-mcat'); if(!sel) return;
  const cats=ingCats(D());
  sel.innerHTML='<option value="">— Nessuna —</option>';
  cats.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.emoji+' '+c.name; if(c.id===selId) o.selected=true; sel.appendChild(o); });
}

window.openNewIngM = function() {
  document.getElementById('ing-mtitle').textContent='Nuovo Ingrediente';
  document.getElementById('ing-mid').value='';
  ['ing-mname','ing-mkcal','ing-mprot','ing-mcarb','ing-mfat','ing-mfib'].forEach(id=>{document.getElementById(id).value='';});
  fillCatSel(''); openModal('modal-ing');
};
window.openEditIngM = function(id) {
  const i=ings(D()).find(i=>i.id===id); if(!i) return;
  document.getElementById('ing-mtitle').textContent='Modifica Ingrediente';
  document.getElementById('ing-mid').value=id;
  document.getElementById('ing-mname').value=i.name;
  document.getElementById('ing-mkcal').value=i.kcalPer100;
  document.getElementById('ing-mprot').value=i.proteinPer100;
  document.getElementById('ing-mcarb').value=i.carbsPer100;
  document.getElementById('ing-mfat').value=i.fatPer100;
  document.getElementById('ing-mfib').value=i.fiberPer100||0;
  fillCatSel(i.categoryId||''); openModal('modal-ing');
};
window.saveIng = function() {
  const id=document.getElementById('ing-mid').value;
  const name=document.getElementById('ing-mname').value.trim();
  const kcal=+document.getElementById('ing-mkcal').value||0;
  const prot=+document.getElementById('ing-mprot').value||0;
  const carb=+document.getElementById('ing-mcarb').value||0;
  const fat= +document.getElementById('ing-mfat').value||0;
  const fib= +document.getElementById('ing-mfib').value||0;
  const catId=document.getElementById('ing-mcat').value;
  if(!name){alert('Inserisci un nome');return;}
  const ing={id:id||uid(),name,categoryId:catId||null,kcalPer100:kcal,proteinPer100:prot,carbsPer100:carb,fatPer100:fat,fiberPer100:fib};
  setData(d=>{const list=[...ings(d)],idx=list.findIndex(i=>i.id===ing.id);if(idx!==-1)list[idx]=ing;else list.push(ing);return{...d,nutrition:{...d.nutrition,ingredients:list}};});
  closeModal('modal-ing');
  if(window._afterIng){window._afterIng(ing);window._afterIng=null;} else if(libSub==='ingredienti') rIngredienti();
};

// ── meal modal ────────────────────────────────────────────────

function openMealModal(editId) {
  mIngreds=[]; mMealId=editId||null;
  if(editId){
    const m=meals(D()).find(m=>m.id===editId); if(!m) return;
    document.getElementById('meal-mtitle').textContent='Modifica Pasto';
    document.getElementById('meal-mid').value=editId;
    document.getElementById('meal-mname').value=m.name;
    document.getElementById('meal-mtype').value=m.type;
    mIngreds=(m.ingredients||[]).map(i=>({...i}));
    document.getElementById('meal-logwrap').style.display='none';
  } else {
    document.getElementById('meal-mtitle').textContent='Nuovo Pasto';
    document.getElementById('meal-mid').value='';
    document.getElementById('meal-mname').value='';
    document.getElementById('meal-mtype').value=mMealType;
    document.getElementById('meal-logwrap').style.display='flex';
    document.getElementById('meal-addlog').checked=true;
  }
  document.getElementById('ing-search').value='';
  document.getElementById('ing-res').innerHTML='';
  renderMIngList(); updateMTotals(); openModal('modal-meal');
}
window.openNewMealM = function() { mMealType='Pranzo'; openMealModal(null); };
window.openAddMealM = function(type) { mMealType=type; openMealModal(null); };
window.openEditMealM = function(id) { openMealModal(id); };

window.onIngS = function(val) {
  const q=val.trim(), res=document.getElementById('ing-res'); if(!q){res.innerHTML='';return;}
  const found=ings(D()).filter(i=>i.name.toLowerCase().includes(q.toLowerCase()));
  let h=found.map(i=>'<button onclick="addIngToMeal(\''+i.id+'\')" style="display:flex;align-items:center;justify-content:space-between;width:100%;background:var(--black3);border:none;border-radius:var(--radius-md);padding:10px 12px;margin-bottom:6px;cursor:pointer;text-align:left">'+
    '<span style="font-size:13px;font-weight:600;color:var(--white)">'+i.name+'</span>'+
    '<span style="font-size:11px;color:var(--gray2)">'+i.kcalPer100+' kcal/100g</span></button>').join('');
  const exact=found.find(i=>i.name.toLowerCase()===q.toLowerCase());
  if(!exact) h+='<button onclick="createAndAddIng()" style="display:flex;align-items:center;gap:8px;width:100%;background:var(--black2);border:2px dashed var(--black3);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:6px;cursor:pointer">'+
    '<span style="font-size:16px">➕</span><span style="font-size:13px;font-weight:600;color:var(--lime)">Crea "'+q+'" come nuovo ingrediente</span></button>';
  res.innerHTML=h;
};

window.addIngToMeal = function(id) {
  const i=ings(D()).find(i=>i.id===id); if(!i) return;
  if(mIngreds.find(x=>x.ingredientId===id)){alert('Già aggiunto');return;}
  mIngreds.push({ingredientId:id,name:i.name,grams:100,kcalPer100:i.kcalPer100,proteinPer100:i.proteinPer100,carbsPer100:i.carbsPer100,fatPer100:i.fatPer100,fiberPer100:i.fiberPer100||0});
  document.getElementById('ing-search').value=''; document.getElementById('ing-res').innerHTML='';
  renderMIngList(); updateMTotals();
};

window.createAndAddIng = function() {
  const q=document.getElementById('ing-search').value.trim();
  document.getElementById('ing-mtitle').textContent='Nuovo Ingrediente';
  document.getElementById('ing-mid').value='';
  document.getElementById('ing-mname').value=q;
  ['ing-mkcal','ing-mprot','ing-mcarb','ing-mfat','ing-mfib'].forEach(id=>{document.getElementById(id).value='';});
  fillCatSel('');
  window._afterIng=function(ing){
    mIngreds.push({ingredientId:ing.id,name:ing.name,grams:100,kcalPer100:ing.kcalPer100,proteinPer100:ing.proteinPer100,carbsPer100:ing.carbsPer100,fatPer100:ing.fatPer100,fiberPer100:ing.fiberPer100||0});
    renderMIngList(); updateMTotals();
    document.getElementById('ing-search').value=''; document.getElementById('ing-res').innerHTML='';
    openModal('modal-meal');
  };
  closeModal('modal-meal'); openModal('modal-ing');
};

function renderMIngList() {
  const list=document.getElementById('meal-ings'); if(!list) return;
  if(!mIngreds.length){list.innerHTML='<div style="font-size:12px;color:var(--gray2);padding:8px 0">Nessun ingrediente. Cerca sopra.</div>';return;}
  list.innerHTML=mIngreds.map((i,idx)=>{
    const n=nut(i);
    return '<div style="background:var(--black3);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:6px">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'+
      '<div style="flex:1;font-size:13px;font-weight:700;color:var(--white)">'+i.name+'</div>'+
      '<button onclick="remIng('+idx+')" style="background:none;border:none;color:#FF6B6B;font-size:14px;cursor:pointer">✕</button></div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
      '<input type="number" value="'+i.grams+'" min="0" step="1" oninput="updGrams('+idx+',+this.value)" style="width:80px;background:var(--black2);border:none;border-radius:var(--radius-sm);padding:6px 10px;font-size:13px;font-weight:700;color:var(--white);font-family:inherit"/>'+
      '<span style="font-size:12px;color:var(--gray2)">g</span>'+
      '<span id="im'+idx+'" style="font-size:11px;color:var(--lime);margin-left:auto">'+n.kcal+' kcal · P:'+n.protein+' C:'+n.carbs+' G:'+n.fat+' F:'+n.fiber+'</span>'+
      '</div></div>';
  }).join('');
}

window.updGrams = function(i,v) {
  if(!mIngreds[i]) return;
  mIngreds[i].grams=v; updateMTotals();
  const n=nut(mIngreds[i]), el=document.getElementById('im'+i);
  if(el) el.textContent=n.kcal+' kcal · P:'+n.protein+' C:'+n.carbs+' G:'+n.fat+' F:'+n.fiber;
};
window.remIng = function(i) { mIngreds.splice(i,1); renderMIngList(); updateMTotals(); };

function updateMTotals() {
  const t=totals(mIngreds);
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  s('mt-kcal',t.kcal); s('mt-prot',t.protein+'g'); s('mt-carb',t.carbs+'g'); s('mt-fat',t.fat+'g'); s('mt-fib',t.fiber+'g');
}

window.saveMeal = function() {
  const editId=document.getElementById('meal-mid').value;
  const name=document.getElementById('meal-mname').value.trim();
  const type=document.getElementById('meal-mtype').value;
  const addlog=document.getElementById('meal-addlog')?.checked;
  if(!name){alert('Inserisci un nome');return;}
  if(!mIngreds.length){alert('Aggiungi almeno un ingrediente');return;}
  const meal={id:editId||uid(),name,type,ingredients:[...mIngreds]};
  setData(d=>{const list=[...meals(d)],idx=list.findIndex(m=>m.id===meal.id);if(idx!==-1)list[idx]=meal;else list.push(meal);return{...d,nutrition:{...d.nutrition,meals:list}};});
  if(!editId&&addlog) addToLog(meal);
  closeModal('modal-meal');
  tab==='log'?rLog():rPasti();
};

window.closeModal = closeModal;
