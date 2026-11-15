import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, seedDemo, clearDemo, countUpdates, insertUpdate } from "../src/database.ts";
import { staffData } from "../src/staffdata.ts";
import { todayNY } from "../src/update.ts";

beforeEach(() => initDatabase(":memory:"));

describe("demo seed", () => {
  test("seeds an empty database with a full staff view", () => {
    expect(seedDemo()).toBeGreaterThan(10);
    const d = staffData();
    expect(d.waiting.length).toBeGreaterThanOrEqual(2);
    expect(d.waiting.length).toBeLessThanOrEqual(5);
    expect(d.waiting.some((w) => w.first_shift)).toBe(true);
    expect(new Set(d.open_concerns.map((c) => c.level))).toEqual(new Set(["danger_now", "fyi", "today"]));
    expect(d.handled_concerns.length).toBe(1);
    expect(d.quiet.length).toBeGreaterThanOrEqual(2);
    expect(d.dollars).toBeGreaterThan(0);
    expect(d.days.filter((x) => x.total > 0).length).toBeGreaterThan(0);
    expect(JSON.stringify(d)).not.toMatch(/Test|QA|Unknown/);
  });
  test("does not seed a database that has data", () => {
    insertUpdate({ volunteer_name: "Real", site: "Food Bank", date: todayNY(), hours: 1, activities: "[]", transcript: "t", language: "en", concerns: "[]", counted: true, duplicate_reason: null, created_at: new Date().toISOString(), approved: false, approved_by: null, approved_at: null, fixed_by: null, fixed_at: null });
    expect(seedDemo()).toBe(0);
  });
  test("clear removes only seeded rows and does not reseed", () => {
    seedDemo();
    insertUpdate({ volunteer_name: "Real", site: "Food Bank", date: todayNY(), hours: 1, activities: "[]", transcript: "t", language: "en", concerns: "[]", counted: true, duplicate_reason: null, created_at: new Date().toISOString(), approved: false, approved_by: null, approved_at: null, fixed_by: null, fixed_at: null });
    clearDemo();
    expect(countUpdates()).toBe(1);
  });
});
