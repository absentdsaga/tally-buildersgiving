import type { Database } from "bun:sqlite";

let db: Database;
const todayNY = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const key = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export function initTasks(d: Database): void {
  db = d;
  db.run("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT NOT NULL, place TEXT NOT NULL DEFAULT '', needed INTEGER NOT NULL DEFAULT 1, done_at TEXT, seeded INTEGER NOT NULL DEFAULT 0)");
  db.run("CREATE TABLE IF NOT EXISTS task_members (task_id INTEGER NOT NULL, name_key TEXT NOT NULL, name TEXT NOT NULL, joined_at TEXT NOT NULL, left_at TEXT, PRIMARY KEY (task_id, name_key))");
}

export function addTask(title: string, place: string, needed: number, date = todayNY(), seeded = 0): number | null {
  const t = title.trim().slice(0, 80);
  if (!t) return null;
  const n = Math.max(1, Math.min(50, Math.round(needed) || 1));
  return Number(db.run("INSERT INTO tasks (date, title, place, needed, seeded) VALUES (?,?,?,?,?)", date, t, place.trim().slice(0, 80), n, seeded).lastInsertRowid);
}

export function finishTask(id: number): boolean {
  return db.run("UPDATE tasks SET done_at = COALESCE(done_at, ?) WHERE id = ?", new Date().toISOString(), id).changes > 0;
}

export function listTasks(date = todayNY()) {
  const rows = db.prepare("SELECT * FROM tasks WHERE date = ? ORDER BY id").all(date) as any[];
  return rows.map((r) => {
    const people = db.prepare("SELECT name, joined_at FROM task_members WHERE task_id = ? AND left_at IS NULL ORDER BY joined_at").all(r.id) as any[];
    const spots = r.done_at ? 0 : Math.max(0, r.needed - people.length);
    return { id: r.id, title: r.title, place: r.place, needed: r.needed, done: !!r.done_at, people: people.map((p) => p.name), spots };
  });
}

export function currentTask(name: string, date = todayNY()) {
  return listTasks(date).find((t) => !t.done && t.people.some((p) => key(p) === key(name))) ?? null;
}

export function leaveTask(name: string, date = todayNY()): void {
  for (const t of listTasks(date)) if (t.people.some((p) => key(p) === key(name))) db.run("UPDATE task_members SET left_at = ? WHERE task_id = ? AND name_key = ? AND left_at IS NULL", new Date().toISOString(), t.id, key(name));
}

export function takeTask(name: string, id: number, date = todayNY()) {
  const t = listTasks(date).find((x) => x.id === id);
  if (!t || t.done) return { error: "gone" as const };
  if (t.people.some((p) => key(p) === key(name))) return { task: t };
  if (t.spots <= 0) return { error: "full" as const };
  leaveTask(name, date);
  db.run("INSERT INTO task_members (task_id, name_key, name, joined_at, left_at) VALUES (?,?,?,?,NULL) ON CONFLICT(task_id, name_key) DO UPDATE SET left_at = NULL, joined_at = excluded.joined_at", id, key(name), name, new Date().toISOString());
  return { task: listTasks(date).find((x) => x.id === id)! };
}

export function pickFree(name: string, date = todayNY()) {
  const open = listTasks(date).filter((t) => !t.done && t.spots > 0 && !t.people.some((p) => key(p) === key(name)));
  open.sort((a, b) => b.spots - a.spots || a.id - b.id);
  return open[0] ?? null;
}

export function tasksDoneBy(name: string, date = todayNY()): string[] {
  const rows = db.prepare("SELECT t.title, t.place FROM task_members m JOIN tasks t ON t.id = m.task_id WHERE m.name_key = ? AND t.date = ? ORDER BY m.joined_at").all(key(name), date) as any[];
  return rows.map((r) => r.title + (r.place ? ", " + r.place : ""));
}

export function seedTasks(date = todayNY()): void {
  if (db.prepare("SELECT 1 FROM tasks WHERE date = ?").get(date)) return;
  const a = addTask("Sort cans", "Table 2", 3, date, 1)!, b = addTask("Pack boxes", "Packing line", 6, date, 1)!;
  addTask("Greet and sign in", "Front table", 2, date, 1);
  addTask("Carry bags to cars", "Parking lot", 2, date, 1);
  for (const [id, n] of [[a, "Rosa"], [a, "Andre"], [b, "Keisha"]] as const) db.run("INSERT OR IGNORE INTO task_members VALUES (?,?,?,?,NULL)", id, key(n), n, new Date().toISOString());
}
