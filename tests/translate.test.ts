import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { teamThread, sendMessage, threadMessages } from "../src/messages.ts";
import { translateToEnglish, fillEnglish } from "../src/translate.ts";

const realFetch = globalThis.fetch;
const realKey = process.env.OPENAI_API_KEY;
afterEach(() => { globalThis.fetch = realFetch; if (realKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = realKey; });

beforeEach(() => initDatabase(":memory:"));

describe("chat translation", () => {
  test("fillEnglish writes body_en for Spanish only", async () => {
    process.env.OPENAI_API_KEY = "test";
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "Hello team" } }] }))) as any;
    const t = teamThread();
    const es = sendMessage(t, "staff", "Maria", "", "Hola equipo", "es")!;
    const en = sendMessage(t, "staff", "Maria", "", "Hi team", "en")!;
    fillEnglish(es.id, es.body, "es"); fillEnglish(en.id, en.body, "en");
    await new Promise((r) => setTimeout(r, 50));
    const rows = threadMessages({ kind: "staff" }, t)!;
    expect(rows.find((m: any) => m.id === es.id).body_en).toBe("Hello team");
    expect(rows.find((m: any) => m.id === en.id).body_en).toBe("");
  });
  test("returns the model translation", async () => {
    process.env.OPENAI_API_KEY = "test";
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: " The tape is on table 2. " } }] }))) as any;
    expect(await translateToEnglish("La cinta est\u00e1 en la mesa 2.")).toBe("The tape is on table 2.");
  });
  test("falls back to empty on failure or no key", async () => {
    process.env.OPENAI_API_KEY = "test";
    globalThis.fetch = (async () => { throw new Error("down"); }) as any;
    expect(await translateToEnglish("hola")).toBe("");
    delete process.env.OPENAI_API_KEY;
    expect(await translateToEnglish("hola")).toBe("");
  });
});
