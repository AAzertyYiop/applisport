const STORAGE_KEY = "suivisport.web.v2";
const LEGACY_KEY = "suivisport.sessions.v1";
const muscles = ["Pectoraux","Dos","Épaules","Biceps","Triceps","Quadriceps","Ischios","Fessiers","Mollets","Abdominaux","Avant-bras","Adducteurs","Abducteurs","Lombaires","Trapèzes","Corps entier","Cardio","Autre"];
const runTypes = ["Endurance fondamentale","Fractionné","Tempo","Seuil","Sortie longue","Récupération","Fartlek","Côtes","Compétition","Autre"];
const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const modalForm = document.querySelector("#modal-form");
const toast = document.querySelector("#toast");

let state = loadState();
let route = { tab: "today", view: "root", id: null, subId: null };
let selectedDate = todayISO();
let calendarMonth = selectedDate.slice(0, 7);
let deferredInstall = null;

function uid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function todayISO(date = new Date()) { const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function fmtDate(iso, options = { weekday:"short", day:"numeric", month:"short" }) { return new Intl.DateTimeFormat("fr-FR", options).format(new Date(`${iso}T12:00:00`)); }
function fmtNumber(n) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n || 0); }
function monthLabel(ym) { return new Intl.DateTimeFormat("fr-FR", { month:"long", year:"numeric" }).format(new Date(`${ym}-01T12:00:00`)); }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function blankState() { return { version:2, programs:[], runningPrograms:[], scheduled:[], sessions:[], runningSessions:[] }; }
function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed?.version === 2) return { ...blankState(), ...parsed };
  } catch {}
  const fresh = blankState();
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    for (const item of legacy) {
      if (item.activity === "Course") fresh.runningSessions.push({ id:uid(), date:item.date, title:"Course", type:"Autre", distance:0, duration:+item.duration || 0, pace:"", notes:item.notes || "" });
      else fresh.sessions.push({ id:uid(), date:item.date, startedAt:`${item.date}T12:00:00`, endedAt:`${item.date}T13:00:00`, programName:"Hors programme", templateName:item.activity || "Séance libre", notes:item.notes || "", sets:[] });
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function overview(eyebrow, title, detail, tone, metrics) {
  return `<section class="overview ${tone}"><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2><p>${esc(detail)}</p><div class="metrics">${metrics.map(m => `<div class="metric"><strong>${esc(m[0])}</strong><span>${esc(m[1])}</span></div>`).join("")}</div></section>`;
}
function header(title, back = false) {
  return `<header class="screen-header"><div class="header-actions">${back ? `<button class="back-btn" data-action="back">‹ Retour</button>` : ""}</div><h1>${esc(title)}</h1><div class="header-actions">${!back ? `<button class="icon-btn" data-action="settings" aria-label="Options">•••</button>` : `<span style="width:42px"></span>`}</div></header>`;
}
function empty(title, subtitle) { return `<div class="empty"><b>${esc(title)}</b>${esc(subtitle)}</div>`; }
function row({id, action, icon="●", tone="", title, detail="", pill="", done=false, deleteAction=""}) {
  return `<div class="row"><button class="row" style="border:0;margin:0;padding:0;box-shadow:none" data-action="${action}" data-id="${id}"><span class="badge ${tone}">${icon}</span><span class="row-main"><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>${pill ? `<span class="pill ${done ? "done":""}">${esc(pill)}</span>` : ""}<span class="chevron">›</span></button>${deleteAction ? `<button class="icon-btn" data-action="${deleteAction}" data-id="${id}" aria-label="Supprimer">×</button>` : ""}</div>`;
}
function section(title, body, action="") { return `<section class="section"><div class="section-title"><span>${esc(title)}</span>${action}</div>${body}</section>`; }
function field(label, name, type="text", value="", attrs="") { return `<label class="field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`; }
function selectField(label, name, options, selected="") { return `<label class="field">${esc(label)}<select name="${name}">${options.map(x => `<option value="${esc(x.value ?? x)}" ${(x.value ?? x) == selected ? "selected":""}>${esc(x.label ?? x)}</option>`).join("")}</select></label>`; }

function render() {
  document.querySelectorAll(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === route.tab));
  const renderer = route.view === "root" ? ({programs:renderPrograms,planning:renderPlanning,today:renderToday,progress:renderProgress}[route.tab]) : ({program:renderProgram,template:renderTemplate,live:renderLive,session:renderSession,runProgram:renderRunProgram,runPlan:renderRunPlan}[route.view]);
  app.innerHTML = renderer ? renderer() : renderToday();
  window.scrollTo({ top:0, behavior:"instant" });
}

function renderPrograms() {
  const strengthTemplates = state.programs.reduce((n,p) => n + p.templates.length, 0);
  const runPlans = state.runningPrograms.reduce((n,p) => n + p.plans.length, 0);
  let body = header("Programmes");
  body += overview("Bibliothèque", state.programs.length + state.runningPrograms.length ? `${state.programs.length + state.runningPrograms.length} programmes prêts` : "Aucun programme", "Musculation et course sont regroupées dans la même bibliothèque.", "coral", [[state.programs.length + state.runningPrograms.length,"programmes"],[strengthTemplates + runPlans,"séances"]]);
  body += `<button class="primary" data-action="choose-program-type">＋ Ajouter un programme</button>`;
  if (state.programs.length) body += section("Musculation", state.programs.map(p => row({id:p.id,action:"open-program",icon:"▱",title:p.name,detail:`${p.templates.length} séances · ${p.templates.reduce((n,t)=>n+t.exercises.length,0)} exos`,deleteAction:"delete-program"})).join(""));
  if (state.runningPrograms.length) body += section("Course", state.runningPrograms.map(p => row({id:p.id,action:"open-run-program",icon:"↗",tone:"teal",title:p.name,detail:`${p.plans.length} séances course`,deleteAction:"delete-run-program"})).join(""));
  if (!state.programs.length && !state.runningPrograms.length) body += section("Bibliothèque", empty("Aucun programme", "Ajoute ton premier programme de musculation ou de course."));
  return body;
}

function renderProgram() {
  const p = state.programs.find(x => x.id === route.id); if (!p) return renderPrograms();
  const exCount = p.templates.reduce((n,t)=>n+t.exercises.length,0);
  return header(p.name,true) + overview("Programme",p.name,p.templates.length ? "Réorganise et complète les séances de ce programme." : "Ajoute des séances pour structurer ce cycle.","coral",[[p.templates.length,"séances"],[exCount,"exos"]]) +
    `<div class="form-card"><label class="field">Nom<input data-bind="program-name" value="${esc(p.name)}"></label></div>` +
    `<div class="section"><button class="primary" data-action="add-template">＋ Ajouter une séance</button></div>` +
    section("Séances", p.templates.length ? p.templates.map(t => row({id:t.id,action:"open-template",icon:"●",tone:"teal",title:t.name,detail:t.notes || `${t.exercises.length} exos`,deleteAction:"delete-template"})).join("") : empty("Aucune séance","Ajoute la première séance."));
}

function renderTemplate() {
  const p = state.programs.find(x => x.id === route.id); const t = p?.templates.find(x => x.id === route.subId); if (!t) return renderProgram();
  return header(t.name,true) + overview("Séance",t.name,t.notes || "Prépare les exercices et les repères de la séance.","teal",[[t.exercises.length,"exos"],[t.exercises.reduce((n,e)=>n+e.sets,0),"séries"]]) +
    `<div class="form-card"><div class="field-grid">${field("Nom","name","text",t.name)}${field("Notes","notes","text",t.notes)}</div><button class="secondary" data-action="save-template-info">Enregistrer les infos</button></div>` +
    `<div class="section"><button class="primary" data-action="add-exercise">＋ Ajouter un exercice</button></div>` +
    section("Exercices",t.exercises.length ? t.exercises.map(e => `<div class="row"><span class="badge">◎</span><span class="row-main"><strong>${esc(e.name)}</strong><small>${esc(e.muscle)} · ${e.sets} × ${e.reps} · repos ${e.rest}s</small></span><button class="icon-btn" data-action="edit-exercise" data-id="${e.id}">✎</button><button class="icon-btn" data-action="delete-exercise" data-id="${e.id}">×</button></div>`).join("") : empty("Aucun exercice","Ajoute le premier exercice."));
}

function renderPlanning() {
  const strength = state.scheduled.filter(x => x.date === selectedDate);
  const runs = allRunPlans().filter(x => x.date === selectedDate);
  const recentRuns = [...state.runningSessions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  let body = header("Calendrier") + calendarHTML();
  body += `<div class="section button-stack"><button class="primary" data-action="choose-plan-type">＋ Planifier une séance</button><button class="secondary" data-action="add-run-result">＋ Ajouter une course réalisée</button></div>`;
  const items = strength.map(w => row({id:w.id,action:w.sessionId?"open-session":"start-scheduled",icon:"●",title:w.templateName,detail:w.programName,pill:w.completed?"Terminée":"Prévue",done:w.completed,deleteAction:"delete-scheduled"})).join("") + runs.map(r => row({id:r.id,action:"open-run-plan",icon:"↗",tone:"teal",title:r.title,detail:`${r.type} · ${runTarget(r)}`,pill:r.completedSessionId?"Terminée":"Prévue",done:!!r.completedSessionId,deleteAction:"delete-run-plan"})).join("");
  body += section(`Séances du ${fmtDate(selectedDate,{day:"numeric",month:"long"})}`,items || empty("Rien ce jour","Planifie une séance musculation ou course sur cette date."));
  if (recentRuns.length) body += section("Courses récentes",recentRuns.map(r=>row({id:r.id,action:"view-run-result",icon:"✓",tone:"teal",title:r.title,detail:`${fmtDate(r.date)} · ${runActual(r)}`,deleteAction:"delete-run-result"})).join(""));
  return body;
}

function calendarHTML() {
  const [y,m] = calendarMonth.split("-").map(Number); const first = new Date(y,m-1,1); const offset = (first.getDay()+6)%7; const days = new Date(y,m,0).getDate(); const prevDays = new Date(y,m-1,0).getDate(); const cells=[];
  for(let i=0;i<42;i++){ let day=i-offset+1, date, muted=false; if(day<1){date=new Date(y,m-2,prevDays+day);muted=true}else if(day>days){date=new Date(y,m-1,day);muted=true}else date=new Date(y,m-1,day); const iso=todayISO(date); const has=state.scheduled.some(x=>x.date===iso)||allRunPlans().some(x=>x.date===iso); cells.push(`<button class="day ${muted?"muted":""} ${iso===todayISO()?"today":""} ${iso===selectedDate?"selected":""} ${has?"has":""}" data-action="select-date" data-date="${iso}">${date.getDate()}</button>`); }
  return `<section class="card"><div class="calendar-head"><button data-action="prev-month">‹</button><strong>${monthLabel(calendarMonth)}</strong><button data-action="next-month">›</button></div><div class="calendar">${["L","M","M","J","V","S","D"].map(x=>`<span class="dow">${x}</span>`).join("")}${cells.join("")}</div></section>`;
}

function renderToday() {
  const today = todayISO(); const planned=state.scheduled.filter(x=>x.date===today&&!x.completed); const recent=[...state.sessions].filter(x=>x.endedAt).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  let body=header("Aujourd’hui")+overview("Aujourd’hui",planned.length ? `${planned.length} séance${planned.length>1?"s":""} à lancer` : "Aucune séance prévue",recent.length?"Retrouve aussi tes dernières séances juste en dessous.":"Démarre une séance libre ou depuis un programme.","coral",[[planned.length,"prévues"],[recent.length,"récentes"]]);
  body+=`<button class="primary" data-action="start-workout">▶ Lancer une séance</button>`;
  body+=section("Prévu",planned.length?planned.map(w=>row({id:w.id,action:"start-scheduled",icon:"●",title:w.templateName,detail:w.programName,pill:"Prévue"})).join(""):empty("Rien aujourd’hui","Aucune séance planifiée."));
  if(recent.length) body+=section("Récent",recent.map(s=>row({id:s.id,action:"open-session",icon:"✓",tone:"teal",title:s.templateName,detail:`${fmtDate(s.date)} · ${s.sets.length} séries`,pill:"Terminée",done:true})).join(""));
  body+=`<div class="section"><button class="secondary" data-action="export-csv">⇧ Exporter les 10 dernières semaines</button></div>`;
  return body;
}

function renderLive() {
  const s=state.sessions.find(x=>x.id===route.id); if(!s)return renderToday();
  const grouped=groupSets(s.sets); const elapsed=Math.max(0,Math.round((Date.now()-new Date(s.startedAt).getTime())/60000));
  let body=header(s.templateName,true)+overview("Séance en cours",s.templateName,s.programName,"coral",[[elapsed,"minutes"],[s.sets.length,"séries"]]);
  body+=`<button class="primary" data-action="add-live-set">＋ Ajouter une série</button>`;
  body+=section("Exercices",Object.keys(grouped).length?Object.entries(grouped).map(([name,sets])=>`<div class="card" style="margin:9px 0"><div class="section-title"><span>${esc(name)}</span><span>${sets.length} séries</span></div>${sets.map((set,i)=>`<div class="row" style="box-shadow:none"><span class="pill">Série ${i+1}</span><span class="row-main"><strong>${set.reps} × ${fmtNumber(set.weight)} kg</strong><small>Repos ${set.rest}s${set.rpe?` · RPE ${set.rpe}`:""}</small></span><button class="icon-btn" data-action="delete-set" data-id="${set.id}">×</button></div>`).join("")}</div>`).join(""):empty("Aucune série","Ajoute ta première série effectuée."));
  body+=`<div class="form-card section"><label class="field">Notes<textarea data-bind="session-notes" rows="3">${esc(s.notes)}</textarea></label><button class="danger" data-action="finish-session">✓ Terminer la séance</button></div>`;
  return body;
}

function renderSession() {
  const s=state.sessions.find(x=>x.id===route.id); if(!s)return renderToday(); const grouped=groupSets(s.sets); const volume=s.sets.reduce((n,x)=>n+x.reps*x.weight,0);
  return header(s.templateName,true)+overview("Séance terminée",s.templateName,`${fmtDate(s.date)} · ${s.programName}`,"teal",[[s.sets.length,"séries"],[`${fmtNumber(volume)} kg`,"volume"]])+section("Détail",Object.entries(grouped).map(([name,sets])=>`<div class="card" style="margin:9px 0"><div class="section-title"><span>${esc(name)}</span><span>${sets.length} séries</span></div>${sets.map((x,i)=>`<div class="row" style="box-shadow:none"><span class="pill">Série ${i+1}</span><span class="row-main"><strong>${x.reps} × ${fmtNumber(x.weight)} kg</strong><small>${x.rpe?`RPE ${x.rpe} · `:""}repos ${x.rest}s</small></span></div>`).join("")}</div>`).join("")||empty("Aucune série","Cette séance ne contient aucune série."))+section("Notes",`<div class="card">${esc(s.notes||"Aucune note.")}</div>`);
}

function renderProgress() {
  const completed=state.sessions.filter(x=>x.endedAt); const volume=completed.reduce((n,s)=>n+s.sets.reduce((a,x)=>a+x.reps*x.weight,0),0); const sets=completed.flatMap(s=>s.sets); const best=sets.reduce((m,x)=>Math.max(m,x.weight),0);
  const monthKeys=[]; for(let i=5;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);monthKeys.push(todayISO(d).slice(0,7));}
  const monthValues=monthKeys.map(k=>completed.filter(s=>s.date.startsWith(k)).reduce((n,s)=>n+s.sets.reduce((a,x)=>a+x.reps*x.weight,0),0)); const max=Math.max(...monthValues,1);
  const muscleTotals={}; for(const s of completed)for(const x of s.sets)muscleTotals[x.muscle||"Autre"]=(muscleTotals[x.muscle||"Autre"]||0)+x.reps*x.weight; const muscleMax=Math.max(...Object.values(muscleTotals),1);
  let body=header("Suivi")+overview("Progression",completed.length ? `${completed.length} séances analysées` : "Pas encore de données","Les volumes, records et groupes musculaires sont calculés depuis tes séances terminées.","teal",[[completed.length,"séances"],[`${fmtNumber(volume)} kg`,"volume"]]);
  body+=`<div class="progress-grid"><div class="stat"><strong>${sets.length}</strong><span>séries</span></div><div class="stat"><strong>${fmtNumber(best)} kg</strong><span>record charge</span></div><div class="stat"><strong>${new Set(sets.map(x=>x.name)).size}</strong><span>exercices</span></div></div>`;
  body+=section("Volume — 6 mois",`<div class="card"><div class="bars">${monthValues.map((v,i)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(3,v/max*100)}%"></div><span>${monthKeys[i].slice(5)}</span></div>`).join("")}</div></div>`);
  body+=section("Répartition musculaire",Object.keys(muscleTotals).length?`<div class="card">${Object.entries(muscleTotals).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<div class="muscle-row"><span>${esc(m)}</span><div class="track"><div class="fill" style="width:${v/muscleMax*100}%"></div></div><b>${Math.round(v/volume*100)||0}%</b></div>`).join("")}</div>`:empty("Aucune répartition","Termine une séance avec des séries pour afficher les données."));
  const records=[...sets].sort((a,b)=>b.weight-a.weight).slice(0,5); if(records.length)body+=section("Meilleures charges",records.map(x=>`<div class="row"><span class="badge amber">★</span><span class="row-main"><strong>${esc(x.name)}</strong><small>${x.reps} répétitions</small></span><b>${fmtNumber(x.weight)} kg</b></div>`).join(""));
  return body;
}

function renderRunProgram(){const p=state.runningPrograms.find(x=>x.id===route.id);if(!p)return renderPrograms();return header(p.name,true)+overview("Programme course",p.name,"Planifie les sorties et leurs objectifs.","teal",[[p.plans.length,"séances"],[p.plans.filter(x=>x.completedSessionId).length,"terminées"]])+`<div class="form-card"><label class="field">Nom<input data-bind="run-program-name" value="${esc(p.name)}"></label></div><div class="section"><button class="primary" data-action="add-run-plan-program">＋ Ajouter une séance course</button></div>`+section("Séances",p.plans.length?p.plans.sort((a,b)=>a.date.localeCompare(b.date)).map(r=>row({id:r.id,action:"open-run-plan",icon:"↗",tone:"teal",title:r.title,detail:`${fmtDate(r.date)} · ${runTarget(r)}`,pill:r.completedSessionId?"Terminée":"Prévue",done:!!r.completedSessionId,deleteAction:"delete-run-plan"})).join(""):empty("Aucune séance","Ajoute une sortie à ce programme."));}
function renderRunPlan(){const found=findRunPlan(route.id);const r=found?.plan;if(!r)return renderPlanning();return header(r.title,true)+overview("Course",r.title,`${fmtDate(r.date)} · ${r.type}`,"teal",[[r.distance?`${fmtNumber(r.distance)} km`:"—","distance"],[r.duration?`${r.duration} min`:"—","durée"]])+section("Objectif",`<div class="card"><b>${esc(runTarget(r))}</b>${r.notes?`<p class="help">${esc(r.notes)}</p>`:""}</div>`)+`<div class="section button-stack"><button class="secondary" data-action="edit-run-plan">✎ Modifier la séance</button>${r.completedSessionId?`<button class="primary" data-action="view-run-result" data-id="${r.completedSessionId}">Voir le résultat</button>`:`<button class="primary" data-action="complete-run-plan">✓ Enregistrer le résultat</button>`}</div>`;}

function groupSets(sets){return sets.reduce((o,x)=>((o[x.name]??=[]).push(x),o),{});} function allRunPlans(){return state.runningPrograms.flatMap(p=>p.plans);} function findRunPlan(id){for(const program of state.runningPrograms){const plan=program.plans.find(x=>x.id===id);if(plan)return{program,plan};}return null;} function runTarget(r){return [r.distance?`${fmtNumber(r.distance)} km`:"",r.duration?`${r.duration} min`:"",r.pace||""].filter(Boolean).join(" · ")||"Objectif libre";} function runActual(r){return [r.distance?`${fmtNumber(r.distance)} km`:"",r.duration?`${r.duration} min`:"",r.pace||""].filter(Boolean).join(" · ")||"Séance non renseignée";}

function openModal(title, content, submitLabel="", handler=null){modalForm.innerHTML=`<div class="modal-head"><h2>${esc(title)}</h2><button class="modal-close" type="button" data-action="close-modal">×</button></div><div class="modal-content">${content}${submitLabel?`<button class="primary" type="submit">${esc(submitLabel)}</button>`:""}</div>`;modalForm.onsubmit=e=>{e.preventDefault();handler?.(new FormData(modalForm));};modal.showModal();}
function closeModal(){modal.close();modalForm.onsubmit=null;} function notify(msg){toast.textContent=msg;toast.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove("show"),1900);} function commit(msg="Enregistré"){save();render();if(msg)notify(msg);}

function chooseProgramType(){openModal("Choisir un sport",`<div class="choice-grid"><button type="button" class="choice" data-action="new-strength-program"><span>●</span>Musculation</button><button type="button" class="choice" data-action="new-run-program"><span>↗</span>Course</button></div>`);}
function choosePlanType(){openModal("Planifier une séance",`<div class="choice-grid"><button type="button" class="choice" data-action="plan-strength"><span>●</span>Musculation</button><button type="button" class="choice" data-action="plan-run"><span>↗</span>Course</button></div>`);}
function strengthPlanner(){const options=state.programs.flatMap(p=>p.templates.map(t=>({value:`${p.id}|${t.id}`,label:`${p.name} — ${t.name}`})));if(!options.length){notify("Crée d’abord un programme et une séance");closeModal();return;}openModal("Planifier une séance",selectField("Programme et séance","choice",options)+field("Date","date","date",selectedDate),"Planifier",fd=>{const[pId,tId]=fd.get("choice").split("|");const p=state.programs.find(x=>x.id===pId),t=p?.templates.find(x=>x.id===tId);state.scheduled.push({id:uid(),date:fd.get("date"),programId:p.id,templateId:t.id,programName:p.name,templateName:t.name,completed:false,sessionId:null});closeModal();commit("Séance planifiée");});}
function runPlanEditor(plan=null,programId=null){const r=plan||{id:uid(),date:selectedDate,type:runTypes[0],title:runTypes[0],distance:8,duration:45,pace:"",notes:"",completedSessionId:null};openModal(plan?"Modifier la course":"Planifier une course",field("Titre","title","text",r.title,"required")+selectField("Type","type",runTypes,r.type)+`<div class="field-grid">${field("Date","date","date",r.date,"required")}${field("Distance cible (km)","distance","number",r.distance,'min="0" step="0.1"')}</div><div class="field-grid">${field("Durée cible (min)","duration","number",r.duration,'min="0"')}${field("Allure cible","pace","text",r.pace,'placeholder="5:30 /km"')}</div><label class="field">Notes<textarea name="notes" rows="3">${esc(r.notes)}</textarea></label>`,plan?"Enregistrer":"Planifier",fd=>{Object.assign(r,{title:fd.get("title").trim(),type:fd.get("type"),date:fd.get("date"),distance:+fd.get("distance"),duration:+fd.get("duration"),pace:fd.get("pace").trim(),notes:fd.get("notes").trim()});if(!plan){let p=state.runningPrograms.find(x=>x.id===programId)||state.runningPrograms[0];if(!p){p={id:uid(),name:"Programme course",createdAt:new Date().toISOString(),plans:[]};state.runningPrograms.push(p);}p.plans.push(r);}closeModal();commit("Course enregistrée");});}
function runResultEditor(plan=null,result=null){const r=result||{id:uid(),date:plan?.date||selectedDate,title:plan?.title||"Course",type:plan?.type||runTypes[0],distance:plan?.distance||0,duration:plan?.duration||0,pace:"",notes:"",planId:plan?.id||null};openModal("Course réalisée",field("Titre","title","text",r.title,"required")+selectField("Type","type",runTypes,r.type)+`<div class="field-grid">${field("Date","date","date",r.date,"required")}${field("Distance (km)","distance","number",r.distance,'min="0" step="0.1"')}</div><div class="field-grid">${field("Durée (min)","duration","number",r.duration,'min="0"')}${field("Allure","pace","text",r.pace,'placeholder="5:30 /km"')}</div><label class="field">Notes<textarea name="notes" rows="3">${esc(r.notes)}</textarea></label>`,"Enregistrer",fd=>{Object.assign(r,{title:fd.get("title").trim(),type:fd.get("type"),date:fd.get("date"),distance:+fd.get("distance"),duration:+fd.get("duration"),pace:fd.get("pace").trim(),notes:fd.get("notes").trim()});if(!result)state.runningSessions.push(r);if(plan)plan.completedSessionId=r.id;closeModal();commit("Course enregistrée");});}
function exerciseEditor(exercise=null){const e=exercise||{id:uid(),name:"",alternatives:"",muscle:"Autre",sets:4,reps:8,weight:0,rest:90};openModal(exercise?"Modifier l’exercice":"Ajouter un exercice",field("Nom de l’exercice","name","text",e.name,"required")+selectField("Groupe musculaire","muscle",muscles,e.muscle)+field("Alternatives","alternatives","text",e.alternatives)+`<div class="field-grid">${field("Séries","sets","number",e.sets,'min="1" max="12"')}${field("Répétitions","reps","number",e.reps,'min="1" max="50"')}</div><div class="field-grid">${field("Poids cible (kg)","weight","number",e.weight,'min="0" step="0.5"')}${field("Repos (secondes)","rest","number",e.rest,'min="0" step="15"')}</div>`,exercise?"Enregistrer":"Ajouter",fd=>{Object.assign(e,{name:fd.get("name").trim(),muscle:fd.get("muscle"),alternatives:fd.get("alternatives").trim(),sets:+fd.get("sets"),reps:+fd.get("reps"),weight:+fd.get("weight"),rest:+fd.get("rest")});if(!exercise){const p=state.programs.find(x=>x.id===route.id),t=p.templates.find(x=>x.id===route.subId);t.exercises.push(e);}closeModal();commit("Exercice enregistré");});}
function startWorkoutModal(){const choices=state.programs.flatMap(p=>p.templates.map(t=>({value:`${p.id}|${t.id}`,label:`${p.name} — ${t.name}`})));openModal("Lancer une séance",`${choices.length?selectField("Depuis un programme","choice",[{value:"",label:"Séance libre"},...choices]):""}${field("Nom de la séance libre","freeName","text","Séance libre")}`,"Commencer",fd=>{let programName="Hors programme",templateName=fd.get("freeName").trim()||"Séance libre",template=null;const choice=fd.get("choice");if(choice){const[pId,tId]=choice.split("|");const p=state.programs.find(x=>x.id===pId);template=p.templates.find(x=>x.id===tId);programName=p.name;templateName=template.name;}const s=createSession({programName,templateName,template});closeModal();route={tab:"today",view:"live",id:s.id,subId:null};commit("");});}
function createSession({programName,templateName,template=null,scheduled=null}){const sets=[];const s={id:uid(),date:todayISO(),startedAt:new Date().toISOString(),endedAt:null,programName,templateName,notes:"",sets,scheduledId:scheduled?.id||null,templateId:template?.id||null};state.sessions.push(s);if(scheduled)scheduled.sessionId=s.id;return s;}
function addSetModal(s){const template=findTemplateById(s.templateId);const names=template?.exercises?.length?template.exercises.map(e=>({value:e.id,label:e.name})):[];openModal("Ajouter une série",`${names.length?selectField("Exercice","exercise",names):field("Exercice","exerciseName","text","",'required')}${names.length?field("Autre nom (optionnel)","exerciseName","text",""):""}<div class="field-grid">${field("Répétitions","reps","number",8,'min="1"')}${field("Poids (kg)","weight","number",0,'min="0" step="0.5"')}</div><div class="field-grid">${field("Repos (s)","rest","number",90,'min="0"')}${field("RPE (optionnel)","rpe","number","",'min="1" max="10" step="0.5"')}</div>`,"Ajouter",fd=>{const ex=template?.exercises.find(x=>x.id===fd.get("exercise"));const name=fd.get("exerciseName").trim()||ex?.name;if(!name)return;s.sets.push({id:uid(),name,muscle:ex?.muscle||"Autre",reps:+fd.get("reps"),weight:+fd.get("weight"),rest:+fd.get("rest"),rpe:fd.get("rpe")?+fd.get("rpe"):null,createdAt:new Date().toISOString()});closeModal();commit("Série ajoutée");});}
function findTemplateById(id){for(const p of state.programs){const t=p.templates.find(x=>x.id===id);if(t)return t;}return null;}

document.querySelector(".tabbar").addEventListener("click",e=>{const b=e.target.closest("button[data-tab]");if(!b)return;route={tab:b.dataset.tab,view:"root",id:null,subId:null};render();});
document.addEventListener("input",e=>{if(e.target.dataset.bind==="program-name"){const p=state.programs.find(x=>x.id===route.id);p.name=e.target.value;save();document.querySelector(".screen-header h1").textContent=p.name;}if(e.target.dataset.bind==="run-program-name"){const p=state.runningPrograms.find(x=>x.id===route.id);p.name=e.target.value;save();document.querySelector(".screen-header h1").textContent=p.name;}if(e.target.dataset.bind==="session-notes"){const s=state.sessions.find(x=>x.id===route.id);s.notes=e.target.value;save();}});
document.addEventListener("click",e=>{const el=e.target.closest("[data-action]");if(!el)return;const a=el.dataset.action,id=el.dataset.id;
  if(a==="close-modal"){closeModal();return;} if(a==="back"){if(route.view==="template")route={tab:"programs",view:"program",id:route.id};else route={tab:route.tab,view:"root",id:null,subId:null};render();return;}
  if(a==="settings"){const old=document.querySelector(".settings");if(old){old.remove();return;}const box=document.createElement("div");box.className="settings";box.innerHTML=`<button data-action="export-json">Exporter toutes les données</button><label>Importer des données<input type="file" data-action="import-json" accept=".json" hidden></label><button data-action="install-app" ${deferredInstall?"":"hidden"}>Installer l’application</button>`;app.append(box);return;}
  if(a==="choose-program-type")chooseProgramType(); else if(a==="new-strength-program"){const p={id:uid(),name:"Nouveau programme",createdAt:new Date().toISOString(),templates:[]};state.programs.push(p);closeModal();route={tab:"programs",view:"program",id:p.id};commit("");}
  else if(a==="new-run-program"){const p={id:uid(),name:"Programme course",createdAt:new Date().toISOString(),plans:[]};state.runningPrograms.push(p);closeModal();route={tab:"programs",view:"runProgram",id:p.id};commit("");}
  else if(a==="open-program"){route={tab:"programs",view:"program",id};render();} else if(a==="open-run-program"){route={tab:"programs",view:"runProgram",id};render();}
  else if(a==="delete-program"&&confirm("Supprimer ce programme et ses séances ?")){state.programs=state.programs.filter(x=>x.id!==id);commit("Programme supprimé");} else if(a==="delete-run-program"&&confirm("Supprimer ce programme course ?")){state.runningPrograms=state.runningPrograms.filter(x=>x.id!==id);commit("Programme supprimé");}
  else if(a==="add-template"){const p=state.programs.find(x=>x.id===route.id);p.templates.push({id:uid(),name:"Nouvelle séance",notes:"",exercises:[]});commit("Séance ajoutée");} else if(a==="open-template"){route={tab:"programs",view:"template",id:route.id,subId:id};render();}
  else if(a==="delete-template"&&confirm("Supprimer cette séance ?")){const p=state.programs.find(x=>x.id===route.id);p.templates=p.templates.filter(x=>x.id!==id);commit("Séance supprimée");} else if(a==="save-template-info"){const p=state.programs.find(x=>x.id===route.id),t=p.templates.find(x=>x.id===route.subId),form=el.closest(".form-card");t.name=form.querySelector('[name="name"]').value.trim()||"Séance";t.notes=form.querySelector('[name="notes"]').value.trim();commit();}
  else if(a==="add-exercise")exerciseEditor(); else if(a==="edit-exercise"){const t=findTemplateById(route.subId);exerciseEditor(t.exercises.find(x=>x.id===id));} else if(a==="delete-exercise"&&confirm("Supprimer cet exercice ?")){const t=findTemplateById(route.subId);t.exercises=t.exercises.filter(x=>x.id!==id);commit("Exercice supprimé");}
  else if(a==="choose-plan-type")choosePlanType(); else if(a==="plan-strength"){closeModal();strengthPlanner();} else if(a==="plan-run"){closeModal();runPlanEditor();}
  else if(a==="select-date"){selectedDate=el.dataset.date;calendarMonth=selectedDate.slice(0,7);render();} else if(a==="prev-month"||a==="next-month"){const[y,m]=calendarMonth.split("-").map(Number),d=new Date(y,m-1+(a==="next-month"?1:-1),1);calendarMonth=todayISO(d).slice(0,7);render();}
  else if(a==="delete-scheduled"&&confirm("Supprimer cette séance planifiée ?")){state.scheduled=state.scheduled.filter(x=>x.id!==id);commit("Séance supprimée");} else if(a==="start-workout")startWorkoutModal(); else if(a==="start-scheduled"){const w=state.scheduled.find(x=>x.id===id);let s=state.sessions.find(x=>x.id===w.sessionId);if(!s)s=createSession({programName:w.programName,templateName:w.templateName,template:findTemplateById(w.templateId),scheduled:w});route={tab:"today",view:"live",id:s.id};commit("");}
  else if(a==="open-session"){const w=state.scheduled.find(x=>x.id===id),sid=w?.sessionId||id,s=state.sessions.find(x=>x.id===sid);route={tab:route.tab,view:s?.endedAt?"session":"live",id:sid};render();} else if(a==="add-live-set")addSetModal(state.sessions.find(x=>x.id===route.id)); else if(a==="delete-set"){const s=state.sessions.find(x=>x.id===route.id);s.sets=s.sets.filter(x=>x.id!==id);commit("Série supprimée");}
  else if(a==="finish-session"){const s=state.sessions.find(x=>x.id===route.id);s.endedAt=new Date().toISOString();const w=state.scheduled.find(x=>x.id===s.scheduledId);if(w)w.completed=true;route={tab:"today",view:"session",id:s.id};commit("Séance terminée");}
  else if(a==="add-run-plan-program")runPlanEditor(null,route.id); else if(a==="open-run-plan"){route={tab:route.tab,view:"runPlan",id};render();} else if(a==="edit-run-plan")runPlanEditor(findRunPlan(route.id).plan); else if(a==="delete-run-plan"&&confirm("Supprimer cette course planifiée ?")){for(const p of state.runningPrograms)p.plans=p.plans.filter(x=>x.id!==id);commit("Course supprimée");}
  else if(a==="complete-run-plan")runResultEditor(findRunPlan(route.id).plan); else if(a==="add-run-result")runResultEditor(); else if(a==="view-run-result"){const r=state.runningSessions.find(x=>x.id===(id||findRunPlan(route.id)?.plan.completedSessionId));if(r)runResultEditor(null,r);} else if(a==="delete-run-result"&&confirm("Supprimer cette course réalisée ?")){state.runningSessions=state.runningSessions.filter(x=>x.id!==id);for(const p of state.runningPrograms)for(const r of p.plans)if(r.completedSessionId===id)r.completedSessionId=null;commit("Course supprimée");}
  else if(a==="export-json")exportJSON(); else if(a==="export-csv")exportCSV(); else if(a==="install-app"&&deferredInstall){deferredInstall.prompt();deferredInstall=null;document.querySelector(".settings")?.remove();}
});
document.addEventListener("change",async e=>{if(e.target.dataset.action!=="import-json")return;const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(parsed.version!==2)throw Error();state={...blankState(),...parsed};save();render();notify("Données importées");}catch{notify("Fichier Suivi Sport invalide");}});
function download(name,text,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);} function exportJSON(){download(`suivi-sport-${todayISO()}.json`,JSON.stringify(state,null,2),"application/json");notify("Export créé");} function exportCSV(){const rows=[["Date","Programme","Séance","Exercice","Répétitions","Poids (kg)","RPE"]];for(const s of state.sessions)for(const x of s.sets)rows.push([s.date,s.programName,s.templateName,x.name,x.reps,x.weight,x.rpe||""]);download(`suivi-sport-${todayISO()}.csv`,rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv;charset=utf-8");notify("Export CSV créé");}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;}); if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
render();
