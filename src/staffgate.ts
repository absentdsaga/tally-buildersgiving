import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE = 12 * 60 * 60;

function code(): string {
  return process.env.STAFF_PIN || "1121";
}

function sig(): string {
  return createHmac("sha256", code()).update("tally-staff-session").digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isStaff(req: Request): boolean {
  const m = /(?:^|;\s*)tally_staff=([0-9a-f]+)/.exec(req.headers.get("cookie") || "");
  return !!m && same(m[1], sig());
}

function jsonHeaders(headers: Record<string, string>, extra: Record<string, string> = {}) {
  return { ...headers, "Content-Type": "application/json", ...extra };
}

export function unauthorized(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Staff passcode required" }), { status: 401, headers: jsonHeaders(headers) });
}

export async function handleLogin(req: Request, headers: Record<string, string>): Promise<Response> {
  let given = "";
  try { given = String((await req.json()).pin ?? "").trim(); } catch {}
  if (!same(given, code())) return unauthorized(headers);
  const cookie = "tally_staff=" + sig() + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + MAX_AGE;
  return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders(headers, { "Set-Cookie": cookie }) });
}

export async function loginHtml(): Promise<string> {
  const html = await Bun.file("./public/login.html").text();
  return process.env.STAFF_PIN ? html.replace(/<!--demo-->[\s\S]*?<!--\/demo-->/, "") : html;
}

export function isStaffPath(p: string): boolean {
  return (
    p.startsWith("/api/staff") ||
    p.startsWith("/api/concerns") ||
    ["/api/approve", "/api/fix-hours", "/api/floor", "/api/report.csv", "/api/sample"].includes(p)
  );
}
