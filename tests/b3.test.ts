import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { handleUpdate } from "../src/update.ts";
import { staffData } from "../src/staffdata.ts";

process.env.TALLY_FALLBACK_ONLY = "1";
beforeEach(() => initDatabase(":memory:"));

const post = (text: string, name: string) =>
  handleUpdate(new Request("http://x/api/update", { method: "POST", body: JSON.stringify({ text, volunteer_name: name }) }), {});

describe("B3 first shift", () => {
  test("first update for a name is flagged, the second is not", async () => {
    const a = await (await post("I did 3 hours at the food bank", "Luis")).json();
    const b = await (await post("I did 2 hours at the shelter", "Luis")).json();
    expect(a.first_shift).toBe(true);
    expect(b.first_shift).toBe(false);
    const w = staffData().waiting;
    expect(w.filter((x: any) => x.first_shift).length).toBe(1);
  });
  test("type-instead link and visible thank-you exist", async () => {
    expect(await Bun.file("public/index.html").text()).toContain("Type instead");
    expect(await Bun.file("public/app.js").text()).toContain("rc-thanks");
  });
});
