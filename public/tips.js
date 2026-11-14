(() => {
  let tip;
  const show = el => {
    if (!tip) { tip = document.createElement("div"); tip.id = "rail-tip"; tip.setAttribute("aria-hidden", "true"); document.body.appendChild(tip); }
    const r = el.getBoundingClientRect();
    tip.textContent = el.dataset.tip;
    tip.style.left = r.right + 14 + "px";
    tip.style.top = r.top + r.height / 2 + "px";
    tip.style.opacity = "1";
  };
  const hide = () => { if (tip) tip.style.opacity = "0"; };
  const pick = e => e.target.closest && e.target.closest(".rail .nav-item[data-tip]");
  document.addEventListener("mouseover", e => { const el = pick(e); if (el) show(el); });
  document.addEventListener("mouseout", e => { if (pick(e)) hide(); });
  document.addEventListener("focusin", e => { const el = pick(e); if (el) show(el); });
  document.addEventListener("focusout", e => { if (pick(e)) hide(); });
  window.addEventListener("scroll", hide, true);
})();
