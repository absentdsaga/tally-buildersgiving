(function () {
  var TXT = {
    en: { next: "Next", skip: "Skip", done: "Done", tour: "Tour", of: "Step {a} of {b}" },
    es: { next: "Siguiente", skip: "Omitir", done: "Listo", tour: "Recorrido", of: "Paso {a} de {b}" }
  };
  var SETS = {
    volunteer: [
      { sel: "#home-next", en: "This card always says what to do next. Arrive, grab a task, wrap up. Nobody has to hunt for a coordinator.", es: "Esta tarjeta siempre dice qué hacer ahora. Llegar, tomar una tarea, terminar. Nadie tiene que buscar al coordinador." },
      { sel: "#today-card", en: "Parking, what to wear, where bags go. Everything your host would tell you at the door.", es: "Estacionamiento, qué ponerte, dónde van las bolsas. Todo lo que tu anfitrión te diría en la puerta." },
      { sel: '[data-tab="shift"]', en: "Done? Tap Talk and say it: \u201cThree hours, sorted cans.\u201d English, Spanish or both. Tally counts it once and thanks you by name.", es: "¿Terminaste? Toca Hablar y dilo: \u201cTres horas, ordené latas.\u201d En inglés, español o los dos. Tally lo cuenta una vez y te da las gracias por tu nombre." },
      { sel: '[data-tab="tasks"]', en: "Standing around? Tap I'm free and Tally sends you where you're needed.", es: "¿Sin nada que hacer? Toca Estoy libre y Tally te manda adonde te necesitan." },
      { sel: '[data-tab="chat"]', en: "Message your host or the whole crew.", es: "Escribe a tu anfitrión o a todo el equipo." },
      { sel: '[data-tab="ask"]', en: "Ask anything about today. Answers come from your host's notes. If the notes don't say, Tally tells you who to ask.", es: "Pregunta lo que sea de hoy. Las respuestas salen de las notas de tu anfitrión. Si no lo dicen, Tally te dice a quién preguntar." },
      { sel: '[data-tab="report"]', en: "Saw something wrong? Tell us, privately if you want. You'll hear back when staff handle it.", es: "¿Viste algo mal? Cuéntanos, en privado si quieres. Te avisamos cuando el equipo lo atienda." }
    ],
    staff: [
      { sel: ".head-row .headline", en: "Your week in one line: who showed up, how many hours, and what's waiting on you.", es: "Tu semana en una línea: quién vino, cuántas horas y qué te está esperando." },
      { sel: "#sec-needs", en: "What volunteers flagged, most urgent first. Mark handled and the volunteer hears back, so nothing dies in a group chat.", es: "Lo que señalaron los voluntarios, lo más urgente primero. Marca atendido y el voluntario recibe aviso, así nada se pierde en un chat." },
      { sel: "#sec-tasks", en: "Post tasks here. When a volunteer taps I'm free, Tally hands them the next one. Nobody waits around to find you.", es: "Publica tareas aquí. Cuando un voluntario toca Estoy libre, Tally le da la siguiente. Nadie espera para encontrarte." },
      { sel: "#sec-updates", en: "Approve hours in one tap. Each approved shift gets a proof code a school or court can check.", es: "Aprueba horas con un toque. Cada turno aprobado recibe un código que una escuela o una corte puede verificar." },
      { sel: "#sec-messages", en: "Message one volunteer or everyone on shift.", es: "Escribe a un voluntario o a todos en turno." },
      { sel: "#report-btn", en: "Your grant report in one download. No rebuilding hours from paper sheets.", es: "Tu informe de subvención en una descarga. Sin reconstruir horas de hojas de papel." }
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
    a.root.classList.remove("on");
    setTimeout(function () { a.root.remove(); }, 220);
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

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var moving = false, token = 0;
    function pos() {
      if (moving) return;
      var el = visible(steps[i].sel);
      if (!el) return;
      var r = el.getBoundingClientRect(), p = 8, vw = window.innerWidth, vh = window.innerHeight;
      var top = Math.max(8, r.top - p), bot = Math.min(vh - 8, r.bottom + p);
      hole.style.top = top + "px"; hole.style.left = (r.left - p) + "px";
      hole.style.width = (r.width + p * 2) + "px"; hole.style.height = Math.max(0, bot - top) + "px";
      var cw = Math.min(320, vw - 24);
      card.style.width = cw + "px";
      var ch = card.offsetHeight, ct = bot + 12;
      if (ct + ch > vh - 12) ct = top - 12 - ch;
      if (ct < 12) ct = vh - ch - 16;
      var left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12);
      card.style.top = ct + "px"; card.style.left = left + "px";
    }
    function settle(el, done) {
      var last = null, still = 0, t0 = performance.now();
      (function tick() {
        var y = el.getBoundingClientRect().top;
        still = last !== null && Math.abs(y - last) < 0.5 ? still + 1 : 0;
        last = y;
        if (still >= 4 || performance.now() - t0 > 1000) done(); else requestAnimationFrame(tick);
      })();
    }
    function show() {
      var s = steps[i], el = visible(s.sel);
      if (!el) { go(1); return; }
      var my = ++token;
      card.classList.remove("in");
      moving = true;
      setTimeout(function () {
        if (my !== token) return;
        text.textContent = s[lang()];
        dots.innerHTML = steps.map(function (_, n) { return '<i class="' + (n === i ? "on" : "") + '"></i>'; }).join("");
        dots.setAttribute("aria-label", L.of.replace("{a}", i + 1).replace("{b}", steps.length));
        next.textContent = i === steps.length - 1 ? L.done : L.next;
        var r = el.getBoundingClientRect(), tall = r.height > window.innerHeight * 0.55;
        var inView = r.top >= 70 && r.bottom <= window.innerHeight - 90;
        if (!inView) el.scrollIntoView({ block: tall ? "start" : "center", behavior: reduce ? "auto" : "smooth" });
        settle(el, function () {
          if (my !== token) return;
          moving = false; pos();
          requestAnimationFrame(function () { card.classList.add("in"); card.focus({ preventScroll: true }); });
        });
      }, root.classList.contains("on") ? 140 : 0);
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
    requestAnimationFrame(function () { root.classList.add("on"); });
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
      var ready = kind === "staff" ? !!visible(".kpis") : !!visible("#home-next") && !!visible("#today-card");
      if (ready) { clearInterval(t); setTimeout(start, 400); }
    }, 500);
  }
  function init() { wire(); autoStart(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id && e.target.id.indexOf("lang-toggle") === 0) setTimeout(wire, 0);
  });
})();
