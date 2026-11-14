import type { Database } from "bun:sqlite";
import { json, body } from "./today.ts";
import { cleanName } from "./database.ts";

let db: Database;

export function initReports(d: Database): void {
  db = d;
  db.run("CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT 'complaint', name TEXT NOT NULL, device TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en', is_private INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, handled_by TEXT, handled_at TEXT)");
}

export function addReport(name: string, device: string, text: string, isPrivate: boolean, lang = "en") {
  const b = text.trim().slice(0, 2000);
  if (!b || (!device && !name)) return null;
  const id = Number(db.run("INSERT INTO reports (name, device, body, lang, is_private, created_at) VALUES (?,?,?,?,?,?)", name, device, b, lang === "es" ? "es" : "en", isPrivate ? 1 : 0, new Date().toISOString()).lastInsertRowid);
  return id;
}

export function staffReports() {
  const rows = db.prepare("SELECT * FROM reports ORDER BY handled_at IS NOT NULL, id DESC").all() as any[];
  return rows.map((r) => ({ id: r.id, name: r.is_private ? null : r.name, private: !!r.is_private, body: r.body, lang: r.lang, created_at: r.created_at, handled_by: r.handled_by, handled_at: r.handled_at }));
}

export function myReports(device: string, name: string) {
  const rows = db.prepare("SELECT * FROM reports WHERE (device != '' AND device = ?) OR (device = '' AND lower(name) = lower(?)) ORDER BY id DESC").all(device, name) as any[];
  return rows.map((r) => ({ id: r.id, body: r.body, created_at: r.created_at, handled: !!r.handled_at, handled_at: r.handled_at }));
}

export function markReportHandled(id: number, who: string): boolean {
  return db.run("UPDATE reports SET handled_by = ?, handled_at = COALESCE(handled_at, ?) WHERE id = ?", who, new Date().toISOString(), id).changes > 0;
}

export async function handleReportPost(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const name = cleanName(String(b.name || ""));
  const device = String(b.device || "").slice(0, 80);
  const id = addReport(name, device, String(b.body || ""), b.private !== false, b.lang);
  return id ? json({ id, message: "ok" }, 200, headers) : json({ error: "Tell us what happened" }, 400, headers);
}

export function handleReportsMine(url: URL, headers: Record<string, string>): Response {
  return json({ reports: myReports(url.searchParams.get("device") || "", cleanName(url.searchParams.get("name") || "")) }, 200, headers);
}

export function handleStaffReports(headers: Record<string, string>): Response {
  return json({ reports: staffReports() }, 200, headers);
}

export async function handleReportHandled(req: Request, headers: Record<string, string>): Promise<Response> {
  const b = await body(req);
  const who = String(b.who || "").trim();
  if (!who) return json({ error: "Staff name needed" }, 400, headers);
  const ok = markReportHandled(Number(b.id), who);
  return json({ success: ok }, ok ? 200 : 404, headers);
}
