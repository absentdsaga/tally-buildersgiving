import type { ParsedUpdate } from "./types.ts";

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a volunteer-hours extraction system for a nonprofit called Tally.

A volunteer describes their shift in English, Spanish, or a mix of both. Extract the following JSON:

{
  "transcript": "the full text of what the volunteer said or typed",
  "language": "en" | "es" | "mixed",
  "volunteer_name": "the name if stated, otherwise empty string",
  "site": "the location where they volunteered, e.g. 'Food Bank', 'Community Center'",
  "date": "YYYY-MM-DD (default today if not stated, use America/New_York timezone)",
  "hours": number (total hours worked, e.g. 3 or 3.5),
  "activities": ["list of activities they did"],
  "concerns": [
    {
      "quote": "exact words from the volunteer about the concern",
      "category": "e.g. safety, health, food insecurity, child welfare, threat",
      "urgency": "today" | "this_week" | "none",
      "reason": "brief explanation of why this urgency level"
    }
  ]
}

Rules:
- If the same concern is described in different ways, keep the original language in the quote.
- Urgency "today" means someone is in immediate danger, scared, a child is unsupervised, someone hasn't eaten, or there's a medical emergency.
- Urgency "this_week" means a problem that needs follow-up but isn't immediate.
- Urgency "none" means a minor issue or no concern.
- If no concerns, return empty concerns array.
- Return ONLY valid JSON, no markdown, no explanation.`;

export async function processWithGemini(
  text: string,
  audioBase64?: string,
  mimeType?: string
): Promise<ParsedUpdate | null> {
  if (!GEMINI_API_KEY) {
    console.error("GOOGLE_AI_API_KEY not set");
    return null;
  }

  const parts: any[] = [{ text: SYSTEM_PROMPT + "\n\nVolunteer input:\n" + text }];

  if (audioBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const textResponse =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!textResponse) {
      console.error("Empty Gemini response");
      return null;
    }

    // Parse the JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(textResponse);
    } catch {
      // Try to extract JSON from markdown code block
      const match = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        console.error("Failed to parse Gemini JSON response:", textResponse);
        return null;
      }
    }

    return validateParsedUpdate(parsed);
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return null;
  }
}

export function validateParsedUpdate(parsed: any): ParsedUpdate | null {
  if (!parsed || typeof parsed !== "object") return null;

  const transcript = typeof parsed.transcript === "string" ? parsed.transcript : "";
  const language = ["en", "es", "mixed"].includes(parsed.language)
    ? parsed.language
    : "en";
  const volunteer_name =
    typeof parsed.volunteer_name === "string" ? parsed.volunteer_name : "";
  const site = typeof parsed.site === "string" ? parsed.site : "Unknown";
  const date =
    typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const hours =
    typeof parsed.hours === "number" && !isNaN(parsed.hours)
      ? Math.max(0, parsed.hours)
      : 0;
  const activities = Array.isArray(parsed.activities)
    ? parsed.activities.filter((a: any) => typeof a === "string")
    : [];

  const concerns = Array.isArray(parsed.concerns)
    ? parsed.concerns
        .filter((c: any) => c && typeof c === "object")
        .map((c: any) => ({
          quote: typeof c.quote === "string" ? c.quote : "",
          category: typeof c.category === "string" ? c.category : "other",
          urgency: ["today", "this_week", "none"].includes(c.urgency)
            ? c.urgency
            : "none",
          reason: typeof c.reason === "string" ? c.reason : "",
        }))
    : [];

  return { transcript, language, volunteer_name, site, date, hours, activities, concerns };
}
