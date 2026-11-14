import { initDatabase, seedDemo, clearDemo, checkDuplicate, insertUpdate, getUrgentConcerns, getAllUpdates } from "./database.ts";
import { seedEvent } from "./event.ts";
import { handleToday, handleCheckin, handleEventPost } from "./today.ts";
import { handleTasksGet, handleTaskTake, handleTaskDone, handleTaskFree, handleStaffTaskAdd, handleStaffTaskDone } from "./taskapi.ts";
import { handleMessagesGet, handleMessagePost, handleMessageVoice, handleStaffMessagesGet, handleStaffMessagePost, handleStaffDm } from "./messageapi.ts";
import { answerQuestion } from "./ask.ts";
import { handleReportPost, handleReportsMine, handleStaffReports, handleReportHandled } from "./reports.ts";
import { isStaff, isStaffPath, handleLogin, unauthorized, loginHtml } from "./staffgate.ts";
import { handleUpdate } from "./update.ts";
import { weekStartNY, handleStaffData, handleHandled, handleHoursPatch, handleSitePatch, handleVolunteerPost, handleVolunteerGet, handleVolunteerStatus, handleFloorPost, handleSpotPost, sitesList } from "./staffdata.ts";
import { proofHtml } from "./proof.ts";
import { letterHtml } from "./letter.ts";
import { cleanName } from "./database.ts";
import { handleSpeak, handleApprove, handleFixHours, handleReport, handleSample } from "./staff.ts";

initDatabase(process.env.DB_PATH);
if (process.env.DEMO_SEED !== "0") { seedDemo(); seedEvent(); }

const VERSION = (() => {
  try { const r = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"]); const h = r.stdout.toString().trim(); if (r.exitCode === 0 && h) return h; } catch {}
  return String(Date.now());
})();
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
function extOf(p: string) { const m = /\.[a-z]+$/i.exec(p); return m ? m[0].toLowerCase() : ""; }
async function sendStatic(file: ReturnType<typeof Bun.file>, path: string) {
  const ext = extOf(path);
  const headers: Record<string, string> = {};
  if (MIME[ext]) { headers["Content-Type"] = MIME[ext]; headers["Cache-Control"] = "no-cache"; }
  if (ext === ".html") return new Response(versionHtml(await file.text()), { headers });
  return new Response(file, { headers });
}
export function versionHtml(html: string) {
  return html.replace(/((?:href|src)=")(?!https?:|\/\/)([^"?#]+\.(?:css|js))(?:\?[^"]*)?"/g, `$1$2?v=${VERSION}"`);
}

const PORT = parseInt(process.env.PORT || "4517", 10);

function getWeekStart(): string {
  return weekStartNY();
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (pathname === "/api/update" && req.method === "POST") {
      return handleUpdate(req, corsHeaders);
    }

    const hp = /^\/api\/update\/(\d+)\/hours$/.exec(pathname);
    if (hp && req.method === "PATCH") return handleHoursPatch(req, Number(hp[1]), corsHeaders);
    const sp = /^\/api\/update\/(\d+)\/site$/.exec(pathname);
    if (sp && req.method === "PATCH") return handleSitePatch(req, Number(sp[1]), corsHeaders);
    if (pathname === "/api/volunteer" && req.method === "POST") return handleVolunteerPost(req, corsHeaders);
    if (pathname === "/api/spot" && req.method === "POST") return handleSpotPost(req, corsHeaders);
    if (pathname === "/api/volunteer/status" && req.method === "GET") return handleVolunteerStatus(url, corsHeaders);
    if (pathname === "/api/volunteer" && req.method === "GET") return handleVolunteerGet(url, corsHeaders);
    if (pathname === "/api/sites") return new Response(JSON.stringify(sitesList()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const pm = /^\/proof\/([A-Za-z0-9]+)$/.exec(pathname);
    if (pm) { const r = proofHtml(pm[1], url.origin); return new Response(r.html, { status: r.status, headers: { "Content-Type": "text/html; charset=utf-8" } }); }
    if (pathname === "/letter") {
      const nm = cleanName(url.searchParams.get("name") || "");
      if (!nm) return new Response("Name needed", { status: 400 });
      return new Response(letterHtml(nm, url.searchParams.get("lang") === "es" ? "es" : "en"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (pathname === "/api/today" && req.method === "GET") return handleToday(url, corsHeaders);
    if (pathname === "/api/tasks" && req.method === "GET") return handleTasksGet(url, corsHeaders);
    if (pathname === "/api/tasks/take" && req.method === "POST") return handleTaskTake(req, corsHeaders);
    if (pathname === "/api/tasks/done" && req.method === "POST") return handleTaskDone(req, corsHeaders);
    if (pathname === "/api/tasks/free" && req.method === "POST") return handleTaskFree(req, corsHeaders);
    if (pathname === "/api/messages" && req.method === "GET") return handleMessagesGet(url, corsHeaders);
    if (pathname === "/api/messages" && req.method === "POST") return handleMessagePost(req, corsHeaders);
    if (pathname === "/api/messages/voice" && req.method === "POST") return handleMessageVoice(req, corsHeaders);
    if (pathname === "/api/ask" && req.method === "POST") { let b: any = {}; try { b = await req.json(); } catch {} const q = String(b.q || "").slice(0, 300); return new Response(JSON.stringify(answerQuestion(q, undefined)), { headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    if (pathname === "/api/reports" && req.method === "POST") return handleReportPost(req, corsHeaders);
    if (pathname === "/api/reports/mine" && req.method === "GET") return handleReportsMine(url, corsHeaders);
    if (pathname === "/api/checkin" && req.method === "POST") return handleCheckin(req, corsHeaders);
    if (pathname === "/api/staff-login" && req.method === "POST") return handleLogin(req, corsHeaders);
    if (isStaffPath(pathname) && !isStaff(req)) return unauthorized(corsHeaders);
    if (["/staff", "/staff.html", "/staff.js"].includes(pathname) && !isStaff(req)) {
      if (pathname === "/staff.js") return unauthorized(corsHeaders);
      return new Response(await loginHtml(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (pathname === "/api/speak" && req.method === "GET") return handleSpeak(url, corsHeaders);
    if (pathname === "/api/staff/tasks" && req.method === "POST") return handleStaffTaskAdd(req, corsHeaders);
    if (pathname === "/api/staff/tasks/done" && req.method === "POST") return handleStaffTaskDone(req, corsHeaders);
    if (pathname === "/api/staff/dm" && req.method === "GET") return handleStaffDm(url, corsHeaders);
    if (pathname === "/api/staff/messages" && req.method === "GET") return handleStaffMessagesGet(url, corsHeaders);
    if (pathname === "/api/staff/messages" && req.method === "POST") return handleStaffMessagePost(req, corsHeaders);
    if (pathname === "/api/staff/reports" && req.method === "GET") return handleStaffReports(corsHeaders);
    if (pathname === "/api/staff/reports/handled" && req.method === "POST") return handleReportHandled(req, corsHeaders);
    if (pathname === "/api/event" && req.method === "POST") return handleEventPost(req, corsHeaders);
    if (pathname === "/api/floor" && req.method === "POST") return handleFloorPost(req, corsHeaders);
    if (pathname === "/api/approve" && req.method === "POST") return handleApprove(req, corsHeaders);
    if (pathname === "/api/fix-hours" && req.method === "POST") return handleFixHours(req, corsHeaders);
    if (pathname === "/api/report.csv" && req.method === "GET") return handleReport(getWeekStart(), corsHeaders);
    if (pathname === "/api/sample" && req.method === "POST") return handleSample(corsHeaders);
    if (pathname === "/api/demo/clear" && req.method === "POST") return new Response(JSON.stringify({ cleared: clearDemo() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (pathname === "/api/staff" && req.method === "GET") return handleStaffData(corsHeaders);
    if (pathname === "/api/concerns/mark-handled" && req.method === "POST") return handleHandled(req, corsHeaders);

    // Static files
    let filePath = pathname === "/" ? "/index.html" : pathname;
    
    // Try to serve the file as-is first, then try adding .html extension
    const fullPath = `./public${filePath}`;
    const file = Bun.file(fullPath);
    if (await file.exists()) {
      return sendStatic(file, fullPath);
    }
    
    // Try with .html extension
    const htmlPath = `./public${filePath}.html`;
    const htmlFile = Bun.file(htmlPath);
    if (await htmlFile.exists()) {
      return sendStatic(htmlFile, htmlPath);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Tally server running on http://localhost:${PORT}`);
