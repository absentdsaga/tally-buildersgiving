// Staff: Reports section (private reports have the name removed)
Object.assign(T.en, { rpTitle: "Reports", rpNone: "No reports.", rpPrivate: "Private", rpHandled: "Handled", rpHandledBy: "handled by {who}" });
Object.assign(T.es, { rpTitle: "Reportes", rpNone: "No hay reportes.", rpPrivate: "Privado", rpHandled: "Atendido", rpHandledBy: "atendido por {who}" });
let rpData = [];
async function rpLoad() {
  try { const r = await fetch("/api/staff/reports"); if (r.ok) { rpData = (await r.json()).reports; rpRender(); } } catch {}
}
function rpRender() {
  const box = $("reports-box"); if (!box) return;
  const sec = $("sec-reports"); if (sec) sec.classList.toggle("hidden", !rpData.length);
  box.innerHTML = rpData.length ? rpData.map(r => '<article class="concern card"><div class="c-head">' + (r.private ? '<span class="tag-lv tag-today">' + esc(t("rpPrivate")) + "</span>" : "<strong>" + nm(r.name) + "</strong>") + " · " + esc(fmtDT(r.created_at)) + ' <span class="tag">' + esc(r.lang) + '</span></div><blockquote lang="' + r.lang + '">“' + esc(r.body) + "”</blockquote>" +
    (r.handled_at ? '<div class="grey">' + esc(t("rpHandledBy", { who: r.handled_by || "staff" })) + " · " + esc(fmtDT(r.handled_at)) + "</div>" : '<button class="primary-btn rp-handle" data-id="' + r.id + '">' + esc(t("rpHandled")) + "</button>") + "</article>").join("") : '<p class="grey">' + esc(t("rpNone")) + "</p>";
  box.querySelectorAll(".rp-handle").forEach(b => b.onclick = async () => {
    if (!who()) { say(t("needName")); $("who").focus(); return; }
    const r = await api("/api/staff/reports/handled", { id: Number(b.dataset.id), who: who() });
    if (!r || !r.ok) say(t("failed")); else rpLoad();
  });
}
const _render4 = render;
render = function () { _render4(); rpRender(); };
document.addEventListener("DOMContentLoaded", () => { rpLoad(); setInterval(rpLoad, 4000); });
