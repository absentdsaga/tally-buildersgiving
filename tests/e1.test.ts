import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { seedEvent, getEvent, eventStatus, checkIn, checkedInNow, saveEvent } from "../src/event.ts";

beforeEach(() => initDatabase(":memory:"));

describe("Part A event", () => {
  test("seed spans now and reads Happening now", () => {
    expect(seedEvent()).toBe(true);
    const e = getEvent()!;
    expect(e.place).toBe("Riverside Pantry");
    expect(e.goal_done).toBe(182);
    expect(e.know.length).toBe(4);
    expect(e.status).toBe("now");
    expect(seedEvent()).toBe(false);
  });
  test("status math", () => {
    const s = "2026-11-14T14:00:00Z", e = "2026-11-14T17:00:00Z";
    expect(eventStatus(s, e, Date.parse(s) - 20 * 60000)).toEqual({ status: "soon", minutes: 20 });
    expect(eventStatus(s, e, Date.parse(s) + 3600000).status).toBe("now");
    expect(eventStatus(s, e, Date.parse(e) - 10 * 60000).status).toBe("wrapping");
  });
  test("check-in is idempotent and listed", () => {
    checkIn("Sofia", true); checkIn("sofia");
    expect(checkedInNow().length).toBe(1);
  });
  test("saveEvent rejects bad times", () => {
    expect(saveEvent({ name: "X", start_at: "2026-11-14T15:00:00Z", end_at: "2026-11-14T14:00:00Z" })).toBeNull();
  });
});
