import { expect, test } from "bun:test";

test("GET / is versioned and static css is no-cache", async () => {
  const port = 4600 + Math.floor(Math.random() * 300) + 1;
  const proc = Bun.spawn(["bun", "src/index.ts"], { env: { ...process.env, PORT: String(port), DB_PATH: ":memory:" }, stdout: "ignore", stderr: "ignore" });
  try {
    let res: Response | undefined;
    for (let i = 0; i < 50 && !res; i++) { try { res = await fetch(`http://localhost:${port}/`); } catch { await Bun.sleep(100); } }
    expect(await res!.text()).toContain("style.css?v=");
    const css = await fetch(`http://localhost:${port}/style.css`);
    expect(css.headers.get("cache-control")).toBe("no-cache");
    expect(css.headers.get("content-type")).toContain("text/css");
  } finally { proc.kill(); }
});
