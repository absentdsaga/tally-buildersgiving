// Tally volunteer: Home. One card that always says what to do next, so nobody hunts for a coordinator.
Object.assign(T.en, {
  hmNext: "Do this next", hmLineArrive: "Welcome to {place}.", hmLineIn: "You're checked in.", hmLineTask: "You're on a task.", hmLineOver: "Thanks for today.", hmLineNone: "Nothing on today.",
  hmArrive: "Find {host} at {where}, then tap I'm here.", hmFree: "Grab a task. Tally sends you where you're needed, so you're never standing around.",
  hmOn: "You're on {task}.", hmOver: "Tell us about your shift so your hours count.", hmTalk: "Tell us about your shift", hmDoneDay: "Done for the day?",
  hmHost: "Your host", hmAt: "At {where}", hmMsg: "Message", hmGoal: "Today's goal", hmHours: "Your hours", hmEveryone: "Everyone today", hmQuiet: "Updates from {host} show up here.", hmJoin: "Check in to see team updates.",
  hmAsk: "Ask a question", hmAskSub: "Parking, breaks, what to do next", hmReport: "Report something", hmReportSub: "Private if you want. Staff tell you when it's handled.",
  hmTasks: "See all tasks", hmTasksSub: "{n} open right now", hmTasksNone: "Your host posts them here", hmLetter: "Get my hours letter", hmLetterSub: "Proof for school, court or work",
});
Object.assign(T.es, {
  hmNext: "Haz esto ahora", hmLineArrive: "Bienvenido a {place}.", hmLineIn: "Ya te registraste.", hmLineTask: "Tienes una tarea.", hmLineOver: "Gracias por venir.", hmLineNone: "Hoy no hay nada.",
  hmArrive: "Busca a {host} en {where} y toca Ya llegué.", hmFree: "Toma una tarea. Tally te manda adonde te necesitan, para que nunca te quedes esperando.",
  hmOn: "Estás en {task}.", hmOver: "Cuéntanos tu turno para que cuenten tus horas.", hmTalk: "Cuéntanos tu turno", hmDoneDay: "¿Terminaste por hoy?",
  hmHost: "Tu anfitrión", hmAt: "En {where}", hmMsg: "Escribir", hmGoal: "Meta de hoy", hmHours: "Tus horas", hmEveryone: "Todos hoy", hmQuiet: "Aquí verás los avisos de {host}.", hmJoin: "Regístrate para ver los avisos del equipo.",
  hmAsk: "Hacer una pregunta", hmAskSub: "Estacionamiento, descansos, qué sigue", hmReport: "Reportar algo", hmReportSub: "En privado si quieres. Te avisamos cuando se atienda.",
  hmTasks: "Ver todas las tareas", hmTasksSub: "{n} libres ahora", hmTasksNone: "Tu anfitrión las publica aquí", hmLetter: "Obtener mi carta de horas", hmLetterSub: "Prueba para escuela, corte o trabajo",
});

function capsuleRow(on, total, n = 10) {
  const k = total ? Math.round(Math.min(1, on / total) * n) : 0;
  let h = "";
  for (let i = 0; i < n; i++) h += '<i class="' + (i < k ? "on" : "") + '"></i>';
  return '<div class="capsules hm-caps" aria-hidden="true">' + h + "</div>";
}

function setHtml(id, html) { const el = $(id); if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; } }

function renderHomeTab() {
  if (!$("tab-home") || !name) return;
  const ev = today && today.event, ci = today && today.checkin, st = ev ? liveStatus(ev).status : "none";
  const mine = typeof taskState !== "undefined" ? taskState.mine : null;
  const host = ev ? ev.host : "";
  const done = !!lastReceipt || (ci && ci.left_at);

  $("home-hi").textContent = t("hi", { name });
  $("home-line").textContent = !ev ? t("hmLineNone") : done || st === "over" ? t("hmLineOver") : !ci ? t("hmLineArrive", { place: ev.place }) : mine ? t("hmLineTask") : t("hmLineIn");

  const hb = $("home-handled");
  hb.textContent = handledAt ? t("handledBanner") + " " + fmtTime(handledAt) : "";
  hb.classList.toggle("hidden", !handledAt);

  // the one card that always says what to do next
  let top = '<div class="hn-top"><span class="tc-lbl">' + esc(t("hmNext")) + "</span>" +
    (ci && !ci.left_at ? '<span class="pill ink hn-clock">' + esc(t("onShift", { d: dur(Date.now() - Date.parse(ci.at)) })) + "</span>" : "") + "</div>";
  let body = "", acts = "";
  if (!ev) body = t("noEvent");
  else if (done || (!ci && st === "over")) {
    body = t("hmOver");
    acts = '<button class="primary-btn hn-go" data-go="talk"><i data-lucide="mic"></i>' + esc(t("hmTalk")) + "</button>";
  } else if (!ci) {
    body = t("hmArrive", { host, where: ev.host_where });
    acts = '<button id="hn-here" class="primary-btn hn-big">' + esc(t("imHere")) + "</button>";
    if (today.first_time) acts += '<p class="hn-sub">' + esc(t("firstTime", { host })) + "</p>";
  } else if (mine) {
    body = t("hmOn", { task: taskLabel(mine) });
    acts = (freeMsg ? '<p class="hn-sub">' + esc(freeMsg) + "</p>" : "") + peopleHtml(mine) +
      '<div class="hn-row"><button id="hn-another" class="primary-btn">' + esc(t("giveAnother")) + '</button><button class="small-btn hn-go" data-go="talk">' + esc(t("hmDoneDay")) + "</button></div>";
  } else {
    body = t("hmFree");
    acts = '<div class="hn-row"><button id="hn-free" class="primary-btn hn-big">' + esc(t("imFree")) + '</button><button class="small-btn hn-go" data-go="talk">' + esc(t("hmDoneDay")) + "</button></div>";
  }
  setHtml("home-next", top + '<p class="hn-text">' + esc(body) + "</p>" + acts);

  // tiles: host, goal, hours, everyone today
  let tiles = "";
  if (ev) {
    tiles += '<div class="card hm-tile hm-host"><span class="tc-lbl">' + HOST + " " + esc(t("hmHost")) + '</span><div class="hm-big">' + esc(host) + '</div><div class="hm-sub">' + esc(t("hmAt", { where: ev.host_where })) + '</div><button class="small-btn hm-msg" data-go="host"><i data-lucide="message-circle"></i>' + esc(t("hmMsg")) + "</button></div>";
    if (ev.goal_target) {
      const unit = lang === "es" ? (UNIT_ES[ev.goal_unit] || ev.goal_unit) : ev.goal_unit;
      tiles += '<div class="card hm-tile"><span class="tc-lbl">' + esc(t("hmGoal")) + '</span><div class="hm-big">' + esc(ev.goal_done) + '<span class="hm-of"> / ' + esc(ev.goal_target) + " " + esc(unit) + "</span></div>" + capsuleRow(ev.goal_done, ev.goal_target) + '<div class="hm-sub">' + esc(ev.goal) + "</div></div>";
    }
  }
  const total = (stats.approved_hours || 0) + (stats.waiting_hours || 0), gh = goal && goal.hours;
  tiles += '<div class="card hm-tile hm-hours"><span class="tc-lbl">' + esc(t("hmHours")) + '</span><div class="hm-big">' + esc(num(total)) + '<span class="hm-of"> ' + esc(gh ? "/ " + gh + " " + t("hrs") : t("hrs")) + "</span></div>" + (gh ? capsuleRow(total, gh) : "") +
    '<div class="hm-sub">' + esc(total === 0 ? t("first") : gh ? (total >= gh ? "✓ " + goal.label : t("toGo", { n: num(gh - total), label: goal.label })) : t("withUs", { n: num(total) })) + "</div></div>";
  const team = (typeof chat !== "undefined" ? chat.threads : []).find(x => x.kind === "team"), l = team && team.last;
  tiles += '<button class="card hm-tile hm-wide hm-team" data-go="team"><span class="tc-lbl">' + SUN + " " + esc(t("hmEveryone")) + (l ? '<span class="hm-time">' + esc(fmtTime(l.created_at)) + "</span>" : "") + "</span>" +
    '<div class="hm-msgline">' + esc(l ? l.sender_name + ": " + l.body : ci ? t("hmQuiet", { host: host || "staff" }) : t("hmJoin")) + "</div></button>";
  setHtml("home-tiles", tiles);

  // shortcuts, like the reference's right-hand link cards
  const open = typeof taskState !== "undefined" ? taskState.tasks.filter(x => !x.done && x.spots > 0).length : 0;
  const link = (go, ic, a, b) => '<button class="hm-link" data-go="' + go + '"><span class="tile"><i data-lucide="' + ic + '"></i></span><span class="hm-link-t"><strong>' + esc(a) + "</strong><span>" + esc(b) + '</span></span><i data-lucide="arrow-up-right" class="hm-arrow"></i></button>';
  setHtml("home-links", link("ask", "circle-help", t("hmAsk"), t("hmAskSub")) + link("tasks", "list-checks", t("hmTasks"), open ? t("hmTasksSub", { n: open }) : t("hmTasksNone")) +
    link("report", "flag", t("hmReport"), t("hmReportSub")) + link("letter", "file-check", t("hmLetter"), t("hmLetterSub")));
  icons();
}

async function hereNow() {
  try {
    const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (r.ok) { today = await r.json(); cardOpen = false; renderToday(); renderTab(); if (typeof loadTasks === "function") loadTasks(); }
  } catch {}
}

document.addEventListener("click", async e => {
  if (!e.target.closest) return;
  if (e.target.closest("#hn-here")) { hereNow(); return; }
  if (e.target.closest("#hn-free")) { await imFree(); return; }
  if (e.target.closest("#hn-another")) {
    const r = await fetch("/api/tasks/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, next: true }) });
    if (r.ok) taskState = await r.json();
    freeMsg = ""; renderTasks(); renderHomeTab(); return;
  }
  const g = e.target.closest("#tab-home [data-go]"); if (!g) return;
  const go = g.dataset.go;
  if (go === "talk") { window.forceCapture = true; setTab("shift"); }
  else if (go === "host") { if (today && today.checkin) openDmWith("__host"); else setTab("chat"); }
  else if (go === "team") { const th = chat.threads.find(x => x.kind === "team"); chat.open = th ? th.id : null; setTab("chat"); }
  else if (go === "letter") window.open("/letter?name=" + encodeURIComponent(name) + "&lang=" + lang, "_blank", "noopener");
  else setTab(go);
});

renderTaskNow = function () { const el = $("task-now"); if (el) el.remove(); if (tab === "home") renderHomeTab(); };
RENDER.home = renderHomeTab;
document.addEventListener("tally-today", () => { if (tab === "home") renderHomeTab(); });
document.addEventListener("DOMContentLoaded", () => {
  setInterval(() => { if (!document.hidden && tab === "home") { if (today && today.checkin) pollChat(false); renderHomeTab(); } }, 20000);
});
const _updateDotH = updateDot;
updateDot = function () { _updateDotH(); if (tab === "home") renderHomeTab(); };
const _renderHomeStats = renderHome;
renderHome = function (a) { _renderHomeStats(a); if (tab === "home") renderHomeTab(); };
const _renderBannerH = renderBanner;
renderBanner = function () { _renderBannerH(); if (tab === "home" && $("home-handled")) renderHomeTab(); };
