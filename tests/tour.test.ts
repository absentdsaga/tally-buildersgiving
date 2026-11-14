import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
const { filterSteps, SETS } = require("../public/tour.js");

describe("walkthrough", () => {
  test("pages include the tour script", () => {
    for (const f of ["index.html", "staff.html"]) expect(readFileSync("public/" + f, "utf8")).toContain("/tour.js");
  });
  test("step filter skips missing targets", () => {
    const have = new Set(["#talk-btn", "#progress"]);
    const out = filterSteps(SETS.volunteer, (s: string) => have.has(s));
    expect(out.map((s: any) => s.sel)).toEqual(["#talk-btn", "#progress"]);
    expect(filterSteps(SETS.staff, () => false)).toEqual([]);
  });
  test("every step has EN and ES text", () => {
    for (const s of [...SETS.volunteer, ...SETS.staff]) { expect(s.en.length).toBeGreaterThan(5); expect(s.es.length).toBeGreaterThan(5); }
  });
});
