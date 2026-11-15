import type { Database } from "bun:sqlite";
import { initTasks, seedTasks } from "./tasks.ts";
import { initMessages, seedMessages } from "./messages.ts";
import { initReports } from "./reports.ts";
const todayNY = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

let db: Database;

export function initEvent(d: Database): void {
  db = d;
  db.run("CREATE TABLE IF NOT EXISTS events (date TEXT PRIMARY KEY, name TEXT NOT NULL, place TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, host TEXT NOT NULL, host_where TEXT NOT NULL, goal TEXT NOT NULL, goal_target INTEGER NOT NULL, goal_done INTEGER NOT NULL, goal_unit TEXT NOT NULL DEFAULT 'boxes', know TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', seeded INTEGER NOT NULL DEFAULT 0)");
  initTasks(d);
  initMessages(d);
  initReports(d);
  db.run("CREATE TABLE IF NOT EXISTS checkins (name_key TEXT NOT NULL, name TEXT NOT NULL, date TEXT NOT NULL, at TEXT NOT NULL, left_at TEXT, first_shift INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (name_key, date))");
}

const key = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export function eventStatus(startAt: string, endAt: string, now = Date.now()): { status: "soon" | "now" | "wrapping" | "over"; minutes: number } {
  const s = Date.parse(startAt), e = Date.parse(endAt);
  if (now < s) return { status: "soon", minutes: Math.ceil((s - now) / 60000) };
  if (now >= e) return { status: "over", minutes: 0 };
  if (e - now <= 30 * 60000) return { status: "wrapping", minutes: Math.ceil((e - now) / 60000) };
  return { status: "now", minutes: Math.ceil((e - now) / 60000) };
}

export function demoWindow(now = Date.now()): { start: Date; end: Date } {
  const start = new Date(Math.floor(now / 3600000) * 3600000 - 3600000);
  return { start, end: new Date(start.getTime() + 4 * 3600000) };
}

const demoAllowed = () => process.env.DEMO_SEED !== "0" && !db.prepare("SELECT 1 FROM meta WHERE k = 'demo_cleared'").get();

export function getEvent(date = todayNY()) {
  let r = db.prepare("SELECT * FROM events WHERE date = ?").get(date) as any;
  if (!r && date === todayNY() && demoAllowed()) { seedEvent(); r = db.prepare("SELECT * FROM events WHERE date = ?").get(date) as any; }
  if (!r) return null;
  if (r.seeded) { const w = demoWindow(); r.start_at = w.start.toISOString(); r.end_at = w.end.toISOString(); }
  let know: string[] = [];
  try { know = JSON.parse(r.know); } catch {}
  return { ...r, know, ...eventStatus(r.start_at, r.end_at), seeded: !!r.seeded };
}

export function saveEvent(b: any, date = todayNY()) {
  const s = (v: any, n = 200) => String(v ?? "").trim().slice(0, n);
  const know = (Array.isArray(b.know) ? b.know : String(b.know || "").split(/\r?\n/)).map((l: any) => s(l, 160)).filter(Boolean).slice(0, 5);
  const start = new Date(b.start_at), end = new Date(b.end_at);
  if (!s(b.name) || isNaN(+start) || isNaN(+end) || end <= start) return null;
  const target = Math.max(0, Math.min(100000, Math.round(Number(b.goal_target) || 0)));
  const done = Math.max(0, Math.min(100000, Math.round(Number(b.goal_done) || 0)));
  db.run(
    `INSERT INTO events (date, name, place, start_at, end_at, host, host_where, goal, goal_target, goal_done, goal_unit, know, notes, seeded)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)
     ON CONFLICT(date) DO UPDATE SET name=excluded.name, place=excluded.place, start_at=excluded.start_at, end_at=excluded.end_at, host=excluded.host, host_where=excluded.host_where, goal=excluded.goal, goal_target=excluded.goal_target, goal_done=excluded.goal_done, goal_unit=excluded.goal_unit, know=excluded.know, notes=excluded.notes, seeded=0`,
    date, s(b.name), s(b.place), start.toISOString(), end.toISOString(), s(b.host, 60) || "Staff", s(b.host_where) || "the front table", s(b.goal), target, done, s(b.goal_unit, 20) || "boxes", JSON.stringify(know), s(b.notes, 2000),
  );
  return getEvent(date);
}

export function seedEvent(now = new Date()): boolean {
  const date = todayNY(now);
  const ex = db.prepare("SELECT seeded FROM events WHERE date = ?").get(date) as any;
  if (ex) { if (ex.seeded) { const w = demoWindow(now.getTime()); db.run("UPDATE events SET start_at=?, end_at=? WHERE date=? AND seeded=1", w.start.toISOString(), w.end.toISOString(), date); seedTasks(date); seedMessages(); const st = db.prepare("SELECT start_at FROM events WHERE date = ?").get(date) as any; const at = new Date(Date.parse(st.start_at) + 5 * 60000).toISOString(); for (const n of ["Rosa", "Andre", "Keisha"]) db.run("INSERT OR IGNORE INTO checkins (name_key, name, date, at, first_shift) VALUES (?,?,?,?,0)", key(n), n, date, at); } return false; }
  const { start, end } = demoWindow(now.getTime());
  db.run(
    "INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)",
    date, "Community Food Drive", "Riverside Pantry", start.toISOString(), end.toISOString(), "Maria", "the front table",
    "Pack 300 boxes for 300 families", 300, 182, "boxes",
    JSON.stringify(["Park in the back lot, not on Oak Street.", "Wear closed-toe shoes and your Tally badge.", "Bags go on the blue cart by door 2.", "Bathrooms are past the water station. Take a water break every hour."]),
    "Don't give clients your phone number or money.\nDon't give clients rides. Tell Maria if someone asks.\nBreaks: 15 minutes, ask your table lead.",
  );
  seedTasks(date);
  seedMessages();
  const at = new Date(start.getTime() + 5 * 60000).toISOString();
  for (const n of ["Rosa", "Andre", "Keisha"]) db.run("INSERT OR IGNORE INTO checkins (name_key, name, date, at, first_shift) VALUES (?,?,?,?,0)", key(n), n, date, at);
  return true;
}

export function checkIn(name: string, firstShift = false, now = new Date()) {
  const date = todayNY(now);
  db.run("INSERT OR IGNORE INTO checkins (name_key, name, date, at, first_shift) VALUES (?,?,?,?,?)", key(name), name, date, now.toISOString(), firstShift ? 1 : 0);
  return getCheckin(name, date);
}

export function getCheckin(name: string, date = todayNY()) {
  return (db.prepare("SELECT name, at, left_at, first_shift FROM checkins WHERE name_key = ? AND date = ?").get(key(name), date) as any) ?? null;
}

export function checkOut(name: string, date = todayNY()): void {
  db.run("UPDATE checkins SET left_at = COALESCE(left_at, ?) WHERE name_key = ? AND date = ?", new Date().toISOString(), key(name), date);
}

export function checkedInNow(date = todayNY()) {
  return db.prepare("SELECT name, at, first_shift FROM checkins WHERE date = ? AND left_at IS NULL ORDER BY at ASC").all(date) as any[];
}
