import type { ParsedUpdate } from "./types.ts";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent?key=" +
  (GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are a volunteer-hours extraction system for a nonprofit called Tally.

A volunteer describes their shift in English, Spanish, or a mix of both. Extract JSON with:
transcript, language (en|es|mixed), volunteer_name, site, date (YYYY-MM-DD, America/New_York default today),
hours (number, 0 if unknown), activities (string array), highlight (max 8 words, in the speaker language, what they did, e.g. "sorting produce for families"; empty if unknown), concerns (quote, category, urgency today|this_week|none, reason).

Urgency today: immediate danger, scared to go home, unsupervised child, has not eaten, medical emergency.
If no concerns, empty array. Hours as words (three, tres, y media) must become numbers.`;

const JSON_SCHEMA = {
  name: "parsed_update",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      transcript: { type: "string" },
      language: { type: "string", enum: ["en", "es", "mixed"] },
      volunteer_name: { type: "string" },
      site: { type: "string" },
      date: { type: "string" },
      hours: { type: "number" },
      activities: { type: "array", items: { type: "string" } },
      highlight: { type: "string" },
      concerns: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            quote: { type: "string" },
            category: { type: "string" },
            urgency: { type: "string", enum: ["today", "this_week", "none"] },
            reason: { type: "string" },
          },
          required: ["quote", "category", "urgency", "reason"],
        },
      },
    },
    required: [
      "transcript",
      "language",
      "volunteer_name",
      "site",
      "date",
      "hours",
      "activities",
      "highlight",
      "concerns",
    ],
  },
};

export async function processWithOpenAI(text: string): Promise<ParsedUpdate | null> {
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set");
    return null;
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\nToday is " + new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }) + " (America/New_York). Use it for \"today\"." },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      console.error("OpenAI extract error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    return validateParsedUpdate(JSON.parse(content));
  } catch (err) {
    console.error("OpenAI extract fetch error:", err);
    return null;
  }
}

export async function processWithGemini(text: string): Promise<ParsedUpdate | null> {
  if (!GEMINI_API_KEY) return null;
  const body = {
    contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\nVolunteer input:\n" + text }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  };
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("Gemini API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!textResponse) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(textResponse);
    } catch {
      const match = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (!match) return null;
      parsed = JSON.parse(match[1]);
    }
    return validateParsedUpdate(parsed);
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return null;
  }
}

export async function extractUpdate(text: string): Promise<{ parsed: ParsedUpdate | null; ms: number; source: string }> {
  const t0 = Date.now();
  let parsed = await processWithOpenAI(text);
  let source = "openai";
  if (!parsed) {
    parsed = await processWithGemini(text);
    source = parsed ? "gemini" : "none";
  }
  return { parsed, ms: Date.now() - t0, source };
}

export function validateParsedUpdate(parsed: any): ParsedUpdate | null {
  if (!parsed || typeof parsed !== "object") return null;
  const transcript = typeof parsed.transcript === "string" ? parsed.transcript : "";
  const language = ["en", "es", "mixed"].includes(parsed.language) ? parsed.language : "en";
  const volunteer_name = typeof parsed.volunteer_name === "string" ? parsed.volunteer_name : "";
  const site = typeof parsed.site === "string" ? parsed.site : "";
  const highlight = typeof parsed.highlight === "string" ? parsed.highlight.split(/\s+/).slice(0, 8).join(" ") : "";
  const date =
    typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const hours =
    typeof parsed.hours === "number" && !isNaN(parsed.hours) ? Math.max(0, parsed.hours) : 0;
  const activities = Array.isArray(parsed.activities)
    ? parsed.activities.filter((a: any) => typeof a === "string")
    : [];
  const concerns = Array.isArray(parsed.concerns)
    ? parsed.concerns
        .filter((c: any) => c && typeof c === "object")
        .map((c: any) => ({
          quote: typeof c.quote === "string" ? c.quote : "",
          category: typeof c.category === "string" ? c.category : "other",
          urgency: ["today", "this_week", "none"].includes(c.urgency) ? c.urgency : "none",
          reason: typeof c.reason === "string" ? c.reason : "",
        }))
    : [];
  return { transcript, language, volunteer_name, site, date, hours, activities, concerns, highlight };
}
