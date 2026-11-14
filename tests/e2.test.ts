import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { seedEvent } from "../src/event.ts";
import { listTasks, takeTask, pickFree, currentTask, leaveTask, addTask, finishTask } from "../src/tasks.ts";

beforeEach(() => { initDatabase(":memory:"); seedEvent(); });

describe("Part B tasks", () => {
  test("seed has 4 tasks, Sort cans has 1 of 3 spots open", () => {
    const t = listTasks();
    expect(t.length).toBe(4);
    const cans = t.find((x) => x.title === "Sort cans")!;
    expect(cans.spots).toBe(1);
    expect([...cans.people].sort()).toEqual(["Andre", "Rosa"]);
  });
  test("take fills spots, full tasks refuse", () => {
    const cans = listTasks().find((x) => x.title === "Sort cans")!;
    expect("task" in takeTask("Sofia", cans.id)).toBe(true);
    expect((takeTask("Dana", cans.id) as any).error).toBe("full");
    expect(currentTask("sofia")!.title).toBe("Sort cans");
  });
  test("I'm free picks the task with most spots left", () => {
    const p = pickFree("Sofia")!;
    expect(p.title).toBe("Pack boxes");
  });
  test("taking another task leaves the old one; done frees the spot", () => {
    const [a, b] = listTasks();
    takeTask("Sofia", a.id); takeTask("Sofia", b.id);
    expect(currentTask("Sofia")!.id).toBe(b.id);
    leaveTask("Sofia");
    expect(currentTask("Sofia")).toBeNull();
  });
  test("staff add and finish", () => {
    const id = addTask("Water table", "Door 1", 2)!;
    expect(finishTask(id)).toBe(true);
    expect(listTasks().find((x) => x.id === id)!.done).toBe(true);
  });
});
