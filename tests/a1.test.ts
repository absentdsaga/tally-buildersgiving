import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, insertUpdate, checkDuplicate, normalizeSite } from "../src/database.ts";
import { parseFallback } from "../src/fallback.ts";
import { todayNY, resolveSite } from "../src/update.ts";

beforeEach(() => initDatabase(":memory:"));

function run(text: string, name: string) {
  const p = parseFallback(text);
  const site = normalizeSite(p.site_canonical || p.site);
  const dup = checkDuplicate(name, todayNY(), site, p.hours);
  const counted = p.hours > 0 && !dup.isDuplicate;
  insertUpdate({ volunteer_name: name, site, date: todayNY(), hours: p.hours, activities: "[]", transcript: text, language: p.language, concerns: "[]", counted, duplicate_reason: dup.reason ?? null, created_at: new Date().toISOString(), approved: false, approved_by: null, approved_at: null, fixed_by: null, fixed_at: null });
  return { counted, site };
}

describe("A1/A2 duplicates", () => {
  test("Spanish retelling is a duplicate", () => {
    const a = run("I did 3 hours at the food pantry sorting cans", "Maria");
    const b = run("Hoy trabajé tres horas en la despensa de comida organizando latas", "Maria");
    expect(a).toEqual({ counted: true, site: "Food Pantry" });
    expect(b).toEqual({ counted: false, site: "Food Pantry" });
  });
  test("Maria and Maria QA never match", () => {
    run("I did 3 hours at the food pantry", "Maria");
    expect(run("I did 3 hours at the food pantry", "Maria QA").counted).toBe(true);
    expect(run("I did 3 hours at the food pantry", "María ").counted).toBe(false);
  });
});

describe("named site", () => {
  test("keeps the place the volunteer said", () => {
    const p = parseFallback("I did 3 hours at Riverside Pantry sorting cans");
    expect(resolveSite(p.site, p.site_canonical || "", "Little Havana Kitchen")).toBe("Riverside Pantry");
    expect(resolveSite("Riverside Pantry", "Food Pantry", "X")).toBe("Riverside Pantry");
  });
  test("maps generic names and defaults to the event place", () => {
    expect(resolveSite("the food pantry", "", "X")).toBe("Food Pantry");
    expect(resolveSite("", "", "riverside pantry")).toBe("Riverside Pantry");
  });
});
