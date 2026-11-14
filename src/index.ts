import { initDatabase, checkDuplicate, insertUpdate, getUrgentConcerns, getAllUpdates } from "./database.ts";
import { isStaff, isStaffPath, handleLogin, unauthorized } from "./staffgate.ts";
import { handleUpdate } from "./update.ts";
import { weekStartNY, handleStaffData, handleHandled, handleHoursPatch, handleSitePatch, handleVolunteerPost, handleVolunteerGet, handleVolunteerStatus, sitesList } from "./staffdata.ts";
import { proofHtml } from "./proof.ts";
import { letterHtml } from "./letter.ts";
import { cleanName } from "./database.ts";
import { handleSpeak, handleApprove, handleFixHours, handleReport, handleSample } from "./staff.ts";

initDatabase(process.env.DB_PATH);

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
    if (pathname === "/api/staff-login" && req.method === "POST") return handleLogin(req, corsHeaders);
    if (isStaffPath(pathname) && !isStaff(req)) return unauthorized(corsHeaders);
    if (["/staff", "/staff.html", "/staff.js"].includes(pathname) && !isStaff(req)) {
      if (pathname === "/staff.js") return unauthorized(corsHeaders);
      return new Response(Bun.file("./public/login.html"), { headers: { "Content-Type": "text/html" } });
    }

    if (pathname === "/api/speak" && req.method === "GET") return handleSpeak(url, corsHeaders);
    if (pathname === "/api/approve" && req.method === "POST") return handleApprove(req, corsHeaders);
    if (pathname === "/api/fix-hours" && req.method === "POST") return handleFixHours(req, corsHeaders);
    if (pathname === "/api/report.csv" && req.method === "GET") return handleReport(getWeekStart(), corsHeaders);
    if (pathname === "/api/sample" && req.method === "POST") return handleSample(corsHeaders);

    if (pathname === "/api/staff" && req.method === "GET") return handleStaffData(corsHeaders);
    if (pathname === "/api/concerns/mark-handled" && req.method === "POST") return handleHandled(req, corsHeaders);

    // Static files
    let filePath = pathname === "/" ? "/index.html" : pathname;
    
    // Try to serve the file as-is first, then try adding .html extension
    const fullPath = `./public${filePath}`;
    const file = Bun.file(fullPath);
    if (await file.exists()) {
      return new Response(file);
    }
    
    // Try with .html extension
    const htmlPath = `./public${filePath}.html`;
    const htmlFile = Bun.file(htmlPath);
    if (await htmlFile.exists()) {
      return new Response(htmlFile);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Tally server running on http://localhost:${PORT}`);
