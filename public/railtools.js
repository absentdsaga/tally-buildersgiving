(function () {
  const rail = document.querySelector(".vol-body .rail");
  const right = document.querySelector(".vol-body .topbar .right");
  if (!rail || !right) return;
  const ids = ["tour-btn", "speaker-toggle", "lang-toggle"];
  const spacer = document.createElement("span");
  spacer.className = "spacer rail-tools-spacer";
  const mq = matchMedia("(min-width: 1024px)");
  function place() {
    const btns = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (mq.matches) {
      if (!spacer.isConnected) rail.appendChild(spacer);
      btns.forEach((b) => { b.classList.add("nav-item", "in-rail"); rail.appendChild(b); });
    } else {
      spacer.remove();
      btns.forEach((b) => { b.classList.remove("nav-item", "in-rail"); right.appendChild(b); });
    }
  }
  place();
  mq.addEventListener("change", place);
})();
