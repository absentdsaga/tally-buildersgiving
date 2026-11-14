import type { ParsedUpdate } from "./types.ts";

// Fallback rule-based parser for typed text when Gemini fails
export function parseFallback(text: string): ParsedUpdate {
  const lower = text.toLowerCase();
  const now = new Date();
  const date = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  // Detect language
  const spanishWords = /\b(estuve|trabajé|horas|hoy|ayer|voluntario|comida|banco|centro|ayudé|niño|mujer|miedo|solo|hambre|enfermo|peligro)\b/;
  const englishWords = /\b(was|worked|hours|today|yesterday|volunteer|food|bank|center|helped|child|woman|scared|alone|hungry|sick|danger)\b/;
  const hasSpanish = spanishWords.test(lower);
  const hasEnglish = englishWords.test(lower);
  const language = hasSpanish && hasEnglish ? "mixed" : hasSpanish ? "es" : "en";

  // Extract hours: look for patterns like "3 hours", "3.5 horas", "three hours"
  let hours = 0;
  const hourPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:hours?|horas?|hrs?)/i,
    /(\d+(?:\.\d+)?)\s*(?:hour|hora)/i,
    /(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|horas?)/i,
  ];
  for (const pattern of hourPatterns) {
    const match = text.match(pattern);
    if (match) {
      hours = parseFloat(match[1]);
      break;
    }
  }

  // Extract name: look for "my name is X" or "soy X"
  let volunteer_name = "";
  const namePatterns = [
    /my name is ([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-ÿ][a-zà-ÿ]+)?)/i,
    /soy ([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-ÿ][a-zà-ÿ]+)?)/i,
    /me llamo ([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-ÿ][a-zà-ÿ]+)?)/i,
    /i'?m ([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-ÿ][a-zà-ÿ]+)?)/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      volunteer_name = match[1];
      break;
    }
  }

  // Extract site
  let site = "Unknown";
  const sitePatterns = [
    /(?:at|en)\s+(?:the\s+|el\s+)?(food bank|banco de comida|community center|centro comunitario|pantry|shelter|refugio|kitchen|cocina|clinic|clínica)/i,
  ];
  for (const pattern of sitePatterns) {
    const match = text.match(pattern);
    if (match) {
      site = match[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      break;
    }
  }
  // Normalize common sites
  if (/banco de comida/i.test(site)) site = "Food Bank";
  if (/centro comunitario/i.test(site)) site = "Community Center";
  if (/clínica/i.test(site)) site = "Clinic";
  if (/refugio/i.test(site)) site = "Shelter";
  if (/cocina/i.test(site)) site = "Kitchen";

  // Extract activities
  const activities: string[] = [];
  const activityKeywords = [
    "packing", "sorting", "serving", "cleaning", "distributing", "organizing",
    "empacando", "clasificando", "sirviendo", "limpiando", "distribuyendo", "organizando",
    "registering", "signing in", "checking", "preparing",
    "registrando", "firmando", "revisando", "preparando",
  ];
  for (const kw of activityKeywords) {
    if (lower.includes(kw)) {
      activities.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  }

  // Detect concerns
  const concerns: ParsedUpdate["concerns"] = [];

  // Urgency patterns
  const todayPatterns = [
    /scared to go home|miedo de ir a casa|miedo a ir a casa/i,
    /child alone|niño solo|niña sola/i,
    /hasn'?t eaten|no ha comido|no comió|sin comer/i,
    /medical|emergency|ambulance|hospital|enfermo grave|emergencia/i,
    /threat|threatened|amenaza|amenazado/i,
    /abuse|abuso|abusado/i,
    /injured|hurt|herido|lesionado/i,
  ];

  const thisWeekPatterns = [
    /needs help|necesita ayuda/i,
    /worried about|preocupado por/i,
    /housing|vivienda|homeless|sin hogar/i,
    /job|employment|empleo|trabajo/i,
  ];

  for (const pattern of todayPatterns) {
    const match = text.match(pattern);
    if (match) {
      concerns.push({
        quote: match[0],
        category: "safety",
        urgency: "today",
        reason: "Immediate safety or wellbeing concern detected",
      });
    }
  }

  for (const pattern of thisWeekPatterns) {
    const match = text.match(pattern);
    if (match) {
      concerns.push({
        quote: match[0],
        category: "wellbeing",
        urgency: "this_week",
        reason: "Needs follow-up but not immediate",
      });
    }
  }

  return {
    transcript: text,
    language,
    volunteer_name,
    site,
    date,
    hours,
    activities,
    concerns,
  };
}
