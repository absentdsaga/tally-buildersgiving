let current = localStorage.getItem("tally-lang") || "en";
let words = null;
function apply() {
  if (!words) return;
  document.documentElement.setAttribute("lang", current);
  document.querySelectorAll("[data-key]").forEach(el => { el.textContent = words[current][el.getAttribute("data-key")]; });
  document.getElementById("lang-toggle").textContent = current.toUpperCase();
}
fetch("/gate.json").then(r => r.json()).then(j => { words = j; apply(); });
document.getElementById("lang-toggle").onclick = () => { current = current === "en" ? "es" : "en"; localStorage.setItem("tally-lang", current); apply(); };
document.getElementById("gate").onsubmit = async e => {
  e.preventDefault();
  const body = JSON.stringify({ pin: document.getElementById("code").value });
  const res = await fetch("/api/staff-login", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  if (res.ok) location.href = "/staff";
  else { document.getElementById("err").classList.remove("hidden"); document.getElementById("code").select(); }
};
