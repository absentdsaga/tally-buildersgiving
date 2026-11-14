import { checkDuplicate, insertUpdate } from "./database.ts";
import { extractUpdate } from "./ai.ts";
import { transcribeAudio } from "./speech.ts";
import type { ParsedUpdate, UpdateResult } from "./types.ts";

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
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
  if (volunteerName && !p.volunteer_name) p.volunteer_name = volunteerName;
  const name = p.volunteer_name || "Anonymous";

  const needsHours = !p.hours || p.hours <= 0;
  const dup = checkDuplicate(name, p.date, p.site, p.hours, needsHours ? "Needs hours" : "Counted");
  const counted = !needsHours && !dup.isDuplicate;
  const duplicateReason = dup.isDuplicate ? dup.reason ?? null : null;
  const status_label: UpdateResult["status_label"] = needsHours ? "Needs hours" : dup.isDuplicate ? "Duplicate" : "Counted";

  const id = insertUpdate({
    volunteer_name: name,
    site: p.site,
    date: p.date,
    hours: p.hours || 0,
    activities: JSON.stringify(p.activities),
    transcript: p.transcript,
    language: p.language,
    concerns: JSON.stringify(p.concerns),
    counted,
    duplicate_reason: duplicateReason,
    created_at: new Date().toISOString(),
    approved: false,
    approved_by: null,
    approved_at: null,
    fixed_by: null,
    fixed_at: null,
  });

  const result: UpdateResult & { volunteer_name: string; existing_time: string | null } = {
    id,
    volunteer_name: name,
    counted,
    duplicate_reason: duplicateReason,
    existing_time: dup.existingTimestamp
      ? new Date(dup.existingTimestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
      : null,
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
