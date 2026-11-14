// Staff: Messages section
Object.assign(T.en, { msgTitle: "Messages", msgNav: "Messages", msgBtn: "Message", msgAll: "Message everyone on shift", msgPlaceholder: "Write a message", msgSend: "Send", msgNone: "No messages yet.", msgTeam: "Everyone today", msgPickName: "Type your name at the top first.", msgBack: "All threads", msgSafety: "Staff can see team chat. Don't share client names or addresses.", msgReportTag: "Report" });
Object.assign(T.es, { msgTitle: "Mensajes", msgNav: "Mensajes", msgBtn: "Mensaje", msgAll: "Mensaje a todos en turno", msgPlaceholder: "Escribe un mensaje", msgSend: "Enviar", msgNone: "Aún no hay mensajes.", msgTeam: "Todos hoy", msgPickName: "Escribe tu nombre arriba primero.", msgBack: "Todos los hilos", msgSafety: "El personal puede ver el chat del equipo. No compartas nombres ni direcciones de clientes.", msgReportTag: "Reportar" });
NAV["#sec-messages"] = "msgNav";

let sm = { threads: [], msgs: {}, last: 0, open: null };
window.msgButton = n => '<button class="small-btn msg-open" data-to="' + esc(n) + '">' + esc(t("msgBtn")) + "</button>";

async function smPoll(initial) {
  if (document.hidden && !initial) return;
  try {
    const r = await fetch("/api/staff/messages?since=" + (initial ? 0 : sm.last));
    if (!r.ok) return;
    const d = await r.json(); sm.threads = d.threads;
    for (const m of d.messages) { const a = sm.msgs[m.thread_id] = sm.msgs[m.thread_id] || []; if (!a.some(x => x.id === m.id)) a.push(m); sm.last = Math.max(sm.last, m.id); }
    smRender();
  } catch {}
}
const thTitle = th => th.kind === "team" ? t("msgTeam") : th.title;
function smRender() {
  const box = $("messages-box"); if (!box) return;
  if (box.contains(document.activeElement) && document.activeElement.id === "sm-input" && sm.open) { smBubbles(); return; }
  if (!sm.open) {
    box.innerHTML = '<button id="sm-all" class="primary-btn">' + esc(t("msgAll")) + "</button>" + (sm.threads.length ? sm.threads.map(th => '<button class="wrow sm-th" data-id="' + th.id + '"><div class="w-main"><div class="w-who"><strong>' + "" + esc(thTitle(th)) + '</strong></div><div class="grey w-line">' + esc(th.last ? th.last.sender_name + ": " + th.last.body : t("msgNone")).slice(0, 100) + "</div></div><div class=\"grey\">" + (th.last ? esc(fmtTime(th.last.created_at)) : "") + "</div></button>").join("") : '<p class="grey">' + esc(t("msgNone")) + "</p>");
    $("sm-all").onclick = () => { const team = sm.threads.find(x => x.kind === "team"); if (team) { sm.open = team.id; smRender(); setTimeout(() => $("sm-input") && $("sm-input").focus(), 0); } };
    box.querySelectorAll(".sm-th").forEach(b => b.onclick = () => { sm.open = Number(b.dataset.id); smRender(); });
  } else {
    const th = sm.threads.find(x => x.id === sm.open) || { kind: "dm", title: "" };
    box.innerHTML = '<div class="row-between"><button id="sm-back" class="link-btn">‹ ' + esc(t("msgBack")) + "</button><strong>" + esc(thTitle(th)) + '</strong></div><p class="grey">' + esc(t("msgSafety")) + '</p><div id="sm-bubbles" class="bubbles"></div><form id="sm-form" class="composer"><input id="sm-input" type="text" autocomplete="off" placeholder="' + esc(t("msgPlaceholder")) + '" aria-label="' + esc(t("msgPlaceholder")) + '"><button class="primary-btn" type="submit">' + esc(t("msgSend")) + "</button></form>";
    smBubbles();
    $("sm-back").onclick = () => { sm.open = null; smRender(); };
    $("sm-form").onsubmit = async e => {
      e.preventDefault();
      if (!who()) { say(t("msgPickName")); $("who").focus(); return; }
      const v = $("sm-input").value.trim(); if (!v) return; $("sm-input").value = "";
      const r = await api("/api/staff/messages", { thread_id: sm.open, who: who(), body: v, lang });
      if (!r || !r.ok) say(t("failed")); else smPoll(false);
    };
  }
}
function smBubbles() {
  const el = $("sm-bubbles"); if (!el) return;
  const ms = sm.msgs[sm.open] || [];
  el.innerHTML = ms.length ? ms.map(m => { const staff = m.sender_kind === "staff"; return '<div class="bub-row ' + (staff ? "me" : "them") + '"><div class="bub ' + (staff ? "me" : "them") + '"><div class="bub-who">' + esc(m.sender_name) + (staff ? ' <span class="pill lime">Staff</span>' : "") + '</div><div lang="' + m.lang + '">' + esc(m.body) + "</div>" + (m.lang === "es" && m.body_en ? '<div class="bub-en">' + esc(t("translation")) + " " + esc(m.body_en) + "</div>" : "") + '<div class="bub-meta">' + esc(fmtTime(m.created_at)) + "</div></div></div>"; }).join("") : '<p class="grey">' + esc(t("msgNone")) + "</p>";
  el.scrollTop = el.scrollHeight;
}

document.addEventListener("click", async e => {
  const b = e.target.closest(".msg-open"); if (!b) return;
  if (!who()) { say(t("msgPickName")); $("who").focus(); return; }
  const rr = await fetch("/api/staff/dm?name=" + encodeURIComponent(b.dataset.to));
  if (rr.ok) { const d = await rr.json(); await smPoll(true); sm.open = d.thread_id; smRender(); $("sec-messages").scrollIntoView({ behavior: "smooth" }); setTimeout(() => $("sm-input") && $("sm-input").focus(), 200); }
});

const _render3 = render;
render = function () {
  _render3();
  document.querySelectorAll("#waiting .wrow:not([data-m])").forEach(row => { row.dataset.m = "1"; const n = row.querySelector(".w-who strong"); if (n && n.textContent.trim() && !n.querySelector(".grey")) row.insertAdjacentHTML("beforeend", window.msgButton(n.textContent.trim())); });
  document.querySelectorAll("#by-volunteer tbody tr").forEach(tr => { const td = tr.firstElementChild; if (td && !td.querySelector(".msg-open") && !td.querySelector(".grey")) td.insertAdjacentHTML("beforeend", " " + window.msgButton(td.textContent.trim())); });
  smRender();
};
document.addEventListener("DOMContentLoaded", () => { smPoll(true); setInterval(() => smPoll(false), 3000); });
