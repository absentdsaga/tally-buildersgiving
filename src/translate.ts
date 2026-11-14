import { setBodyEn } from "./messages.ts";

export async function translateToEnglish(text: string): Promise<string> {
  const k = process.env.OPENAI_API_KEY;
  if (!k || !text.trim()) return "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + k },
      body: JSON.stringify({ model: "gpt-4.1-mini", temperature: 0, messages: [
        { role: "system", content: "Translate the user message from Spanish to English. Reply with the translation only." },
        { role: "user", content: text },
      ] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const d: any = await res.json();
    return String(d?.choices?.[0]?.message?.content || "").trim().slice(0, 1000);
  } catch { return ""; }
}

export function fillEnglish(id: number, body: string, lang: string): void {
  if (lang !== "es") return;
  translateToEnglish(body).then((en) => { if (en) setBodyEn(id, en); }).catch(() => {});
}
