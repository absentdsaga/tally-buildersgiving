import { getEvent, saveEvent, checkIn, getCheckin } from "./event.ts";
import { hasAnyUpdate, cleanName } from "./database.ts";
import { tasksDoneBy } from "./tasks.ts";

const todayNY = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
export async function body(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

export function todayPayload(name: string) {
  const ev = getEvent();
  return { now: new Date().toISOString(), date: todayNY(), event: ev, checkin: name ? getCheckin(name) : null, tasks_done: name ? tasksDoneBy(name) : [], first_time: !!name && !hasAnyUpdate(name) };
}

export function handleToday(url: URL, headers: Record<string, string>): Response {
  return json(todayPayload(cleanName(url.searchParams.get("name") || "")), 200, headers);
}

export async function handleCheckin(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = cleanName(String(b.name || ""));
  if (!name) return json({ error: "Name needed" }, 400, headers);
  const first = !hasAnyUpdate(name) && !getCheckin(name);
  const c = checkIn(name, first);
  return json({ checkin: c, ...todayPayload(name) }, 200, headers);
}

export async function handleEventPost(req: Request, headers: Record<string, string>): Promise<Response> {
  const ev = saveEvent(await body(req));
  return ev ? json({ event: ev }, 200, headers) : json({ error: "Name and a start before the end are needed" }, 400, headers);
}
