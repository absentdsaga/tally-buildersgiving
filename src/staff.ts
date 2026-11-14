import { getAllUpdates, approveUpdate, fixHours, loadSampleWeek, grantReportRows } from "./database.ts";
import { buildSpeakText, speakLanguage } from "./speak.ts";
import { synthesizeSpeech } from "./speech.ts";
import type { Language } from "./types.ts";

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export async function handleSpeak(url: URL, headers: Record<string, string>): Promise<Response> {
  const id = Number(url.searchParams.get("id"));
  const row = getAllUpdates().find((u) => u.id === id);
  if (!row) return json({ error: "Not found" }, 404, headers);
  const concerns = JSON.parse(row.concerns || "[]");
  const kind = !row.hours || row.hours <= 0 ? "needs_hours" : row.counted ? "counted" : "duplicate";
  const when = /at (\d{1,2}:\d{2} ?[AP]M)/i.exec(row.duplicate_reason || "")?.[1];
  const text = buildSpeakText({
    kind,
    name: row.volunteer_name,
    hours: row.hours,
    site: row.site,
    language: row.language as Language,
    duplicateTime: when,
    hasConcern: concerns.some((c: any) => c.urgency === "today"),
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
  const ok = approveUpdate(Number(b.id), String(b.who || "staff"));
  return json({ success: ok }, ok ? 200 : 404, headers);
}

export async function handleFixHours(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const hours = Number(b.hours);
  if (!b.id || !isFinite(hours) || hours <= 0 || hours > 24) return json({ error: "Invalid id or hours" }, 400, headers);
  const ok = fixHours(Number(b.id), hours, String(b.who || "staff"));
  return json({ success: ok }, ok ? 200 : 404, headers);
}

export function handleReport(weekStart: string, headers: Record<string, string>): Response {
  const rows = grantReportRows(weekStart);
  const sums = new Map<string, number>();
  for (const r of rows.filter((r) => r.counted && r.approved)) {
    const k = r.volunteer_name + "\u0000" + r.site;
    sums.set(k, (sums.get(k) || 0) + r.hours);
  }
  const q = (s: string) => "\"" + s.replace(/"/g, "\"\"") + "\"";
  const lines = ["volunteer,site,approved_hours"];
  for (const [k, h] of sums) {
    const [v, s] = k.split("\u0000");
    lines.push(q(v) + "," + q(s) + "," + h);
  }
  lines.push("");
  lines.push("duplicates_caught," + rows.filter((r) => !r.counted && r.duplicate_reason).length);
  return new Response(lines.join("\n") + "\n", {
    headers: { ...headers, "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=grant-report-" + weekStart + ".csv" },
  });
}

export function handleSample(headers: Record<string, string>): Response {
  const n = loadSampleWeek();
  return json({ loaded: n }, n ? 200 : 409, headers);
}
