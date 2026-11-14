import { json, body } from "./today.ts";
import { cleanName } from "./database.ts";
import { getCheckin } from "./event.ts";
import { transcribeAudio } from "./speech.ts";
import { teamThread, hostThread, peerThread, getThread, canRead, sendMessage, visibleThreads, messagesSince, threadMessages, reachable, key } from "./messages.ts";

const vol = (name: string) => ({ kind: "volunteer" as const, name });
const STAFF = { kind: "staff" as const };

export function handleMessagesGet(url: URL, headers: Record<string, string>): Response {
  const name = cleanName(url.searchParams.get("name") || "");
  if (!name) return json({ error: "Name needed" }, 400, headers);
  const v = vol(name);
  const since = Number(url.searchParams.get("since") || 0) || 0;
  const tid = Number(url.searchParams.get("thread") || 0);
  if (tid && !canRead(getThread(tid), v)) return json({ error: "Not allowed" }, 403, headers);
  const msgs = since || !tid ? messagesSince(v, since, tid || undefined) : threadMessages(v, tid);
  return json({ checked_in: !!getCheckin(name), threads: visibleThreads(v), messages: msgs, reachable: reachable(name) }, 200, headers);
}

export async function handleMessagePost(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = cleanName(String(b.name || ""));
  if (!name) return json({ error: "Name needed" }, 400, headers);
  const device = String(b.device || "").slice(0, 80);
  let tid = Number(b.thread_id || 0);
  if (!tid && b.with) {
    const other = cleanName(String(b.with));
    if (!other || key(other) === key(name)) return json({ error: "Pick a teammate" }, 400, headers);
    if (!getCheckin(name) || !getCheckin(other)) return json({ error: "Only people checked in today can be messaged" }, 403, headers);
    tid = peerThread(name, other);
  } else if (!tid && b.host) tid = hostThread(name);
  else if (!tid && b.team) tid = teamThread();
  const t = getThread(tid);
  if (!canRead(t, vol(name))) return json({ error: "Not allowed" }, 403, headers);
  const m = sendMessage(tid, "volunteer", name, device, String(b.body || ""), b.lang === "es" ? "es" : "en");
  if (!m) return json({ error: "Message is empty" }, 400, headers);
  const { sender_device, ...out } = m;
  return json({ message: out, thread_id: tid }, 200, headers);
}

export async function handleMessageVoice(req: Request, headers: Record<string, string>): Promise<Response> {
  try {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    if (!audio || !audio.size) return json({ error: "No audio" }, 400, headers);
    const t = await transcribeAudio(await audio.arrayBuffer(), audio.name || "audio.webm", audio.type || "audio/webm");
    if (!t || !t.text.trim()) return json({ error: "Could not transcribe" }, 422, headers);
    return json({ text: t.text }, 200, headers);
  } catch { return json({ error: "Bad request" }, 400, headers); }
}

export function handleStaffMessagesGet(url: URL, headers: Record<string, string>): Response {
  const since = Number(url.searchParams.get("since") || 0) || 0;
  const tid = Number(url.searchParams.get("thread") || 0);
  const msgs = since || !tid ? messagesSince(STAFF, since, tid || undefined) : threadMessages(STAFF, tid);
  return json({ threads: visibleThreads(STAFF), messages: msgs }, 200, headers);
}

export async function handleStaffMessagePost(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const who = String(b.who || "").trim();
  if (!who) return json({ error: "Staff name needed" }, 400, headers);
  let tid = Number(b.thread_id || 0);
  if (!tid && b.to) tid = hostThread(cleanName(String(b.to)) || String(b.to));
  else if (!tid && b.team) tid = teamThread();
  if (!getThread(tid)) return json({ error: "Thread not found" }, 404, headers);
  const m = sendMessage(tid, "staff", who, "", String(b.body || ""), b.lang === "es" ? "es" : "en");
  if (!m) return json({ error: "Message is empty" }, 400, headers);
  const { sender_device, ...out } = m;
  return json({ message: out, thread_id: tid }, 200, headers);
}

export function handleStaffDm(url: URL, headers: Record<string, string>): Response {
  const n = cleanName(url.searchParams.get("name") || "");
  if (!n) return json({ error: "Name needed" }, 400, headers);
  return json({ thread_id: hostThread(n) }, 200, headers);
}
