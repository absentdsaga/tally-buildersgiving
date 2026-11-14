import { getByProofCode } from "./database.ts";
import { ORG } from "./staffdata.ts";

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const miami = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" }) + " (Miami time)";

const STYLE = `body{font:17px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222;max-width:640px;margin:0 auto;padding:32px 24px}
h1{font-size:28px;margin:0 0 4px}.org{color:#555;margin-bottom:24px}dl{margin:0}dt{color:#666;font-size:14px;margin-top:14px}dd{margin:0;font-size:19px}
.code{font:700 40px/1.2 ui-monospace,Menlo,monospace;letter-spacing:6px;margin:24px 0 8px}.check{color:#555;font-size:15px}
body{font-family:"Inter Tight",-apple-system,"Segoe UI",system-ui,sans-serif;background:#f3f3f3;color:#17181c;font-variant-numeric:tabular-nums}
h1{font-weight:500;letter-spacing:-.03em}.org,.check,dt{color:#5f6661}
dl{background:#eaeeea;border-radius:28px;padding:8px 24px 20px}
.code{display:inline-block;background:#f0faa0;border-radius:999px;padding:6px 24px}
button{min-height:48px;padding:0 24px;font-size:15px;font-weight:500;border:0;border-radius:999px;background:#17181c;color:#fff;cursor:pointer;margin-bottom:24px}
button:focus-visible{outline:2px solid #17181c;outline-offset:3px}
@media print{button{display:none}body{padding:0;background:#fff}dl{background:none;padding:0}.code{background:none;padding:0}}`;

export function proofHtml(code: string, origin: string): { html: string; status: number } {
  const u = getByProofCode(code);
  const head = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Proof of volunteer hours</title><style>${STYLE}</style></head><body>`;
  if (!u) return { html: head + `<h1>Proof of volunteer hours</h1><p>No record with this code.</p></body></html>`, status: 404 };
  const reported = u.reported_hours && u.reported_hours !== u.hours ? `<dt>Hours reported</dt><dd>${esc(String(u.reported_hours))}</dd>` : "";
  const c = u.proof_code!;
  return {
    status: 200,
    html: head + `<button onclick="window.print()">Print</button><h1>Proof of volunteer hours</h1><div class="org">${esc(ORG.name)}, ${esc(ORG.address)}</div>
<dl><dt>Volunteer</dt><dd>${esc(u.volunteer_name)}</dd><dt>Hours approved</dt><dd>${esc(String(u.hours))}</dd>${reported}
<dt>Site</dt><dd>${esc(u.site || "Site not said")}</dd><dt>Shift date</dt><dd>${esc(u.date)}</dd>
<dt>Approved by</dt><dd>Approved by ${esc(u.approved_by || "staff")} on ${esc(miami(u.approved_at || u.created_at))}</dd></dl>
<div class="code">${esc(c)}</div><div class="check">Check this record at ${esc(origin)}/proof/${esc(c)}</div></body></html>`,
  };
}
