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
  db.run("CREATE TABLE IF NOT EXISTS volunteers (name TEXT PRIMARY KEY, goal_hours REAL, goal_label TEXT, lang TEXT)");
  try { db.run("ALTER TABLE updates ADD COLUMN approved INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN approved_by TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN approved_at TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN fixed_by TEXT"); } catch {}
  try { db.run("ALTER TABLE updates ADD COLUMN fixed_at TEXT"); } catch {}
  db.run(`CREATE INDEX IF NOT EXISTS idx_duplicate_check ON updates(volunteer_name, date, site, hours)`);
}

export function closeDatabase(): void {
  if (db) db.close();
}

export function normalizeSite(raw: string): string {
  const n = (raw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  if (!n || n === "unknown" || n === "n/a" || n === "none") return "";
  if (/food ?bank|pantry|banco de (comida|alimentos)|despensa/.test(n)) return "Food Bank";
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
  const x = normalize(a).split(" "), y = normalize(b).split(" ");
  const n = Math.min(x.length, y.length);
  return x.slice(0, n).join(" ") === y.slice(0, n).join(" ");
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
    if (rowKey === key || (sameVolunteer(row.volunteer_name, volunteerName) && rowKey.split("|").slice(1).join("|") === key.split("|").slice(1).join("|"))) {
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
    approved: !!r.approved,
  }));
}

export function approveUpdate(id: number, who: string): boolean {
  const r = db.run(`UPDATE updates SET approved = 1, approved_by = ?, approved_at = ? WHERE id = ?`, who, new Date().toISOString(), id);
  return r.changes > 0;
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

export function grantReportRows(weekStart: string) {
  const rows = getAllUpdates().filter((u) => u.date >= weekStart);
  return rows;
}
