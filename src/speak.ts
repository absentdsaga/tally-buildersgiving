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
  highlight?: string;
  milestone?: number;
}

export function speakLanguage(language: Language): "en" | "es" {
  return language === "es" ? "es" : "en";
}

function firstName(name: string): string {
  const n = (name || "friend").trim();
  return n.split(/\s+/)[0] || "friend";
}

const EN_W = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const ES_W = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce"];

function hoursPhrase(hours: number, lang: "en" | "es"): string {
  if (Number.isInteger(hours) && hours >= 1 && hours <= 12) {
    return lang === "es" ? (hours === 1 ? "una hora" : ES_W[hours] + " horas") : (hours === 1 ? "one hour" : EN_W[hours] + " hours");
  }
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
        ? " Lo que nos contaste está con el personal ahora, para hoy."
        : " What you told us is with the staff now, for today."
      : "";
  const what = input.highlight ? ", " + input.highlight : "";
  const ms = input.milestone
    ? lang === "es" ? ` Es tu turno número ${input.milestone} con nosotros.` : ` That is your ${input.milestone}${ordinal(input.milestone)} shift with us.`
    : "";
  const cap = h.charAt(0).toUpperCase() + h.slice(1);
  return lang === "es"
    ? `Gracias, ${name}. ${cap} en ${site}${what}. Lo notamos.${ms}${concern}`
    : `Thank you, ${name}. ${cap} at ${site}${what}. We noticed.${ms}${concern}`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  return ["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th";
}
