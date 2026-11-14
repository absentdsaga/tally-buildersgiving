import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, countUpdates, setFloor, getFloor, saveSpot } from "../src/database.ts";
import { handleUpdate, todayNY } from "../src/update.ts";
import { parseFallback } from "../src/fallback.ts";

process.env.TALLY_FALLBACK_ONLY = "1";
beforeEach(() => initDatabase(":memory:"));

const post = (text: string, name: string) =>
  handleUpdate(new Request("http://x/api/update", { method: "POST", body: JSON.stringify({ text, volunteer_name: name }) }), {});

describe("B4 intent", () => {
  test("four moments in EN and ES", () => {
    expect(parseFallback("Hi, I'm Luis, first time").intent).toBe("arriving");
    expect(parseFallback("Hola, llegué").intent).toBe("arriving");
    expect(parseFallback("I'm free").intent).toBe("free");
    expect(parseFallback("I'm bored").intent).toBe("free");
    expect(parseFallback("ya terminé lo que me dieron").intent).toBe("free");
    expect(parseFallback("¿qué hago?").intent).toBe("free");
    expect(parseFallback("I did 3 hours at the food bank").intent).toBe("done");
    expect(parseFallback("a woman is scared to go home").intent).toBe("concern");
  });
  test("free hands out the oldest open task once; nothing stored", async () => {
    setFloor(todayNY(), "Sort cans, table 2\nSweep", "Find Ana at the front table.");
    const a = await (await post("I'm free", "Luis")).json();
    expect(a.thanks).toContain("Sort cans, table 2");
    const b = await (await post("I'm bored", "Maria")).json();
    expect(b.thanks).toContain("Sweep");
    const c = await (await post("I'm free", "Ana")).json();
    expect(c.thanks).toContain("Ask the staff");
    expect(getFloor(todayNY()).taken[0].taken_by).toBe("Luis");
    expect(countUpdates()).toBe(0);
  });
  test("arriving greets and reads notes", async () => {
    setFloor(todayNY(), "", "Find Ana at the front table.");
    const r = await (await post("Hi, I'm Luis, first time", "Luis")).json();
    expect(r.thanks).toContain("Welcome, Luis.");
    expect(r.thanks).toContain("Find Ana");
    expect(countUpdates()).toBe(0);
  });
  test("arriving always gives a next step", async () => {
    for (const s of ["I just got here, idk what to do", "first day", "acabo de llegar, no sé qué hacer", "es mi primera vez", "primer día", "llegué"])
      expect(parseFallback(s).intent).toBe("arriving");
    const a = await (await post("I just got here, idk what to do", "Dioni")).json();
    expect(a.intent).toBe("arriving");
    expect(a.thanks).toContain("front table");
    setFloor(todayNY(), "Sort cans\nSweep", "");
    const b = await (await post("first time", "Dioni")).json();
    expect(b.thanks).toContain("Sort cans");
    expect(getFloor(todayNY()).taken[0].taken_by).toBe("Dioni");
    const c = await (await post("acabo de llegar", "Ana")).json();
    expect(c.thanks).toContain("Bienvenido/a, Ana");
    expect(c.thanks).toContain("Sweep");
    setFloor(todayNY(), "", "");
    const d = await (await post("acabo de llegar", "Ana")).json();
    expect(d.thanks).toContain("mesa de entrada");
  });
  test("spot interest is counted once per name per day", () => {
    saveSpot("Luis", todayNY()); saveSpot("luis", todayNY());
    expect(getFloor(todayNY()).spots).toBe(1);
  });
});
