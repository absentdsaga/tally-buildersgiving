import { Database } from "bun:sqlite";
import { initDatabase, checkDuplicate, insertUpdate, getUrgentConcerns, getAllUpdates } from "./database.ts";
import { processWithGemini } from "./ai.ts";
import { parseFallback } from "./fallback.ts";
import type { ParsedUpdate } from "./types.ts";

initDatabase();

const PORT = parseInt(process.env.PORT || "4517", 10);

// Helper to get start of week (Monday)
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(now.setDate(diff));
  return monday.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function todayNY(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (pathname === "/api/update" && req.method === "POST") {
      return handleUpdate(req, corsHeaders);
    }

    if (pathname === "/api/staff" && req.method === "GET") {
      return handleStaff(corsHeaders);
    }

    if (pathname === "/api/concerns/mark-handled" && req.method === "POST") {
      return handleMarkConcern(req, corsHeaders);
    }

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

async function handleUpdate(req: Request, headers: Record<string, string>): Promise<Response> {
  const contentType = req.headers.get("content-type") || "";
  let parsed: ParsedUpdate | null = null;
  let rawText = "";

  if (contentType.includes("multipart/form-data")) {
    // Audio upload
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const textFallback = formData.get("text") as string | null;
    const volunteerName = formData.get("volunteer_name") as string | null;

    if (audioFile) {
      const bytes = await audioFile.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = audioFile.type || "audio/webm";
      
      // Try Gemini with audio
      parsed = await processWithGemini(textFallback || "", base64, mimeType);
    }

    if (!parsed && textFallback) {
      rawText = textFallback;
      parsed = await processWithGemini(textFallback);
    }

    if (!parsed && rawText) {
      parsed = parseFallback(rawText);
    }

    if (parsed && volunteerName && !parsed.volunteer_name) {
      parsed.volunteer_name = volunteerName;
    }
  } else {
    // JSON text input
    try {
      const body = await req.json();
      rawText = body.text || "";
      const volunteerName = body.volunteer_name || "";

      if (rawText) {
        parsed = await processWithGemini(rawText);
        if (!parsed) {
          parsed = parseFallback(rawText);
        }
      }

      if (parsed && volunteerName && !parsed.volunteer_name) {
        parsed.volunteer_name = volunteerName;
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
  }

  if (!parsed) {
    return new Response(JSON.stringify({ error: "Could not parse update" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Use volunteer name from request if not in parsed
  const volunteerName = parsed.volunteer_name || "Anonymous";

  // Check for duplicates
  const duplicate = checkDuplicate(volunteerName, parsed.date, parsed.site, parsed.hours);

  const counted = !duplicate.isDuplicate;
  const duplicateReason = duplicate.isDuplicate ? duplicate.reason : null;

  // Insert into DB
  const id = insertUpdate({
    volunteer_name: volunteerName,
    site: parsed.site,
    date: parsed.date,
    hours: parsed.hours,
    activities: JSON.stringify(parsed.activities),
    transcript: parsed.transcript,
    language: parsed.language,
    concerns: JSON.stringify(parsed.concerns),
    counted,
    duplicate_reason: duplicateReason,
    created_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      id,
      counted,
      duplicate_reason: duplicateReason,
      hours: parsed.hours,
      site: parsed.site,
      concerns: parsed.concerns,
      transcript: parsed.transcript,
      language: parsed.language,
      activities: parsed.activities,
    }),
    {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );
}

function handleStaff(headers: Record<string, string>): Response {
  const weekStart = getWeekStart();
  const today = todayNY();
  const allUpdates = getAllUpdates();

  // Filter to this week
  const weekUpdates = allUpdates.filter(u => u.date >= weekStart);

  // Total hours this week (only counted)
  const totalHours = weekUpdates
    .filter(u => u.counted)
    .reduce((sum, u) => sum + u.hours, 0);

  // Hours per volunteer
  const volunteerHours: Record<string, number> = {};
  for (const u of weekUpdates.filter(u => u.counted)) {
    volunteerHours[u.volunteer_name] = (volunteerHours[u.volunteer_name] || 0) + u.hours;
  }

  // Urgent concerns (today)
  const urgentUpdates = getUrgentConcerns().filter(u => u.date === today);
  const concerns = urgentUpdates.flatMap(u => {
    try {
      const cs = JSON.parse(u.concerns);
      return cs
        .filter((c: any) => c.urgency === "today")
        .map((c: any) => ({
          id: u.id,
          quote: c.quote,
          category: c.category,
          volunteer_name: u.volunteer_name,
          site: u.site,
          created_at: u.created_at,
          language: u.language,
        }));
    } catch {
      return [];
    }
  });

  // Log of all updates
  const log = allUpdates.map(u => ({
    id: u.id,
    volunteer_name: u.volunteer_name,
    site: u.site,
    date: u.date,
    hours: u.hours,
    counted: u.counted,
    duplicate_reason: u.duplicate_reason,
    created_at: u.created_at,
    transcript: u.transcript,
    language: u.language,
    activities: JSON.parse(u.activities || "[]"),
    concerns: JSON.parse(u.concerns || "[]"),
  }));

  return new Response(
    JSON.stringify({
      total_hours: totalHours,
      volunteer_hours: volunteerHours,
      concerns,
      log,
    }),
    {
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );
}

async function handleMarkConcern(req: Request, headers: Record<string, string>): Promise<Response> {
  try {
    const body = await req.json();
    const concernId = body.id;

    if (!concernId) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // For now, we mark by clearing concerns on that update
    // In a real app we'd have a separate concerns table with handled status
    const db = new Database("tally.db");
    db.run(
      `UPDATE updates SET concerns = '[]' WHERE id = ?`,
      concernId
    );
    db.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}

console.log(`Tally server running on http://localhost:${PORT}`);
