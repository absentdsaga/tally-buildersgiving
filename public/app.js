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
    alert("Microphone access denied or not available. Please type instead.");
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

  showThinking();

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
    alert("Failed to send. Please try again.");
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
    alert("Failed to send. Please try again.");
    hideThinking();
  }
}

function showThinking() {
  document.getElementById("thinking-state").classList.remove("hidden");
  document.getElementById("result-section").classList.add("hidden");
}

function hideThinking() {
  document.getElementById("thinking-state").classList.add("hidden");
}

function showResult(data) {
  hideThinking();
  const section = document.getElementById("result-section");
  section.classList.remove("hidden");

  const status = document.getElementById("result-status");
  const hours = document.getElementById("result-hours");
  const site = document.getElementById("result-site");
  const concerns = document.getElementById("result-concerns");

  const plural = data.hours !== 1 ? "s" : "";

  if (data.counted) {
    status.textContent = t("counted");
    status.className = "result-status counted";
    hours.textContent = t("hoursCounted", { hours: data.hours, plural });
  } else {
    status.textContent = t("notCounted");
    status.className = "result-status not-counted";
    hours.textContent = t("hoursNotCounted", { hours: data.hours, plural });
  }

  site.textContent = data.duplicate_reason || `${data.hours} hour${plural} at ${data.site}`;

  const urgentConcerns = (data.concerns || []).filter(c => c.urgency === "today");
  if (urgentConcerns.length > 0) {
    concerns.classList.remove("hidden");
    concerns.innerHTML = `
      <div class="concern-label">${t("sentToStaff")}</div>
      ${urgentConcerns.map(c => `<div class="concern-quote">"${c.quote}"</div>`).join("")}
    `;
  } else {
    concerns.classList.add("hidden");
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
  loadName();

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
