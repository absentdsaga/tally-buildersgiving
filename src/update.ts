import { checkDuplicate, insertUpdate, normalizeSite, cleanName, setDuplicateAt, findOpenConcern, volunteerStats, getVolunteer } from "./database.ts";
import { extractUpdate } from "./ai.ts";
import { transcribeAudio } from "./speech.ts";
import { buildSpeakText } from "./speak.ts";
import type { ParsedUpdate, UpdateResult } from "./types.ts";

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export function todayNY(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function clampDate(date: string, now = new Date()): string {
  const today = todayNY(now);
  const ageDays = (Date.parse(today) - Date.parse(date)) / 86400000;
  return ageDays >= 0 && ageDays <= 7 ? date : today;
}

export async function handleUpdate(req: Request, headers: Record<string, string>): Promise<Response> {
  const contentType = req.headers.get("content-type") || "";
  let text = "";
  let volunteerName = "";
  let transcribeMs = 0;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    text = (form.get("text") as string | null) || "";
    volunteerName = (form.get("volunteer_name") as string | null) || "";
    if (audio && audio.size > 0) {
      const t = await transcribeAudio(await audio.arrayBuffer(), audio.name || "audio.webm", audio.type || "audio/webm");
      if (t) {
        text = t.text;
        transcribeMs = t.ms;
      }
    }
  } else {
    try {
      const body = await req.json();
      text = body.text || "";
      volunteerName = body.volunteer_name || "";
    } catch {
      return json({ error: "Invalid JSON" }, 400, headers);
    }
  }

  if (!text.trim()) return json({ error: "Could not understand the update" }, 400, headers);

  const { parsed, ms: extractMs } = await extractUpdate(text);
  if (!parsed) return json({ error: "Could not parse update" }, 400, headers);
  const p: ParsedUpdate = parsed;
  if (!p.transcript) p.transcript = text;
  const deviceName = cleanName(volunteerName);
  const name = deviceName || cleanName(p.volunteer_name);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 3 || (!p.hours && !p.site && !p.site_canonical && p.concerns.length === 0)) {
    return json({ error: "We didn't catch that. Try again?", code: "empty" }, 422, headers);
  }
  p.site = normalizeSite(p.site_canonical || p.site);
  p.date = clampDate(p.date);

  if (!name) return json({ error: "Name needed", code: "name_required" }, 400, headers);
  const needsHours = !p.hours || p.hours <= 0;
  const dup = checkDuplicate(name, p.date, p.site, p.hours, needsHours ? "Needs hours" : "Counted");
  const counted = !needsHours && !dup.isDuplicate;
  const duplicateReason = dup.isDuplicate ? dup.reason ?? null : null;
  const status_label: UpdateResult["status_label"] = needsHours ? "Needs hours" : dup.isDuplicate ? "Duplicate" : "Counted";

  const urgent = p.concerns.filter((c) => c.urgency === "today");
  const repeatConcern = urgent.length > 0 && findOpenConcern(name, p.date, urgent.map((c) => c.quote));
  const storedConcerns = repeatConcern ? p.concerns.filter((c) => c.urgency !== "today") : p.concerns;

  const id = insertUpdate({
    volunteer_name: name,
    site: p.site,
    date: p.date,
    hours: p.hours || 0,
    activities: JSON.stringify(p.activities),
    transcript: p.transcript,
    language: p.language,
    concerns: JSON.stringify(storedConcerns),
    counted,
    duplicate_reason: duplicateReason,
    created_at: new Date().toISOString(),
    approved: false,
    approved_by: null,
    approved_at: null,
    fixed_by: null,
    fixed_at: null,
  });

  setDuplicateAt(id, dup.existingTimestamp ?? "", p.highlight || "");
  const stats = name ? volunteerStats(name) : null;
  const vol = name ? getVolunteer(name) : null;

  const result: any = {
    id,
    volunteer_name: name,
    counted,
    duplicate_reason: duplicateReason,
    duplicate_at: dup.existingTimestamp ?? null,
    date: p.date,
    highlight: p.highlight || "",
    stats: stats && { approved_hours: stats.approved_hours, waiting_hours: stats.waiting_hours, approved_shifts: stats.approved_shifts },
    goal: vol && { goal_hours: vol.goal_hours, goal_label: vol.goal_label },
    has_concern: urgent.length > 0,
    thanks: buildSpeakText({
      kind: needsHours ? "needs_hours" : dup.isDuplicate ? "duplicate" : "counted",
      name, hours: p.hours || 0, site: p.site, language: p.language as any,
      duplicateTime: dup.existingTimestamp ? new Date(dup.existingTimestamp).toLocaleTimeString(p.language === "es" ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : undefined,
      hasConcern: urgent.length > 0, highlight: p.highlight || "",
      milestone: counted && stats && [1, 5, 10, 25, 50].includes(stats.approved_shifts) ? stats.approved_shifts : 0,
    }),
    hours: p.hours || 0,
    site: p.site,
    concerns: p.concerns,
    transcript: p.transcript,
    language: p.language,
    activities: p.activities,
    status_label,
    timings: { transcribe_ms: transcribeMs, extract_ms: extractMs, tts_ms: 0 },
    speak_url: process.env.ELEVENLABS_API_KEY ? "/api/speak?id=" + id : null,
  };
  console.log("[update " + id + "] " + status_label + " transcribe=" + transcribeMs + "ms extract=" + extractMs + "ms");
  return json(result, 200, headers);
}
