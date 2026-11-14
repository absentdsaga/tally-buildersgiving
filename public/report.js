// Tally volunteer: Report tab
Object.assign(T.en, {
  repTitle: "Report", repClient: "Something's wrong with someone we're helping", repClientSub: "Tell us by voice or text. Staff will see it today.", repWrong: "Something happened that wasn't okay", repWrongSub: "Rude to a client, someone made you uncomfortable, an injury, a safety problem.",
  repPrivate: "Keep my name private", repWhat: "What happened?", repSubmit: "Send report", repThanks: "Thank you. Staff will see this today.", repHandled: "Staff handled your report.", repOpen: "Waiting for staff", repMine: "Your reports", repBack: "Back",
});
Object.assign(T.es, {
  repTitle: "Reportar", repClient: "Algo anda mal con alguien a quien ayudamos", repClientSub: "Cuéntanos por voz o texto. El personal lo verá hoy.", repWrong: "Pasó algo que no estuvo bien", repWrongSub: "Alguien fue grosero con un cliente, te hizo sentir incómodo, una lesión, un problema de seguridad.",
  repPrivate: "Mantener mi nombre privado", repWhat: "¿Qué pasó?", repSubmit: "Enviar reporte", repThanks: "Gracias. El personal lo verá hoy.", repHandled: "El personal atendió tu reporte.", repOpen: "Esperando al personal", repMine: "Tus reportes", repBack: "Atrás",
});

let repMode = "", repList = [], repDraft = "", repDone = false;

async function loadReports() {
  try { const r = await fetch("/api/reports/mine?device=" + encodeURIComponent(deviceId) + "&name=" + encodeURIComponent(name)); if (r.ok) repList = (await r.json()).reports; } catch {}
  if (tab === "report") renderReport();
}
function renderReport() {
  const box = $("tab-report"); if (!box) return;
  if (box.querySelector("#rep-text") && document.activeElement === $("rep-text")) return;
  let h = '<h2 class="sec-title">' + esc(t("repTitle")) + "</h2>";
  if (repDone) h += '<p class="card lime free-msg">' + esc(t("repThanks")) + "</p>";
  if (repMode === "wrong") {
    h += '<button id="rep-back" class="link-btn">‹ ' + esc(t("repBack")) + '</button><form id="rep-form" class="card task-card"><label class="tc-lbl" for="rep-text">' + esc(t("repWhat")) + '</label><textarea id="rep-text" rows="5" class="rep-text">' + esc(repDraft) + '</textarea><label class="rep-priv"><input id="rep-private" type="checkbox" checked> ' + esc(t("repPrivate")) + '</label><button class="primary-btn" type="submit">' + esc(t("repSubmit")) + "</button></form>";
  } else {
    h += '<button id="rep-client" class="card task-card rep-card"><div class="tc-title">' + esc(t("repClient")) + "</div><span>" + esc(t("repClientSub")) + '</span></button><button id="rep-wrong" class="card task-card rep-card"><div class="tc-title">' + esc(t("repWrong")) + "</div><span>" + esc(t("repWrongSub")) + "</span></button>";
  }
  if (repList.length) h += '<div class="tc-lbl">' + esc(t("repMine")) + "</div>" + repList.map(r => '<div class="card task-card"><div>' + esc(r.body.slice(0, 120)) + '</div><span class="pill ' + (r.handled ? "lime" : "white") + '">' + esc(t(r.handled ? "repHandled" : "repOpen")) + "</span></div>").join("");
  box.innerHTML = h;
  const c = $("rep-client"); if (c) c.onclick = () => { window.forceCapture = true; setTab("shift"); openTypeBox(true); renderToday(); };
  const w = $("rep-wrong"); if (w) w.onclick = () => { repMode = "wrong"; repDone = false; renderReport(); };
  const bk = $("rep-back"); if (bk) bk.onclick = () => { repMode = ""; repDraft = ""; renderReport(); };
  const f = $("rep-form"); if (f) f.onsubmit = async e => {
    e.preventDefault();
    const v = $("rep-text").value.trim(); if (!v) return;
    const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, device: deviceId, body: v, private: $("rep-private").checked, lang }) });
    if (!r.ok) { say(t("failed")); return; }
    repMode = ""; repDraft = ""; repDone = true; await loadReports(); renderReport();
  };
}
document.addEventListener("tally-report-msg", e => { const m = e.detail; repMode = "wrong"; repDone = false; repDraft = m ? '“' + m.body + '” (' + m.sender_name + ")\n" : ""; });
RENDER.report = () => { renderReport(); loadReports(); };
document.addEventListener("DOMContentLoaded", () => { setInterval(() => { if (!document.hidden && name && tab === "report") loadReports(); }, 5000); });
