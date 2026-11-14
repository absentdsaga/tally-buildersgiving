import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { seedEvent } from "../src/event.ts";
import { answerQuestion } from "../src/ask.ts";

beforeEach(() => { initDatabase(":memory:"); seedEvent(); });

describe("Part D ask", () => {
  test("parking answers from Know before you go", () => {
    const r = answerQuestion("Where do I park?");
    expect(r.known).toBe(true);
    expect(r.answer).toContain("back lot");
  });
  test("staff note answers boundary question", () => {
    expect(answerQuestion("Can I give a client my phone number?").answer).toContain("phone number or money");
    expect(answerQuestion("Can I give a client a ride?").answer).toContain("rides");
  });
  test("Spanish question gets Spanish answer", () => {
    const r = answerQuestion("¿Dónde puedo estacionar?");
    expect(r.lang).toBe("es");
    expect(r.answer).toContain("lote de atrás");
  });
  test("unknown is never invented", () => {
    const r = answerQuestion("What is the wifi password?");
    expect(r.known).toBe(false);
    expect(r.answer).toBe("I don't know that one. Ask Maria at the front table.");
    expect(answerQuestion("¿Cuál es la clave del wifi?").answer).toContain("No sé esa");
  });
});
