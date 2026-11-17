// Tally volunteer: Chat tab (polling every 3 s)
Object.assign(T.en, {
  chatTitle: "Chat", everyone: "Everyone today", yourHost: "Your host", hostWith: "Your host ({host})", safety: "Staff can see team chat. Don't share client names or addresses.",
  typeMsg: "Type a message", sendMsg: "Send", micMsg: "Voice message", staffPill: "Staff", reportMsg: "Report", noMsgs: "No messages yet. Say hi.", back: "Back",
  checkInFirst: "Tap \"I'm here\" on Home to join the chat.", newFrom: "{who}: {text}", openIt: "Open", teammates: "Message a teammate", transLine: "English:", sendFail: "Message not sent. Try again.",
});
Object.assign(T.es, {
  chatTitle: "Chat", everyone: "Todos hoy", yourHost: "Tu anfitrión", hostWith: "Tu anfitrión ({host})", safety: "El personal puede ver el chat del equipo. No compartas nombres ni direcciones de clientes.",
  typeMsg: "Escribe un mensaje", sendMsg: "Enviar", micMsg: "Mensaje de voz", staffPill: "Personal", reportMsg: "Reportar", noMsgs: "Aún no hay mensajes. Saluda.", back: "Atrás",
  checkInFirst: "Toca \"Ya llegué\" en Inicio para unirte al chat.", newFrom: "{who}: {text}", openIt: "Abrir", teammates: "Escribir a un compañero", transLine: "Inglés:", sendFail: "No se envió. Inténtalo otra vez.",
});

let chat = { threads: [], messages: {}, last: 0, open: null, reachable: [] }, chatRec = null, banner = null;
const deviceId = (() => { let d = localStorage.getItem("tally-device"); if (!d) { d = "d" + Math.random().toString(36).slice(2, 10); localStorage.setItem("tally-device", d); } return d; })();
const readKey = () => "tally-read-" + name;
const readMap = () => { try { return JSON.parse(localStorage.getItem(readKey()) || "{}"); } catch { return {}; } };
const markRead = tid => { const m = readMap(); const l = (chat.messages[tid] || []).at(-1); if (l) { m[tid] = l.id; localStorage.setItem(readKey(), JSON.stringify(m)); } };
const mine = m => m.sender_kind === "volunteer" && m.sender_name.toLowerCase() === name.toLowerCase();
const SUN = '<svg class="emo" viewBox="0 0 32 32" aria-hidden="true"><g stroke="#f2b705" stroke-width="2.4" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6.1 6.1l2.8 2.8M23.1 23.1l2.8 2.8M6.1 25.9l2.8-2.8M23.1 8.9l2.8-2.8"/></g><circle cx="16" cy="16" r="8.2" fill="#ffd23f"/><path d="M9.4 14.3h13.2" stroke="#17181c" stroke-width="1.3"/><rect x="9.4" y="13.6" width="5.8" height="3.8" rx="1.7" fill="#17181c"/><rect x="16.8" y="13.6" width="5.8" height="3.8" rx="1.7" fill="#17181c"/><path d="M13 19.7c1.8 1.3 4.2 1.3 6 0" stroke="#17181c" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';
const HOST = '<span class="emo-host" aria-hidden="true">🙋</span>';
const threadIcon = th => th.kind === "team" ? SUN + " " : th.kind === "host" ? HOST + " " : "";
const threadTitle = th => th.kind === "team" ? t("everyone") : th.kind === "host" ? t("hostWith", { host: (today && today.event && today.event.host) || "Maria" }) : th.title;
const unread = th => { const l = th.last; return !!l && !mine(l) && l.id > (readMap()[th.id] || 0); };
const hhmm = iso => fmtTime(iso);

async function pollChat(initial) {
  if (!name || document.hidden && !initial) return;
  try {
    const r = await fetch("/api/messages?name=" + encodeURIComponent(name) + "&since=" + (initial ? 0 : chat.last));
    if (!r.ok) return;
    const d = await r.json();
    chat.reachable = d.reachable; chat.threads = d.threads; chat.checked_in = d.checked_in;
    const fresh = [];
    for (const m of d.messages) { const a = chat.messages[m.thread_id] = chat.messages[m.thread_id] || []; if (!a.some(x => x.id === m.id)) { a.push(m); fresh.push(m); } chat.last = Math.max(chat.last, m.id); }
    if (!initial) {
      const inc = fresh.filter(m => m.sender_kind === "staff" && !(tab === "chat" && chat.open === m.thread_id));
      if (inc.length && tab !== "chat") showBanner(inc.at(-1));
    }
    if (tab === "chat" && chat.open) markRead(chat.open);
    updateDot();
    if (tab === "chat") renderChat();
  } catch {}
}
function updateDot() { const n = chat.threads.filter(unread).length; const d = $("dot-chat"); if (d) d.classList.toggle("hidden", n === 0); }

function showBanner(m) {
  const s = $("tab-shift"); if (!s) return;
  let b = $("msg-banner");
  if (!b) { b = document.createElement("div"); b.id = "msg-banner"; b.className = "msg-banner"; $("view-home").prepend(b); }
  b.innerHTML = '<span>' + esc(t("newFrom", { who: m.sender_name, text: m.body.slice(0, 80) })) + '</span><button class="small-btn" id="banner-open">' + esc(t("openIt")) + "</button>";
  b.classList.add("show");
  $("banner-open").onclick = () => { b.classList.remove("show"); chat.open = m.thread_id; setTab("chat"); };
  setTimeout(() => b.classList.remove("show"), 12000);
}

function bubble(m) {
  const me = mine(m);
  const staff = m.sender_kind === "staff";
  return '<div class="bub-row ' + (me ? "me" : "them") + '"><div class="bub ' + (me ? "me" : "them") + '">' +
    (!me ? '<div class="bub-who">' + (staff ? esc(m.sender_name) : '<button class="dm-name" data-dm="' + esc(m.sender_name) + '">' + esc(m.sender_name) + "</button>") + (staff ? ' <span class="pill lime">' + esc(t("staffPill")) + "</span>" : "") + "</div>" : "") +
    '<div lang="' + m.lang + '">' + esc(m.body) + "</div>" +
    (m.lang === "es" && m.body_en ? '<div class="bub-en">' + esc(t("transLine")) + " " + esc(m.body_en) + "</div>" : "") +
    '<div class="bub-meta">' + esc(hhmm(m.created_at)) + (!me ? ' · <button class="link-btn rep-msg" data-id="' + m.id + '">' + esc(t("reportMsg")) + "</button>" : "") + "</div></div></div>";
}

function renderChat() {
  const box = $("tab-chat"); if (!box) return;
  if (!(today && today.checkin)) { box.innerHTML = '<p class="card">' + esc(t("checkInFirst")) + "</p>"; return; }
  const keep = box.querySelector("#chat-input") ? box.querySelector("#chat-input").value : "";
  if (!chat.open) {
    box.innerHTML = '<h2 class="sec-title">' + esc(t("chatTitle")) + "</h2>" + chat.threads.map(th => {
      const l = th.last;
      return '<button class="card thread-row" data-t="' + th.id + '"><div class="thread-main"><strong>' + threadIcon(th) + esc(threadTitle(th)) + "</strong><span>" + esc(l ? (l.sender_name === name ? "" : l.sender_name + ": ") + l.body : t("noMsgs")).slice(0, 80) + '</span></div><div class="thread-side">' + (l ? esc(hhmm(l.created_at)) : "") + (unread(th) ? '<b class="udot"></b>' : "") + "</div></button>";
    }).join("") + (chat.reachable.length ? '<div class="tc-lbl">' + esc(t("teammates")) + '</div><div class="chips">' + chat.reachable.map(n => '<button class="chip dm-name" data-dm="' + esc(n) + '">' + esc(n) + "</button>").join("") + "</div>" : "");
    box.querySelectorAll(".thread-row").forEach(b => b.onclick = () => { chat.open = Number(b.dataset.t); markRead(chat.open); updateDot(); renderChat(); });
  } else {
    const th = chat.threads.find(x => x.id === chat.open) || { kind: "dm", title: "" };
    const ms = chat.messages[chat.open] || [];
    box.innerHTML = '<div class="chat-head"><button id="chat-back" class="link-btn">‹ ' + esc(t("back")) + "</button><strong>" + threadIcon(th) + esc(threadTitle(th)) + '</strong></div><p class="safety">' + esc(t("safety")) + '</p><div id="bubbles" class="bubbles">' + (ms.length ? ms.map(bubble).join("") : '<p class="grey">' + esc(t("noMsgs")) + "</p>") +
      '</div><form id="chat-form" class="composer"><input id="chat-input" type="text" autocomplete="off" aria-label="' + esc(t("typeMsg")) + '" placeholder="' + esc(t("typeMsg")) + '"><button type="button" id="chat-mic" class="icon-btn" aria-label="' + esc(t("micMsg")) + '"><i data-lucide="mic"></i></button><button class="primary-btn" type="submit">' + esc(t("sendMsg")) + "</button></form>";
    $("chat-input").value = keep;
    const bs = $("bubbles"); bs.scrollTop = bs.scrollHeight;
    $("chat-back").onclick = () => { chat.open = null; renderChat(); };
    $("chat-form").onsubmit = e => { e.preventDefault(); const v = $("chat-input").value.trim(); if (v) { $("chat-input").value = ""; sendChat(v); } };
    $("chat-mic").onclick = chatMic;
    box.querySelectorAll(".rep-msg").forEach(b => b.onclick = () => { const m = ms.find(x => x.id === Number(b.dataset.id)); document.dispatchEvent(new CustomEvent("tally-report-msg", { detail: m })); setTab("report"); });
  }
  box.querySelectorAll(".dm-name").forEach(b => b.onclick = () => openDmWith(b.dataset.dm));
  icons();
}

async function sendChat(text, extra) {
  const th = chat.threads.find(x => x.id === chat.open);
  const body = { name, device: deviceId, body: text, lang, ...(extra || (chat.open ? { thread_id: chat.open } : {})) };
  try {
    const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { say(t("sendFail")); return null; }
    const d = await r.json();
    (chat.messages[d.thread_id] = chat.messages[d.thread_id] || []).push(d.message);
    chat.last = Math.max(chat.last, d.message.id);
    chat.open = d.thread_id;
    await pollChat(true);
    markRead(chat.open); renderChat();
    return d;
  } catch { say(t("sendFail")); return null; }
}

async function openDmWith(who, prefill) {
  setTab("chat");
  if (who === "__host") {
    const th = chat.threads.find(x => x.kind === "host");
    if (th) { chat.open = th.id; renderChat(); }
  } else {
    const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, device: deviceId, with: who, body: "👋", lang }) });
    if (!r.ok) { say(t("sendFail")); return; }
    const d = await r.json(); chat.open = d.thread_id; await pollChat(true);
  }
  renderChat();
  if (prefill && $("chat-input")) $("chat-input").value = prefill;
}
window.openDmWith = openDmWith;

async function chatMic() {
  const btn = $("chat-mic");
  if (chatRec) { chatRec.stop(); return; }
  let s;
  try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { say(t("micDenied")); return; }
  const rec = new MediaRecorder(s), parts = [];
  rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
  rec.onstop = async () => {
    s.getTracks().forEach(x => x.stop()); chatRec = null; btn.classList.remove("recording");
    const f = new FormData(); f.append("audio", new Blob(parts, { type: rec.mimeType || "audio/webm" }), "note.webm");
    try { const r = await fetch("/api/messages/voice", { method: "POST", body: f }); if (r.ok) { const d = await r.json(); if (d.text) await sendChat(d.text); } else say(t("nocatch")); } catch { say(t("sendFail")); }
  };
  chatRec = rec; btn.classList.add("recording"); rec.start();
}

RENDER.chat = () => { renderChat(); pollChat(true); };
document.addEventListener("tally-today", () => { if (name && today && today.checkin && !chat.threads.length) pollChat(true); });
document.addEventListener("DOMContentLoaded", () => {
  setInterval(() => { if (!document.hidden && name && today && today.checkin) pollChat(false); }, 3000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pollChat(false); });
});
