const STORAGE_KEY = "suivisport.sessions.v1";
const activityIcons = { Course: "↗", Vélo: "◇", Natation: "≈", Musculation: "＋", Marche: "→", Autre: "•" };

const elements = {
  list: document.querySelector("#sessions-list"),
  empty: document.querySelector("#empty-state"),
  weeklyCount: document.querySelector("#weekly-count"),
  weeklyPlural: document.querySelector("#weekly-plural"),
  totalDuration: document.querySelector("#total-duration"),
  streakCount: document.querySelector("#streak-count"),
  clearAll: document.querySelector("#clear-all-button"),
  dialog: document.querySelector("#session-dialog"),
  form: document.querySelector("#session-form"),
  date: document.querySelector("#session-date"),
  settings: document.querySelector("#settings-button"),
  popover: document.querySelector("#settings-popover"),
  install: document.querySelector("#install-button"),
  toast: document.querySelector("#toast"),
};

let sessions = loadSessions();
let installPrompt = null;

function loadSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isValidSession) : [];
  } catch {
    return [];
  }
}

function isValidSession(session) {
  return session && typeof session.id === "string" && typeof session.activity === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(session.date) && Number.isFinite(Number(session.duration)) && Number(session.duration) > 0;
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function weekKey(date) {
  return localDateString(startOfWeek(date));
}

function calculateStreak() {
  if (!sessions.length) return 0;
  const activeWeeks = new Set(sessions.map((session) => weekKey(parseLocalDate(session.date))));
  let cursor = startOfWeek(new Date());
  if (!activeWeeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (activeWeeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder}` : `${hours} h`;
}

function render() {
  sessions.sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  elements.list.replaceChildren(...sessions.map(createSessionElement));
  elements.empty.hidden = sessions.length > 0;
  elements.clearAll.hidden = sessions.length === 0;

  const currentWeek = startOfWeek(new Date());
  const nextWeek = new Date(currentWeek);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const weekly = sessions.filter((session) => {
    const date = parseLocalDate(session.date);
    return date >= currentWeek && date < nextWeek;
  }).length;
  const totalMinutes = sessions.reduce((total, session) => total + Number(session.duration), 0);
  const totalHours = totalMinutes / 60;

  elements.weeklyCount.textContent = weekly;
  elements.weeklyPlural.textContent = weekly === 1 ? "" : "s";
  elements.totalDuration.innerHTML = totalHours < 10 && totalHours % 1 ? `${totalHours.toFixed(1)}<span>h</span>` : `${Math.round(totalHours)}<span>h</span>`;
  elements.streakCount.innerHTML = `${calculateStreak()}<span> sem.</span>`;
}

function createSessionElement(session) {
  const article = document.createElement("article");
  article.className = "session-item";
  const formattedDate = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(parseLocalDate(session.date));

  const icon = document.createElement("span");
  icon.className = "activity-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = activityIcons[session.activity] || activityIcons.Autre;

  const details = document.createElement("div");
  details.className = "session-details";
  const title = document.createElement("h3");
  title.textContent = session.activity;
  const note = document.createElement("p");
  note.textContent = session.notes || "Séance enregistrée";
  details.append(title, note);

  const date = document.createElement("time");
  date.className = "session-date";
  date.dateTime = session.date;
  date.textContent = formattedDate;

  const duration = document.createElement("span");
  duration.className = "session-duration";
  duration.textContent = formatDuration(Number(session.duration));

  const remove = document.createElement("button");
  remove.className = "delete-button";
  remove.type = "button";
  remove.setAttribute("aria-label", `Supprimer la séance ${session.activity}`);
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteSession(session.id));

  article.append(icon, details, date, duration, remove);
  return article;
}

function deleteSession(id) {
  sessions = sessions.filter((session) => session.id !== id);
  saveSessions();
  render();
  showToast("Séance supprimée");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function openDialog() {
  elements.date.value = localDateString();
  elements.dialog.showModal();
}

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long",
}).format(new Date());

document.querySelector("#add-session-button").addEventListener("click", openDialog);
document.querySelector("#close-dialog-button").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(elements.form);
  sessions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    activity: String(data.get("activity")),
    date: String(data.get("date")),
    duration: Number(data.get("duration")),
    notes: String(data.get("notes")).trim(),
    createdAt: new Date().toISOString(),
  });
  saveSessions();
  render();
  elements.form.reset();
  elements.dialog.close();
  showToast("Séance enregistrée");
});

elements.clearAll.addEventListener("click", () => {
  if (!window.confirm("Supprimer définitivement toutes les séances ?")) return;
  sessions = [];
  saveSessions();
  render();
  showToast("Toutes les séances ont été supprimées");
});

elements.settings.addEventListener("click", () => {
  elements.popover.hidden = !elements.popover.hidden;
  elements.settings.setAttribute("aria-expanded", String(!elements.popover.hidden));
});

document.addEventListener("click", (event) => {
  if (!elements.popover.hidden && !elements.popover.contains(event.target) && !elements.settings.contains(event.target)) {
    elements.popover.hidden = true;
    elements.settings.setAttribute("aria-expanded", "false");
  }
});

document.querySelector("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sessions }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `suivisport-${localDateString()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Export créé");
});

document.querySelector("#import-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const incoming = Array.isArray(imported) ? imported : imported.sessions;
    if (!Array.isArray(incoming) || !incoming.every(isValidSession)) throw new Error("Format invalide");
    const byId = new Map([...sessions, ...incoming].map((session) => [session.id, session]));
    sessions = [...byId.values()];
    saveSessions();
    render();
    showToast(`${incoming.length} séance${incoming.length > 1 ? "s" : ""} importée${incoming.length > 1 ? "s" : ""}`);
  } catch {
    showToast("Ce fichier n’est pas un export SuiviSport valide");
  } finally {
    event.target.value = "";
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.install.hidden = false;
});

elements.install.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  elements.install.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

render();
