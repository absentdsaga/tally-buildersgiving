import { volunteerStats } from "./database.ts";
import { ORG } from "./staffdata.ts";

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const W = {
  en: { title: "Volunteer hours letter", sub: "A record of volunteer hours with the details schools and courts usually ask for.", date: "Date", site: "Site", hours: "Hours", total: "Total approved hours", waiting: "Hours still waiting for staff confirmation are not included.", confirmed: "Confirmed by: ________ (staff name, title, phone, email, date)", print: "Print or save as PDF", none: "No approved shifts yet.", site_none: "Site not said", volunteer: "Volunteer", code: "Check code" },
  es: { title: "Carta de horas de voluntariado", sub: "Un registro de horas de voluntariado con los detalles que escuelas y cortes suelen pedir.", date: "Fecha", site: "Sitio", hours: "Horas", total: "Total de horas aprobadas", waiting: "Las horas que aún esperan confirmación del personal no están incluidas.", confirmed: "Confirmado por: ________ (nombre, cargo, teléfono, correo, fecha)", print: "Imprimir o guardar como PDF", none: "Aún no hay turnos aprobados.", site_none: "Sitio no indicado", volunteer: "Voluntario", code: "Código" },
};

export function letterHtml(name: string, lang: "en" | "es"): string {
  const s = volunteerStats(name);
  const en = W.en, o = W[lang];
  const both = (k: keyof typeof en) => (lang === "es" ? esc(o[k]) + " / " + esc(en[k]) : esc(en[k]));
  const rows = s.shifts.map((u) => `<tr><td>${esc(u.date)}</td><td>${esc(u.site || o.site_none)}</td><td class="n">${u.hours}</td><td>${esc(u.proof_code || "")}</td></tr>`).join("") || `<tr><td colspan="4">${esc(o.none)}</td></tr>`;
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(en.title)} - ${esc(name)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%232f6b4f'/%3E%3C/svg%3E">
<style>
body{font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222;max-width:720px;margin:0 auto;padding:24px}
h1{font-size:26px;margin:0}h2{font-size:15px;font-weight:400;color:#555;margin:4px 0 24px}
table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:8px;border-bottom:1px solid #ccc}td.n,th.n{text-align:right}
.total{font-size:20px;font-weight:700}.sig{margin-top:56px;border-top:1px solid #222;padding-top:8px}.note{color:#555}
body{font-family:"Inter Tight",-apple-system,"Segoe UI",system-ui,sans-serif;background:#f3f3f3;color:#17181c;font-variant-numeric:tabular-nums}
h1{font-weight:500;letter-spacing:-.03em}h2{color:#5f6661}.note{color:#5f6661}
table{background:#eaeeea;border-radius:20px;overflow:hidden}th,td{border-bottom:1px solid #d3d8d3}
.total{background:#f0faa0;border-radius:999px;display:inline-block;padding:8px 20px;font-weight:500}
.sig{border-top:1px solid #17181c}
button{min-height:48px;padding:0 24px;font-size:15px;font-weight:500;border:0;border-radius:999px;background:#17181c;color:#fff;cursor:pointer;margin-bottom:24px}
button:focus-visible{outline:2px solid #17181c;outline-offset:3px}
@media print{button{display:none}body{padding:0;background:#fff}table{background:none}.total{background:none;padding:0}}
</style></head><body>
<button onclick="window.print()">${esc(o.print)}</button>
<h1>${both("title")}</h1>
<h2>${esc(ORG.name)}, ${esc(ORG.address)}<br>${esc(o.sub)}${lang === "es" ? "<br>" + esc(en.sub) : ""}</h2>
<p><strong>${both("volunteer")}:</strong> ${esc(name)}</p>
<table><thead><tr><th>${both("date")}</th><th>${both("site")}</th><th class="n">${both("hours")}</th><th>${esc(o.code)}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="total">${both("total")}: ${s.approved_hours}</p>
<p class="note">${esc(o.waiting)}${lang === "es" ? "<br>" + esc(en.waiting) : ""}</p>
<div class="sig">${esc(o.confirmed)}${lang === "es" ? "<br>" + esc(en.confirmed) : ""}</div>
</body></html>`;
}
