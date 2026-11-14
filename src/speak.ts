import type { Language } from "./types.ts";

export type SpeakKind = "counted" | "duplicate" | "needs_hours";

export interface SpeakInput {
  kind: SpeakKind;
  name: string;
  hours: number;
  site: string;
  language: Language;
  duplicateTime?: string;
  hasConcern?: boolean;
}

export function speakLanguage(language: Language): "en" | "es" {
  return language === "es" ? "es" : "en";
}

function firstName(name: string): string {
  const n = (name || "friend").trim();
  return n.split(/\s+/)[0] || "friend";
}

function hoursPhrase(hours: number, lang: "en" | "es"): string {
  if (lang === "es") {
    return hours === 1 ? "una hora" : `${hours} horas`;
  }
  return hours === 1 ? "one hour" : `${hours} hours`;
}

export function buildSpeakText(input: SpeakInput): string {
  const lang = speakLanguage(input.language);
  const name = firstName(input.name);
  const site = input.site || (lang === "es" ? "el sitio" : "the site");
  const h = hoursPhrase(input.hours, lang);

  if (input.kind === "needs_hours") {
    return lang === "es"
      ? `Gracias, ${name}. ¿Cuántas horas fue tu turno?`
      : `Thank you, ${name}. How many hours was your shift?`;
  }

  if (input.kind === "duplicate") {
    const when = input.duplicateTime || "";
    return lang === "es"
      ? `Ya lo tenemos, ${name}: ${h} en ${site}, contado una vez${when ? " a las " + when : ""}.`
      : `Already have it, ${name}: ${h} at ${site}, counted once${when ? " at " + when : ""}.`;
  }

  const concern =
    input.hasConcern
      ? lang === "es"
        ? " Y lo que te dijeron está con el personal ahora, para hoy."
        : " And what that woman told you is with the staff now, for today."
      : "";

  return lang === "es"
    ? `Gracias, ${name}. ${h.charAt(0).toUpperCase() + h.slice(1)} en ${site}, contadas.${concern}`
    : `Thank you, ${name}. ${h.charAt(0).toUpperCase() + h.slice(1)} at ${site}, counted.${concern}`;
}
