import type { ParsedUpdate } from "./types.ts";

const EN_HOURS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const ES_HOURS: Record<string, number> = {
  uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

export function parseHoursFromText(text: string): number {
  const lower = text.toLowerCase();

  const digitHour = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|horas?|hrs?|h\b)/i);
  if (digitHour) return parseFloat(digitHour[1]);

  const bareH = lower.match(/\b(\d+(?:\.\d+)?)h\b/);
  if (bareH) return parseFloat(bareH[1]);

  const words = { ...EN_HOURS, ...ES_HOURS };
  const wordList = Object.keys(words).join("|");

  const halfAfter = new RegExp(
    "\\\\b(" + wordList + ")\\\\s+(?:hours?|horas?|hrs?)?\\\\s*(?:and a half|y media)\\\\b",
    "i"
  );
  const mHalf = lower.match(halfAfter);
  if (mHalf) return words[mHalf[1]] + 0.5;

  if (/\bmedia\s+(?:hora|hour)\b/.test(lower)) return 0.5;
  if (/\bhalf\s+(?:an?\s+)?(?:hour|hora)\b/.test(lower)) return 0.5;

  const wordHour = new RegExp("\\\\b(" + wordList + ")\\\\s*(?:hours?|horas?|hrs?)\\\\b", "i");
  const mWord = lower.match(wordHour);
  if (mWord) return words[mWord[1]];

  const hice = lower.match(new RegExp("\\\\bhice\\\\s+(" + wordList + ")(?:\\\\s+(?:horas?|hours?))?\\\\b", "i"));
  if (hice) return words[hice[1]];

  return 0;
}

export function parseFallback(text: string): ParsedUpdate {
  const lower = text.toLowerCase();
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const spanishWords =
    /\b(estuve|trabaj\u00E9|trabaje|horas|hoy|ayer|voluntario|comida|banco|centro|ayud\u00E9|ayude|ni\u00F1o|nino|mujer|miedo|solo|hambre|enfermo|peligro|hice|soy|me llamo)\b/;
  const englishWords =
    /\b(was|worked|hours|today|yesterday|volunteer|food|bank|center|helped|child|woman|scared|alone|hungry|sick|danger|here)\b/;
  const hasSpanish = spanishWords.test(lower);
  const hasEnglish = englishWords.test(lower);
  const language = hasSpanish && hasEnglish ? "mixed" : hasSpanish ? "es" : "en";

  const hours = parseHoursFromText(text);

  let volunteer_name = "";
  const namePatterns = [
    /my name is ([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s[A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+)?)/i,
    /soy ([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s[A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+)?)/i,
    /me llamo ([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s[A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+)?)/i,
    /i'm ([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s[A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+)?)/i,
    /^([A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+(?:\s[A-Z\u00C0-\u00FF][a-z\u00E0-\u00FF]+)?)\s+here\b/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      volunteer_name = match[1];
      break;
    }
  }

  let site = "Unknown";
  const siteMatch = text.match(/(?:at|en)\s+(?:the\s+|el\s+|la\s+)?(food bank|banco de comida|community center|centro comunitario|pantry|shelter|refugio|kitchen|cocina|clinic|cl\u00EDnica|clinica)/i);
  if (siteMatch) {
    site = siteMatch[1];
  }
  if (/banco de comida|food bank/i.test(site)) site = "Food Bank";
  if (/centro comunitario/i.test(site)) site = "Community Center";
  if (/cl\u00EDnica|clinica/i.test(site)) site = "Clinic";
  if (/refugio/i.test(site)) site = "Shelter";
  if (/cocina/i.test(site)) site = "Kitchen";

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

  const concerns: ParsedUpdate["concerns"] = [];
  const todayPatterns = [
    /scared to go home|miedo de ir a casa|miedo a ir a casa/i,
    /child alone|ni\u00F1o solo|ni\u00F1a sola/i,
    /hasn't eaten|no ha comido|no comi\u00F3|sin comer/i,
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
