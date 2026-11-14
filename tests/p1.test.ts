import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { handleUpdate, todayNY } from "../src/update.ts";
import { staffData } from "../src/staffdata.ts";

process.env.TALLY_FALLBACK_ONLY = "1";
beforeEach(() => initDatabase(":memory:"));

const TEXT = "I did 3 hours at Riverside Pantry sorting cans. One lady said she is scared to go home, her husband yells at her.";
const post = (text: string, name: string) =>
  handleUpdate(new Request("http://x/api/update", { method: "POST", body: JSON.stringify({ text, volunteer_name: name }) }), {});

describe("issue 7: one message carries hours and a concern", () => {
  test("staff summary for today counts the shift and shows the concern", async () => {
    const r = await (await post(TEXT, "Rosa")).json();
    expect(r.counted).toBe(true);
    expect(r.has_concern).toBe(true);
    const d = staffData();
    expect(d.today).toBe(todayNY());
    expect(d.today_volunteers).toBe(1);
    expect(d.today_hours).toBe(3);
    expect(d.today_waiting).toBe(3);
    expect(d.open_concerns.length).toBe(1);
    expect(["today", "danger_now"]).toContain(d.open_concerns[0].level);
  });

  test("shift date is a real date, never Invalid", async () => {
    const r = await (await post(TEXT, "Rosa")).json();
    expect(r.date).toBe(todayNY());
    const shown = new Date(r.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    expect(shown).not.toContain("Invalid");
    expect(shown).toMatch(/^\w{3}, \w{3} \d+$/);
  });
});
