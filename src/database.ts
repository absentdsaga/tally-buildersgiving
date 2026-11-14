import { Database } from "bun:sqlite";
import type { UpdateRecord, DuplicateCheckResult } from "./types.ts";

let db: Database;

export function initDatabase(dbPath?: string): void {
  db = new Database(dbPath || "tally.db");
  db.run(`
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      volunteer_name TEXT NOT NULL,
      site TEXT NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      activities TEXT NOT NULL,
      transcript TEXT NOT NULL,
      language TEXT NOT NULL,
      concerns TEXT NOT NULL,
      counted INTEGER NOT NULL DEFAULT 1,
      duplicate_reason TEXT,
      created_at TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      fixed_by TEXT,
      fixed_at TEXT
    )
  `);
  try { db.run("ALTER TABLE updates ADD COLUMN duplicate_at TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN highlight TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN reported_hours REAL"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN handled_by TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN handled_at TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN proof_code TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN first_shift INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0"); } catch {}
  db.run("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS volunteers (name TEXT PRIMARY KEY, goal_hours REAL, goal_label TEXT, lang TEXT)");
  try { db.run("ALTER TABLE updates ADD COLUMN approved INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN approved_by TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN approved_at TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN fixed_by TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN fixed_at TEXT"); } catch {}
  db.run("CREATE TABLE IF NOT EXISTS floor_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, text TEXT NOT NULL, taken_by TEXT, taken_at TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS floor_notes (date TEXT PRIMARY KEY, notes TEXT NOT NULL)");
  db.run("CREATE TABLE IF NOT EXISTS spots (name_key TEXT NOT NULL, name TEXT NOT NULL, date TEXT NOT NULL, PRIMARY KEY (name_key, date))");
  db.run(`CREATE INDEX IF NOT EXISTS idx_duplicate_check ON updates(volunteer_name, date, site, hours)`);
}

export function closeDatabase(): void {
  if (db) db.close();
}

export function normalizeSite(raw: string): string {
  const n = (raw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  if (!n || n === "unknown" || n === "n/a" || n === "none") return "";
  if (/food ?pantry|despensa|^pantry$/.test(n)) return "Food Pantry";
  if (/food ?bank|banco de (comida|alimentos)/.test(n)) return "Food Bank";
  if (/community cent|centro comunitario/.test(n)) return "Community Center";
  if (/kitchen|cocina/.test(n)) return "Little Havana Kitchen";
  if (/clinic|clinica/.test(n)) return "Clinic";
  if (/shelter|refugio/.test(n)) return "Shelter";
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cleanName(raw: string): string {
  const n = (raw || "").trim().replace(/\s+/g, " ");
  if (!n || /^(anonymous|unknown|anonimo|here( to)?|none|n\/a)$/i.test(n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) return "";
  return n.replace(/(^|\s)(\p{L})/gu, (_m, a, c) => a + c.toUpperCase());
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

export function duplicateKey(volunteerName: string, date: string, site: string, hours: number): string {
  return `${normalize(volunteerName)}|${date}|${normalize(site)}|${hours.toFixed(1)}`;
}

function sameVolunteer(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

export function checkDuplicate(
  volunteerName: string,
  date: string,
  site: string,
  hours: number,
  status: "Counted" | "Needs hours" = "Counted"
): DuplicateCheckResult {
  if (status === "Needs hours" || !hours || hours <= 0) return { isDuplicate: false };

  const key = duplicateKey(volunteerName, date, site, hours);
  const rows = db.prepare(`SELECT * FROM updates WHERE counted = 1 ORDER BY created_at ASC`).all() as UpdateRecord[];
  for (const row of rows) {
    if (!row.hours || row.hours <= 0) continue;
    const rowKey = duplicateKey(row.volunteer_name, row.date, row.site, row.hours);
    if (rowKey === key) {
      return {
        isDuplicate: true,
        reason: `Already counted: ${row.hours} hour${row.hours !== 1 ? "s" : ""} at ${row.site}`,
        existingTimestamp: row.created_at,
        existingHours: row.hours,
        existingSite: row.site,
      };
    }
  }
  return { isDuplicate: false };
}

function defaults(record: Omit<UpdateRecord, "id">) {
  return {
    ...record,
    approved: record.approved ?? false,
    approved_by: record.approved_by ?? null,
    approved_at: record.approved_at ?? null,
    fixed_by: record.fixed_by ?? null,
    fixed_at: record.fixed_at ?? null,
  };
}

export function hasAnyUpdate(name: string): boolean {
  return getAllUpdates().some((u) => normalize(u.volunteer_name) === normalize(name));
}

export function setFirstShift(id: number): void {
  db.run("UPDATE updates SET first_shift = 1 WHERE id = ?", id);
}

export function setDuplicateAt(id: number, at: string, highlight = ""): void {
  db.run("UPDATE updates SET duplicate_at = ?, highlight = ? WHERE id = ?", at, highlight, id);
}

export function findOpenConcern(name: string, date: string, quotes: string[]): boolean {
  const rows = db.prepare("SELECT * FROM updates WHERE date = ? AND concerns != '[]' AND handled_at IS NULL").all(date) as any[];
  const words = (q: string) => new Set(normalize(q).split(" ").filter((w) => w.length > 2));
  for (const r of rows) {
    if (!sameVolunteer(r.volunteer_name, name)) continue;
    let cs: any[] = [];
    try { cs = JSON.parse(r.concerns); } catch {}
    for (const c of cs) for (const q of quotes) {
      const a = words(c.quote), b = words(q);
      const inter = [...a].filter((w) => b.has(w)).length;
      if (Math.max(a.size, b.size) && inter / Math.max(a.size, b.size) >= 0.5) return true;
    }
  }
  return false;
}

export function insertUpdate(record: Omit<UpdateRecord, "id">): number {
  const r = defaults(record);
  const stmt = db.prepare(`
    INSERT INTO updates (volunteer_name, site, date, hours, activities, transcript, language, concerns, counted, duplicate_reason, created_at, approved, approved_by, approved_at, fixed_by, fixed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    r.volunteer_name, r.site, r.date, r.hours, r.activities, r.transcript, r.language, r.concerns,
    r.counted ? 1 : 0, r.duplicate_reason, r.created_at,
    r.approved ? 1 : 0, r.approved_by, r.approved_at, r.fixed_by, r.fixed_at
  );
  return Number(result.lastInsertRowid);
}

export function getUpdatesByDateRange(startDate: string, endDate: string): UpdateRecord[] {
  return db.prepare(`SELECT * FROM updates WHERE date >= ? AND date <= ? ORDER BY created_at DESC`).all(startDate, endDate) as UpdateRecord[];
}

export function getUrgentConcerns(): UpdateRecord[] {
  const rows = db.prepare(`SELECT * FROM updates WHERE concerns != '[]' ORDER BY created_at DESC`).all() as UpdateRecord[];
  return rows.filter((row) => {
    try {
      return JSON.parse(row.concerns).some((c: any) => c.urgency === "today");
    } catch {
      return false;
    }
  });
}

export function getAllCountedUpdates(): UpdateRecord[] {
  return db.prepare(`SELECT * FROM updates WHERE counted = 1 ORDER BY created_at DESC`).all() as UpdateRecord[];
}

export function getAllUpdates(): UpdateRecord[] {
  return mapBool(db.prepare(`SELECT * FROM updates ORDER BY created_at DESC`).all() as any[]);
}

function mapBool(rows: any[]): UpdateRecord[] {
  return rows.map((r) => ({
    ...r,
    counted: !!r.counted,
    first_shift: !!r.first_shift,
    approved: !!r.approved,
    site: normalizeSite(r.site),
    volunteer_name: cleanName(r.volunteer_name),
  }));
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newProofCode(): string {
  for (;;) {
    let c = "";
    for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!db.prepare("SELECT 1 FROM updates WHERE proof_code = ?").get(c)) return c;
  }
}

export function approveUpdate(id: number, who: string): boolean {
  const r = db.run(`UPDATE updates SET approved = 1, approved_by = ?, approved_at = ?, proof_code = COALESCE(proof_code, ?) WHERE id = ?`, who, new Date().toISOString(), newProofCode(), id);
  return r.changes > 0;
}

export function getByProofCode(code: string): UpdateRecord | undefined {
  return getAllUpdates().find((u) => u.proof_code === code.toUpperCase() && u.approved);
}

export function fixHours(id: number, hours: number, who: string): boolean {
  const r = db.run(`UPDATE updates SET reported_hours = CASE WHEN reported_hours IS NULL AND hours > 0 THEN hours ELSE reported_hours END, hours = ?, counted = 1, duplicate_reason = NULL, fixed_by = ?, fixed_at = ? WHERE id = ?`, hours, who, new Date().toISOString(), id);
  return r.changes > 0;
}

export function setHoursIfEmpty(id: number, hours: number): boolean {
  const r = db.run("UPDATE updates SET hours = ?, counted = 1 WHERE id = ? AND hours <= 0 AND approved = 0", hours, id);
  return r.changes > 0;
}

export function setSiteIfEmpty(id: number, site: string): boolean {
  return db.run("UPDATE updates SET site = ? WHERE id = ? AND site = ''", site, id).changes > 0;
}

export function getUpdate(id: number): UpdateRecord | undefined {
  return getAllUpdates().find((u) => u.id === id);
}

export function markHandled(id: number, who: string): boolean {
  return db.run("UPDATE updates SET handled_by = ?, handled_at = ? WHERE id = ?", who, new Date().toISOString(), id).changes > 0;
}

export function handledSince(name: string, since: string): Array<{ id: number; handled_at: string; handled_by: string | null }> {
  return getAllUpdates()
    .filter((u) => sameVolunteer(u.volunteer_name, name) && u.concerns !== "[]" && u.handled_at && u.handled_at > since)
    .map((u) => ({ id: u.id, handled_at: u.handled_at!, handled_by: u.handled_by ?? null }));
}

export function upsertVolunteer(name: string, goalHours: number | null, goalLabel: string | null, lang: string): void {
  db.run("INSERT INTO volunteers (name, goal_hours, goal_label, lang) VALUES (?,?,?,?) ON CONFLICT(name) DO UPDATE SET goal_hours=excluded.goal_hours, goal_label=excluded.goal_label, lang=excluded.lang", name, goalHours, goalLabel, lang);
}

export function getVolunteer(name: string): any {
  return db.prepare("SELECT * FROM volunteers WHERE lower(name) = lower(?)").get(name) ?? null;
}

export function volunteerStats(name: string) {
  const mine = getAllUpdates().filter((u) => sameVolunteer(u.volunteer_name, name) && u.counted && u.hours > 0);
  const approved = mine.filter((u) => u.approved);
  return {
    approved_hours: approved.reduce((a, u) => a + u.hours, 0),
    waiting_hours: mine.filter((u) => !u.approved).reduce((a, u) => a + u.hours, 0),
    approved_shifts: approved.length,
    shifts: approved.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function countUpdates(): number {
  const row = db.prepare(`SELECT COUNT(*) as n FROM updates`).get() as { n: number };
  return row.n;
}

export function loadSampleWeek(): number {
  if (countUpdates() > 0) return 0;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const samples: Array<Partial<UpdateRecord> & { volunteer_name: string; site: string; hours: number; transcript: string; language: string; counted: boolean; concerns: string }> = [
    { volunteer_name: "Luis Pena", site: "Food Bank", hours: 3, language: "mixed", transcript: "Soy Luis Pena, hice tres horas en el Food Bank hoy, and a woman told me she is scared to go home", counted: true, concerns: JSON.stringify([{ quote: "scared to go home", category: "safety", urgency: "today", reason: "immediate" }]) },
    { volunteer_name: "Luis Pena", site: "Food Bank", hours: 3, language: "en", transcript: "Luis here. Three hours at the food bank today.", counted: false, duplicate_reason: "Already counted", concerns: "[]" },
    { volunteer_name: "Maria Garcia", site: "Community Center", hours: 4, language: "en", transcript: "Maria Garcia, four hours at the community center packing.", counted: true, concerns: "[]" },
    { volunteer_name: "Maria Garcia", site: "Community Center", hours: 4, language: "es", transcript: "Soy María, cuatro horas en el centro comunitario.", counted: false, duplicate_reason: "Already counted", concerns: "[]" },
    { volunteer_name: "Ana Ruiz", site: "Little Havana Kitchen", hours: 2.5, language: "es", transcript: "Ana Ruiz, dos y media horas en la cocina de Little Havana.", counted: true, concerns: "[]" },
    { volunteer_name: "Jose Diaz", site: "Food Bank", hours: 5, language: "en", transcript: "Jose Diaz, five hours at the food bank sorting.", counted: true, concerns: "[]" },
    { volunteer_name: "Camila Ortiz", site: "Community Center", hours: 3, language: "mixed", transcript: "Camila here, tres horas at the community center. A child was alone.", counted: true, concerns: JSON.stringify([{ quote: "A child was alone", category: "safety", urgency: "today", reason: "child welfare" }]) },
    { volunteer_name: "Ana Ruiz", site: "Food Bank", hours: 1, language: "en", transcript: "Ana, one hour at the food bank.", counted: true, concerns: "[]" },
    { volunteer_name: "Jose Diaz", site: "Little Havana Kitchen", hours: 2, language: "es", transcript: "José, dos horas en la cocina.", counted: true, concerns: "[]" },
    { volunteer_name: "Maria Garcia", site: "Little Havana Kitchen", hours: 3.5, language: "en", transcript: "Maria, 3.5 hours at Little Havana Kitchen.", counted: true, concerns: "[]" },
    { volunteer_name: "Camila Ortiz", site: "Food Bank", hours: 2, language: "en", transcript: "Camila, two hours at the food bank.", counted: true, concerns: "[]" },
    { volunteer_name: "Luis Pena", site: "Community Center", hours: 0, language: "en", transcript: "Luis stopped by the community center.", counted: false, concerns: "[]" },
  ];
  let n = 0;
  for (const s of samples) {
    insertUpdate({
      volunteer_name: s.volunteer_name,
      site: s.site,
      date: today,
      hours: s.hours,
      activities: "[]",
      transcript: s.transcript,
      language: s.language,
      concerns: s.concerns,
      counted: s.counted,
      duplicate_reason: s.duplicate_reason ?? null,
      created_at: new Date().toISOString(),
      approved: false,
      approved_by: null,
      approved_at: null,
      fixed_by: null,
      fixed_at: null,
    });
    n++;
  }
  return n;
}

const nyDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const shiftDay = (day: string, n: number) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export function seededCount(): number {
  return Number((db.prepare("SELECT COUNT(*) AS n FROM updates WHERE seeded = 1").get() as any).n);
}

export function clearDemo(): number {
  const n = db.run("DELETE FROM updates WHERE seeded = 1").changes;
  db.run("INSERT OR REPLACE INTO meta (k, v) VALUES ('demo_cleared', '1')");
  return n;
}

export function seedDemo(): number {
  if (countUpdates() > 0) return 0;
  if (db.prepare("SELECT 1 FROM meta WHERE k = 'demo_cleared'").get()) return 0;
  const today = nyDay();
  const d = new Date(today + "T00:00:00Z");
  const ws = shiftDay(today, -((d.getUTCDay() + 6) % 7));
  const span = Math.round((Date.parse(today) - Date.parse(ws)) / 86400000) + 1;
  const wk = (i: number) => shiftDay(ws, i % span);
  const ago = (n: number) => shiftDay(today, -n);
  const stamp = (day: string, h: number) => day + "T" + String(h).padStart(2, "0") + ":15:00.000Z";
  type R = { n: string; site: string; h: number; date: string; lang: string; tx: string; ok?: boolean; first?: boolean; cs?: any[]; handled?: boolean; at?: number };
  const rows: R[] = [
    { n: "Maria Garcia", site: "Food Pantry", h: 4, date: wk(0), lang: "en", tx: "Maria here, four hours at the food pantry packing boxes.", ok: true },
    { n: "Andre Johnson", site: "Community Center", h: 3, date: wk(0), lang: "en", tx: "Andre, three hours at the community center setting up tables.", ok: true },
    { n: "Rosa Martinez", site: "Little Havana Kitchen", h: 5, date: wk(1), lang: "es", tx: "Soy Rosa, cinco horas en la cocina preparando comidas.", ok: true },
    { n: "Keisha Brown", site: "Food Bank", h: 2.5, date: wk(1), lang: "en", tx: "Keisha, two and a half hours sorting at the food bank.", ok: true },
    { n: "Luis Pena", site: "Food Pantry", h: 6, date: wk(2), lang: "es", tx: "Luis, seis horas en la despensa repartiendo comida.", ok: true },
    { n: "Maria Garcia", site: "Community Center", h: 3.5, date: wk(2), lang: "en", tx: "Maria, three and a half hours at the community center.", ok: true },
    { n: "Andre Johnson", site: "Food Bank", h: 4, date: wk(3), lang: "en", tx: "Andre, four hours loading the truck at the food bank.", ok: true },
    { n: "Keisha Brown", site: "Little Havana Kitchen", h: 3, date: wk(4), lang: "en", tx: "Keisha, three hours in the kitchen.", ok: true },
    { n: "Rosa Martinez", site: "Food Pantry", h: 2, date: wk(5), lang: "es", tx: "Rosa, dos horas en la despensa.", ok: true },
    { n: "Maria Garcia", site: "Food Pantry", h: 4, date: ago(7), lang: "en", tx: "Maria, four hours at the pantry last week.", ok: true },
    { n: "Andre Johnson", site: "Food Bank", h: 5, date: ago(8), lang: "en", tx: "Andre, five hours at the food bank.", ok: true },
    { n: "Luis Pena", site: "Community Center", h: 3, date: ago(9), lang: "es", tx: "Luis, tres horas en el centro comunitario.", ok: true },
    { n: "Carmen Rivera", site: "Food Pantry", h: 4, date: ago(30), lang: "es", tx: "Carmen, cuatro horas en la despensa.", ok: true },
    { n: "Tyrone Williams", site: "Food Bank", h: 3, date: ago(26), lang: "en", tx: "Tyrone, three hours at the food bank.", ok: true },
    { n: "Sofia Hernandez", site: "Food Pantry", h: 3, date: today, lang: "en", tx: "Sofia, my first time. Three hours at the food pantry handing out bags.", first: true, at: 15 },
    { n: "Daniel Cruz", site: "Community Center", h: 2, date: today, lang: "en", tx: "Daniel, two hours at the community center cleaning up.", at: 14 },
    { n: "Keisha Brown", site: "Food Bank", h: 3, date: today, lang: "en", tx: "Keisha, three hours at the food bank. A man asked if we could keep a list of people who come in, I told him I would pass it on.", ok: true, at: 16,
      cs: [{ quote: "A man asked if we could keep a list of people who come in", category: "other", urgency: "this_week", reason: "question for staff", level: "fyi", quote_en: "" }] },
    { n: "Luis Pena", site: "Food Pantry", h: 3, date: today, lang: "es", tx: "Luis, tres horas en la despensa. Una señora dijo que tiene miedo de ir a casa.", at: 17,
      cs: [{ quote: "Una señora dijo que tiene miedo de ir a casa", category: "safety", urgency: "today", reason: "someone afraid to go home", level: "today", quote_en: "A woman said she is afraid to go home." }] },
    { n: "Andre Johnson", site: "Community Center", h: 2, date: ago(1) < ws ? today : ago(1), lang: "en", tx: "Andre, two hours at the center. A kid was crying alone by the door, I stayed with him until his mom came.", ok: true, handled: true, at: 11,
      cs: [{ quote: "A kid was crying alone by the door", category: "safety", urgency: "today", reason: "child alone", level: "today", quote_en: "" }] },
  ];
  let n = 0;
  for (const r of rows) {
    const created = stamp(r.date, r.at ?? 13);
    const code = r.ok ? newProofCode() : null;
    db.run(
      `INSERT INTO updates (volunteer_name, site, date, hours, activities, transcript, language, concerns, counted, duplicate_reason, created_at, approved, approved_by, approved_at, first_shift, handled_by, handled_at, proof_code, seeded)
       VALUES (?, ?, ?, ?, '[]', ?, ?, ?, 1, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      r.n, r.site, r.date, r.h, r.tx, r.lang, JSON.stringify(r.cs ?? []), created,
      r.ok ? 1 : 0, r.ok ? "Emily" : null, r.ok ? created : null, r.first ? 1 : 0,
      r.handled ? "Emily" : null, r.handled ? created : null, code,
    );
    n++;
  }
  return n;
}

export function grantReportRows(weekStart: string) {
  const rows = getAllUpdates().filter((u) => u.date >= weekStart);
  return rows;
}

export function setFloor(date: string, tasksText: string, notes: string): void {
  const lines = tasksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const taken = new Set((db.prepare("SELECT text FROM floor_tasks WHERE date = ? AND taken_by IS NOT NULL").all(date) as any[]).map((r) => r.text));
  db.run("DELETE FROM floor_tasks WHERE date = ? AND taken_by IS NULL", date);
  for (const l of lines) if (!taken.has(l)) db.run("INSERT INTO floor_tasks (date, text) VALUES (?, ?)", date, l);
  db.run("INSERT INTO floor_notes (date, notes) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET notes = excluded.notes", date, notes.trim());
}

export function getFloor(date: string) {
  const rows = db.prepare("SELECT * FROM floor_tasks WHERE date = ? ORDER BY id ASC").all(date) as any[];
  const n = db.prepare("SELECT notes FROM floor_notes WHERE date = ?").get(date) as any;
  return {
    notes: n?.notes ?? "",
    open: rows.filter((r) => !r.taken_by).map((r) => r.text as string),
    taken: rows.filter((r) => r.taken_by).map((r) => ({ text: r.text as string, taken_by: r.taken_by as string, taken_at: r.taken_at as string })),
    spots: Number((db.prepare("SELECT COUNT(*) AS n FROM spots WHERE date = ?").get(date) as any).n),
  };
}

export function takeNextTask(date: string, name: string): string | null {
  const rows = db.prepare("SELECT id, text FROM floor_tasks WHERE date = ? AND taken_by IS NULL ORDER BY id ASC").all(date) as any[];
  for (const r of rows) {
    const c = db.run("UPDATE floor_tasks SET taken_by = ?, taken_at = ? WHERE id = ? AND taken_by IS NULL", name, new Date().toISOString(), r.id);
    if (c.changes > 0) return r.text;
  }
  return null;
}

export function saveSpot(name: string, date: string): void {
  db.run("INSERT OR IGNORE INTO spots (name_key, name, date) VALUES (?, ?, ?)", normalize(name), name, date);
}
