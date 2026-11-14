// Tally staff page
const T = {
  en: {
    volunteer: "Volunteer", who: "Your name", hoursWeek: "Hours this week", worth: "Worth to funders", volunteers: "Volunteers",
    waitingHrs: "+ {n} hours waiting for your OK", rate: "Florida value of a volunteer hour, Independent Sector 2026",
    attention: "Needs attention", nothing: "Nothing flagged this week.", handle: "Mark handled", handledN: "Handled ({n})",
    handledBy: "handled by {who}", waitingOk: "Waiting for your OK", approveAll: "Approve all", approve: "Approve", fix: "Fix", save: "Save",
    hoursLabel: "Hours", needsHours: "Needs hours", nothingWaiting: "Nothing waiting. All caught up.",
    dupsN: "{n} retellings caught and not counted", quiet: "Haven't heard from in 3+ weeks", last: "last shift {d}", total: "{n} hours",
    byVolunteer: "By volunteer", bySite: "By site (this week vs last week)", report: "Download report ({n} approved hours)", approveFirst: "Approve hours first", demo: "demo",
    siteNotSaid: "Site not said", nameNotGiven: "Name not given", thisWeek: "This week", lastWeek: "Last week", approvedCol: "Approved", waitingCol: "Waiting", site: "Site",
    failed: "That did not save. Check your connection and try again.", approvedMsg: "Approved.", handledMsg: "Marked handled.", fixedMsg: "Hours fixed and approved.",
    sampleOk: "Sample week loaded.", sampleNo: "Sample data only loads into an empty database.", reasonAt: "Already counted at {t}", reasonNoTime: "Already counted",
    reported: "reported {a}, approved {b}", language: "Language",
  },
  es: {
    volunteer: "Voluntario", who: "Tu nombre", hoursWeek: "Horas esta semana", worth: "Valor para financiadores", volunteers: "Voluntarios",
    waitingHrs: "+ {n} horas esperando tu OK", rate: "Valor en Florida de una hora de voluntariado, Independent Sector 2026",
    attention: "Requiere atención", nothing: "Nada señalado esta semana.", handle: "Marcar atendido", handledN: "Atendidos ({n})",
    handledBy: "atendido por {who}", waitingOk: "Esperando tu OK", approveAll: "Aprobar todo", approve: "Aprobar", fix: "Corregir", save: "Guardar",
    hoursLabel: "Horas", needsHours: "Faltan horas", nothingWaiting: "Nada pendiente. Todo al día.",
    dupsN: "{n} repeticiones detectadas y no contadas", quiet: "Sin noticias en 3+ semanas", last: "último turno {d}", total: "{n} horas",
    byVolunteer: "Por voluntario", bySite: "Por sitio (esta semana vs la anterior)", report: "Descargar informe ({n} horas aprobadas)", approveFirst: "Aprueba horas primero", demo: "demo",
    siteNotSaid: "Sitio no indicado", nameNotGiven: "Nombre no indicado", thisWeek: "Esta semana", lastWeek: "Semana anterior", approvedCol: "Aprobadas", waitingCol: "Pendientes", site: "Sitio",
    failed: "No se guardó. Revisa tu conexión e inténtalo de nuevo.", approvedMsg: "Aprobado.", handledMsg: "Marcado como atendido.", fixedMsg: "Horas corregidas y aprobadas.",
    sampleOk: "Semana de muestra cargada.", sampleNo: "Los datos de muestra solo se cargan en una base vacía.", reasonAt: "Ya contado a las {t}", reasonNoTime: "Ya contado",
    reported: "reportó {a}, aprobó {b}", language: "Idioma",
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
const fmtDT = iso => new Date(iso).toLocaleString(loc(), { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });
const fmtTime = iso => new Date(iso).toLocaleTimeString(loc(), { hour: "numeric", minute: "2-digit", timeZone: TZ });
const fmtDate = d => new Date(d + "T12:00:00Z").toLocaleDateString(loc(), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const nm = n => n ? esc(n) : '<span class="grey">' + esc(t("nameNotGiven")) + "</span>";
const st = s => s ? esc(s) : '<span class="grey">' + esc(t("siteNotSaid")) + "</span>";
const who = () => ($("who").value.trim() || "staff");

function say(m) { $("status").textContent = m; $("status").classList.toggle("hidden", !m); }

async function api(path, body) {
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    if (r.status === 401) { location.reload(); return null; }
    return r;
  } catch { return null; }
}

function applyLanguage() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-key]").forEach(el => { if (el.id === "report-btn") return; el.textContent = t(el.getAttribute("data-key")); });
  $("lang-toggle").textContent = lang.toUpperCase();
  if (data) render();
}

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
  return '<article class="concern"><div class="c-head"><strong>' + nm(c.name) + "</strong> · " + st(c.site) + " · " + esc(fmtDT(c.created_at)) + ' <span class="tag">' + esc(c.language) + '</span></div><blockquote lang="' + (c.language === "es" ? "es" : "en") + '">“' + esc(c.quote) + "”</blockquote>" +
    (done ? '<div class="grey">' + esc(t("handledBy", { who: c.handled_by || "staff" })) + " · " + esc(fmtDT(c.handled_at)) + "</div>" : '<button class="primary-btn handle-btn" data-id="' + c.id + '">' + esc(t("handle")) + "</button>") + "</article>";
}

function render() {
  const d = data;
  $("stat-hours").textContent = num(d.approved_hours);
  $("stat-waiting").textContent = d.waiting_hours ? t("waitingHrs", { n: num(d.waiting_hours) }) : "";
  $("stat-dollars").textContent = d.dollars.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  $("stat-rate").textContent = t("rate");
  $("stat-vols").textContent = d.volunteers;

  $("concerns").innerHTML = d.open_concerns.length ? d.open_concerns.map(c => concernCard(c, false)).join("") : '<p class="grey">' + esc(t("nothing")) + "</p>";
  show("handled-wrap", d.handled_concerns.length > 0);
  $("handled-sum").textContent = t("handledN", { n: d.handled_concerns.length });
  $("handled").innerHTML = d.handled_concerns.map(c => concernCard(c, true)).join("");

  show("approve-all", d.waiting.some(w => !w.needs_hours));
  $("waiting").innerHTML = d.waiting.length ? d.waiting.map(w =>
    '<div class="wrow" data-id="' + w.id + '"><div class="w-main"><div class="w-who"><strong>' + nm(w.name) + "</strong> · " + st(w.site) + " · " + esc(fmtDate(w.date)) + '</div><div class="grey w-line">' + esc(w.line) + "</div></div>" +
    (w.needs_hours
      ? '<div class="w-act"><input class="hrs-input" type="number" min="0.5" max="24" step="0.5" inputmode="decimal" aria-label="' + esc(t("hoursLabel")) + '" placeholder="' + esc(t("needsHours")) + '"><button class="small-btn fix-save" data-id="' + w.id + '" data-needs="1">' + esc(t("save")) + "</button></div>"
      : '<div class="w-num">' + num(w.hours) + '</div><div class="w-act"><button class="primary-btn approve-btn" data-id="' + w.id + '">' + esc(t("approve")) + '</button><button class="pencil fix-btn" data-id="' + w.id + '" data-h="' + w.hours + '" aria-label="' + esc(t("fix")) + '" title="' + esc(t("fix")) + '">✎</button></div>') + "</div>").join("")
    : '<p class="grey">' + esc(t("nothingWaiting")) + "</p>";

  show("dups-wrap", d.duplicates.length > 0);
  $("dups-sum").textContent = t("dupsN", { n: d.duplicates.length });
  $("dups").innerHTML = d.duplicates.map(u => '<div class="dup grey"><strong>' + nm(u.name) + "</strong> · " + st(u.site) + " · " + esc(fmtDate(u.date)) + " · " + (u.duplicate_at ? esc(t("reasonAt", { t: fmtTime(u.duplicate_at) })) : esc(t("reasonNoTime"))) + "</div>").join("");

  show("quiet-wrap", d.quiet.length > 0);
  $("quiet").innerHTML = d.quiet.map(q => '<div class="dup"><strong>' + nm(q.name) + "</strong> · " + esc(t("last", { d: fmtDate(q.last) })) + " · " + esc(t("total", { n: num(q.approved + q.waiting) })) + "</div>").join("");

  $("by-volunteer").innerHTML = table([t("volunteers"), t("approvedCol"), t("waitingCol")], d.by_volunteer.map(v => [nm(v.name), num(v.approved), num(v.waiting)]));
  $("by-site").innerHTML = table([t("site"), t("thisWeek"), t("lastWeek")], d.by_site.map(s => [st(s.site), num(s.this_week), num(s.last_week)]));
  show("sample-btn", d.db_empty);
  const rb = $("report-btn"), rh = d.report_hours || 0;
  rb.textContent = rh > 0 ? t("report", { n: num(rh) }) : t("approveFirst");
  rb.classList.toggle("disabled", rh <= 0);
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
  const id = Number(b.dataset.id);
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
  $("who").addEventListener("change", () => localStorage.setItem("tally-staff-name", $("who").value.trim()));
  $("lang-toggle").addEventListener("click", () => { lang = lang === "en" ? "es" : "en"; localStorage.setItem("tally-lang", lang); applyLanguage(); });
  applyLanguage(); load();
});
