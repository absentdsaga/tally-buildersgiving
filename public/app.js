// Tally Volunteer Page

const translations = {
  en: {
    yourName: "Your name",
    enterName: "Enter your name",
    tapToTalk: "Tap to talk",
    tapToStop: "Tap to stop",
    recording: "Recording...",
    or: "or",
    typeShift: "Type about your shift...",
    send: "Send",
    thinking: "Thinking...",
    counted: "Counted",
    notCounted: "Not counted",
    hoursCounted: "{hours} hour{plural} counted",
    hoursNotCounted: "{hours} hour{plural} not counted",
    sentToStaff: "Sent to staff for today",
    volunteer: "Volunteer",
    staff: "Staff",
    alreadyCounted: "Already counted",
    at: "at",
    listening: "Listening...",
    counting: "Counting...",
    needsHours: "Needs hours",
    needsHoursMsg: "How many hours was your shift? Staff will add them.",
    howFast: "how fast",
    hide: "hide",
    voiceOn: "Voice on",
    voiceOff: "Voice off",
    transcribeMs: "listen",
    extractMs: "understand",
    ttsMs: "voice",
    failed: "Failed to send. Please try again.",
    micDenied: "Microphone access denied or not available. Please type instead.",
    staffView: "Staff view",
    hint: "Try it: tap and say what you did today, like \u0027I did three hours at the food bank\u0027",
    emergency: "Tally is not an emergency line. If someone is in danger, call 911. For a mental health crisis, call or text 988. To report abuse of a child or a vulnerable adult in Florida, call 1-800-962-2873.",
    emergency911: "If someone is in danger right now, call 911.",
  },
  es: {
    yourName: "Tu nombre",
    enterName: "Escribe tu nombre",
    tapToTalk: "Toca para hablar",
    tapToStop: "Toca para detener",
    recording: "Grabando...",
    or: "o",
    typeShift: "Escribe sobre tu turno...",
    send: "Enviar",
    thinking: "Pensando...",
    counted: "Contado",
    notCounted: "No contado",
    hoursCounted: "{hours} hora{plural} contada{plural}",
    hoursNotCounted: "{hours} hora{plural} no contada{plural}",
    sentToStaff: "Enviado al personal para hoy",
    volunteer: "Voluntario",
    staff: "Personal",
    alreadyCounted: "Ya contado",
    at: "a las",
    listening: "Escuchando...",
    counting: "Contando...",
    needsHours: "Faltan horas",
    needsHoursMsg: "¿Cuántas horas fue tu turno? El personal las agregará.",
    howFast: "qué tan rápido",
    hide: "ocultar",
    voiceOn: "Voz activada",
    voiceOff: "Voz apagada",
    transcribeMs: "escuchar",
    extractMs: "entender",
    ttsMs: "voz",
    failed: "No se pudo enviar. Inténtalo de nuevo.",
    micDenied: "No hay acceso al micrófono. Por favor escribe.",
    staffView: "Vista del personal",
    hint: "Pruébalo: toca y di lo que hiciste hoy, como \u0027Hice tres horas en el banco de alimentos\u0027",
    emergency: "Tally no es una línea de emergencia. Si alguien está en peligro, llama al 911. Para una crisis de salud mental, llama o envía un mensaje de texto al 988. Para reportar abuso de un niño o de un adulto vulnerable en Florida, llama al 1-800-962-2873.",
    emergency911: "Si alguien está en peligro ahora mismo, llama al 911.",
  },
};

let currentLang = localStorage.getItem("tally-lang") || "en";
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;
let audioContext = null;
let analyser = null;
let levelInterval = null;
let recordingStream = null;

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
  document.querySelectorAll("[data-key-placeholder]").forEach(el => {
    const key = el.getAttribute("data-key-placeholder");
    if (key) el.placeholder = t(key);
  });
  document.getElementById("lang-toggle").textContent = currentLang.toUpperCase();
  if (document.getElementById("speaker-toggle")) updateSpeakerBtn();
  renderTimings();
}

function linkPhones(str) {
  return esc(str).replace(/1-800-962-2873|\b911\b|\b988\b/g, n => "<a href=\"tel:" + n.replace(/-/g, "") + "\">" + n + "</a>");
}

function renderNotices() {
  document.getElementById("emergency").innerHTML = linkPhones(t("emergency"));
  const r = document.getElementById("result-911");
  if (r && !r.classList.contains("hidden")) r.innerHTML = linkPhones(t("emergency911"));
}

function toggleLanguage() {
  currentLang = currentLang === "en" ? "es" : "en";
  localStorage.setItem("tally-lang", currentLang);
  applyLanguage();
}

// Name persistence
function loadName() {
  const saved = localStorage.getItem("tally-name");
  if (saved) document.getElementById("volunteer-name").value = saved;
}

function saveName() {
  const name = document.getElementById("volunteer-name").value.trim();
  if (name) localStorage.setItem("tally-name", name);
}

// Recording
async function startRecording() {
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(recordingStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    mediaRecorder = new MediaRecorder(recordingStream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      sendAudio(blob);
    };

    mediaRecorder.start();
    recordingStartTime = Date.now();

    document.getElementById("recording-ui").classList.remove("hidden");
    document.getElementById("talk-btn").classList.add("recording");
    document.querySelector("#talk-btn .btn-text").textContent = t("tapToStop");

    recordingTimer = setInterval(updateTimer, 1000);
    levelInterval = setInterval(updateLevel, 50);
  } catch (err) {
    alert(t("micDenied"));
    console.error(err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach(t => t.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  clearInterval(recordingTimer);
  clearInterval(levelInterval);

  document.getElementById("recording-ui").classList.add("hidden");
  document.getElementById("talk-btn").classList.remove("recording");
  document.querySelector("#talk-btn .btn-text").textContent = t("tapToTalk");
  document.getElementById("timer").textContent = "00:00";
  document.getElementById("level-bar").style.width = "0%";
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${mins}:${secs}`;
}

function updateLevel() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const pct = Math.min(100, (avg / 128) * 100);
  document.getElementById("level-bar").style.width = `${pct}%`;
}

async function sendAudio(blob) {
  const name = document.getElementById("volunteer-name").value.trim();
  saveName();

  showThinking(true);

  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");
  formData.append("volunteer_name", name);

  try {
    const res = await fetch("/api/update", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    showResult(data);
  } catch (err) {
    console.error(err);
    alert(t("failed"));
    hideThinking();
  }
}

async function sendText() {
  const text = document.getElementById("text-input").value.trim();
  const name = document.getElementById("volunteer-name").value.trim();
  if (!text) return;

  saveName();
  showThinking();

  try {
    const res = await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, volunteer_name: name }),
    });
    const data = await res.json();
    showResult(data);
    document.getElementById("text-input").value = "";
  } catch (err) {
    console.error(err);
    alert(t("failed"));
    hideThinking();
  }
}

let thinkTimer = null;
function showThinking(audio) {
  const label = document.getElementById("thinking-label");
  label.setAttribute("data-key", audio ? "listening" : "counting");
  label.textContent = t(audio ? "listening" : "counting");
  clearTimeout(thinkTimer);
  if (audio) thinkTimer = setTimeout(() => { label.setAttribute("data-key", "counting"); label.textContent = t("counting"); }, 1800);
  document.getElementById("thinking-state").classList.remove("hidden");
  document.getElementById("result-section").classList.add("hidden");
}

function hideThinking() {
  clearTimeout(thinkTimer);
  document.getElementById("thinking-state").classList.add("hidden");
}

function countUp(el, target) {
  const start = performance.now(), dur = 700;
  const step = now => {
    const p = Math.min(1, (now - start) / dur);
    const v = target * (1 - Math.pow(1 - p, 3));
    el.textContent = Number.isInteger(target) ? Math.round(v) : v.toFixed(1);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function esc(s) {
  return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}

let lastTimings = null;
function renderTimings() {
  const el = document.getElementById("timings");
  if (!el) return;
  if (!lastTimings || localStorage.getItem("tally-timings") === "off") { el.classList.add("hidden"); return; }
  const m = lastTimings;
  el.classList.remove("hidden");
  el.innerHTML = t("howFast") + ": " + t("transcribeMs") + " " + m.transcribe_ms + "ms \u00B7 " + t("extractMs") + " " + m.extract_ms + "ms \u00B7 " + t("ttsMs") + " " + (m.tts_ms ? m.tts_ms + "ms" : "\u2013") + " <button id=\"hide-timings\" class=\"link-btn\">" + t("hide") + "</button>";
  document.getElementById("hide-timings").onclick = () => { localStorage.setItem("tally-timings", "off"); renderTimings(); };
}

function showResult(data) {
  hideThinking();
  if (data.error) { alert(data.error); return; }
  localStorage.setItem("tally-seen", "1");
  document.getElementById("first-hint").classList.add("hidden");
  const section = document.getElementById("result-section");
  section.classList.remove("hidden");
  const card = section.querySelector(".result-card");
  card.classList.remove("animate-in");
  void card.offsetWidth;
  card.classList.add("animate-in");

  const status = document.getElementById("result-status");
  const hours = document.getElementById("result-hours");
  const site = document.getElementById("result-site");
  const concerns = document.getElementById("result-concerns");
  const plural = data.hours !== 1 ? "s" : "";
  const needs = data.status_label === "Needs hours";
  const dup = !data.counted && !needs;

  if (needs) {
    status.textContent = t("needsHours");
    status.className = "result-status needs-hours";
    hours.textContent = t("needsHoursMsg");
    site.textContent = data.site || "";
  } else if (dup) {
    status.textContent = t("alreadyCounted");
    status.className = "result-status stamp-dup";
    hours.textContent = t("hoursNotCounted", { hours: data.hours, plural });
    site.textContent = data.duplicate_reason || "";
  } else {
    status.textContent = t("counted");
    status.className = "result-status counted";
    hours.innerHTML = "<span class=\"big-num\" id=\"big-num\">0</span> <span class=\"big-label\">" + t("hoursCounted", { hours: "", plural }).trim() + "</span>";
    countUp(document.getElementById("big-num"), data.hours);
    site.textContent = data.hours + " hour" + plural + " at " + data.site;
  }

  const urgent = (data.concerns || []).filter(c => c.urgency === "today");
  if (urgent.length > 0) {
    concerns.classList.remove("hidden");
    concerns.innerHTML = "<div class=\"concern-label\">" + t("sentToStaff") + "</div>" + urgent.map(c => "<div class=\"concern-quote\">\"" + esc(c.quote) + "\"</div>").join("");
  } else {
    concerns.classList.add("hidden");
  }
  document.getElementById("result-911").classList.toggle("hidden", urgent.length === 0);
  renderNotices();

  lastTimings = data.timings || null;
  renderTimings();
  playVoice(data);
}

let currentAudio = null;
function voiceOn() { return localStorage.getItem("tally-voice") !== "off"; }
function updateSpeakerBtn() {
  const b = document.getElementById("speaker-toggle");
  b.textContent = voiceOn() ? "\u{1f50a}" : "\u{1f507}";
  b.setAttribute("aria-label", t(voiceOn() ? "voiceOn" : "voiceOff"));
  b.title = t(voiceOn() ? "voiceOn" : "voiceOff");
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

// Init
document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
  if (!localStorage.getItem("tally-seen")) document.getElementById("first-hint").classList.remove("hidden");
  loadName();
  updateSpeakerBtn();
  document.getElementById("speaker-toggle").addEventListener("click", () => {
    localStorage.setItem("tally-voice", voiceOn() ? "off" : "on");
    if (!voiceOn() && currentAudio) currentAudio.pause();
    updateSpeakerBtn();
  });

  document.getElementById("lang-toggle").addEventListener("click", toggleLanguage);

  const talkBtn = document.getElementById("talk-btn");
  let isRecording = false;
  talkBtn.addEventListener("click", () => {
    if (!isRecording) {
      startRecording();
      isRecording = true;
    } else {
      stopRecording();
      isRecording = false;
    }
  });

  document.getElementById("send-text-btn").addEventListener("click", sendText);
  document.getElementById("volunteer-name").addEventListener("blur", saveName);
});
