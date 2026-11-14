// Staff: Today's tasks box
Object.assign(T.en, { tkTitle: "Today's tasks", tkTitleF: "Task", tkWhere: "Where", tkNeeded: "People needed", tkAdd: "Add task", tkDone: "Mark done", tkNone: "No tasks yet.", tkOn: "On it:", tkNobody: "Nobody yet", tkFinished: "Done", tkAdded: "Task added." });
Object.assign(T.es, { tkTitle: "Tareas de hoy", tkTitleF: "Tarea", tkWhere: "Dónde", tkNeeded: "Personas necesarias", tkAdd: "Agregar tarea", tkDone: "Marcar hecha", tkNone: "Aún no hay tareas.", tkOn: "Haciéndola:", tkNobody: "Nadie todavía", tkFinished: "Hecha", tkAdded: "Tarea agregada." });

function renderTasksBox() {
  const box = $("tasks-box"); if (!box) return;
  if (box.contains(document.activeElement) && box.querySelector(".tk-list")) { box.querySelector(".tk-list").innerHTML = tkList(); wireTk(); return; }
  box.innerHTML = '<form id="tk-form" class="ev-grid"><label class="ev-f"><span>' + esc(t("tkTitleF")) + '</span><input id="tk-title" required></label><label class="ev-f"><span>' + esc(t("tkWhere")) + '</span><input id="tk-place"></label><label class="ev-f"><span>' + esc(t("tkNeeded")) + '</span><input id="tk-needed" type="number" min="1" max="50" value="2"></label><button class="primary-btn" type="submit">' + esc(t("tkAdd")) + '</button></form><div class="tk-list">' + tkList() + "</div>";
  $("tk-form").onsubmit = async e => {
    e.preventDefault();
    const r = await api("/api/staff/tasks", { title: $("tk-title").value, place: $("tk-place").value, needed: Number($("tk-needed").value) });
    if (!r || !r.ok) { say(t("failed")); return; }
    $("tk-title").value = ""; say(t("tkAdded")); load();
  };
  wireTk();
}
function tkList() {
  const ts = data.tasks || [];
  return ts.length ? ts.map(x => '<div class="wrow"><div class="w-main"><div class="w-who"><strong>' + esc(x.title) + "</strong>" + (x.place ? " · " + esc(x.place) : "") + " · " + x.people.length + "/" + x.needed + (x.done ? ' <span class="tag-lv tag-first">' + esc(t("tkFinished")) + "</span>" : "") + '</div><div class="grey w-line">' + esc(t("tkOn")) + " " + (x.people.length ? x.people.map(p => esc(p) + (window.msgButton ? "" : "")).join(", ") : esc(t("tkNobody"))) + "</div></div>" + (x.done ? "" : '<button class="small-btn tk-done" data-id="' + x.id + '">' + esc(t("tkDone")) + "</button>") + "</div>").join("") : '<p class="grey">' + esc(t("tkNone")) + "</p>";
}
function wireTk() {
  document.querySelectorAll(".tk-done").forEach(b => b.onclick = async () => { const r = await api("/api/staff/tasks/done", { id: Number(b.dataset.id) }); if (!r || !r.ok) say(t("failed")); else load(); });
}
const _render2 = render;
render = function () { _render2(); renderTasksBox(); icons(); };
