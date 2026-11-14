import { describe, expect, test, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initDatabase, closeDatabase, checkDuplicate, insertUpdate, normalize, duplicateKey } from "../src/database.ts";
import { validateParsedUpdate } from "../src/ai.ts";
import { parseFallback, parseHoursFromText } from "../src/fallback.ts";
import { clampDate, todayNY } from "../src/update.ts";
import { isStaff, isStaffPath, handleLogin } from "../src/staffgate.ts";
import { buildSpeakText } from "../src/speak.ts";

// Create a fresh in-memory DB for each test
beforeEach(() => {
  initDatabase(":memory:");
});

describe("duplicate detection", () => {
  test("first update is not a duplicate", () => {
    const result = checkDuplicate("Maria Garcia", "2025-11-14", "Food Bank", 3);
    expect(result.isDuplicate).toBe(false);
  });

  test("exact same update is a duplicate", () => {
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    const result = checkDuplicate("Maria Garcia", "2025-11-14", "Food Bank", 3);
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toContain("Already counted");
    expect(result.existingHours).toBe(3);
    expect(result.existingSite).toBe("Food Bank");
  });

  test("different hours is NOT a duplicate", () => {
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    const result = checkDuplicate("Maria Garcia", "2025-11-14", "Food Bank", 4);
    expect(result.isDuplicate).toBe(false);
  });

  test("different date is NOT a duplicate", () => {
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    const result = checkDuplicate("Maria Garcia", "2025-11-15", "Food Bank", 3);
    expect(result.isDuplicate).toBe(false);
  });

  test("different site is NOT a duplicate", () => {
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    const result = checkDuplicate("Maria Garcia", "2025-11-14", "Community Center", 3);
    expect(result.isDuplicate).toBe(false);
  });

  test("case-insensitive name matching", () => {
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    const result = checkDuplicate("maria garcia", "2025-11-14", "Food Bank", 3);
    expect(result.isDuplicate).toBe(true);
  });

  test("accent-insensitive name matching", () => {
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    const result = checkDuplicate("María García", "2025-11-14", "Food Bank", 3);
    expect(result.isDuplicate).toBe(true);
  });

  test("Spanish re-telling of English update is detected as duplicate", () => {
    // Maria already logged 3h at Food Bank in English
    // Now she tries again with Spanish text - same key should match
    insertUpdate({
      volunteer_name: "Maria Garcia",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: '["packing"]',
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      concerns: "[]",
      counted: true,
      duplicate_reason: null,
      created_at: new Date().toISOString(),
    });

    // Same normalized key: maria garcia|2025-11-14|food bank|3.0
    const result = checkDuplicate("María García", "2025-11-14", "Food Bank", 3);
    expect(result.isDuplicate).toBe(true);
  });
});

describe("normalize function", () => {
  test("lowercases text", () => {
    expect(normalize("HELLO")).toBe("hello");
  });

  test("strips accents", () => {
    expect(normalize("María García")).toBe("maria garcia");
  });

  test("trims whitespace", () => {
    expect(normalize("  hello world  ")).toBe("hello world");
  });

  test("collapses multiple spaces", () => {
    expect(normalize("hello   world")).toBe("hello world");
  });
});

describe("duplicateKey function", () => {
  test("produces deterministic key", () => {
    const key1 = duplicateKey("Maria Garcia", "2025-11-14", "Food Bank", 3);
    const key2 = duplicateKey("maria garcia", "2025-11-14", "food bank", 3);
    expect(key1).toBe(key2);
  });

  test("different inputs produce different keys", () => {
    const key1 = duplicateKey("Maria Garcia", "2025-11-14", "Food Bank", 3);
    const key2 = duplicateKey("Maria Garcia", "2025-11-14", "Food Bank", 4);
    expect(key1).not.toBe(key2);
  });
});

describe("JSON validation (validateParsedUpdate)", () => {
  test("valid parsed update passes validation", () => {
    const input = {
      transcript: "I worked 3 hours at the food bank",
      language: "en",
      volunteer_name: "Maria",
      site: "Food Bank",
      date: "2025-11-14",
      hours: 3,
      activities: ["packing", "sorting"],
      concerns: [],
    };
    const result = validateParsedUpdate(input);
    expect(result).not.toBeNull();
    expect(result?.transcript).toBe(input.transcript);
    expect(result?.hours).toBe(3);
    expect(result?.activities).toEqual(["packing", "sorting"]);
  });

  test("null input returns null", () => {
    expect(validateParsedUpdate(null)).toBeNull();
  });

  test("invalid language defaults to en", () => {
    const input = {
      transcript: "test",
      language: "fr",
      volunteer_name: "",
      site: "Test",
      date: "2025-11-14",
      hours: 0,
      activities: [],
      concerns: [],
    };
    const result = validateParsedUpdate(input);
    expect(result?.language).toBe("en");
  });

  test("negative hours become 0", () => {
    const input = {
      transcript: "test",
      language: "en",
      volunteer_name: "",
      site: "Test",
      date: "2025-11-14",
      hours: -5,
      activities: [],
      concerns: [],
    };
    const result = validateParsedUpdate(input);
    expect(result?.hours).toBe(0);
  });

  test("concerns are validated and filtered", () => {
    const input = {
      transcript: "test",
      language: "en",
      volunteer_name: "",
      site: "Test",
      date: "2025-11-14",
      hours: 2,
      activities: [],
      concerns: [
        { quote: "scared to go home", category: "safety", urgency: "today", reason: "immediate" },
        null,
        { quote: "needs job help", urgency: "this_week", reason: "follow-up" },
      ],
    };
    const result = validateParsedUpdate(input);
    expect(result?.concerns.length).toBe(2);
    expect(result?.concerns[0].urgency).toBe("today");
    expect(result?.concerns[1].urgency).toBe("this_week"); // default for missing category
  });

  test("activities array is filtered to strings only", () => {
    const input = {
      transcript: "test",
      language: "en",
      volunteer_name: "",
      site: "Test",
      date: "2025-11-14",
      hours: 2,
      activities: ["packing", null, 123, "sorting"],
      concerns: [],
    };
    const result = validateParsedUpdate(input);
    expect(result?.activities).toEqual(["packing", "sorting"]);
  });
});

describe("fallback parser", () => {
  test("parses English shift description", () => {
    const text = "My name is Maria. I worked 3 hours at the food bank today packing boxes.";
    const result = parseFallback(text);

    expect(result.volunteer_name).toBe("Maria");
    expect(result.hours).toBe(3);
    expect(result.site).toBe("Food Bank");
    expect(result.language).toBe("en");
    expect(result.activities).toContain("Packing");
  });

  test("parses Spanish shift description", () => {
    const text = "Soy María. Trabajé 4 horas en el banco de comida hoy empacando.";
    const result = parseFallback(text);

    expect(result.volunteer_name).toBe("María");
    expect(result.hours).toBe(4);
    expect(result.site).toBe("Food Bank");
    expect(result.language).toBe("es");
    expect(result.activities).toContain("Empacando");
  });

  test("detects mixed language", () => {
    const text = "I worked 3 horas at the food bank empacando cajas.";
    const result = parseFallback(text);

    expect(result.language).toBe("mixed");
    expect(result.hours).toBe(3);
    expect(result.site).toBe("Food Bank");
  });

  test("detects safety concern - scared to go home", () => {
    const text = "A woman told me she's scared to go home tonight.";
    const result = parseFallback(text);

    expect(result.concerns.length).toBeGreaterThan(0);
    expect(result.concerns[0].urgency).toBe("today");
    expect(result.concerns[0].category).toBe("safety");
  });

  test("detects safety concern in Spanish - miedo de ir a casa", () => {
    const text = "Una mujer me dijo que tiene miedo de ir a casa esta noche.";
    const result = parseFallback(text);

    expect(result.concerns.length).toBeGreaterThan(0);
    expect(result.concerns[0].urgency).toBe("today");
  });

  test("detects child alone concern", () => {
    const text = "There was a child alone in the parking lot for over an hour.";
    const result = parseFallback(text);

    expect(result.concerns.some(c => c.urgency === "today")).toBe(true);
  });

  test("detects hunger concern", () => {
    const text = "A man said he hasn't eaten in two days.";
    const result = parseFallback(text);

    expect(result.concerns.some(c => c.urgency === "today")).toBe(true);
  });

  test("detects this_week urgency for housing issues", () => {
    const text = "A family mentioned they're worried about housing next month.";
    const result = parseFallback(text);

    expect(result.concerns.some(c => c.urgency === "this_week")).toBe(true);
  });

  test("handles empty/minimal input gracefully", () => {
    const text = "Hello there";
    const result = parseFallback(text);

    expect(result.language).toBe("en");
    expect(result.hours).toBe(0);
    expect(result.concerns.length).toBe(0);
  });

  test("extracts decimal hours", () => {
    const text = "I worked 3.5 hours at the community center cleaning.";
    const result = parseFallback(text);

    expect(result.hours).toBe(3.5);
    expect(result.site).toBe("Community Center");
  });
});

describe("hour words and digits", () => {
  const cases: [string, number][] = [
    ["hice tres horas en el Food Bank", 3],
    ["trabajé cuatro horas", 4],
    ["una hora", 1],
    ["doce horas", 12],
    ["Three hours at the food bank today", 3],
    ["two and a half hours", 2.5],
    ["tres horas y media", 3.5],
    ["3.5 hours", 3.5],
    ["2h at the pantry", 2],
    ["worked 3 hours", 3],
  ];
  for (const [text, hours] of cases) {
    test(text, () => expect(parseHoursFromText(text)).toBe(hours));
  }
  test("mixed sentence from the live bug saves 3 hours", () => {
    const p = parseFallback("Soy Luis Pena, hice tres horas en el Food Bank hoy, and a woman told me she is scared to go home");
    expect(p.hours).toBe(3);
  });
});

describe("0-hour entries never block later entries", () => {
  const base = {
    volunteer_name: "Luis Pena", site: "Food Bank", date: "2026-11-14", hours: 0,
    activities: "[]", transcript: "x", language: "en" as const, concerns: "[]",
    created_at: new Date().toISOString(),
  };
  test("0-hour needs-hours entry is not an original", () => {
    insertUpdate({ ...base, counted: false, duplicate_reason: null });
    expect(checkDuplicate("Luis Pena", "2026-11-14", "Food Bank", 3).isDuplicate).toBe(false);
  });
  test("even a 0-hour row marked counted does not block", () => {
    insertUpdate({ ...base, counted: true, duplicate_reason: null });
    expect(checkDuplicate("Luis", "2026-11-14", "Food Bank", 3).isDuplicate).toBe(false);
  });
  test("first-name-only repeat of a real entry is a duplicate", () => {
    insertUpdate({ ...base, hours: 3, counted: true, duplicate_reason: null });
    expect(checkDuplicate("Luis", "2026-11-14", "Food Bank", 3).isDuplicate).toBe(true);
  });
});

describe("TTS text builder", () => {
  const b = { name: "Luis Pena", hours: 3, site: "Food Bank" };
  test("English counted with concern", () => {
    const t = buildSpeakText({ ...b, kind: "counted", language: "en", hasConcern: true });
    expect(t).toBe("Thank you, Luis. Three hours at Food Bank. We noticed. What you told us is with the staff now, for today.");
  });
  test("Spanish counted", () => {
    expect(buildSpeakText({ ...b, kind: "counted", language: "es" })).toBe("Gracias, Luis. Tres horas en Food Bank. Lo notamos.");
  });
  test("duplicate English with time", () => {
    expect(buildSpeakText({ ...b, kind: "duplicate", language: "en", duplicateTime: "3:12 PM" })).toBe("Already have it, Luis: three hours at Food Bank, counted once at 3:12 PM.");
  });
  test("duplicate Spanish", () => {
    expect(buildSpeakText({ ...b, kind: "duplicate", language: "es" })).toContain("Ya lo tenemos, Luis");
  });
  test("missing hours EN and ES", () => {
    expect(buildSpeakText({ ...b, hours: 0, kind: "needs_hours", language: "en" })).toBe("Thank you, Luis. How many hours was your shift?");
    expect(buildSpeakText({ ...b, hours: 0, kind: "needs_hours", language: "es" })).toBe("Gracias, Luis. ¿Cuántas horas fue tu turno?");
  });
});

describe("date clamping", () => {
  const now = new Date("2026-11-14T15:00:00Z");
  test("a today update gets today's date", () => {
    expect(todayNY(now)).toBe("2026-11-14");
    expect(clampDate("2026-11-14", now)).toBe("2026-11-14");
    expect(clampDate("2023-01-01", now)).toBe("2026-11-14");
  });
  test("recent past kept, old and future clamped to today", () => {
    expect(clampDate("2026-11-10", now)).toBe("2026-11-10");
    expect(clampDate("2026-11-01", now)).toBe("2026-11-14");
    expect(clampDate("2026-11-20", now)).toBe("2026-11-14");
  });
});

describe("staff gate", () => {
  const login = (pin: string) => handleLogin(new Request("http://x/api/staff-login", { method: "POST", body: JSON.stringify({ pin }) }), {});
  test("staff paths are protected, volunteer paths are not", () => {
    for (const p of ["/api/staff", "/api/concerns/mark-handled", "/api/approve", "/api/fix-hours", "/api/report.csv", "/api/sample"]) expect(isStaffPath(p)).toBe(true);
    for (const p of ["/api/update", "/api/speak", "/"]) expect(isStaffPath(p)).toBe(false);
  });
  test("no cookie means 401 territory", () => {
    expect(isStaff(new Request("http://x/api/staff"))).toBe(false);
    expect(isStaff(new Request("http://x/api/staff", { headers: { cookie: "tally_staff=abc123" } }))).toBe(false);
  });
  test("wrong code is 401, right code sets an httpOnly 12h cookie that is accepted", async () => {
    expect((await login("0000")).status).toBe(401);
    const ok = await login(process.env.STAFF_PIN || "1121");
    expect(ok.status).toBe(200);
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=43200");
    const cookie = setCookie.split(";")[0];
    expect(isStaff(new Request("http://x/api/staff", { headers: { cookie } }))).toBe(true);
  });
});
