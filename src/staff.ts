import { getAllUpdates, approveUpdate, fixHours, loadSampleWeek, grantReportRows, getUpdate, volunteerStats } from "./database.ts";
import { VOLUNTEER_HOUR_VALUE, RATE_SOURCE } from "./staffdata.ts";
import { buildSpeakText, speakLanguage } from "./speak.ts";
import { synthesizeSpeech } from "./speech.ts";
import type { Language } from "./types.ts";

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export async function handleSpeak(url: URL, headers: Record<string, string>): Promise<Response> {
  const raw = url.searchParams.get("text");
  if (raw) {
    const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
    const out = await synthesizeSpeech(raw.slice(0, 300), lang);
    if (!out) return json({ error: "Speech unavailable" }, 503, headers);
    return new Response(out.audio, { headers: { ...headers, "Content-Type": "audio/mpeg", "X-TTS-Ms": String(out.ms) } });
  }
  const id = Number(url.searchParams.get("id"));
  const row = getAllUpdates().find((u) => u.id === id);
  if (!row) return json({ error: "Not found" }, 404, headers);
  const concerns = JSON.parse(row.concerns || "[]");
  const kind = !row.hours || row.hours <= 0 ? "needs_hours" : row.counted ? "counted" : "duplicate";
  const when = row.duplicate_at ? new Date(row.duplicate_at).toLocaleTimeString(row.language === "es" ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : undefined;
  const st = volunteerStats(row.volunteer_name);
  const ms = [1, 5, 10, 25, 50];
  const milestone = row.counted && ms.includes(st.approved_shifts) ? st.approved_shifts : 0;
  const text = buildSpeakText({
    kind,
    name: row.volunteer_name,
    hours: row.hours,
    site: row.site,
    language: row.language as Language,
    duplicateTime: when,
    hasConcern: concerns.some((c: any) => c.urgency === "today"),
    highlight: row.highlight || "",
    milestone,
  });
  const out = await synthesizeSpeech(text, speakLanguage(row.language as Language));
  if (!out) return json({ error: "Speech unavailable" }, 503, headers);
  return new Response(out.audio, {
    headers: { ...headers, "Content-Type": "audio/mpeg", "X-TTS-Ms": String(out.ms), "X-Speak-Text": encodeURIComponent(text) },
  });
}

async function body(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

export async function handleApprove(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  if (!b.id) return json({ error: "Missing id" }, 400, headers);
  const who = String(b.who || "").trim();
  if (!who) return json({ error: "Staff name needed" }, 400, headers);
  const ok = approveUpdate(Number(b.id), who);
  return json({ success: ok }, ok ? 200 : 404, headers);
}

export async function handleFixHours(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const hours = Number(b.hours);
  if (!b.id || !isFinite(hours) || hours <= 0 || hours > 24) return json({ error: "Invalid id or hours" }, 400, headers);
  const who = String(b.who || "").trim();
  if (!who) return json({ error: "Staff name needed" }, 400, headers);
  const ok = fixHours(Number(b.id), hours, who);
  return json({ success: ok }, ok ? 200 : 404, headers);
}

export function handleReport(weekStart: string, headers: Record<string, string>): Response {
  const rows = getAllUpdates().filter((r) => r.counted && r.approved && r.hours > 0).sort((a, b) => a.date.localeCompare(b.date));
  const q = (v: unknown) => "\"" + String(v ?? "").replace(/"/g, "\"\"") + "\"";
  const lines = ["name,date,site,hours_reported,hours_approved,approved_by,approved_at,language,dollar_value"];
  let total = 0;
  for (const r of rows) {
    total += r.hours;
    lines.push([q(r.volunteer_name || "Name not given"), r.date, q(r.site || "Site not said"), q(r.reported_hours ?? r.hours), r.hours, q(r.approved_by), q(r.approved_at), r.language, (r.hours * VOLUNTEER_HOUR_VALUE).toFixed(2)].join(","));
  }
  lines.push([q("TOTAL"), "", "", "", total, "", "", "", (total * VOLUNTEER_HOUR_VALUE).toFixed(2)].join(","));
  lines.push(q("Rate: $" + VOLUNTEER_HOUR_VALUE + " per hour. " + RATE_SOURCE));
  return new Response(lines.join("\n") + "\n", {
    headers: { ...headers, "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=grant-report.csv" },
  });
}

export function handleSample(headers: Record<string, string>): Response {
  const n = loadSampleWeek();
  return json({ loaded: n }, n ? 200 : 409, headers);
}
