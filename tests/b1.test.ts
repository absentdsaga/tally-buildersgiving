import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, markHandled, getUpdate } from "../src/database.ts";
import { handleUpdate } from "../src/update.ts";
import { handleVolunteerStatus, staffData } from "../src/staffdata.ts";
import { parseFallback } from "../src/fallback.ts";

process.env.TALLY_FALLBACK_ONLY = "1";
beforeEach(() => initDatabase(":memory:"));

const post = (text: string, name: string) =>
  handleUpdate(new Request("http://x/api/update", { method: "POST", body: JSON.stringify({ text, volunteer_name: name }) }), {});

describe("B1 concern levels", () => {
  test("danger words in EN and ES become danger_now", () => {
    for (const t of ["He has a gun at home", "Her dad hit her", "Vi sangre y un arma", "she said she wants to hurt herself"]) {
      expect(parseFallback(t).concerns.some((c) => c.level === "danger_now")).toBe(true);
    }
  });
  test("non-danger concerns keep today / fyi", () => {
    const p = parseFallback("A woman is scared to go home. He needs help with housing.");
    expect(p.concerns.find((c) => c.level === "today")).toBeTruthy();
    expect(p.concerns.find((c) => c.level === "fyi")).toBeTruthy();
  });
  test("Spanish concern stores quote_en and level via the API", async () => {
    const r = await (await post("Hoy trabajé tres horas en el refugio. Un niño solo tenía sangre", "Maria")).json();
    expect(r.concern_level).toBe("danger_now");
    const c = staffData().open_concerns[0];
    expect(c.level).toBe("danger_now");
    expect(c.quote_en).toBeDefined();
    expect(getUpdate(r.id)!.concerns).toContain("level");
  });
  test("danger_now sorts above today", async () => {
    await post("Soy Ana, 2 hours at the shelter, a woman is scared to go home", "Ana");
    await post("Luis, 2 hours at the food bank, a man had a gun", "Luis");
    expect(staffData().open_concerns.map((c) => c.level)).toEqual(["danger_now", "today"]);
  });
  test("handled shows in volunteer status", async () => {
    const r = await (await post("3 hours at the shelter, a woman is scared to go home", "Maria")).json();
    const url = new URL("http://x/api/volunteer/status?name=Maria&since=1970-01-01T00:00:00Z");
    expect((await (handleVolunteerStatus(url, {})).json()).handled.length).toBe(0);
    markHandled(r.id, "Sam");
    expect((await (handleVolunteerStatus(url, {})).json()).handled.length).toBe(1);
    const other = new URL("http://x/api/volunteer/status?name=Maria%20QA&since=1970-01-01T00:00:00Z");
    expect((await (handleVolunteerStatus(other, {})).json()).handled.length).toBe(0);
  });
});
