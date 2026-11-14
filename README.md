# Tally

**Volunteer hours & safety reporting for small nonprofits**

Tally is a simple tool for nonprofits that rely on volunteers. After a shift, volunteers tap one button and talk (or type) about their day — in English, Spanish, or a mix of both. Tally counts their hours exactly once and flags any safety or wellbeing concerns for staff to see immediately.

## Who it's for

- **Volunteers**: Log hours quickly by talking or typing. No forms to fill out.
- **Staff**: See urgent concerns at the top of the dashboard, track weekly hours per volunteer, and review every update.

## What it does

1. **Counts hours once** — If the same volunteer logs the same hours at the same site on the same day (even in a different language), the duplicate is caught and explained clearly: *"Already counted at 3:12 PM: 3 hours at Food Bank"*
2. **Flags what can't wait** — Safety concerns (someone scared to go home, a child alone, someone who hasn't eaten, medical problems, threats) go to the top of the staff page marked "Today", with the volunteer's exact words quoted
3. **Speaks your language** — English, Spanish, or both mixed in the same sentence. The interface toggles between EN/ES.

## How it works

- Volunteers tap to record audio (tap-to-start, tap-to-stop) or type text
- Google Gemini AI transcribes audio and extracts structured data (hours, site, activities, concerns)
- A deterministic duplicate check runs locally (no AI needed) using normalized name + date + site + hours
- If Gemini is unavailable, a rule-based fallback parser handles typed text so the app never dead-ends

## Tech stack

- **Runtime**: Bun with TypeScript
- **Server**: `Bun.serve` (no framework)
- **Database**: SQLite via `bun:sqlite` (`tally.db`, gitignored)
- **AI**: Google Gemini 2.5 Flash via REST API
- **Frontend**: Vanilla HTML/CSS/JS, mobile-first design

## Getting started

### Prerequisites

- [Bun](https://bun.sh) installed
- A Google AI API key (set as `GOOGLE_AI_API_KEY` environment variable)

### Install & run

```bash
# Clone and install
git clone <repo-url>
cd tally-buildersgiving
bun install

# Set your API key
export GOOGLE_AI_API_KEY=your-key-here

# Start the server (default port 4517)
bun run src/index.ts

# Or use a different port
PORT=3000 bun run src/index.ts
```

Open http://localhost:4517 for the volunteer page, or http://localhost:4517/staff for staff.

### Run tests

```bash
bun test
```

Tests cover:
- Duplicate detection (including case/accent-insensitive matching and Spanish re-tellings)
- JSON validation for parsed updates
- Fallback rule-based parser (English, Spanish, mixed language, concern detection)

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/update` | Submit a shift update (JSON text or multipart audio) |
| GET | `/api/staff` | Get staff dashboard data (hours, concerns, log) |
| POST | `/api/concerns/mark-handled` | Mark a concern as handled |

#### POST /api/update examples

**Text input:**
```bash
curl -X POST http://localhost:4517/api/update \
  -H "Content-Type: application/json" \
  -d '{"text": "My name is Maria. I worked 3 hours at the food bank today.", "volunteer_name": "Maria"}'
```

**Audio input:** Send as `multipart/form-data` with field `audio` (File).

#### Response format

```json
{
  "id": 1,
  "counted": true,
  "duplicate_reason": null,
  "hours": 3,
  "site": "Food Bank",
  "concerns": [],
  "transcript": "...",
  "language": "en",
  "activities": ["Packing"]
}
```

## Staff passcode

`/staff` and every staff API (`/api/staff*`, `/api/concerns*`, `/api/approve`, `/api/fix-hours`, `/api/report.csv`, `/api/sample`) require a passcode. Set it with the `STAFF_PIN` env var (default `1121` if unset; change it for real use). `/staff` shows a passcode screen first; success sets an httpOnly cookie for 12 hours, and staff APIs return 401 without it. The volunteer screen stays open.

## Screens

**Volunteer (/)**: first visit asks a first name, then "Counting toward something?" (Bright Futures 100/75, school or court hours, or just count). Both are remembered on the device and saved per name on the server (`volunteers` table). Home is the headline "Hi, Maria. Tell us about your [mic pill] shift", a lime-free progress card with a capsule meter and a big thin number ("62 / 75 hrs"; filled ink capsules = approved, lime = waiting, dashed = to go), one big ink talk button with a lime ring (it turns lime and shows a stop square and "Listening… tap to stop" while recording) and a quiet "Type instead" link. There is no bottom nav on this screen, only the small top bar (Tally mark, speaker, EN/ES, Staff link). On a result the page scrolls to the top and the lime card shows "Thank you, Luis.", the hours counting up and capsules filling; a danger concern puts a red tel:911 pill above the card, and any concern adds a dark "Staff will see this today" card with the volunteer's words. After sending, a receipt card shows one of: counted (+hours, site, date, "Waiting for staff to confirm"), duplicate (calm grey, time in Miami time, built in the current language on the client), needs hours (tap 1-6+, saved with `PATCH /api/update/:id/hours`), or a gentle concern note with the 911 line. Milestones are said at approved shifts 1, 5, 10, 25, 50. A missing site is asked with tappable chips (`PATCH /api/update/:id/site`). The timing line only shows with `?debug=1`. The footer is one line with tel: links (not an emergency line, 911, 988, 1-800-962-2873).

**Hours letter (/letter?name=Maria&lang=es)**: printable page listing only APPROVED shifts, the total, the note that waiting hours are not included, and a signature block. Organisation name and address come from the `ORG` constant in `src/staffdata.ts`. It makes no claim that any school, court or employer accepts it.

**Staff (/staff, passcode)**: black icon rail on desktop (floating black pill bar with safe-area padding on phones), a headline with live counts, tabs that scroll to sections, a KPI row (dark "Needs you today" first, hours this week, worth to funders at `VOLUNTEER_HOUR_VALUE` = 34.88, volunteers), a capsule bar chart of hours per day (`days` in `GET /api/staff`; ink = total, lime = still waiting), Waiting for your OK as row cards (Approve, Fix, Approve all, hours input for needs-hours rows; new rows flash lime), a right column of Needs attention concern cards (exact quote, level tag, "Mark handled" records who and when), and collapsed cards for recently approved, quiet volunteers, tables and Today's floor, plus a grant report CSV (one row per approved shift plus a totals row and the rate source). "demo" loads a sample week into an empty database.

## Concern levels, proof page, first shift

Each concern gets a level from the extractor, with a keyword backstop in `src/fallback.ts` (EN/ES danger words such as gun, hit, bleeding, arma, golpe, sangre, suicid). The backstop runs on every extractor result.

- **danger_now**: the volunteer card shows "If someone is in danger right now, call 911." in big type plus the Florida Abuse Hotline and 988 as tel: links. Tally never says help is on the way. Staff see a "Danger now" tag, above Today cards.
- **today**: coral "Today" tag on the staff page and one soft WebAudio chime when a new one appears (the page refreshes every 15 s). Volunteer card: "A staff member will see this today."
- **fyi**: grey "FYI" tag, listed last, no chime.

For Spanish concerns the extractor also returns `quote_en`; staff see the exact words, then "Translation:" in grey. When staff mark a concern handled, the volunteer screen (on load and every 30 s) calls `GET /api/volunteer/status?name=...` and shows a green "Staff handled what you told us." banner with the Miami time.

**Proof of hours (/proof/:code)**: approving a shift creates a 6-character code (no 0/O/1/I, unique). The page shows the volunteer, approved hours (and reported hours if different), site, shift date, who approved it and when (Miami time), the org name from `ORG`, the code, and a check URL. Unknown codes show "No record with this code." The hours letter lists each shift's code. The page makes no claim that any school, court or employer accepts it. Staff must type "Your name" (remembered on the device); it is sent with approve, fix and handled calls and stored.

**First shift badge**: a gold "First shift" badge on staff rows and concerns when that update is the first stored for that name.

**Other rules**: names match exactly after lowercase, trim and accent removal (no prefix match); the duplicate key is name + date + `site_canonical` + hours, so a Spanish retelling is caught; an empty name or an empty update (under 3 words, or no hours, site or concern) is rejected and not stored; the report button reads "Download report (N approved hours)" and is disabled at 0. `TALLY_FALLBACK_ONLY=1` makes the server use only the rule-based parser (used by tests).

**One talk button, four moments**: the extractor returns `intent` (arriving, free, concern, done), and the fallback parser detects the same EN/ES phrases. Staff type tasks (one per line) and notes in the "Today's floor" box, stored per day in the `floor_tasks` and `floor_notes` tables (`POST /api/floor`, staff only). Arriving greets the volunteer by name and reads the notes. Free gives the oldest open task and marks it taken by that volunteer (staff see "taken by Luis, 4:52 PM"); with none open it says to ask staff at the front table. Neither stores hours. After a "done" thank-you, "Save me a spot next time" (`POST /api/spot`) records name and date, and staff see a count.

## Rules

Names: asked once, kept on the device, sent with every update; "Anonymous" is never shown ("Name not given"). Sites are normalised to Title Case (pantry/food bank become Food Bank); never "Unknown" ("Site not said"). A duplicate update never repeats an open same-day concern from the same volunteer. Times are stored as ISO timestamps and shown in America/New_York on the client. No alert() pop-ups; messages appear inline.

## Not an emergency line

The volunteer screen footer always shows the not-an-emergency notice (EN/ES) with tappable `tel:` links; the receipt repeats the 911 line when something urgent was flagged.

## Project rules

See [MEL.md](MEL.md): the AI reads and extracts, deterministic code decides whether hours count, staff approve before reports, never invent hours, concerns keep the volunteer's exact words, every string in English and Spanish, and test with real provider calls.

## Timings

Measured on a test server (real OpenAI, ElevenLabs calls), time until the result card data is ready:

| Flow | Total | Breakdown |
|---|---|---|
| Typed mixed ES/EN update | ~1.1 s | extract 1.08 s |
| Duplicate of that update | ~0.8 s | extract 0.79 s |
| 6-second voice clip | ~1.2 s | transcribe 0.36 s, extract 0.88 s |

The spoken reply is fetched after the card shows (~0.23 s). Nothing was over 2 s, so no speed changes were made.

## Project structure

```
tally-buildersgiving/
├── public/
│   ├── index.html      # Volunteer page
│   ├── staff.html      # Staff dashboard
│   ├── style.css       # Design tokens and shared components
│   ├── volunteer.css   # Volunteer screen
│   ├── staff.css       # Staff page
│   ├── app.js          # Volunteer page logic
│   ├── staff.js        # Staff page logic
│   └── login.html      # Staff passcode screen
├── src/
│   ├── index.ts        # Server entry point
│   ├── database.ts     # SQLite layer & duplicate detection
│   ├── ai.ts           # Gemini integration & validation
│   ├── fallback.ts     # Rule-based fallback parser
│   ├── staffdata.ts    # Staff numbers, org config, hours/site/volunteer endpoints
│   ├── letter.ts       # Hours letter page
│   ├── proof.ts        # Proof of hours page
│   └── types.ts        # TypeScript types
├── tests/
│   ├── index.test.ts   # Core tests
│   └── design.test.ts  # Html ids, letter, PATCH, staff numbers
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Built with Mel

This project was built end-to-end using **Mel**, an AI coding agent inside the Mel terminal. Here's how it was built:

1. **Planning**: The full spec was broken into 11 tasks covering database, API, frontend, testing, and documentation
2. **Core implementation**: Built from scratch — no frameworks, just Bun.serve, SQLite, and vanilla JS
3. **Duplicate detection**: Implemented deterministic key-based deduplication that normalizes names/sites (case-insensitive, accent-stripped) so "María García" matches "maria garcia"
4. **Bilingual support**: Full EN/ES interface toggle plus AI-powered transcription that handles code-switching (English/Spanish mixed)
5. **Safety-first design**: Concerns are extracted with urgency levels ("today"/"this_week"/"none") and surfaced prominently on the staff dashboard
6. **Testing**: 54 passing tests covering duplicate detection edge cases, JSON validation, and the fallback parser including Spanish inputs
7. **Verification**: Server started and tested with real curl requests including live Gemini API calls — all endpoints verified working
8. **Git history**: Small, clearly described commits throughout development
9. **Project rules**: `MEL.md` records the rules every Mel run follows (AI extracts, code decides, staff approve, never invent hours)
10. **Staff access and safety**: Mel added the staff passcode, the bilingual emergency notice, and the first-visit hint, with tests (now 54), and re-measured the loop with real provider calls
12. **Seventh pass**: Mel fixed the Spanish double count and the name-matching bugs, rejected empty names and updates, added concern levels with a danger backstop, the proof-of-hours page, and the first-shift badge, the "Today's floor" box with arriving/free intents, with tests (now 85)
11. **Design round**: Mel rewrote both screens around one action (mic button, progress ring, receipt card), added the hours letter and a read-in-5-seconds staff page, fixed the QA bugs (recording crash, UTC times, alerts, tab bar, messy sites and names, repeated concerns, favicon), and added tests (now 63)

13. **Eighth pass**: Mel fixed spoken updates never being sent (the recorder was nulled before `onstop` read it), then restyled every screen to the visual spec in Emily's GitHub issue #6 (`docs/emily-redesign-spec.md`, reference `docs/redesign-reference.png`): tokens, Inter Tight, Lucide 0.544.0 icons (decoration only, the pages work if the CDN fails), capsule meters and chart, black rail, and her section 9 UX upgrades. No behavior was changed.

## License

MIT
