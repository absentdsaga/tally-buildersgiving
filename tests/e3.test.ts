import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase } from "../src/database.ts";
import { seedEvent, checkIn } from "../src/event.ts";
import { teamThread, hostThread, peerThread, sendMessage, visibleThreads, messagesSince, threadMessages, canRead, getThread } from "../src/messages.ts";
import { handleMessagePost, handleMessagesGet } from "../src/messageapi.ts";

beforeEach(() => { initDatabase(":memory:"); seedEvent(); checkIn("Sofia"); checkIn("Dana"); });
const V = (name: string) => ({ kind: "volunteer" as const, name });
const post = (b: any) => handleMessagePost(new Request("http://x/api/messages", { method: "POST", body: JSON.stringify(b) }), {});

describe("Part C messages", () => {
  test("team room is seeded with a morning of messages", () => {
    const m = threadMessages(V("Sofia"), teamThread())!;
    expect(m.length).toBe(5);
    expect(m.some((x: any) => x.lang === "es")).toBe(true);
    expect(m.at(-1).body).toContain("182");
  });
  test("host DM: volunteer and staff both ways, staff can read it", () => {
    const t = hostThread("Sofia");
    sendMessage(t, "volunteer", "Sofia", "dev1", "Where do I park?");
    sendMessage(t, "staff", "Maria", "", "Back lot!");
    expect(threadMessages({ kind: "staff" }, t)!.length).toBe(2);
    expect(threadMessages(V("Sofia"), t)!.length).toBe(2);
  });
  test("volunteer cannot read a DM they are not in", () => {
    const t = peerThread("Rosa", "Andre");
    sendMessage(t, "volunteer", "Rosa", "", "hi");
    expect(canRead(getThread(t), V("Sofia"))).toBe(false);
    expect(threadMessages(V("Sofia"), t)).toBeNull();
    expect(messagesSince(V("Sofia"), 0).some((m: any) => m.thread_id === t)).toBe(false);
    expect(visibleThreads(V("Sofia")).some((x) => x.id === t)).toBe(false);
  });
  test("peer DM works both ways and only for checked-in people", async () => {
    const ok = await post({ name: "Sofia", with: "Dana", body: "hello" });
    expect(ok.status).toBe(200);
    const tid = (await ok.json()).thread_id;
    await post({ name: "Dana", thread_id: tid, body: "hi back" });
    expect(threadMessages(V("Dana"), tid)!.length).toBe(2);
    const no = await post({ name: "Sofia", with: "Nobody Here", body: "hello" });
    expect(no.status).toBe(403);
  });
  test("team room fan-out reaches every checked-in volunteer and staff", async () => {
    const before = messagesSince(V("Dana"), 0).length;
    await post({ name: "Sofia", team: true, body: "Need tape at table 3" });
    expect(messagesSince(V("Dana"), 0).length).toBe(before + 1);
    expect(messagesSince({ kind: "staff" }, 0).length).toBe(before + 1);
  });
  test("since= returns only new messages", async () => {
    const all = messagesSince(V("Sofia"), 0);
    const last = all.at(-1).id;
    expect(messagesSince(V("Sofia"), last).length).toBe(0);
    await post({ name: "Dana", team: true, body: "new one" });
    const r = await (handleMessagesGet(new URL("http://x/api/messages?name=Sofia&since=" + last), {})).json();
    expect(r.messages.length).toBe(1);
    expect(r.messages[0].body).toBe("new one");
  });
  test("someone not checked in cannot read the team room", () => {
    expect(canRead(getThread(teamThread()), V("Stranger"))).toBe(false);
  });
});
