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
      <div class="concern-quote">"${escapeHtml(c.quote)}"</div>
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
    container.innerHTML = `<div class="no-concerns">No hours yet this week</div>`;
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
    container.innerHTML = `<div class="no-concerns">No updates yet</div>`;
    return;
  }

  container.innerHTML = log.map(entry => {
    const statusClass = entry.counted ? "counted" : "not-counted";
    const statusText = entry.counted ? t("counted") : t("notCounted");
    return `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-name">${escapeHtml(entry.volunteer_name)}</span>
          <span class="log-status ${statusClass}">${statusText}</span>
        </div>
        <div class="log-detail">
          ${entry.hours}h · ${escapeHtml(entry.site)} · ${formatDate(entry.date)}
        </div>
        ${entry.duplicate_reason ? `<div class="log-reason">${escapeHtml(entry.duplicate_reason)}</div>` : ""}
      </div>
    `;
  }).join("");
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
});
