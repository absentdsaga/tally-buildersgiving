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

## Not an emergency line

The volunteer screen shows, in the current language (EN/ES), that Tally is not an emergency line, with tappable `tel:` links for 911, 988 and the Florida abuse hotline (1-800-962-2873). When an update is flagged "today", the result card repeats the 911 line. First-time visitors see a one-line hint above the talk button, and a small "Staff view" link leads to the passcode screen.

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
│   ├── style.css       # Mobile-first styles
│   ├── app.js          # Volunteer page logic
│   └── staff.js        # Staff page logic
├── src/
│   ├── index.ts        # Server entry point
│   ├── database.ts     # SQLite layer & duplicate detection
│   ├── ai.ts           # Gemini integration & validation
│   ├── fallback.ts     # Rule-based fallback parser
│   └── types.ts        # TypeScript types
├── tests/
│   └── index.test.ts   # Test suite
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

## License

MIT
