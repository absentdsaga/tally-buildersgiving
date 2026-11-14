import { test, expect } from "bun:test";
test("app.js onstop does not read the shared recorder", async () => {
  const s = await Bun.file("public/app.js").text();
  const i = s.indexOf(".onstop");
  expect(i).toBeGreaterThan(0);
  const body = s.slice(i, i + 400);
  expect(body).not.toContain("recorder.mimeType");
  expect(body).toContain("rec.mimeType");
});
