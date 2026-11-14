import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, insertUpdate, findOpenConcern, normalizeSite, cleanName, approveUpdate, getUpdate, volunteerStats } from "../src/database.ts";
import { handleHoursPatch, staffData } from "../src/staffdata.ts";
import { letterHtml } from "../src/letter.ts";
import { isStaff, isStaffPath } from "../src/staffgate.ts";
import { todayNY } from "../src/update.ts";

beforeEach(() => initDatabase(":memory:"));

const base = { activities: "[]", transcript: "t", language: "en", concerns: "[]", counted: true, duplicate_reason: null, created_at: new Date().toISOString() };
const add = (o: any) => insertUpdate({ volunteer_name: "Maria", site: "Food Bank", date: todayNY(), hours: 3, ...base, ...o });

describe("html ids", () => {
  const html = async (f: string) => Bun.file("public/" + f).text();
  for (const [h, j] of [["index.html", "app.js"], ["staff.html", "staff.js"]]) {
    test(j + " only uses ids that exist in " + h, async () => {
      const page = await html(h), js = await html(j);
      const ids = new Set([...page.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      const created = new Set([...js.matchAll(/\bid="([^"\\]+)"/g)].map((m) => m[1]).concat([...js.matchAll(/id=\\?"([^"\\]+)\\?"/g)].map((m) => m[1])));
      const used = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1])
        .concat([...js.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]))
        .concat([...js.matchAll(/querySelector\("#([\w-]+)/g)].map((m) => m[1]));
      const missing = used.filter((i) => !ids.has(i) && !created.has(i));
      expect(missing).toEqual([]);
    });
  }
});

describe("normalizing", () => {
  test("sites", () => {
    expect(normalizeSite("food bank")).toBe("Food Bank");
    expect(normalizeSite("Food pantry")).toBe("Food Bank");
    expect(normalizeSite("Unknown")).toBe("");
    expect(normalizeSite("little place")).toBe("Little Place");
  });
  test("names", () => {
    expect(cleanName("Anonymous")).toBe("");
    expect(cleanName("here to")).toBe("");
    expect(cleanName("maria")).toBe("Maria");
  });
});

describe("repeated concern", () => {
  test("same volunteer, same day, similar quote is found; other volunteer is not", () => {
    add({ concerns: JSON.stringify([{ quote: "a woman is scared to go home", category: "safety", urgency: "today", reason: "" }]) });
    expect(findOpenConcern("Maria", todayNY(), ["woman scared to go home"])).toBe(true);
    expect(findOpenConcern("Luis", todayNY(), ["woman scared to go home"])).toBe(false);
    expect(findOpenConcern("Maria", todayNY(), ["child was hungry"])).toBe(false);
  });
});

describe("needs-hours PATCH", () => {
  test("sets hours only on a zero-hour update", async () => {
    const id = add({ hours: 0, counted: false });
    const req = (h: number) => new Request("http://x/api/update/1/hours", { method: "PATCH", body: JSON.stringify({ hours: h }) });
    expect((await handleHoursPatch(req(3), id, {})).status).toBe(200);
    expect(getUpdate(id)!.hours).toBe(3);
    expect(getUpdate(id)!.counted).toBe(true);
    expect((await handleHoursPatch(req(5), id, {})).status).toBe(409);
    expect((await handleHoursPatch(req(99), id, {})).status).toBe(400);
  });
});

describe("letter", () => {
  test("only approved hours", () => {
    const a = add({ hours: 4 }); add({ hours: 2, site: "Clinic" });
    approveUpdate(a, "Sam");
    const html = letterHtml("Maria", "en");
    expect(html).toContain("Total approved hours: 4");
    expect(html).not.toContain("Clinic");
    expect(html).toContain("Hours still waiting for staff confirmation are not included.");
    expect(volunteerStats("Maria").approved_hours).toBe(4);
  });
});

describe("staff numbers and gate", () => {
  test("approved hours and dollars", () => {
    const a = add({ hours: 10 }); approveUpdate(a, "Sam"); add({ hours: 2 });
    const d = staffData();
    expect(d.approved_hours).toBe(10);
    expect(d.waiting_hours).toBe(2);
    expect(d.dollars).toBe(348.8);
  });
  test("no cookie means not staff, new staff routes are gated", () => {
    expect(isStaff(new Request("http://x/api/staff"))).toBe(false);
    for (const p of ["/api/staff", "/api/concerns/mark-handled", "/api/approve", "/api/fix-hours", "/api/report.csv", "/api/sample"]) expect(isStaffPath(p)).toBe(true);
  });
});
