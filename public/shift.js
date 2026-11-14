// Tally volunteer: Today card, check-in, shift clock, tab bar
Object.assign(T.en, {
  tabShift: "Shift", tabTasks: "Tasks", tabChat: "Chat", tabAsk: "Ask", tabReport: "Report",
  imHere: "I'm here", checkedIn: "Checked in {time}", onShift: "On shift {d}", yourHost: "Your host", findHer: "Find them at {where}",
  goalToday: "Today's goal", ofBoxes: "{a} of {b} {unit}", know: "Know before you go",
  stSoon: "Starts in {n} min", stNow: "Happening now", stWrap: "Wrapping up", stOver: "Event is over", firstTime: "First time? Your host is {host}. They'll find you.",
  collapse: "Hide details", expand: "Show details", noEvent: "No event today. Check with staff.", firstShiftBadge: "First shift",
});
Object.assign(T.es, {
  tabShift: "Turno", tabTasks: "Tareas", tabChat: "Chat", tabAsk: "Preguntar", tabReport: "Reportar",
  imHere: "Ya llegué", checkedIn: "Registrado a las {time}", onShift: "En turno {d}", yourHost: "Tu anfitrión", findHer: "Búscalo en {where}",
  goalToday: "Meta de hoy", ofBoxes: "{a} de {b} {unit}", know: "Antes de empezar",
  stSoon: "Empieza en {n} min", stNow: "En curso", stWrap: "Por terminar", stOver: "El evento terminó", firstTime: "¿Primera vez? Tu anfitrión es {host}. Te buscará.",
  collapse: "Ocultar detalles", expand: "Mostrar detalles", noEvent: "Hoy no hay evento. Pregunta al personal.", firstShiftBadge: "Primer turno",
});

const TABS = [["shift", "clock"], ["tasks", "list-checks"], ["chat", "message-circle"], ["ask", "circle-help"], ["report", "flag"]];
const RENDER = {};   // tab id -> function, registered by later parts
let tab = "shift", today = null, cardOpen = true;
const UNIT_ES = { boxes: "cajas" };

function dur(ms) {
  const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60);
  return h ? h + "h " + String(m % 60).padStart(2, "0") + "m" : m + "m";
}

async function loadToday() {
  if (!name) return;
  try {
    const r = await fetch("/api/today?name=" + encodeURIComponent(name));
    if (r.ok) today = await r.json();
  } catch {}
  renderToday();
}

function statusPill(ev) {
  const s = liveStatus(ev);
  const k = { soon: "stSoon", now: "stNow", wrapping: "stWrap", over: "stOver" }[s.status];
  return '<span class="pill ' + (s.status === "now" ? "ink" : s.status === "wrapping" ? "white" : "lime") + '">' + esc(t(k, { n: s.minutes })) + "</span>";
}
function liveStatus(ev) {
  const now = Date.now(), s = Date.parse(ev.start_at), e = Date.parse(ev.end_at);
  if (now < s) return { status: "soon", minutes: Math.ceil((s - now) / 60000) };
  if (now >= e) return { status: "over", minutes: 0 };
  return { status: e - now <= 1800000 ? "wrapping" : "now", minutes: Math.ceil((e - now) / 60000) };
}

function renderToday() {
  const card = $("today-card"), box = $("checkin-box");
  if (!card) return;
  const ev = today && today.event;
  if (!ev) { card.innerHTML = '<p class="tc-none">' + esc(t("noEvent")) + "</p>"; box.innerHTML = ""; return; }
  const ci = today.checkin;
  const pct = ev.goal_target ? Math.min(100, Math.round(ev.goal_done / ev.goal_target * 100)) : 0;
  const unit = lang === "es" ? (UNIT_ES[ev.goal_unit] || ev.goal_unit) : ev.goal_unit;
  const time = fmtTime(ev.start_at) + (lang === "es" ? " a " : " to ") + fmtTime(ev.end_at);
  const open = cardOpen || !ci;
  let h = ci && !open ? '<div class="tc-compact"><span class="tc-title">' + esc(ev.place) + "</span>" + statusPill(ev) + "</div>" : '<div class="tc-top"><div class="tc-title">' + esc(ev.place + " · " + ev.name) + "</div>" + statusPill(ev) + "</div>";
  if (open) h += '<div class="tc-time">' + esc(time) + "</div>";
  if (open) {
    h += '<div class="tc-host"><span class="tc-lbl">' + esc(t("yourHost")) + "</span><strong>" + esc(ev.host) + "</strong> · " + esc(t("findHer", { where: ev.host_where })) + "</div>";
    if (ev.goal) {
      h += '<div class="tc-goal"><span class="tc-lbl">' + esc(t("goalToday")) + "</span>" + esc(ev.goal) + "</div>";
      h += '<div id="goal-bar" class="goal-bar" role="img" aria-label="' + esc(t("ofBoxes", { a: ev.goal_done, b: ev.goal_target, unit })) + '"><i style="width:' + pct + '%"></i></div>';
      h += '<div class="tc-prog">' + esc(t("ofBoxes", { a: ev.goal_done, b: ev.goal_target, unit })) + "</div>";
    }
    if (ev.know.length) h += '<div class="tc-know"><span class="tc-lbl">' + esc(t("know")) + "</span><ul>" + ev.know.map(l => "<li>" + esc(l) + "</li>").join("") + "</ul></div>";
  }
  if (ci) h += '<button id="tc-toggle" class="link-btn">' + esc(t(cardOpen ? "collapse" : "expand")) + "</button>";
  card.innerHTML = h;
  const tg = document.getElementById("tc-toggle");
  if (tg) tg.onclick = () => { cardOpen = !cardOpen; renderToday(); };

  if (!ci) {
    box.innerHTML = '<button id="here-btn" class="here-btn">' + esc(t("imHere")) + "</button>" + (today.first_time ? '<p class="first-line">' + esc(t("firstTime", { host: ev.host })) + "</p>" : "");
    $("here-btn").onclick = async () => {
      try {
        const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        if (r.ok) { today = await r.json(); cardOpen = false; renderToday(); renderTab(); }
      } catch {}
    };
  } else {
    const live = !ci.left_at;
    box.innerHTML = '<div class="clock-row"><span class="pill lime">' + esc(t("checkedIn", { time: fmtTime(ci.at) })) + '</span><span id="shift-clock" class="shift-clock">' +
      esc(t("onShift", { d: dur((ci.left_at ? Date.parse(ci.left_at) : Date.now()) - Date.parse(ci.at)) })) + "</span></div>" +
      (ci.first_shift ? '<p class="first-line">' + esc(t("firstTime", { host: ev.host })) + "</p>" : "");
  }
  const cap = $("capture"); if (cap && tab === "shift") cap.classList.toggle("hidden", (!ci && !window.forceCapture) || !!lastReceipt);
  icons();
  document.dispatchEvent(new CustomEvent("tally-today"));
}

function renderTabs() {
  const nav = $("vol-tabs");
  nav.innerHTML = TABS.map(([id, ic]) => '<button class="vt' + (id === tab ? " active" : "") + '" data-tab="' + id + '" data-tip="' + esc(t("tab" + id[0].toUpperCase() + id.slice(1))) + '" aria-label="' + esc(t("tab" + id[0].toUpperCase() + id.slice(1))) + '"' + (id === tab ? ' aria-current="page"' : "") + '><i data-lucide="' + ic + '"></i><span>' + esc(t("tab" + id[0].toUpperCase() + id.slice(1))) + '</span><b class="vt-dot hidden" id="dot-' + id + '"></b></button>').join("");
  nav.querySelectorAll(".vt").forEach(b => b.onclick = () => setTab(b.dataset.tab));
  icons();
}

function syncEmergency() {
  const e = $("emergency"); if (!e) return;
  e.classList.toggle("hidden", tab !== "report" && tab !== "shift");
  e.classList.toggle("small", tab === "shift");
}
function setTab(id) {
  tab = id;
  syncEmergency();
  for (const [x] of TABS) $("tab-" + x).classList.toggle("hidden", x !== id);
  $("today-card").classList.toggle("hidden", id !== "shift");
  $("checkin-box").classList.toggle("hidden", id !== "shift");
  renderTabs(); renderTab(); renderToday();
  window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent("tally-tab", { detail: id }));
}
function renderTab() { if (RENDER[tab]) RENDER[tab](); }

const _applyLanguage = applyLanguage;
applyLanguage = function () { _applyLanguage(); if (!$("vol-tabs")) return; renderTabs(); renderToday(); renderTab(); };
const _route = route;
route = function () { _route(); if (name && goal) { loadToday(); } };

document.addEventListener("DOMContentLoaded", () => {
  renderTabs(); renderTab(); syncEmergency();
  setInterval(() => {
    const c = today && today.checkin;
    if (c && !c.left_at && $("shift-clock")) $("shift-clock").textContent = t("onShift", { d: dur(Date.now() - Date.parse(c.at)) });
    if (today && today.event && tab === "shift") { const p = $("today-card").querySelector(".pill"); if (p) p.outerHTML = statusPill(today.event); }
  }, 20000);
  setInterval(() => { if (!document.hidden && name) loadToday(); }, 30000);
  if (name && goal) loadToday();
});
