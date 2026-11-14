// Tally staff page
const T = {
  en: {
    volunteer: "Volunteer", who: "Your name", hoursWeek: "Hours this week", worth: "Worth to funders", volunteers: "Volunteers",
    waitingHrs: "+ {n} hours waiting for your OK", rate: "Florida value of a volunteer hour, Independent Sector 2026", mathLine: "{h} approved hours × {r} ({src})", hrsSplit: "{a} approved + {w} waiting for your OK",
    attention: "Needs attention", nothing: "Nothing flagged this week.", handle: "Mark handled", handledN: "Handled ({n})",
    handledBy: "handled by {who}", waitingOk: "Waiting for your OK", approveAll: "Approve all", approve: "Approve", fix: "Fix", save: "Save",
    hoursLabel: "Hours", needsHours: "Needs hours", nothingWaiting: "Nothing waiting. All caught up.",
    dupsN: "{n} retellings caught and not counted", quiet: "Haven't heard from in 3+ weeks", last: "last shift {d}", total: "{n} hours",
    byVolunteer: "By volunteer", bySite: "By site (this week vs last week)", report: "Download report ({n} approved hours)", approveFirst: "Approve hours first", demo: "demo",
    siteNotSaid: "Site not said", nameNotGiven: "Name not given", thisWeek: "This week", lastWeek: "Last week", approvedCol: "Approved", waitingCol: "Waiting", site: "Site",
    failed: "That did not save. Check your connection and try again.", approvedMsg: "Approved.", handledMsg: "Marked handled.", fixedMsg: "Hours fixed and approved.",
    sampleOk: "Sample week loaded.", sampleNo: "Sample data only loads into an empty database.", reasonAt: "Already counted at {t}", reasonNoTime: "Already counted",
    reported: "reported {a}, approved {b}", floorTitle: "Today's floor", floorHint: "Tasks, one per line", floorNotes: "Notes: bathroom, where bags go, who is in charge", takenBy: "taken by {n}, {t}", spots: "{n} saving a spot for next time", floorSaved: "Floor saved.", firstShift: "First shift", proof: "Proof", needName: "Type your name at the top first.", recent: "Recently approved", tagToday: "Today", tagFyi: "FYI", tagDanger: "Danger now", translation: "Translation:", language: "Language",
    clearDemo: "Clear demo data", demoCleared: "Demo data cleared.", navHome: "Tally home", navVol: "Volunteer screen", navConcerns: "Concerns", navReport: "Grant report", navUpdates: "Waiting for OK", pillVols: "Volunteers today", pillHours: "Hours today",
    hVol: "volunteer", hHour: "hour this week", hWait: "({n} waiting)", hVols: "volunteers", hAnd: "and", hHours: "hours this week", tabAll: "All", tabNeeds: "Needs you today", tabWaiting: "Waiting for approval", tabApproved: "Approved", tabSites: "Sites",
    reviewNow: "Review now", chartTitle: "Hours this week", noShifts: "No shifts yet", volScreen: "Volunteer screen", sampleWeek: "Sample week",
    needsToday: "Needs you today", nothingUrgent: "Nothing urgent", updatesEmpty: "Updates show up here as volunteers talk.", hrsUnit: "{n} hrs", reportBtn: "Download grant report", noApproved: "Nothing approved yet.",
  },
  es: {
    volunteer: "Voluntario", who: "Tu nombre", hoursWeek: "Horas esta semana", worth: "Valor para financiadores", volunteers: "Voluntarios",
    waitingHrs: "+ {n} horas esperando tu OK", mathLine: "{h} horas aprobadas × {r} ({src})", hrsSplit: "{a} aprobadas + {w} esperando tu OK", rate: "Valor en Florida de una hora de voluntariado, Independent Sector 2026",
    attention: "Requiere atención", nothing: "Nada señalado esta semana.", handle: "Marcar atendido", handledN: "Atendidos ({n})",
    handledBy: "atendido por {who}", waitingOk: "Esperando tu OK", approveAll: "Aprobar todo", approve: "Aprobar", fix: "Corregir", save: "Guardar",
    hoursLabel: "Horas", needsHours: "Faltan horas", nothingWaiting: "Nada pendiente. Todo al día.",
    dupsN: "{n} repeticiones detectadas y no contadas", quiet: "Sin noticias en 3+ semanas", last: "último turno {d}", total: "{n} horas",
    byVolunteer: "Por voluntario", bySite: "Por sitio (esta semana vs la anterior)", report: "Descargar informe ({n} horas aprobadas)", approveFirst: "Aprueba horas primero", demo: "demo",
    siteNotSaid: "Sitio no indicado", nameNotGiven: "Nombre no indicado", thisWeek: "Esta semana", lastWeek: "Semana anterior", approvedCol: "Aprobadas", waitingCol: "Pendientes", site: "Sitio",
    failed: "No se guardó. Revisa tu conexión e inténtalo de nuevo.", approvedMsg: "Aprobado.", handledMsg: "Marcado como atendido.", fixedMsg: "Horas corregidas y aprobadas.",
    sampleOk: "Semana de muestra cargada.", sampleNo: "Los datos de muestra solo se cargan en una base vacía.", reasonAt: "Ya contado a las {t}", reasonNoTime: "Ya contado",
    reported: "reportó {a}, aprobó {b}", floorTitle: "El piso de hoy", floorHint: "Tareas, una por línea", floorNotes: "Notas: baño, dónde van las bolsas, quién está a cargo", takenBy: "tomada por {n}, {t}", spots: "{n} guardando lugar para la próxima", floorSaved: "Piso guardado.", firstShift: "Primer turno", proof: "Prueba", needName: "Escribe tu nombre arriba primero.", recent: "Aprobados recientemente", tagToday: "Hoy", tagFyi: "FYI", tagDanger: "Peligro ahora", translation: "Traducción:", language: "Idioma",
    clearDemo: "Borrar datos de ejemplo", demoCleared: "Datos de ejemplo borrados.", navHome: "Inicio", navVol: "Pantalla de voluntarios", navConcerns: "Inquietudes", navReport: "Informe para fondos", navUpdates: "Esperando OK", pillVols: "Voluntarios hoy", pillHours: "Horas hoy",
    hVol: "voluntario", hHour: "hora hoy", hWait: "({n} pendientes)", hVols: "voluntarios", hAnd: "y", hHours: "horas hoy", tabAll: "Todo", tabNeeds: "Te necesitan hoy", tabWaiting: "Esperando aprobación", tabApproved: "Aprobado", tabSites: "Sitios",
    reviewNow: "Revisar ahora", chartTitle: "Horas esta semana", noShifts: "Aún no hay turnos", volScreen: "Pantalla de voluntarios", sampleWeek: "Semana de muestra",
    needsToday: "Te necesitan hoy", nothingUrgent: "Nada urgente", updatesEmpty: "Las novedades aparecen aquí cuando los voluntarios hablan.", hrsUnit: "{n} hrs", reportBtn: "Descargar informe para financiadores", noApproved: "Nada aprobado todavía.",
  },
};
const TZ = "America/New_York";
let lang = localStorage.getItem("tally-lang") || "en";
let data = null;
const $ = id => document.getElementById(id);
const t = (k, v = {}) => { let s = T[lang][k] ?? T.en[k] ?? k; for (const [a, b] of Object.entries(v)) s = s.replace("{" + a + "}", b); return s; };
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = n => (Math.round(n * 10) / 10).toString();
const loc = () => (lang === "es" ? "es-US" : "en-US");
const safe = (v, f) => { const x = new Date(v); return v && !isNaN(x) ? f(x) : ""; };
const fmtDT = iso => safe(iso, x => x.toLocaleString(loc(), { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: TZ }));
const fmtTime = iso => safe(iso, x => x.toLocaleTimeString(loc(), { hour: "numeric", minute: "2-digit", timeZone: TZ }));
const fmtDate = d => safe(d && d + "T12:00:00Z", x => x.toLocaleDateString(loc(), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }));
const nm = n => n ? esc(n) : '<span class="grey">' + esc(t("nameNotGiven")) + "</span>";
const fs = u => u.first_shift ? ' <span class="tag-lv tag-first">' + esc(t("firstShift")) + "</span>" : "";
const st = s => s ? esc(s) : '<span class="grey">' + esc(t("siteNotSaid")) + "</span>";
const who = () => $("who").value.trim();

function say(m) { $("status").textContent = m; $("status").classList.toggle("hidden", !m); }

async function api(path, body) {
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    if (r.status === 401) { location.reload(); return null; }
    return r;
  } catch { return null; }
}

const NAV = { "#top": "navHome", "/": "navVol", "#sec-needs": "navConcerns", "/api/report.csv": "navReport", "#sec-updates": "navUpdates" };
function labelNav() {
  document.querySelectorAll(".rail .nav-item, .bottom-bar .nav-item").forEach(a => {
    const k = NAV[a.getAttribute("href")] || (a.id === "lang-toggle" ? "language" : "");
    if (!k) return;
    const s = t(k);
    a.setAttribute("aria-label", s); a.setAttribute("data-tip", s);
    if (a.closest(".bottom-bar")) { let l = a.querySelector(".lbl"); if (!l) { l = document.createElement("span"); l.className = "lbl"; a.appendChild(l); } l.textContent = s; }
  });
  const pills = document.querySelectorAll(".head-row .inline-pill");
  if (pills[0]) { pills[0].title = t("pillVols"); pills[0].setAttribute("aria-label", t("pillVols")); }
  if (pills[1]) { pills[1].title = t("pillHours"); pills[1].setAttribute("aria-label", t("pillHours")); }
}
function applyLanguage() {
  document.documentElement.lang = lang;
  labelNav();
  document.querySelectorAll("[data-key]").forEach(el => { if (el.id === "report-btn") return; el.textContent = t(el.getAttribute("data-key")); });
  for (const id of ["lang-toggle", "lang-toggle-m"]) { $(id).textContent = lang.toUpperCase(); $(id).setAttribute("aria-label", t("language")); }
  if (data) render(); else icons();
}
function icons() { try { if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.75 } }); } catch {} }
const initials = n => (n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
function countTo(el, to, fmt) {
  const from = Number(el.dataset.v || 0); el.dataset.v = to;
  if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(to); return; }
  const start = performance.now();
  const step = now => { const p = Math.min(1, (now - start) / 700); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function renderChart(d) {
  const days = d.days || [], max = Math.max(0, ...days.map(x => x.total));
  const empty = max === 0;
  show("chart-empty", empty); show("chart", !empty);
  if (empty) { $("chart").innerHTML = ""; return; }
  const H = 180;
  $("chart").innerHTML = '<div class="grid-lines">' + [0, 1, 2, 3].map(() => "<i></i>").join("") + '</div><div class="bars">' + days.map((x, i) => {
    const isToday = x.date === d.today, h = x.total ? Math.max(24, Math.round(x.total / max * H)) : H, wh = x.total ? Math.round(x.waiting / x.total * h) : 0;
    const lbl = new Date(x.date + "T12:00:00Z").toLocaleDateString(loc(), { weekday: "short", day: "numeric", timeZone: "UTC" });
    return '<div class="bar-col' + (isToday ? " today" : "") + '"><div class="bar-area">' + (x.total
      ? '<div class="bar" style="height:' + h + 'px;animation-delay:' + i * 40 + 'ms"><span class="dotw"></span>' + (wh ? '<div class="bar-wait" style="height:' + wh + 'px"><span class="dotw"></span></div>' : "") + (isToday ? '<span class="tip ink">' + esc(t("hrsUnit", { n: num(x.total) })) + "</span>" + (x.waiting ? '<span class="tip lime">' + num(x.waiting) + "</span>" : "") : "") + "</div>"
      : '<div class="bar empty" style="height:' + H + 'px"><span class="dotw grey-dot"></span></div>') + '</div><div class="bar-lbl">' + esc(lbl) + "</div></div>";
  }).join("") + "</div>";
}

function setInitials() { const n = who(), i = n ? initials(n) : "", el = $("who-initials"); el.textContent = i === "?" ? "" : i; el.classList.toggle("hidden", !el.textContent); }
async function load() {
  try {
    const r = await fetch("/api/staff");
    if (r.status === 401) { location.reload(); return; }
    data = await r.json();
  } catch { say(t("failed")); return; }
  render();
}

function table(head, rows) {
  return '<table><thead><tr>' + head.map(h => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
}

function concernCard(c, done) {
  const lv = c.level || "today", tagK = lv === "danger_now" ? "tagDanger" : lv === "fyi" ? "tagFyi" : "tagToday", tagC = lv === "danger_now" ? "danger" : lv;
  return '<article class="concern card lv-' + tagC + '"><div class="c-head"><span class="tile"><i data-lucide="triangle-alert"></i></span><span class="tag-lv tag-' + tagC + '">' + esc(t(tagK)) + "</span> <strong>" + nm(c.name) + "</strong>" + fs(c) + " · " + st(c.site) + " · " + esc(fmtDT(c.created_at)) + ' <span class="tag">' + esc(c.language) + '</span></div><blockquote lang="' + (c.language === "es" ? "es" : "en") + '">“' + esc(c.quote) + "”</blockquote>" + (c.quote_en ? '<div class="quote-en">' + esc(t("translation")) + " " + esc(c.quote_en) + "</div>" : "") +
    (done ? '<div class="grey">' + esc(t("handledBy", { who: c.handled_by || "staff" })) + " · " + esc(fmtDT(c.handled_at)) + "</div>" : '<button class="primary-btn handle-btn" data-id="' + c.id + '">' + esc(t("handle")) + "</button>") + "</article>";
}

let seenIds = null, knownRows = null;
function chime(open) {
  const ids = new Set(open.filter(c => c.level !== "fyi").map(c => c.id));
  if (seenIds && [...ids].some(i => !seenIds.has(i))) {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
      o.type = "sine"; o.frequency.value = 660; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.15, a.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
      o.start(); o.stop(a.currentTime + 0.85);
    } catch {}
  }
  seenIds = ids;
}

let floorLoaded = false;
function renderFloor(f) {
  if (!floorLoaded) {
    floorLoaded = true;
    $("floor-tasks").value = f.open.concat(f.taken.map(x => x.text)).join("\n");
    $("floor-notes").value = f.notes;
  }
  $("floor-tasks").placeholder = t("floorHint");
  $("floor-notes").placeholder = t("floorNotes");
  $("floor-info").innerHTML = f.taken.map(x => esc(x.text) + " — " + esc(t("takenBy", { n: x.taken_by, t: fmtTime(x.taken_at) }))).join("<br>") + (f.spots ? (f.taken.length ? "<br>" : "") + esc(t("spots", { n: f.spots })) : "");
}

function render() {
  const d = data;
  renderFloor(d.floor);
  const hoursToday = d.today_hours || 0, volsToday = d.today_volunteers || 0;
  countTo($("h-vols"), volsToday, v => String(Math.round(v)));
  countTo($("h-hours"), hoursToday, v => num(v));
  $("h-vols-word").textContent = t(volsToday === 1 ? "hVol" : "hVols");
  $("h-hours-word").textContent = t(hoursToday === 1 ? "hHour" : "hHours");
  $("h-wait").textContent = d.today_waiting ? " " + t("hWait", { n: num(d.today_waiting) }) : "";
  const urgent = d.open_concerns.filter(c => c.level !== "fyi").length;
  const prevUrgent = Number($("needs-num").dataset.v || 0);
  $("needs-num").dataset.v = urgent; $("needs-num").textContent = urgent;
  if (urgent > prevUrgent && prevUrgent >= 0 && seenIds) { $("needs-num").style.animation = "none"; void $("needs-num").offsetWidth; $("needs-num").style.animation = "bump .4s"; }
  $("needs-text").textContent = urgent ? t("needsToday") : t("nothingUrgent");
  show("needs-btn", urgent > 0); show("needs-dot", urgent > 0);
  const tot = d.approved_hours + d.waiting_hours, on = tot ? Math.round(d.approved_hours / tot * 10) : 0, upto = tot ? 10 : 0;
  const km = $("kpi-meter"); if (!km.children.length) for (let i = 0; i < 10; i++) km.appendChild(document.createElement("i"));
  [...km.children].forEach((c, i) => { c.className = i < on ? "on" : i < upto ? "wait" : ""; });
  renderChart(d);
  $("report-label").textContent = t("reportBtn");
  $("stat-hours").textContent = num(d.today_hours);
  $("stat-waiting").textContent = d.waiting_hours ? t("hrsSplit", { a: num(d.approved_hours), w: num(d.waiting_hours) }) : "";
  $("stat-dollars").textContent = d.dollars.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  $("stat-rate").textContent = t("mathLine", { h: num(d.approved_hours), r: "$" + d.rate.toFixed(2), src: t("rate") });
  $("stat-vols").textContent = d.today_volunteers;

  chime(d.open_concerns);
  $("concerns").innerHTML = d.open_concerns.length ? d.open_concerns.map(c => concernCard(c, false)).join("") : '<div class="card all-clear"><span class="tile"><i data-lucide="check"></i></span><div><strong>' + esc(t("nothing")) + "</strong></div></div>";
  show("handled-wrap", d.handled_concerns.length > 0);
  $("handled-sum").textContent = t("handledN", { n: d.handled_concerns.length });
  $("handled").innerHTML = d.handled_concerns.map(c => concernCard(c, true)).join("");

  const knownBefore = knownRows;
  show("approve-all", d.waiting.some(w => !w.needs_hours));
  $("waiting").innerHTML = d.waiting.length ? d.waiting.map(w =>
    '<div class="wrow' + (knownRows && !knownRows.has(w.id) ? " fresh" : "") + '" data-id="' + w.id + '"><span class="av">' + esc(initials(w.name)) + '</span><div class="w-main"><div class="w-who"><strong>' + nm(w.name) + "</strong>" + fs(w) + " · " + st(w.site) + " · " + esc(fmtDate(w.date)) + '</div><div class="grey w-line">' + esc(w.line) + "</div></div>" +
    (w.needs_hours
      ? '<div class="w-act"><input class="hrs-input" type="number" min="0.5" max="24" step="0.5" inputmode="decimal" aria-label="' + esc(t("hoursLabel")) + '" placeholder="' + esc(t("needsHours")) + '"><button class="small-btn fix-save" data-id="' + w.id + '" data-needs="1">' + esc(t("save")) + "</button></div>"
      : '<div class="w-num">' + num(w.hours) + '</div><div class="w-act"><button class="primary-btn approve-btn" data-id="' + w.id + '">' + esc(t("approve")) + '</button><button class="pencil fix-btn" data-id="' + w.id + '" data-h="' + w.hours + '" aria-label="' + esc(t("fix")) + '" title="' + esc(t("fix")) + '">✎</button></div>') + "</div>").join("")
    : '<p class="grey">' + esc(d.approved_recent.length || d.duplicates.length ? t("nothingWaiting") : t("updatesEmpty")) + "</p>";
  knownRows = new Set(d.waiting.map(w => w.id));
  $("recent-empty").textContent = d.approved_recent.length ? "" : t("noApproved");
  show("recent-wrap", d.approved_recent.length > 0);
  $("recent").innerHTML = d.approved_recent.map(u => '<div class="dup"><strong>' + nm(u.name) + "</strong> · " + st(u.site) + " · " + esc(fmtDate(u.date)) + " · " + num(u.hours) + (u.proof_code ? ' · <a href="/proof/' + esc(u.proof_code) + '" target="_blank" rel="noopener">' + esc(t("proof")) + "</a>" : "") + "</div>").join("");
  show("dups-wrap", d.duplicates.length > 0);
  $("dups-sum").textContent = t("dupsN", { n: d.duplicates.length });
  $("dups").innerHTML = d.duplicates.map(u => '<div class="dup grey"><strong>' + nm(u.name) + "</strong> · " + st(u.site) + " · " + esc(fmtDate(u.date)) + " · " + (u.duplicate_at ? esc(t("reasonAt", { t: fmtTime(u.duplicate_at) })) : esc(t("reasonNoTime"))) + "</div>").join("");

  show("quiet-wrap", d.quiet.length > 0);
  $("quiet").innerHTML = d.quiet.map(q => '<div class="dup"><strong>' + nm(q.name) + "</strong> · " + esc(t("last", { d: fmtDate(q.last) })) + " · " + esc(t("total", { n: num(q.approved + q.waiting) })) + "</div>").join("");

  $("by-volunteer").innerHTML = table([t("volunteers"), t("approvedCol"), t("waitingCol")], d.by_volunteer.map(v => [nm(v.name), num(v.approved), num(v.waiting)]));
  $("by-site").innerHTML = table([t("site"), t("thisWeek"), t("lastWeek")], d.by_site.map(s => [st(s.site), num(s.this_week), num(s.last_week)]));
  show("demo-clear-wrap", !!d.has_demo);
  show("sample-btn", d.db_empty); show("demo-tile", d.db_empty);
  const rb = $("report-btn"), rh = d.report_hours || 0;
  rb.textContent = rh > 0 ? t("report", { n: num(rh) }) : t("approveFirst");
  rb.classList.toggle("disabled", rh <= 0);
  setInitials();
  icons();
  rb.setAttribute("aria-disabled", String(rh <= 0));
  if (rh <= 0) rb.removeAttribute("href"); else rb.setAttribute("href", "/api/report.csv");
}
function show(id, on) { $(id).classList.toggle("hidden", !on); }

async function act(path, body, okMsg) {
  const r = await api(path, body);
  if (!r || !r.ok) { say(t("failed")); return false; }
  say(okMsg); await load(); return true;
}

document.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (["handle-btn", "approve-btn", "fix-save"].some(c => b.classList.contains(c)) || b.id === "approve-all") {
    if (!who()) { say(t("needName")); $("who").focus(); return; }
  }
  const id = Number(b.dataset.id);
  if (b.id === "clear-demo") { const r = await api("/api/demo/clear"); say(r && r.ok ? t("demoCleared") : t("failed")); await load(); return; }
  if (b.classList.contains("handle-btn")) act("/api/concerns/mark-handled", { id, who: who() }, t("handledMsg"));
  else if (b.classList.contains("approve-btn")) act("/api/approve", { id, who: who() }, t("approvedMsg"));
  else if (b.id === "approve-all") {
    for (const w of data.waiting.filter(w => !w.needs_hours)) await api("/api/approve", { id: w.id, who: who() });
    say(t("approvedMsg")); load();
  } else if (b.classList.contains("fix-btn")) {
    const row = b.closest(".wrow");
    row.querySelector(".w-num").outerHTML = '<input class="hrs-input" type="number" min="0.5" max="24" step="0.5" inputmode="decimal" value="' + b.dataset.h + '" aria-label="' + esc(t("hoursLabel")) + '">';
    row.querySelector(".w-act").innerHTML = '<button class="primary-btn fix-save" data-id="' + id + '" data-reported="' + b.dataset.h + '">' + esc(t("save")) + "</button>";
    row.querySelector(".hrs-input").focus();
  } else if (b.classList.contains("fix-save")) {
    const v = Number(b.closest(".wrow").querySelector(".hrs-input").value);
    if (!(v > 0 && v <= 24)) { say(t("failed")); return; }
    const r = await api("/api/fix-hours", { id, hours: v, who: who() });
    if (!r || !r.ok) { say(t("failed")); return; }
    await api("/api/approve", { id, who: who() });
    say(b.dataset.reported ? t("reported", { a: b.dataset.reported, b: v }) : t("fixedMsg")); load();
  } else if (b.id === "sample-btn") {
    const r = await api("/api/sample");
    say(r && r.ok ? t("sampleOk") : t("sampleNo")); load();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  $("who").value = localStorage.getItem("tally-staff-name") || "";
  $("floor-save").addEventListener("click", async () => {
    const r = await api("/api/floor", { tasks: $("floor-tasks").value, notes: $("floor-notes").value });
    if (!r || !r.ok) { say(t("failed")); return; }
    floorLoaded = false; say(t("floorSaved")); load();
  });
  $("who").addEventListener("change", () => { localStorage.setItem("tally-staff-name", $("who").value.trim()); setInitials(); });
  for (const id of ["lang-toggle", "lang-toggle-m"]) $(id).addEventListener("click", () => { lang = lang === "en" ? "es" : "en"; localStorage.setItem("tally-lang", lang); applyLanguage(); });
  applyLanguage(); load(); setInterval(load, 4000);
});
