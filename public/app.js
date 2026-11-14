// Tally volunteer page
const T = {
  en: {
    staff: "Staff", askName: "What's your first name?", continue: "Continue", askGoal: "Counting toward something?",
    goalSchool: "School or court hours (type the number)", goalNone: "Just count my hours",
    hi: "Hi, {name}.", ofHours: "of {goal} hours", hoursWord: "hours", first: "Your first shift starts the count.",
    toGo: "{n} to go for {label}", withUs: "{n} hours with us", tapTalk: "Tap and tell us about your shift", tapDone: "Tap when you're done",
    orType: "or type it", send: "Send", another: "Tell us about another shift", letter: "Get my hours letter",
    listening: "Listening...", counting: "Counting...", voiceOn: "Voice on", voiceOff: "Voice off",
    micDenied: "Your browser blocked the microphone. Allow it in the address bar, or type instead.",
    failed: "That did not go through. Check your connection and tap the button to try again.",
    typeHere: "Type a few words about your shift, like: 3 hours at the Food Bank.",
    plus: "+{n} hours", waiting: "Waiting for staff to confirm", dupe: "Already counted. You told us this at {time}, so we did not add hours twice.",
    dupeNoTime: "Already counted. We did not add hours twice.", howMany: "How many hours was your shift?", saved: "Saved. Staff will confirm your hours.",
    concern: "You told us something important. Staff will see it today.", danger: "If someone is in danger right now, call 911.",
    where: "Where was your shift?", siteSaved: "Thanks, site saved.", nth: "That's your {n}{o} shift with us.", hoursPlaceholder: "Hours",
    siteNotSaid: "Site not said", nocatch: "We didn't catch that. Try again?", nameNeeded: "We need your name first.",
    emergency: "Not an emergency line · Danger: 911 · Crisis: 988 · Abuse: 1-800-962-2873",
    howFast: "how fast", listen: "listen", understand: "understand", voice: "voice",
  },
  es: {
    staff: "Personal", askName: "¿Cómo te llamas?", continue: "Continuar", askGoal: "¿Cuentas para algo?",
    goalSchool: "Horas de escuela o corte (escribe el número)", goalNone: "Solo contar mis horas",
    hi: "Hola, {name}.", ofHours: "de {goal} horas", hoursWord: "horas", first: "Tu primer turno empieza la cuenta.",
    toGo: "Faltan {n} para {label}", withUs: "{n} horas con nosotros", tapTalk: "Toca y cuéntanos tu turno", tapDone: "Toca cuando termines",
    orType: "o escríbelo", send: "Enviar", another: "Cuéntanos otro turno", letter: "Obtener mi carta de horas",
    listening: "Escuchando...", counting: "Contando...", voiceOn: "Voz activada", voiceOff: "Voz apagada",
    micDenied: "Tu navegador bloqueó el micrófono. Permítelo en la barra de direcciones, o escribe.",
    failed: "No se pudo enviar. Revisa tu conexión y toca el botón para intentar otra vez.",
    typeHere: "Escribe unas palabras sobre tu turno, como: 3 horas en el Food Bank.",
    plus: "+{n} horas", waiting: "Esperando confirmación del personal", dupe: "Ya contado. Nos lo dijiste a las {time}, así que no sumamos horas dos veces.",
    dupeNoTime: "Ya contado. No sumamos horas dos veces.", howMany: "¿Cuántas horas fue tu turno?", saved: "Guardado. El personal confirmará tus horas.",
    concern: "Nos contaste algo importante. El personal lo verá hoy.", danger: "Si alguien está en peligro ahora mismo, llama al 911.",
    where: "¿Dónde fue tu turno?", siteSaved: "Gracias, sitio guardado.", nth: "Es tu turno número {n} con nosotros.", hoursPlaceholder: "Horas",
    siteNotSaid: "Sitio no indicado", nocatch: "No te entendimos. ¿Lo intentas otra vez?", nameNeeded: "Primero necesitamos tu nombre.",
    emergency: "No es una línea de emergencia · Peligro: 911 · Crisis: 988 · Abuso: 1-800-962-2873",
    howFast: "qué tan rápido", listen: "escuchar", understand: "entender", voice: "voz",
  },
};
const TZ = "America/New_York";
const CIRC = 2 * Math.PI * 86;
let lang = localStorage.getItem("tally-lang") || "en";
let name = localStorage.getItem("tally-name") || "";
let goal = JSON.parse(localStorage.getItem("tally-goal") || "null");
let stats = { approved_hours: 0, waiting_hours: 0 };
let recorder = null, chunks = [], stream = null, ctx = null, analyser = null, timerId = null, levelId = null, startedAt = 0, busy = false;
let currentAudio = null, lastTimings = null, lastReceipt = null;

const $ = id => document.getElementById(id);
const t = (k, v = {}) => { let s = (T[lang][k] ?? T.en[k] ?? k); for (const [a, b] of Object.entries(v)) s = s.replace("{" + a + "}", b); return s; };
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = n => (Math.round(n * 10) / 10).toString();
const loc = () => (lang === "es" ? "es-US" : "en-US");
const fmtDate = d => new Date(d + "T12:00:00Z").toLocaleDateString(loc(), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = iso => new Date(iso).toLocaleTimeString(loc(), { hour: "numeric", minute: "2-digit", timeZone: TZ });
const ordSuffix = n => (lang === "es" ? "" : ["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
const debug = new URLSearchParams(location.search).get("debug") === "1";

function show(id, on = true) { $(id).classList.toggle("hidden", !on); }
function say(text) { const m = $("msg"); m.textContent = text || ""; show("msg", !!text); }

function applyLanguage() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-key]").forEach(el => { el.textContent = t(el.getAttribute("data-key")); });
  $("lang-toggle").textContent = lang.toUpperCase();
  $("emergency").innerHTML = esc(t("emergency")).replace(/1-800-962-2873|\b911\b|\b988\b/g, n => '<a href="tel:' + n.replace(/-/g, "") + '">' + n + "</a>");
  $("letter-btn").href = "/letter?name=" + encodeURIComponent(name) + "&lang=" + lang;
  updateSpeaker();
  if (name) renderHome();
  if (lastReceipt) renderReceipt(lastReceipt);
  renderTimings();
}

function voiceOn() { return localStorage.getItem("tally-voice") !== "off"; }
function updateSpeaker() {
  const b = $("speaker-toggle");
  b.innerHTML = voiceOn()
    ? '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13 .4L14.6 8.6 12.6 10.6 10.6 8.6 9.2 10 11.2 12 9.2 14l1.4 1.4 2-2 2 2L16 14l-2-2 2-2.6z"/></svg>';
  b.setAttribute("aria-label", t(voiceOn() ? "voiceOn" : "voiceOff"));
  b.title = t(voiceOn() ? "voiceOn" : "voiceOff");
}

// ---- views ----
function route() {
  show("view-name", !name);
  show("view-goal", !!name && !goal);
  show("view-home", !!name && !!goal);
  if (name && goal) { loadStats(); }
}

async function loadStats() {
  try {
    const r = await fetch("/api/volunteer?name=" + encodeURIComponent(name));
    if (r.ok) { const d = await r.json(); stats = d; }
  } catch {}
  renderHome(true);
}

function setRing(approved, waiting, goalHours) {
  const total = approved + waiting;
  const scale = goalHours || Math.max(10, Math.ceil(total / 10) * 10);
  const a = Math.min(1, approved / scale), w = Math.min(1, total / scale);
  $("ring-approved").style.strokeDasharray = (a * CIRC) + " " + CIRC;
  $("ring-waiting").style.strokeDasharray = (w * CIRC) + " " + CIRC;
}

function renderHome(animate) {
  $("greeting").textContent = t("hi", { name });
  const approved = stats.approved_hours || 0, waiting = stats.waiting_hours || 0, total = approved + waiting;
  const gh = goal && goal.hours;
  $("ring-num").textContent = num(total);
  $("ring-of").textContent = gh ? t("ofHours", { goal: gh }) : t("hoursWord");
  if (total === 0) $("ring-sub").textContent = t("first");
  else if (gh) $("ring-sub").textContent = total >= gh ? "\u2713 " + goal.label : t("toGo", { n: num(gh - total), label: goal.label });
  else $("ring-sub").textContent = t("withUs", { n: num(total) });
  setRing(approved, waiting, gh);
  if (!busy && !recorder) $("talk-label").textContent = t("tapTalk");
}

function animateRing(from, to) {
  const gh = goal && goal.hours, el = $("ring-num"), start = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = now => {
    const p = reduce ? 1 : Math.min(1, (now - start) / 900), v = from + (to - from) * (1 - Math.pow(1 - p, 3));
    el.textContent = num(v);
    setRing(stats.approved_hours || 0, v - (stats.approved_hours || 0), gh);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- onboarding ----
function saveVolunteer() {
  fetch("/api/volunteer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, goal_hours: goal && goal.hours, goal_label: goal && goal.label, lang }) }).catch(() => {});
}
function setGoal(hours, label) {
  goal = { hours, label };
  localStorage.setItem("tally-goal", JSON.stringify(goal));
  saveVolunteer();
  route(); applyLanguage();
}

// ---- recording ----
async function startRecording() {
  say("");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    say(t("micDenied")); openTypeBox(true); return;
  }
  try {
    ctx = new AudioContext();
    analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    recorder = new MediaRecorder(stream); chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => sendAudio(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    recorder.start();
  } catch (e) { say(t("micDenied")); openTypeBox(true); cleanupRecording(); return; }
  startedAt = Date.now();
  $("talk-btn").classList.add("recording");
  $("talk-label").textContent = t("tapDone");
  show("rec-ui"); show("type-link", false);
  timerId = setInterval(() => {
    const s = Math.floor((Date.now() - startedAt) / 1000);
    $("rec-timer").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }, 250);
  levelId = setInterval(updateLevels, 70);
}

function updateLevels() {
  if (!analyser) return;
  const d = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(d);
  const bars = $("levels").children, per = Math.floor(d.length / bars.length);
  for (let i = 0; i < bars.length; i++) {
    let s = 0; for (let j = 0; j < per; j++) s += d[i * per + j];
    bars[i].style.height = Math.max(8, Math.min(100, (s / per / 160) * 100)) + "%";
  }
}

function cleanupRecording() {
  clearInterval(timerId); clearInterval(levelId);
  if (stream) stream.getTracks().forEach(x => x.stop());
  if (ctx) ctx.close().catch(() => {});
  stream = null; ctx = null; analyser = null; recorder = null;
  $("talk-btn").classList.remove("recording");
  $("rec-timer").textContent = "00:00";
  show("rec-ui", false); show("type-link");
  $("talk-label").textContent = t("tapTalk");
}

function stopRecording() {
  const r = recorder;
  if (r && r.state !== "inactive") r.stop();
  cleanupRecording();
  recorder = r; // keep reference for mimeType in onstop
  recorder = null;
}

function openTypeBox(on) {
  show("type-box", on);
  $("type-link").setAttribute("aria-expanded", String(on));
  if (on) $("text-input").focus();
}

// ---- sending ----
function thinking(on, audio) {
  show("thinking", on);
  $("thinking-label").textContent = t(audio ? "listening" : "counting");
  if (on && audio) setTimeout(() => { if (busy) $("thinking-label").textContent = t("counting"); }, 1800);
  show("talk-btn", !on);
  $("talk-label").classList.toggle("hidden", on);
}

async function post(body, headers) {
  busy = true; say("");
  try {
    const res = await fetch("/api/update", { method: "POST", headers, body });
    const data = await res.json();
    busy = false; thinking(false);
    if (data.error) { say(data.code === "empty" ? t("nocatch") : data.code === "name_required" ? t("nameNeeded") : t("failed")); return; }
    receipt(data);
  } catch (e) { busy = false; thinking(false); say(t("failed")); }
}
function sendAudio(blob) {
  thinking(true, true);
  const f = new FormData(); f.append("audio", blob, "recording.webm"); f.append("volunteer_name", name);
  post(f, {});
}
function sendText() {
  const text = $("text-input").value.trim();
  if (!text) { say(t("typeHere")); return; }
  thinking(true, false);
  post(JSON.stringify({ text, volunteer_name: name }), { "Content-Type": "application/json" });
  $("text-input").value = ""; openTypeBox(false);
}

// ---- receipt ----
function receipt(data) {
  lastTimings = data.timings || null;
  const before = (stats.approved_hours || 0) + (stats.waiting_hours || 0);
  data._before = before;
  lastReceipt = data;
  if (data.volunteer_name && !name) { name = data.volunteer_name; localStorage.setItem("tally-name", name); }
  show("capture", false); show("receipt-wrap");
  renderReceipt(data);
  if (data.counted) {
    const after = before + data.hours;
    animateRingTo(before, after);
    stats = { ...stats, waiting_hours: (stats.waiting_hours || 0) + data.hours };
  }
  renderTimings(); playVoice(data);
}
function animateRingTo(a, b) { animateRing(a, b); }

function renderReceipt(d) {
  const needs = d.status_label === "Needs hours", dup = !d.counted && !needs;
  const site = d.site || "";
  let h = "";
  if (needs) {
    h += '<div class="rc-icon rc-ask">?</div><h3>' + esc(t("howMany")) + '</h3><div class="chips hours-chips">' +
      [1, 2, 3, 4, 5].map(n => '<button class="chip hour-chip" data-h="' + n + '">' + n + "</button>").join("") +
      '<button class="chip hour-chip" data-h="more">6+</button></div>' +
      '<form id="more-hours" class="hidden"><input id="more-input" class="big-input" type="number" min="6" max="24" step="0.5" inputmode="decimal" aria-label="' + esc(t("hoursPlaceholder")) + '"><button class="primary-btn" type="submit">' + esc(t("send")) + "</button></form>";
  } else if (dup) {
    h += '<div class="rc-icon rc-grey">=</div><p class="rc-dupe">' + esc(d.duplicate_at ? t("dupe", { time: fmtTime(d.duplicate_at) }) : t("dupeNoTime")) + "</p>";
  } else {
    h += '<div class="rc-icon rc-ok">\u2713</div><h3>' + esc(t("plus", { n: num(d.hours) })) + " · " + esc(site || t("siteNotSaid")) + " · " + esc(fmtDate(d.date)) + '</h3><span class="chip-grey">' + esc(t("waiting")) + "</span>";
    if (d.thanks) h += '<p class="rc-thanks">' + esc(d.thanks) + "</p>";
    const n = d.stats && d.stats.approved_shifts;
    if (n && [1, 5, 10, 25, 50].includes(n)) h += '<p class="rc-milestone">' + esc(t("nth", { n, o: ordSuffix(n) })) + "</p>";
  }
  if (!site && !dup) {
    h += '<div class="where"><p>' + esc(t("where")) + '</p><div id="site-chips" class="chips"></div></div>';
  }
  if (d.has_concern) h += '<p class="rc-concern">' + esc(t("concern")) + "<br>" + esc(t("danger")).replace(/911/, '<a href="tel:911">911</a>') + "</p>";
  $("receipt-body").innerHTML = h;
  if (!site && !dup) loadSiteChips(d);
  document.querySelectorAll(".hour-chip").forEach(b => b.onclick = () => {
    if (b.dataset.h === "more") { show("more-hours"); $("more-input").focus(); } else saveHours(d, Number(b.dataset.h));
  });
  const mh = document.getElementById("more-hours");
  if (mh) mh.onsubmit = e => { e.preventDefault(); const v = Number($("more-input").value); if (v > 0 && v <= 24) saveHours(d, v); };
}

async function loadSiteChips(d) {
  let sites = [];
  try { sites = await (await fetch("/api/sites")).json(); } catch {}
  const box = document.getElementById("site-chips"); if (!box) return;
  box.innerHTML = sites.map(s => '<button class="chip" data-s="' + esc(s) + '">' + esc(s) + "</button>").join("");
  box.querySelectorAll(".chip").forEach(b => b.onclick = async () => {
    const r = await fetch("/api/update/" + d.id + "/site", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: b.dataset.s }) });
    if (r.ok) { d.site = b.dataset.s; renderReceipt(d); say(t("siteSaved")); }
  });
}

async function saveHours(d, hours) {
  const r = await fetch("/api/update/" + d.id + "/hours", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours }) });
  if (!r.ok) { say(t("failed")); return; }
  d.hours = hours; d.counted = true; d.status_label = "Counted"; d.thanks = ""; d.stats = d.stats || {};
  const before = (stats.approved_hours || 0) + (stats.waiting_hours || 0);
  animateRingTo(before, before + hours);
  stats = { ...stats, waiting_hours: (stats.waiting_hours || 0) + hours };
  renderReceipt(d); say(t("saved"));
}

function backToCapture() {
  lastReceipt = null; say("");
  show("receipt-wrap", false); show("capture");
  loadStats();
}

// ---- voice and debug ----
function renderTimings() {
  const el = $("timings");
  if (!debug || !lastTimings) { show("timings", false); return; }
  const m = lastTimings; show("timings");
  el.textContent = t("howFast") + ": " + t("listen") + " " + m.transcribe_ms + "ms · " + t("understand") + " " + m.extract_ms + "ms · " + t("voice") + " " + (m.tts_ms ? m.tts_ms + "ms" : "–");
}
async function playVoice(data) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (!voiceOn() || !data.speak_url) return;
  try {
    const res = await fetch(data.speak_url);
    if (!res.ok) return;
    const ms = res.headers.get("X-TTS-Ms");
    const blob = await res.blob();
    if (lastTimings && ms) { lastTimings.tts_ms = Number(ms); renderTimings(); }
    currentAudio = new Audio(URL.createObjectURL(blob));
    await currentAudio.play();
  } catch (e) { console.warn("voice unavailable", e); }
}

// ---- init ----
document.addEventListener("DOMContentLoaded", () => {
  const lv = $("levels");
  for (let i = 0; i < 14; i++) lv.appendChild(document.createElement("i"));
  $("lang-toggle").addEventListener("click", () => { lang = lang === "en" ? "es" : "en"; localStorage.setItem("tally-lang", lang); if (name) saveVolunteer(); applyLanguage(); });
  $("speaker-toggle").addEventListener("click", () => {
    localStorage.setItem("tally-voice", voiceOn() ? "off" : "on");
    if (!voiceOn() && currentAudio) currentAudio.pause();
    updateSpeaker();
  });
  $("name-form").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("name-input").value.trim().replace(/\s+/g, " ");
    if (!v) return;
    name = v.charAt(0).toUpperCase() + v.slice(1);
    localStorage.setItem("tally-name", name);
    route(); applyLanguage();
  });
  document.querySelectorAll("#goal-chips .chip").forEach(b => b.addEventListener("click", () => {
    const g = b.dataset.goal;
    if (g === "100" || g === "75") setGoal(Number(g), b.dataset.label);
    else if (g === "school") { show("goal-school"); $("goal-hours").focus(); }
    else setGoal(null, "");
  }));
  $("goal-school").addEventListener("submit", e => {
    e.preventDefault();
    const v = Number($("goal-hours").value);
    if (v > 0) setGoal(v, lang === "es" ? "tu meta" : "your goal");
  });
  $("talk-btn").addEventListener("click", () => { if (busy) return; recorder ? stopRecording() : startRecording(); });
  $("type-link").addEventListener("click", () => openTypeBox($("type-box").classList.contains("hidden")));
  $("send-text-btn").addEventListener("click", sendText);
  $("another-btn").addEventListener("click", backToCapture);
  route(); applyLanguage();
});
