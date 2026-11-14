// Tally volunteer: Ask tab
Object.assign(T.en, {
  askTitle: "Ask anything about today.", askPlaceholder: "Type your question", askSend: "Ask", askMic: "Ask with voice", chip1: "Where do I park?", chip2: "Can I give a client a ride?", chip3: "When's my break?",
  msgMaria: "Message {host}", askFail: "Couldn't get an answer. Try again.",
});
Object.assign(T.es, {
  askTitle: "Pregunta lo que quieras sobre hoy.", askPlaceholder: "Escribe tu pregunta", askSend: "Preguntar", askMic: "Preguntar con voz", chip1: "¿Dónde estaciono?", chip2: "¿Puedo llevar a un cliente en mi carro?", chip3: "¿Cuándo es mi descanso?",
  msgMaria: "Escribir a {host}", askFail: "No se pudo responder. Inténtalo otra vez.",
});

let askLog = [], askRec = null;

function renderAsk() {
  const box = $("tab-ask"); if (!box) return;
  const keep = $("ask-input") ? $("ask-input").value : "";
  box.innerHTML = '<h2 class="sec-title">' + esc(t("askTitle")) + '</h2><div class="chips">' + [1, 2, 3].map(i => '<button class="chip ask-chip" data-q="' + esc(t("chip" + i)) + '">' + esc(t("chip" + i)) + "</button>").join("") + "</div>" +
    '<div id="ask-log" class="bubbles">' + askLog.map((m, i) => m.q ? '<div class="bub-row me"><div class="bub me">' + esc(m.q) + "</div></div>" : '<div class="bub-row them"><div class="bub them"><div>' + esc(m.a) + "</div>" + (m.known ? "" : '<button class="primary-btn ask-msg" data-i="' + i + '">' + esc(t("msgMaria", { host: m.host })) + "</button>") + "</div></div>").join("") +
    '</div><form id="ask-form" class="composer"><input id="ask-input" type="text" autocomplete="off" placeholder="' + esc(t("askPlaceholder")) + '" aria-label="' + esc(t("askPlaceholder")) + '"><button type="button" id="ask-mic" class="icon-btn" aria-label="' + esc(t("askMic")) + '"><i data-lucide="mic"></i></button><button class="primary-btn" type="submit">' + esc(t("askSend")) + "</button></form>";
  $("ask-input").value = keep;
  box.querySelectorAll(".ask-chip").forEach(b => b.onclick = () => ask(b.dataset.q));
  $("ask-form").onsubmit = e => { e.preventDefault(); const v = $("ask-input").value.trim(); if (v) { $("ask-input").value = ""; ask(v); } };
  $("ask-mic").onclick = askMic;
  box.querySelectorAll(".ask-msg").forEach(b => b.onclick = () => { const m = askLog[Number(b.dataset.i)]; const q = askLog[Number(b.dataset.i) - 1]; openDmWith("__host", q ? q.q : ""); });
  icons();
}
async function ask(q) {
  askLog.push({ q });
  renderAsk();
  try {
    const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q, lang }) });
    const d = await r.json();
    askLog.push({ a: d.answer, known: d.known, host: d.host });
  } catch { askLog.push({ a: t("askFail"), known: true, host: "" }); }
  renderAsk();
  const l = $("ask-log"); if (l) l.scrollTop = l.scrollHeight;
}
async function askMic() {
  const btn = $("ask-mic");
  if (askRec) { askRec.stop(); return; }
  let s;
  try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { say(t("micDenied")); return; }
  const rec = new MediaRecorder(s), parts = [];
  rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
  rec.onstop = async () => {
    s.getTracks().forEach(x => x.stop()); askRec = null; btn.classList.remove("recording");
    const f = new FormData(); f.append("audio", new Blob(parts, { type: rec.mimeType || "audio/webm" }), "q.webm");
    try { const r = await fetch("/api/messages/voice", { method: "POST", body: f }); if (r.ok) { const d = await r.json(); if (d.text) ask(d.text); } } catch {}
  };
  askRec = rec; btn.classList.add("recording"); rec.start();
}
RENDER.ask = renderAsk;
