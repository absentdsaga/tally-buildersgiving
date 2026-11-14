// Tally volunteer: Tasks tab, "You're on", I'm free
Object.assign(T.en, {
  spotsOpen: "{a} of {b} spots open", full: "Full", takeIt: "I'll take it", youreOn: "You're on: {title}", giveAnother: "Done, give me another", imFree: "I'm free",
  onThis: "On this task:", noTasks: "No tasks yet. Ask your host.", noOpen: "No open tasks right now. Ask at the front table.", tasksTitle: "Tasks", taskDone: "Done", youAre: "You're on this", leaveTask: "Leave task",
});
Object.assign(T.es, {
  spotsOpen: "{a} de {b} lugares libres", full: "Lleno", takeIt: "Yo lo tomo", youreOn: "Estás en: {title}", giveAnother: "Listo, dame otra", imFree: "Estoy libre",
  onThis: "En esta tarea:", noTasks: "Aún no hay tareas. Pregunta a tu anfitrión.", noOpen: "Ahora no hay tareas libres. Pregunta en la mesa de entrada.", tasksTitle: "Tareas", taskDone: "Hecha", youAre: "Estás en esta tarea", leaveTask: "Dejar tarea",
});

let taskState = { tasks: [], mine: null }, freeMsg = "";
const taskLabel = x => x.title + (x.place ? ", " + x.place : "");

async function loadTasks() {
  if (!name) return;
  try { const r = await fetch("/api/tasks?name=" + encodeURIComponent(name)); if (r.ok) taskState = await r.json(); } catch {}
  renderTasks(); renderTaskNow();
}
function peopleHtml(x) {
  const ppl = x.people.filter(p => p.toLowerCase() !== name.toLowerCase());
  if (!ppl.length) return "";
  return '<p class="task-people">' + esc(t("onThis")) + " " + ppl.map(p => '<button class="dm-name" data-dm="' + esc(p) + '">' + esc(p) + "</button>").join(", ") + "</p>";
}
function renderTasks() {
  const box = $("tab-tasks"); if (!box) return;
  const open = taskState.tasks.filter(x => !x.done);
  box.innerHTML = '<button id="free-btn" class="here-btn">' + esc(t("imFree")) + "</button>" + (freeMsg ? '<p id="free-msg" class="card lime free-msg">' + esc(freeMsg) + "</p>" : "") +
    (open.length ? open.map(x => {
      const mine = taskState.mine && taskState.mine.id === x.id;
      return '<div class="card task-card"><div class="tc-title">' + esc(taskLabel(x)) + '</div><div class="task-spots">' + esc(t("spotsOpen", { a: x.spots, b: x.needed })) + "</div>" + peopleHtml(x) +
        (mine ? '<span class="pill lime">' + esc(t("youAre")) + '</span> <button class="link-btn leave-btn">' + esc(t("leaveTask")) + "</button>" : x.spots > 0 ? '<button class="primary-btn take-btn" data-id="' + x.id + '">' + esc(t("takeIt")) + "</button>" : '<span class="pill white">' + esc(t("full")) + "</span>") + "</div>";
    }).join("") : '<p class="grey">' + esc(t("noTasks")) + "</p>");
  $("free-btn").onclick = imFree;
  box.querySelectorAll(".take-btn").forEach(b => b.onclick = async () => {
    const r = await fetch("/api/tasks/take", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, task_id: Number(b.dataset.id) }) });
    if (r.ok) taskState = await r.json(); else await loadTasks();
    freeMsg = ""; renderTasks(); renderTaskNow();
  });
  box.querySelectorAll(".leave-btn").forEach(b => b.onclick = async () => {
    const r = await fetch("/api/tasks/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (r.ok) taskState = await r.json();
    renderTasks(); renderTaskNow();
  });
  box.querySelectorAll(".dm-name").forEach(b => b.onclick = () => { if (window.openDmWith) window.openDmWith(b.dataset.dm); });
}
async function imFree() {
  const r = await fetch("/api/tasks/free", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, lang }) });
  if (!r.ok) return;
  const d = await r.json();
  taskState = { tasks: d.tasks, mine: d.mine };
  freeMsg = lang === "es" ? d.message : d.message;
  renderTasks(); renderTaskNow();
  if (voiceOn() && d.speak_url) {
    try { if (currentAudio) currentAudio.pause(); const a = await fetch(d.speak_url); if (a.ok) { currentAudio = new Audio(URL.createObjectURL(await a.blob())); await currentAudio.play(); } } catch {}
  }
}
function renderTaskNow() {
  let el = $("task-now");
  if (!el) { el = document.createElement("div"); el.id = "task-now"; $("tab-shift").prepend(el); }
  const m = taskState.mine;
  if (!m || !(today && today.checkin)) { el.innerHTML = ""; el.className = ""; return; }
  el.className = "card lime task-now";
  el.innerHTML = '<div class="tc-title">' + esc(t("youreOn", { title: taskLabel(m) })) + "</div>" + peopleHtml(m) + '<button id="task-another" class="secondary-btn">' + esc(t("giveAnother")) + "</button>";
  $("task-another").onclick = async () => {
    const r = await fetch("/api/tasks/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, next: true }) });
    if (r.ok) { const d = await r.json(); taskState = d; }
    renderTaskNow(); renderTasks();
  };
  el.querySelectorAll(".dm-name").forEach(b => b.onclick = () => { if (window.openDmWith) window.openDmWith(b.dataset.dm); });
}

RENDER.tasks = loadTasks;
document.addEventListener("DOMContentLoaded", () => {
  setInterval(() => { if (!document.hidden && name && (tab === "tasks" || tab === "shift")) loadTasks(); }, 5000);
  if (name) loadTasks();
});
document.addEventListener("tally-today", renderTaskNow);
