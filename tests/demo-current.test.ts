import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, refreshDemo, seededCount } from "../src/database.ts";
import { getEvent, demoWindow, eventStatus } from "../src/event.ts";

beforeEach(() => initDatabase(":memory:"));

describe("demo stays current", () => {
  test("sample event is created on first read and is happening now", () => {
    const e = getEvent()!;
    expect(e).not.toBeNull();
    expect(e.status).toBe("now");
  });
  test("demo window is live at every hour of the day", () => {
    const base = Date.parse("2026-11-20T00:00:00Z");
    for (let h = 0; h < 24; h++) {
      const now = base + h * 3600000 + 59 * 60000;
      const w = demoWindow(now);
      expect(eventStatus(w.start.toISOString(), w.end.toISOString(), now).status).toBe("now");
    }
  });
  test("refreshDemo reseeds once per day only", () => {
    expect(refreshDemo()).toBeGreaterThan(10);
    const n = seededCount();
    expect(refreshDemo()).toBe(0);
    expect(seededCount()).toBe(n);
  });
});
