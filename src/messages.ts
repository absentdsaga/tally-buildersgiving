import type { Database } from "bun:sqlite";
import { getCheckin, checkedInNow } from "./event.ts";

let db: Database;
const todayNY = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
export const key = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export function initMessages(d: Database): void {
  db = d;
  db.run("CREATE TABLE IF NOT EXISTS threads (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, a TEXT NOT NULL DEFAULT '', b TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE(kind, a, b))");
  db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id INTEGER NOT NULL, sender_kind TEXT NOT NULL, sender_name TEXT NOT NULL, sender_device TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en', created_at TEXT NOT NULL, seeded INTEGER NOT NULL DEFAULT 0, body_en TEXT NOT NULL DEFAULT '')");
}

function thread(kind: string, a: string, b: string): number {
  db.run("INSERT OR IGNORE INTO threads (kind, a, b, created_at) VALUES (?,?,?,?)", kind, a, b, new Date().toISOString());
  return (db.prepare("SELECT id FROM threads WHERE kind = ? AND a = ? AND b = ?").get(kind, a, b) as any).id;
}
export const teamThread = () => thread("team", "", "");
export const hostThread = (name: string) => thread("dm", key(name), "staff");
export const peerThread = (n1: string, n2: string) => { const [a, b] = [key(n1), key(n2)].sort(); return thread("dm", a, b); };

export function getThread(id: number) { return (db.prepare("SELECT * FROM threads WHERE id = ?").get(id) as any) ?? null; }

export function canRead(t: any, viewer: { kind: "staff" } | { kind: "volunteer"; name: string }): boolean {
  if (!t) return false;
  if (viewer.kind === "staff") return true;
  if (t.kind === "team") return !!getCheckin(viewer.name);
  return t.a === key(viewer.name) || t.b === key(viewer.name);
}

export function sendMessage(threadId: number, kind: "staff" | "volunteer", name: string, device: string, text: string, lang = "en", seeded = 0, at = new Date().toISOString()) {
  const body = text.trim().slice(0, 1000);
  if (!body) return null;
  const id = Number(db.run("INSERT INTO messages (thread_id, sender_kind, sender_name, sender_device, body, lang, created_at, seeded) VALUES (?,?,?,?,?,?,?,?)", threadId, kind, name, device, body, lang === "es" ? "es" : "en", at, seeded).lastInsertRowid);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as any;
}

function labelFor(t: any, viewer: any, names: Map<string, string>): { title: string; kind: string } {
  if (t.kind === "team") return { title: "team", kind: "team" };
  if (viewer.kind === "volunteer") {
    if (t.b === "staff") return { title: "host", kind: "host" };
    const other = t.a === key(viewer.name) ? t.b : t.a;
    return { title: names.get(other) || other, kind: "peer" };
  }
  if (t.b === "staff") return { title: names.get(t.a) || t.a, kind: "host" };
  return { title: (names.get(t.a) || t.a) + " + " + (names.get(t.b) || t.b), kind: "peer" };
}

export function visibleThreads(viewer: { kind: "staff" } | { kind: "volunteer"; name: string }) {
  const names = new Map<string, string>();
  for (const r of db.prepare("SELECT name_key, name FROM checkins").all() as any[]) names.set(r.name_key, r.name);
  for (const r of db.prepare("SELECT sender_name FROM messages WHERE sender_kind = 'volunteer'").all() as any[]) names.set(key(r.sender_name), r.sender_name);
  const all = db.prepare("SELECT * FROM threads").all() as any[];
  const out = all.filter((t) => canRead(t, viewer)).map((t) => {
    const last = db.prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1").get(t.id) as any;
    return { id: t.id, ...labelFor(t, viewer, names), last: last ?? null };
  });
  if (viewer.kind === "volunteer" && getCheckin(viewer.name) && !out.some((t) => t.kind === "host")) {
    const id = hostThread(viewer.name);
    out.push({ id, title: "host", kind: "host", last: null });
  }
  const rank: Record<string, number> = { team: 0, host: 1, peer: 2 };
  return out.sort((x, y) => rank[x.kind] - rank[y.kind] || (y.last?.id ?? 0) - (x.last?.id ?? 0));
}

export function messagesSince(viewer: { kind: "staff" } | { kind: "volunteer"; name: string }, since: number, threadId?: number) {
  const ok = new Set(visibleThreads(viewer).map((t) => t.id));
  const rows = db.prepare("SELECT * FROM messages WHERE id > ? ORDER BY id").all(since) as any[];
  return rows.filter((m) => ok.has(m.thread_id) && (!threadId || m.thread_id === threadId)).map(({ sender_device, ...m }) => m);
}

export function threadMessages(viewer: any, id: number) {
  const t = getThread(id);
  if (!canRead(t, viewer)) return null;
  return (db.prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY id").all(id) as any[]).map(({ sender_device, ...m }) => m);
}

export function reachable(name: string): string[] {
  return checkedInNow(todayNY()).map((c) => c.name).filter((n) => key(n) !== key(name));
}

export function seedMessages(): void {
  const id = teamThread();
  if (db.prepare("SELECT 1 FROM messages WHERE thread_id = ? AND seeded = 1").get(id)) return;
  const now = Date.now(), at = (min: number) => new Date(now - min * 60000).toISOString();
  const rows: Array<["staff" | "volunteer", string, string, string, number]> = [
    ["staff", "Maria", "Good morning, team! Park in the back lot, not on Oak Street. Coffee is by the front table.", "en", 150],
    ["volunteer", "Andre", "Anyone know where the tape is? Boxes are coming apart.", "en", 95],
    ["volunteer", "Rosa", "Andre, la cinta está en la mesa 2, en la caja azul.", "es", 92],
    ["volunteer", "Keisha", "Thanks Rosa! Found it.", "en", 90],
    ["staff", "Maria", "We hit 182 boxes! Keep it going, you are amazing.", "en", 12],
  ];
  for (const [k, n, b, l, m] of rows) {
    const msg = sendMessage(id, k, n, "", b, l, 1, at(m));
    if (msg && l === "es") db.run("UPDATE messages SET body_en = ? WHERE id = ?", "Andre, the tape is on table 2, in the blue box.", msg.id);
  }
}

export function setBodyEn(id: number, en: string): void { db.run("UPDATE messages SET body_en = ? WHERE id = ?", en, id); }
