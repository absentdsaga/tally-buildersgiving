// Tally Staff Page

const translations = {
  en: {
    needsYouToday: "Needs you today",
    noConcerns: "No urgent concerns today. Great work!",
    hoursThisWeek: "Hours this week",
    byVolunteer: "By volunteer",
    allUpdates: "All updates",
    volunteer: "Volunteer",
    staff: "Staff",
    handled: "Handled",
    counted: "Counted",
    notCounted: "Not counted",
    duplicateOf: "Duplicate of",
    needsHours: "Needs hours",
    duplicate: "Duplicate",
    approve: "Approve",
    approved: "Approved",
    fixHours: "Fix hours",
    save: "Save",
    approvedHrs: "approved",
    waitingHrs: "waiting for review",
    dupsCaught: "duplicates caught",
    downloadReport: "Download grant report",
    loadSample: "Load sample week",
    demo: "demo",
    noHours: "No hours yet this week",
    noUpdates: "No updates yet",
    by: "by",
    fixedBy: "hours fixed by",
    whoAreYou: "Your name (for the record)",
  },
  es: {
    needsYouToday: "Te necesitan hoy",
    noConcerns: "No hay preocupaciones urgentes hoy. ¡Buen trabajo!",
    hoursThisWeek: "Horas esta semana",
    byVolunteer: "Por voluntario",
    allUpdates: "Todas las actualizaciones",
    volunteer: "Voluntario",
    staff: "Personal",
    handled: "Atendido",
    counted: "Contado",
    notCounted: "No contado",
    duplicateOf: "Duplicado de",
    needsHours: "Faltan horas",
    duplicate: "Duplicado",
    approve: "Aprobar",
    approved: "Aprobado",
    fixHours: "Corregir horas",
    save: "Guardar",
    approvedHrs: "aprobadas",
    waitingHrs: "esperando revisión",
    dupsCaught: "duplicados detectados",
    downloadReport: "Descargar informe de subvención",
    loadSample: "Cargar semana de ejemplo",
    demo: "demo",
    noHours: "Aún no hay horas esta semana",
    noUpdates: "Aún no hay actualizaciones",
    by: "por",
    fixedBy: "horas corregidas por",
    whoAreYou: "Tu nombre (para el registro)",
  },
};

let currentLang = localStorage.getItem("tally-lang") || "en";

function t(key, vars = {}) {
  let str = translations[currentLang][key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-key]").forEach(el => {
    const key = el.getAttribute("data-key");
    if (key) el.textContent = t(key);
  });
  document.getElementById("lang-toggle").textContent = currentLang.toUpperCase();
}

function toggleLanguage() {
  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem("tally-lang", currentLang);
  applyLanguage();
  loadData(); // reload to update text
}

async function loadData() {
  try {
    const res = await fetch("/api/staff");
    const data = await res.json();
    renderConcerns(data.concerns);
    renderHours(data.total_hours, data.volunteer_hours);
    renderLog(data.log);
    renderReview(data);
  } catch (err) {
    console.error("Failed to load staff data:", err);
  }
}

function renderConcerns(concerns) {
  const list = document.getElementById("concerns-list");
  const none = document.getElementById("no-concerns");

  if (concerns.length === 0) {
    list.innerHTML = "";
    none.classList.remove("hidden");
    return;
  }

  none.classList.add("hidden");
  list.innerHTML = concerns.map(c => `
    <div class="concern-card" data-id="${c.id}">
      <div class="concern-quote">"${escapeHtml(c.quote)}" <span class="lang-tag">${(c.language || "en").toUpperCase()}</span></div>
      <div class="concern-meta">
        ${escapeHtml(c.volunteer_name)} · ${escapeHtml(c.site)} · ${formatTime(c.created_at)}
      </div>
      <button class="handled-btn" onclick="markHandled(${c.id})">${t("handled")}</button>
    </div>
  `).join("");
}

function renderHours(total, byVolunteer) {
  document.getElementById("total-hours").textContent = total.toFixed(1);

  const container = document.getElementById("volunteer-hours");
  const entries = Object.entries(byVolunteer);
  if (entries.length === 0) {
    container.innerHTML = `<div class="no-concerns">${t("noHours")}</div>`;
    return;
  }

  container.innerHTML = entries.map(([name, hours]) => `
    <div class="volunteer-hours-row">
      <span>${escapeHtml(name)}</span>
      <span class="hours-val">${hours.toFixed(1)}h</span>
    </div>
  `).join("");
}

function renderLog(log) {
  const container = document.getElementById("updates-log");
  if (log.length === 0) {
    container.innerHTML = `<div class="no-concerns">${t("noUpdates")}</div>`;
    return;
  }

  container.innerHTML = log.map(entry => {
    const needs = entry.status === "Needs hours";
    const dup = entry.status === "Duplicate";
    const statusClass = needs ? "needs-hours" : dup ? "duplicate" : "counted";
    const statusText = needs ? t("needsHours") : dup ? t("duplicate") : t("counted");
    const actions = dup ? "" : `
        <div class="staff-actions">
          ${entry.approved ? `<span class="log-status counted">✓ ${t("approved")} ${t("by")} ${escapeHtml(entry.approved_by || "staff")}</span>` : (needs ? "" : `<button class="approve-btn" onclick="approveEntry(${entry.id})">${t("approve")}</button>`)}
          <input type="number" min="0.25" max="24" step="0.25" id="fix-${entry.id}" value="${entry.hours || ""}" aria-label="${t("fixHours")}">
          <button onclick="fixEntry(${entry.id})">${t("fixHours")}</button>
        </div>`;
    return `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-name">${escapeHtml(entry.volunteer_name)}</span>
          <span class="log-status ${statusClass}">${statusText}</span>
        </div>
        <div class="log-detail">
          ${entry.hours}h · ${escapeHtml(entry.site)} · ${formatDate(entry.date)}
        </div>
        ${entry.fixed_by ? `<div class="log-reason">${t("fixedBy")} ${escapeHtml(entry.fixed_by)}</div>` : ""}
        ${entry.duplicate_reason ? `<div class="log-reason">${escapeHtml(entry.duplicate_reason)}</div>` : ""}
        ${actions}
      </div>
    `;
  }).join("");
}

function staffName() {
  let n = localStorage.getItem("tally-staff-name");
  if (!n) {
    n = (prompt(t("whoAreYou")) || "staff").trim() || "staff";
    localStorage.setItem("tally-staff-name", n);
  }
  return n;
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

async function approveEntry(id) {
  await postJson("/api/approve", { id, who: staffName() });
  loadData();
}

async function fixEntry(id) {
  const hours = Number(document.getElementById("fix-" + id).value);
  if (!(hours > 0 && hours <= 24)) return;
  await postJson("/api/fix-hours", { id, hours, who: staffName() });
  loadData();
}

function renderReview(data) {
  document.getElementById("review-bar").innerHTML =
    `<span class="approved">${data.approved_hours.toFixed(1)}h ${t("approvedHrs")}</span>` +
    `<span class="waiting">${data.waiting_hours.toFixed(1)}h ${t("waitingHrs")}</span>` +
    `<span>${data.duplicates_caught} ${t("dupsCaught")}</span>`;
  const sample = document.getElementById("sample-btn");
  sample.classList.toggle("hidden", !data.db_empty);
}

async function loadSample() {
  await postJson("/api/sample", {});
  loadData();
}

async function markHandled(id) {
  try {
    await fetch("/api/concerns/mark-handled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadData();
  } catch (err) {
    console.error("Failed to mark handled:", err);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(currentLang === "es" ? "es-US" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(currentLang === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

// Poll every 10 seconds
setInterval(loadData, 10000);

// Init
document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
  loadData();
  document.getElementById("lang-toggle").addEventListener("click", toggleLanguage);
  document.getElementById("sample-btn").addEventListener("click", loadSample);
  document.getElementById("demo-link").addEventListener("click", async () => { if (!(await postJson("/api/sample", {}))) alert("Database is not empty"); loadData(); });
});
