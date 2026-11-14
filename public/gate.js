let current = localStorage.getItem("tally-lang") || "en";
let words = null;
let errKey = null;
function showErr() {
  const el = document.getElementById("err");
  if (!errKey) { el.classList.add("hidden"); return; }
  el.textContent = words[current][errKey];
  el.classList.remove("hidden");
}
function apply() {
  if (!words) return;
  document.documentElement.setAttribute("lang", current);
  document.querySelectorAll("[data-key]").forEach(el => { el.textContent = words[current][el.getAttribute("data-key")]; });
  document.getElementById("lang-toggle").textContent = current.toUpperCase();
  showErr();
}
fetch("/gate.json").then(r => r.json()).then(j => { words = j; apply(); });
document.getElementById("lang-toggle").onclick = () => { current = current === "en" ? "es" : "en"; localStorage.setItem("tally-lang", current); apply(); };
async function submit(pin) {
  const code = document.getElementById("code");
  let res;
  try {
    res = await fetch("/api/staff-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pin.trim() }) });
  } catch { errKey = "down"; showErr(); return; }
  if (res.ok) { location.href = "/staff"; return; }
  errKey = res.status === 401 ? (document.getElementById("demo") ? "wrong" : "wrongReal") : "down";
  showErr();
  if (res.status === 401) code.select();
}
document.getElementById("gate").onsubmit = e => { e.preventDefault(); submit(document.getElementById("code").value); };
const demoBtn = document.getElementById("demo-btn");
if (demoBtn) demoBtn.onclick = () => { document.getElementById("code").value = "1121"; submit("1121"); };
