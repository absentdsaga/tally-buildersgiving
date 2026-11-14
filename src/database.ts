import { Database } from "bun:sqlite";
import type { UpdateRecord, DuplicateCheckResult } from "./types.ts";

let db: Database;

export function initDatabase(dbPath?: string): void {
  db = new Database(dbPath || "tally.db");
  
  // Create updates table
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
      created_at TEXT NOT NULL
    )
  `);
  
  // Index for duplicate detection
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_duplicate_check 
    ON updates(volunteer_name, date, site, hours)
  `);
}

export function closeDatabase(): void {
  if (db) db.close();
}

// Normalize a string for comparison: lowercase, strip accents and extra whitespace
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\s+/g, " ")
    .trim();
}

// Build a deterministic duplicate key
export function duplicateKey(
  volunteerName: string,
  date: string,
  site: string,
  hours: number
): string {
  return `${normalize(volunteerName)}|${date}|${normalize(site)}|${hours.toFixed(1)}`;
}

export function checkDuplicate(
  volunteerName: string,
  date: string,
  site: string,
  hours: number
): DuplicateCheckResult {
  const key = duplicateKey(volunteerName, date, site, hours);
  
  const stmt = db.prepare(`
    SELECT * FROM updates
    WHERE counted = 1
    ORDER BY created_at ASC
  `);
  
  const rows = stmt.all() as UpdateRecord[];
  
  for (const row of rows) {
    const existingKey = duplicateKey(row.volunteer_name, row.date, row.site, row.hours);
    if (existingKey === key) {
      return {
        isDuplicate: true,
        reason: `Already counted at ${new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}: ${row.hours} hour${row.hours !== 1 ? "s" : ""} at ${row.site}`,
        existingTimestamp: row.created_at,
        existingHours: row.hours,
        existingSite: row.site,
      };
    }
  }
  
  return { isDuplicate: false };
}

export function insertUpdate(record: Omit<UpdateRecord, "id">): number {
  const stmt = db.prepare(`
    INSERT INTO updates (volunteer_name, site, date, hours, activities, transcript, language, concerns, counted, duplicate_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    record.volunteer_name,
    record.site,
    record.date,
    record.hours,
    record.activities,
    record.transcript,
    record.language,
    record.concerns,
    record.counted ? 1 : 0,
    record.duplicate_reason,
    record.created_at
  );
  
  return Number(result.lastInsertRowid);
}

export function getUpdatesByDateRange(startDate: string, endDate: string): UpdateRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM updates
    WHERE date >= ? AND date <= ?
    ORDER BY created_at DESC
  `);
  return stmt.all(startDate, endDate) as UpdateRecord[];
}

export function getUrgentConcerns(): UpdateRecord[] {
  // Get all updates that have concerns with urgency "today"
  const stmt = db.prepare(`
    SELECT * FROM updates
    WHERE concerns != '[]'
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all() as UpdateRecord[];
  return rows.filter(row => {
    try {
      const concerns = JSON.parse(row.concerns);
      return concerns.some((c: any) => c.urgency === "today");
    } catch {
      return false;
    }
  });
}

export function getAllCountedUpdates(): UpdateRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM updates
    WHERE counted = 1
    ORDER BY created_at DESC
  `);
  return stmt.all() as UpdateRecord[];
}

export function getAllUpdates(): UpdateRecord[] {
  const stmt = db.prepare(`SELECT * FROM updates ORDER BY created_at DESC`);
  return stmt.all() as UpdateRecord[];
}
