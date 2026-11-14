// Staff: event editor + checked-in list
Object.assign(T.en, {
  evTitle: "Today's event", ciTitle: "Checked in now", evName: "Event name", evPlace: "Place", evStart: "Starts", evEnd: "Ends", evHost: "Host", evHostWhere: "Host is at",
  evGoal: "Goal (one line)", evTarget: "Goal number", evDone: "Progress so far (number)", evUnit: "Counting what? (e.g. boxes packed)", evSetup: "Event setup", evDoneHint: "e.g. 164", evKnow: "Know before you go (3 to 5 lines)", evNotes: "Notes for the Ask tab (one per line)",
  evSave: "Save event", evSaved: "Event saved.", ciNone: "Nobody has checked in yet.", ciOn: "on shift {d}", ciSince: "in at {t}",
});
Object.assign(T.es, {
  evTitle: "El evento de hoy", ciTitle: "Registrados ahora", evName: "Nombre del evento", evPlace: "Lugar", evStart: "Empieza", evEnd: "Termina", evHost: "Anfitrión", evHostWhere: "El anfitrión está en",
  evGoal: "Meta (una línea)", evTarget: "Número de la meta", evDone: "Avance hasta ahora (número)", evUnit: "¿Qué se cuenta? (ej. cajas empacadas)", evSetup: "Configurar evento", evDoneHint: "ej. 164", evKnow: "Antes de empezar (3 a 5 líneas)", evNotes: "Notas para la pestaña Preguntar (una por línea)",
  evSave: "Guardar evento", evSaved: "Evento guardado.", ciNone: "Nadie se ha registrado todavía.", ciOn: "en turno {d}", ciSince: "llegó a las {t}",
});

const localInput = iso => { const d = new Date(iso); const p = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d); return p.replace(" ", "T"); };
const fromLocal = v => {
  // v is a New York wall time; find the matching instant
  const [d, tm] = v.split("T"); const guess = new Date(d + "T" + tm + ":00Z");
  const off = guess.getTime() - new Date(guess.toLocaleString("en-US", { timeZone: TZ })).getTime();
  return new Date(guess.getTime() + off).toISOString();
};
const durS = ms => { const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60); return h ? h + "h " + String(m % 60).padStart(2, "0") + "m" : m + "m"; };
let evFormFor = "";

function renderEvent() {
  const ev = data.event, box = $("event-form");
  if (!box) return;
  const sig = JSON.stringify([ev, lang]);
  if (evFormFor === sig && box.children.length) return;
  if (box.contains(document.activeElement) && box.children.length) return;
  evFormFor = sig;
  const e = ev || { name: "", place: "", start_at: new Date().toISOString(), end_at: new Date(Date.now() + 3 * 3600000).toISOString(), host: "", host_where: "the front table", goal: "", goal_target: 0, goal_done: 0, goal_unit: "boxes", know: [], notes: "" };
  const f = (id, k, v, type, ph) => '<label class="ev-f"><span>' + esc(t(k)) + '</span><input id="' + id + '" type="' + (type || "text") + '" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(t(ph)) + '"' : "") + '></label>';
  box.innerHTML = '<div class="ev-grid">' + f("ev-name", "evName", e.name) + f("ev-place", "evPlace", e.place) + f("ev-start", "evStart", localInput(e.start_at), "datetime-local") + f("ev-end", "evEnd", localInput(e.end_at), "datetime-local") +
    f("ev-host", "evHost", e.host) + f("ev-where", "evHostWhere", e.host_where) + f("ev-goal", "evGoal", e.goal) + f("ev-target", "evTarget", e.goal_target, "number") + f("ev-done", "evDone", e.goal_done, "number", "evDoneHint") + f("ev-unit", "evUnit", e.goal_unit) + "</div>" +
    '<label class="ev-f"><span>' + esc(t("evKnow")) + '</span><textarea id="ev-know" rows="5">' + esc(e.know.join("\n")) + "</textarea></label>" +
    '<label class="ev-f"><span>' + esc(t("evNotes")) + '</span><textarea id="ev-notes" rows="4">' + esc(e.notes) + "</textarea></label>" +
    '<button id="ev-save" class="primary-btn">' + esc(t("evSave")) + "</button>";
  $("ev-save").onclick = async () => {
    const r = await api("/api/event", { name: $("ev-name").value, place: $("ev-place").value, start_at: fromLocal($("ev-start").value), end_at: fromLocal($("ev-end").value), host: $("ev-host").value, host_where: $("ev-where").value, goal: $("ev-goal").value, goal_target: $("ev-target").value, goal_done: $("ev-done").value, goal_unit: $("ev-unit").value, know: $("ev-know").value, notes: $("ev-notes").value });
    if (!r || !r.ok) { say(t("failed")); return; }
    evFormFor = ""; say(t("evSaved")); load();
  };
}

function renderChecked() {
  const list = data.checked_in || [], box = $("checked-list");
  if (!box) return;
  box.innerHTML = list.length ? list.map(c => '<div class="wrow" data-name="' + esc(c.name) + '"><span class="av">' + esc(initials(c.name)) + '</span><div class="w-main"><div class="w-who"><strong>' + esc(c.name) + "</strong>" + (c.first_shift ? ' <span class="tag-lv tag-first">' + esc(t("firstShift")) + "</span>" : "") + '</div><div class="grey w-line">' + esc(t("ciSince", { t: fmtTime(c.at) })) + " · <span class=\"live-clock\" data-at=\"" + esc(c.at) + "\">" + esc(t("ciOn", { d: durS(Date.now() - Date.parse(c.at)) })) + "</span></div></div>" + (window.msgButton ? window.msgButton(c.name) : "") + "</div>").join("") : '<p class="grey">' + esc(t("ciNone")) + "</p>";
}

const _render = render;
render = function () { _render(); renderEvent(); renderChecked(); icons(); };
setInterval(() => document.querySelectorAll(".live-clock").forEach(el => { el.textContent = t("ciOn", { d: durS(Date.now() - Date.parse(el.dataset.at)) }); }), 20000);
if (data) render();
