import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { seedEvent, checkIn, getCheckin } from "../src/event.ts";
import { addReport, staffReports, myReports, markReportHandled } from "../src/reports.ts";
import { tasksDoneBy, takeTask, listTasks } from "../src/tasks.ts";
import { checkOut } from "../src/event.ts";
import { handleUpdate } from "../src/update.ts";

process.env.TALLY_FALLBACK_ONLY = "1";
beforeEach(() => { initDatabase(":memory:"); seedEvent(); });

describe("Part E reports", () => {
  test("private report hides the name from staff but the device still sees it", () => {
    const id = addReport("Sofia", "dev1", "Someone was rude to a client", true)!;
    const s = staffReports().find((r) => r.id === id)!;
    expect(s.name).toBeNull();
    expect(s.private).toBe(true);
    expect(JSON.stringify(s)).not.toContain("Sofia");
    expect(JSON.stringify(s)).not.toContain("dev1");
    expect(myReports("dev1", "Sofia").length).toBe(1);
  });
  test("non-private report shows the name", () => {
    addReport("Sofia", "dev1", "Spilled oil by door 2", false);
    expect(staffReports()[0].name).toBe("Sofia");
  });
  test("handled shows on the volunteer's report list", () => {
    const id = addReport("Sofia", "dev1", "Unsafe stack of boxes", true)!;
    expect(myReports("dev1", "Sofia")[0].handled).toBe(false);
    markReportHandled(id, "Maria");
    expect(myReports("dev1", "Sofia")[0].handled).toBe(true);
    expect(myReports("other", "Dana").length).toBe(0);
  });
});

describe("Part F after the shift", () => {
  test("counted update ends the shift clock; tasks done are listed", async () => {
    checkIn("Sofia");
    takeTask("Sofia", listTasks()[0].id);
    const r = await (await handleUpdate(new Request("http://x/api/update", { method: "POST", body: JSON.stringify({ text: "Sofia here, 3 hours at the food pantry", volunteer_name: "Sofia" }) }), {})).json();
    expect(r.counted).toBe(true);
    expect(getCheckin("Sofia").left_at).toBeTruthy();
    expect(tasksDoneBy("Sofia")).toEqual(["Sort cans, Table 2"]);
  });
});
