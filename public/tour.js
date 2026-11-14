(function () {
  var TXT = {
    en: { next: "Next", skip: "Skip", done: "Done", tour: "Tour", of: "Step {a} of {b}" },
    es: { next: "Siguiente", skip: "Omitir", done: "Listo", tour: "Recorrido", of: "Paso {a} de {b}" }
  };
  var SETS = {
    volunteer: [
      { sel: "#talk-btn", en: "Tap and say what you did. Tally counts the hours.", es: "Toca y cuenta lo que hiciste. Tally cuenta las horas." },
      { sel: "#vol-tabs", en: "Tasks, chat with your team, ask about today, or report something.", es: "Tareas, chat con tu equipo, pregunta sobre hoy o reporta algo." },
      { sel: "#progress", en: "Your hours add up here, toward your goal.", es: "Tus horas se suman aquí, hacia tu meta." }
    ],
    staff: [
      { sel: ".kpis", en: "This week at a glance, and what it's worth to funders.", es: "Esta semana de un vistazo, y lo que vale para los financiadores." },
      { sel: "#sec-needs", en: "Concerns from volunteers, most urgent first. Mark them handled.", es: "Preocupaciones de voluntarios, las más urgentes primero. Márcalas como atendidas." },
      { sel: "#sec-updates", en: "Approve hours with one tap. Approved hours go in the grant report.", es: "Aprueba horas con un toque. Las horas aprobadas van al informe de la subvención." }
    ]
  };
  function filterSteps(steps, exists) { return steps.filter(function (s) { return !!exists(s.sel); }); }
  if (typeof module !== "undefined" && module.exports) { module.exports = { filterSteps: filterSteps, SETS: SETS }; }
  if (typeof document === "undefined") return;

  var kind = document.body.classList.contains("staff-body") ? "staff" : "volunteer";
  var KEY = "tally-tour-" + kind;
  function lang() { return localStorage.getItem("tally-lang") === "es" ? "es" : "en"; }
  function visible(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? el : null;
  }
  var active = null;

  function close(mark) {
    if (!active) return;
    var a = active; active = null;
    window.removeEventListener("resize", a.pos);
    window.removeEventListener("scroll", a.pos, true);
    document.removeEventListener("keydown", a.key, true);
    a.root.remove();
    if (mark) localStorage.setItem(KEY, "1");
    if (a.from && a.from.focus) a.from.focus();
  }

  function start() {
    if (active) return;
    var steps = filterSteps(SETS[kind], visible);
    if (!steps.length) return;
    var L = TXT[lang()], i = 0, from = document.activeElement;
    var root = document.createElement("div");
    root.className = "tour-root";
    root.innerHTML = '<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-modal="true" tabindex="-1"><p class="tour-text"></p><div class="tour-dots"></div><div class="tour-actions"><button type="button" class="tour-skip"></button><button type="button" class="tour-next"></button></div></div>';
    document.body.appendChild(root);
    var hole = root.querySelector(".tour-hole"), card = root.querySelector(".tour-card");
    var text = root.querySelector(".tour-text"), dots = root.querySelector(".tour-dots");
    var skip = root.querySelector(".tour-skip"), next = root.querySelector(".tour-next");
    skip.textContent = L.skip;

    function pos() {
      var el = visible(steps[i].sel);
      if (!el) { go(1); return; }
      var r = el.getBoundingClientRect(), p = 6, vw = window.innerWidth, vh = window.innerHeight;
      hole.style.cssText = "top:" + (r.top - p) + "px;left:" + (r.left - p) + "px;width:" + (r.width + p * 2) + "px;height:" + (r.height + p * 2) + "px";
      var cw = Math.min(300, vw - 24);
      card.style.width = cw + "px";
      var ch = card.offsetHeight, top = r.bottom + p + 12;
      if (top + ch > vh - 12) top = r.top - p - 12 - ch;
      if (top < 12) top = Math.max(12, vh - ch - 12);
      var left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12);
      card.style.top = top + "px"; card.style.left = left + "px";
    }
    function show() {
      var s = steps[i];
      var el = visible(s.sel);
      if (!el) { go(1); return; }
      el.scrollIntoView({ block: "center" });
      text.textContent = s[lang()];
      dots.innerHTML = steps.map(function (_, n) { return '<i class="' + (n === i ? "on" : "") + '"></i>'; }).join("");
      dots.setAttribute("aria-label", L.of.replace("{a}", i + 1).replace("{b}", steps.length));
      next.textContent = i === steps.length - 1 ? L.done : L.next;
      pos();
      card.focus();
    }
    function go(d) {
      i += d;
      if (i >= steps.length) { close(true); return; }
      show();
    }
    function key(e) {
      if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") {
        var f = [skip, next], at = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    }
    next.addEventListener("click", function () { go(1); });
    skip.addEventListener("click", function () { close(true); });
    root.addEventListener("click", function (e) { if (e.target === root) close(true); });
    window.addEventListener("resize", pos);
    window.addEventListener("scroll", pos, true);
    document.addEventListener("keydown", key, true);
    active = { root: root, pos: pos, key: key, from: from };
    show();
  }

  function wire() {
    ["tour-btn", "tour-btn-m"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.setAttribute("aria-label", TXT[lang()].tour);
      b.setAttribute("title", TXT[lang()].tour);
      b.setAttribute("data-tip", TXT[lang()].tour);
      if (!b.dataset.wired) { b.dataset.wired = "1"; b.addEventListener("click", start); }
    });
  }
  function autoStart() {
    if (localStorage.getItem(KEY)) return;
    var t = setInterval(function () {
      if (localStorage.getItem(KEY)) { clearInterval(t); return; }
      if (document.hidden || active) return;
      var ready = kind === "staff" ? !!visible(".kpis") : !!visible("#progress") && !!visible("#talk-btn");
      if (ready) { clearInterval(t); setTimeout(start, 400); }
    }, 500);
  }
  function init() { wire(); autoStart(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id && e.target.id.indexOf("lang-toggle") === 0) setTimeout(wire, 0);
  });
})();
