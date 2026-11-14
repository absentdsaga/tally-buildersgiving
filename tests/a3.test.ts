import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, insertUpdate, getUpdate, markHandled, fixHours, approveUpdate, countUpdates } from "../src/database.ts";
import { handleUpdate, todayNY } from "../src/update.ts";
import { staffData } from "../src/staffdata.ts";

process.env.TALLY_FALLBACK_ONLY = "1";
beforeEach(() => initDatabase(":memory:"));

const post = (text: string, name: string) =>
  handleUpdate(new Request("http://x/api/update", { method: "POST", body: JSON.stringify({ text, volunteer_name: name }) }), {});
const base = { activities: "[]", transcript: "t", language: "en", concerns: "[]", counted: true, duplicate_reason: null, created_at: new Date().toISOString() };
const add = (o: any) => insertUpdate({ volunteer_name: "Maria", site: "Food Bank", date: todayNY(), hours: 3, ...base, ...o });

describe("A1 through handleUpdate", () => {
  test("one counted, one duplicate", async () => {
    const a = await (await post("I did 3 hours at the food pantry sorting cans", "Maria")).json();
    const b = await (await post("Hoy trabajé tres horas en la despensa de comida organizando latas", "Maria")).json();
    expect(a.counted).toBe(true);
    expect(b.counted).toBe(false);
    expect(b.status_label).toBe("Duplicate");
    expect(b.site).toBe("Food Pantry");
  });
});

describe("A3/A4 rejections", () => {
  test("empty name is rejected", async () => {
    const r = await post("I did 3 hours at the food bank", "");
    expect(r.status).toBe(400);
    expect((await r.json()).code).toBe("name_required");
    expect(countUpdates()).toBe(0);
  });
  test("short or empty updates are not stored", async () => {
    expect((await post("hello there", "Maria")).status).toBe(422);
    expect((await post("I like the weather today", "Maria")).status).toBe(422);
    expect(countUpdates()).toBe(0);
  });
});

describe("A5 staff actions", () => {
  test("handled persists", () => {
    const id = add({ concerns: JSON.stringify([{ quote: "scared to go home", category: "safety", urgency: "today", reason: "" }]) });
    expect(staffData().open_concerns.length).toBe(1);
    markHandled(id, "Sam");
    const u = getUpdate(id)!;
    expect(u.handled_by).toBe("Sam");
    expect(u.handled_at).toBeTruthy();
    expect(staffData().open_concerns.length).toBe(0);
    expect(staffData().handled_concerns.length).toBe(1);
  });
  test("fix keeps reported hours and updates totals", () => {
    const id = add({ hours: 5 });
    fixHours(id, 3, "Sam");
    approveUpdate(id, "Sam");
    const u = getUpdate(id)!;
    expect(u.hours).toBe(3);
    expect(u.reported_hours).toBe(5);
    expect(staffData().approved_hours).toBe(3);
    expect(staffData().report_hours).toBe(3);
  });
});

describe("A6 report hours", () => {
  test("report_hours is zero until approval", () => {
    add({ hours: 4 });
    expect(staffData().report_hours).toBe(0);
  });
});
