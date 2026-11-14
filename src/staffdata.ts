import { handledSince, getAllUpdates, markHandled, setHoursIfEmpty, setSiteIfEmpty, upsertVolunteer, getVolunteer, volunteerStats, normalizeSite } from "./database.ts";
import { todayNY } from "./update.ts";

export const VOLUNTEER_HOUR_VALUE = 34.88;
export const RATE_SOURCE = "Florida value of a volunteer hour, Independent Sector 2026";
export const ORG = { name: "Little Havana Community Pantry", address: "Miami, FL" };

export function weekStartNY(today = todayNY()): string {
  const d = new Date(today + "T00:00:00Z");
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

const shift = (u: any) => ({
  id: u.id,
  name: u.volunteer_name,
  site: u.site,
  date: u.date,
  hours: u.hours,
  created_at: u.created_at,
  language: u.language,
  line: (u.transcript || "").split(/(?<=[.!?])\s/)[0].slice(0, 140),
});

export function staffData() {
  const all = getAllUpdates();
  const today = todayNY();
  const ws = weekStartNY(today);
  const lastWs = new Date(ws + "T00:00:00Z");
  lastWs.setUTCDate(lastWs.getUTCDate() - 7);
  const lw = lastWs.toISOString().slice(0, 10);
  const real = all.filter((u) => u.counted && u.hours > 0);
  const week = real.filter((u) => u.date >= ws);
  const approved_hours = week.filter((u) => u.approved).reduce((a, u) => a + u.hours, 0);

  const concernRows = all.flatMap((u) => {
    let cs: any[] = [];
    try { cs = JSON.parse(u.concerns || "[]"); } catch {}
    return cs
      .filter((c) => c.urgency === "today" || c.level === "fyi" || (c.urgency === "this_week"))
      .map((c) => ({ level: c.level || (c.urgency === "today" ? "today" : "fyi"), quote_en: c.quote_en || "", id: u.id, name: u.volunteer_name, site: u.site, created_at: u.created_at, quote: c.quote, language: u.language, handled_by: u.handled_by ?? null, handled_at: u.handled_at ?? null }));
  });
  const rank: Record<string, number> = { danger_now: 0, today: 1, fyi: 2 };
  const open = concernRows.filter((c) => !c.handled_at).sort((a, b) => rank[a.level] - rank[b.level] || b.created_at.localeCompare(a.created_at));
  const handled = concernRows.filter((c) => c.handled_at).sort((a, b) => b.handled_at!.localeCompare(a.handled_at!));

  const waiting = all
    .filter((u) => u.counted && !u.approved)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((u) => ({ ...shift(u), needs_hours: false }))
    .concat(all.filter((u) => !u.counted && u.hours <= 0 && !u.duplicate_reason && !u.approved).map((u) => ({ ...shift(u), needs_hours: true })));
  const dups = all.filter((u) => !u.counted && u.duplicate_reason).map((u) => ({ ...shift(u), duplicate_at: u.duplicate_at ?? null, reason: u.duplicate_reason }));

  const names = new Set(all.filter((u) => u.volunteer_name).map((u) => u.volunteer_name));
  const byVol = new Map<string, any>();
  for (const u of real.filter((u) => u.volunteer_name)) {
    const v = byVol.get(u.volunteer_name) || { name: u.volunteer_name, approved: 0, waiting: 0, last: "" };
    if (u.approved) v.approved += u.hours; else v.waiting += u.hours;
    if (u.date > v.last) v.last = u.date;
    byVol.set(u.volunteer_name, v);
  }
  const cutoff = new Date(today + "T00:00:00Z");
  cutoff.setUTCDate(cutoff.getUTCDate() - 21);
  const cut = cutoff.toISOString().slice(0, 10);
  const quiet = [...byVol.values()].filter((v) => v.last <= cut).sort((a, b) => a.last.localeCompare(b.last)).slice(0, 5);
  const bySite = new Map<string, any>();
  for (const u of real.filter((u) => u.approved)) {
    const k = u.site || "";
    const s = bySite.get(k) || { site: k, this_week: 0, last_week: 0 };
    if (u.date >= ws) s.this_week += u.hours;
    else if (u.date >= lw) s.last_week += u.hours;
    bySite.set(k, s);
  }
  return {
    week_start: ws,
    rate: VOLUNTEER_HOUR_VALUE,
    rate_source: RATE_SOURCE,
    approved_hours,
    report_hours: real.filter((u) => u.approved).reduce((a, u) => a + u.hours, 0),
    waiting_hours: week.filter((u) => !u.approved).reduce((a, u) => a + u.hours, 0),
    dollars: Math.round(approved_hours * VOLUNTEER_HOUR_VALUE * 100) / 100,
    volunteers: names.size,
    db_empty: all.length === 0,
    open_concerns: open,
    handled_concerns: handled,
    waiting,
    duplicates: dups,
    quiet,
    by_volunteer: [...byVol.values()],
    by_site: [...bySite.values()],
  };
}

export function handleStaffData(headers: Record<string, string>): Response {
  return json(staffData(), 200, headers);
}

async function body(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

export async function handleHandled(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  if (!b.id) return json({ error: "Missing id" }, 400, headers);
  const ok = markHandled(Number(b.id), String(b.who || "staff"));
  return json({ success: ok }, ok ? 200 : 404, headers);
}

export async function handleHoursPatch(req: Request, id: number, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const hours = Number(b.hours);
  if (!isFinite(hours) || hours <= 0 || hours > 24) return json({ error: "Invalid hours" }, 400, headers);
  const ok = setHoursIfEmpty(id, hours);
  return json({ success: ok }, ok ? 200 : 409, headers);
}

export async function handleSitePatch(req: Request, id: number, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const site = normalizeSite(String(b.site || ""));
  if (!site) return json({ error: "Invalid site" }, 400, headers);
  const ok = setSiteIfEmpty(id, site);
  return json({ success: ok, site }, ok ? 200 : 409, headers);
}

export async function handleVolunteerPost(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = String(b.name || "").trim();
  if (!name) return json({ error: "Missing name" }, 400, headers);
  const gh = b.goal_hours == null ? null : Number(b.goal_hours);
  if (gh !== null && (!isFinite(gh) || gh <= 0 || gh > 5000)) return json({ error: "Invalid goal" }, 400, headers);
  upsertVolunteer(name, gh, b.goal_label ? String(b.goal_label) : null, b.lang === "es" ? "es" : "en");
  return json({ success: true }, 200, headers);
}

export function handleVolunteerStatus(url: URL, headers: Record<string, string>): Response {
  const name = (url.searchParams.get("name") || "").trim();
  if (!name) return json({ error: "Missing name" }, 400, headers);
  const since = url.searchParams.get("since") || "";
  return json({ handled: handledSince(name, since) }, 200, headers);
}

export function handleVolunteerGet(url: URL, headers: Record<string, string>): Response {
  const name = (url.searchParams.get("name") || "").trim();
  if (!name) return json({ error: "Missing name" }, 400, headers);
  const s = volunteerStats(name);
  const v = getVolunteer(name);
  return json({ approved_hours: s.approved_hours, waiting_hours: s.waiting_hours, approved_shifts: s.approved_shifts, goal: v && { goal_hours: v.goal_hours, goal_label: v.goal_label } }, 200, headers);
}

export function sitesList(): string[] {
  const set = new Set<string>(["Food Bank", "Community Center", "Little Havana Kitchen"]);
  for (const u of getAllUpdates()) if (u.site) set.add(u.site);
  return [...set];
}
