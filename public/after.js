// Tally volunteer: after the shift (thank-you card extras)
Object.assign(T.en, { shiftTime: "Shift time {d}", tasksDone: "Tasks you did", helped: "You helped pack {n} {unit} today" });
Object.assign(T.es, { shiftTime: "Tiempo de turno {d}", tasksDone: "Tareas que hiciste", helped: "Ayudaste a empacar {n} {unit} hoy" });

const _renderReceipt = renderReceipt;
renderReceipt = function (d) {
  _renderReceipt(d);
  if (!d.counted || !today || !today.event) return;
  const ci = today.checkin, ev = today.event;
  if (ci && !ci.left_at && !d._refreshed) { d._refreshed = true; loadToday().then(() => renderReceipt(d)); return; }
  let h = "";
  if (ci) h += '<p class="rc-shift">' + esc(t("shiftTime", { d: dur((ci.left_at ? Date.parse(ci.left_at) : Date.now()) - Date.parse(ci.at)) })) + "</p>";
  if ((today.tasks_done || []).length) h += '<p class="rc-shift"><span class="tc-lbl">' + esc(t("tasksDone")) + "</span>" + today.tasks_done.map(esc).join("<br>") + "</p>";
  if (ev.goal_done) h += '<p class="rc-milestone">' + esc(t("helped", { n: ev.goal_done, unit: lang === "es" ? (UNIT_ES[ev.goal_unit] || ev.goal_unit) : ev.goal_unit })) + "</p>";
  if (h) $("receipt-body").insertAdjacentHTML("beforeend", h);
};
