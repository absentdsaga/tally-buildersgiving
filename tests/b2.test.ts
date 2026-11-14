import { describe, expect, test, beforeEach } from "bun:test";
import { initDatabase, insertUpdate, approveUpdate, getUpdate } from "../src/database.ts";
import { proofHtml } from "../src/proof.ts";
import { letterHtml } from "../src/letter.ts";
import { handleApprove } from "../src/staff.ts";
import { todayNY } from "../src/update.ts";

beforeEach(() => initDatabase(":memory:"));
const base = { activities: "[]", transcript: "t", language: "en", concerns: "[]", counted: true, duplicate_reason: null, created_at: new Date().toISOString() };
const add = (o: any = {}) => insertUpdate({ volunteer_name: "Maria", site: "Food Pantry", date: todayNY(), hours: 3, ...base, ...o });

describe("B2 proof", () => {
  test("code is created on approve only, 6 safe chars, unique", () => {
    const a = add(), b = add({ hours: 2 });
    expect(getUpdate(a)!.proof_code ?? null).toBeNull();
    approveUpdate(a, "Sam"); approveUpdate(b, "Sam");
    const ca = getUpdate(a)!.proof_code!, cb = getUpdate(b)!.proof_code!;
    expect(ca).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(ca).not.toBe(cb);
    approveUpdate(a, "Other");
    expect(getUpdate(a)!.proof_code).toBe(ca);
  });
  test("page shows approved hours and approver; unknown code message", () => {
    const a = add();
    approveUpdate(a, "Sam Lee");
    const code = getUpdate(a)!.proof_code!;
    const r = proofHtml(code, "http://x");
    expect(r.status).toBe(200);
    expect(r.html).toContain("Proof of volunteer hours");
    expect(r.html).toContain("Approved by Sam Lee");
    expect(r.html).toContain("Hours approved");
    expect(r.html).toContain("Check this record at http://x/proof/" + code);
    expect(letterHtml("Maria", "en")).toContain(code);
    expect(proofHtml("ZZZZZZ", "http://x").html).toContain("No record with this code.");
  });
  test("approve without staff name is rejected", async () => {
    const a = add();
    const r = await handleApprove(new Request("http://x", { method: "POST", body: JSON.stringify({ id: a }) }), {});
    expect(r.status).toBe(400);
    expect(getUpdate(a)!.approved).toBe(false);
  });
});
