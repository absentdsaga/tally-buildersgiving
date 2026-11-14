import { getEvent } from "./event.ts";
import { listTasks } from "./tasks.ts";
import { normalize } from "./database.ts";

const ES_LINES: Record<string, string> = {
  "Park in the back lot, not on Oak Street.": "Estaciona en el lote de atrás, no en la calle Oak.",
  "Wear closed-toe shoes and your Tally badge.": "Usa zapatos cerrados y tu credencial de Tally.",
  "Bags go on the blue cart by door 2.": "Las bolsas van en el carrito azul junto a la puerta 2.",
  "Bathrooms are past the water station. Take a water break every hour.": "Los baños están después de la estación de agua. Toma un descanso de agua cada hora.",
  "Don't give clients your phone number or money.": "No les des a los clientes tu número de teléfono ni dinero.",
  "Don't give clients rides. Tell Maria if someone asks.": "No lleves a clientes en tu carro. Dile a Maria si alguien lo pide.",
  "Breaks: 15 minutes, ask your table lead.": "Descansos: 15 minutos, pregunta a tu líder de mesa.",
};

const TOPICS: Array<[string, RegExp]> = [
  ["park", /park|estacion|parqueo|aparcar|carro|lot\b/],
  ["wear", /wear|shoe|badge|dress|ropa|zapato|vestir|usar|credencial/],
  ["bags", /\bbags?\b|bolsa/],
  ["bath", /bathroom|restroom|toilet|bano|servicio/],
  ["water", /water|agua|break|descanso|rest|lunch|almuerzo|comer|eat/],
  ["ride", /\bride|aventon|llevar|drive|give a client/],
  ["money", /phone|number|money|telefono|dinero|plata|cash|numero/],
  ["host", /host|who is in charge|quien|anfitrion|boss|jefe|maria/],
  ["goal", /goal|meta|boxes|cajas|how many|cuantas|progress|avance/],
  ["time", /what time|when does|hora|end|finish|termina|start|empieza|cuando/],
  ["task", /task|job|tarea|trabajo|do now|que hago|sort|cans/],
];
const STOP = new Set(["the", "a", "an", "is", "are", "do", "i", "my", "to", "of", "and", "in", "on", "for", "where", "what", "can", "me", "el", "la", "de", "que", "en", "y", "un", "una", "mi", "donde", "como", "puedo"]);
const words = (s: string) => normalize(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w));

export function detectLang(q: string): "en" | "es" {
  const n = normalize(q);
  return /[¿¡ñáéíóú]/i.test(q) || /\b(donde|como|cuando|puedo|que|quien|hay|estoy|tengo|cuanto|cuantas|dame|necesito|baño|bano)\b/.test(n) ? "es" : "en";
}

export function answerQuestion(q: string, forceLang?: "en" | "es") {
  const lang = forceLang || detectLang(q);
  const ev = getEvent();
  const host = ev?.host || "staff";
  const where = ev?.host_where || "the front table";
  const unknown = lang === "es" ? `No sé esa. Pregunta a ${host} en ${where === "the front table" ? "la mesa de entrada" : where}.` : `I don't know that one. Ask ${host} at ${where}.`;
  if (!ev || !q.trim()) return { answer: unknown, known: false, lang, host };
  type Src = { en: string; es?: string; topics: string[] };
  const src: Src[] = [];
  const fmt = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const tm = (d: string) => new Date(d).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  src.push({ en: `${ev.name} at ${ev.place} runs ${fmt(ev.start_at)} to ${fmt(ev.end_at)}.`, es: `${ev.name} en ${ev.place} es de ${tm(ev.start_at)} a ${tm(ev.end_at)}.`, topics: ["time"] });
  src.push({ en: `Your host is ${ev.host}. Find them at ${ev.host_where}.`, es: `Tu anfitrión es ${ev.host}. Búscalo en ${ev.host_where === "the front table" ? "la mesa de entrada" : ev.host_where}.`, topics: ["host"] });
  if (ev.goal) src.push({ en: `Today's goal: ${ev.goal}. We are at ${ev.goal_done} of ${ev.goal_target} ${ev.goal_unit}.`, es: `Meta de hoy: ${ev.goal}. Vamos en ${ev.goal_done} de ${ev.goal_target} ${ev.goal_unit === "boxes" ? "cajas" : ev.goal_unit}.`, topics: ["goal"] });
  const topicOf = (l: string) => TOPICS.filter(([, re]) => re.test(normalize(l))).map(([k]) => k);
  for (const l of ev.know) src.push({ en: l, es: ES_LINES[l], topics: topicOf(l) });
  for (const l of String(ev.notes || "").split(/\r?\n/).map((x: string) => x.trim()).filter(Boolean)) {
    const tp = topicOf(l);
    if (/ride/i.test(l)) tp.push("ride");
    if (/phone|money/i.test(l)) tp.push("money");
    src.push({ en: l, es: ES_LINES[l], topics: tp });
  }
  for (const t of listTasks().filter((x) => !x.done)) {
    src.push({ en: `${t.title} is at ${t.place || "the front table"}. ${t.spots} of ${t.needed} spots open.`, es: `${t.title} es en ${t.place || "la mesa de entrada"}. ${t.spots} de ${t.needed} lugares libres.`, topics: ["task"] });
  }
  const nq = normalize(q), qw = new Set(words(q));
  const qTopics = TOPICS.filter(([, re]) => re.test(nq)).map(([k]) => k);
  const scored = src.map((s) => {
    const sw = new Set(words(s.en));
    const overlap = [...qw].filter((w) => sw.has(w)).length;
    const tp = s.topics.filter((x) => qTopics.includes(x)).length;
    return { s, score: tp * 3 + overlap };
  }).filter((x) => x.score >= 3).sort((a, b) => b.score - a.score);
  if (!scored.length) return { answer: unknown, known: false, lang, host };
  const picks = scored.slice(0, scored[0].score >= 6 && scored[1] && scored[1].score >= 6 ? 2 : 1).map((x) => x.s);
  const out = picks.map((p) => (lang === "es" ? p.es || p.en : p.en)).join(" ");
  return { answer: out, known: true, lang, host };
}
