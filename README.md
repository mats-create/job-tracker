# 🌿 Job Tracker

A personal, AI-powered job search application. Track applications, score job matches against your CV, generate cover letters, and get coaching from Gabbi — your built-in AI assistant.

Hosted on GitHub Pages · Data stored privately in Firebase · Built with React + Babel (no build step required)

---

## Features

### 📋 My Jobs
- Import jobs automatically from Arbetsförmedlingen and JSearch (Indeed, LinkedIn, Glassdoor)
- Add jobs manually
- Track status through the full pipeline: New → Reviewing → Applied → Interview → Offer → Closed
- Milestone date tracking: applied, interview, offer, rejected, no response — all auto-captured and editable
- AI match scoring against your CV with rationale
- Cover letter generation per job
- Notes, deadline tracking, silent job detection (30+ days no response)
- Bulk status changes, archive, dismiss

### 🔍 Search Profiles
- Save named search queries per job board
- Auto-fetch on a schedule or manually
- Location filtering, result limits, multi-source support
- Per-run import summary with fetched/new/skipped counts

### 💬 Gabbi — AI Assistant
- Analyses your CV and pipeline, identifies gaps and patterns
- Suggests and saves search profiles
- Updates job statuses, adds notes, edits CV sections — all with confirmation
- Coaches on recruitment assessments: personality tests (Big Five, DISC, Alva Labs, Hogan), cognitive tests (Matrigma, SHL, Watson-Glaser), situational judgement tests
- Context-aware starter prompts based on your live pipeline data
- Powered by Claude (Anthropic)

### 📄 My CV
- Upload PDF or paste text — extracted text stored, original file not retained
- Structured sections: tools & software, skills & competencies, achievements
- Job preferences: target roles, industries, locations, salary, work type
- Email recipients for sending cover letters and reports
- Clear all CV data with two-step confirmation

### ✉️ Cover Letters
- AI-generated, grounded strictly in your CV — no invented claims
- Language auto-detection (Swedish/English)
- Tone selection
- Send via email, export as PDF or text

### 📈 Reports
- Weekly digest, top matches, status report, monthly summary
- AI-generated with funnel statistics and response rate analysis
- Activity listing with CSV export

### ⏱ Scheduler
- Automatic job fetching on configurable days, times, and intervals
- Run log with 30-day history
- Backup and restore (JSON export/import)
- Reset all data

### 📊 Dashboard
- Pipeline overview: New, Reviewing, Applied, Interview, Offer
- Closed outcomes: Rejected, No response, Ad removed, Not relevant
- Hero tiles: Jobs tracked (all statuses excl. archived), New to review, Applications sent (Applied · Interview · Offer), Best match
- Import summary overlay with per-profile results
- Silent jobs alert for applications with no response after 30 days

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Babel standalone (CDN) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firebase Firestore (europe-west3) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Job sources | Arbetsförmedlingen JobSearch API · JSearch via RapidAPI |
| PDF extraction | pdf.js |
| Hosting | GitHub Pages |
| Build | Python build.py + GitHub Actions |

---

## Architecture

The app is a single-file React application (`index.html`) assembled from modular source files in `src/`. A GitHub Action rebuilds `index.html` automatically on every push to `src/`.

```
src/
  shell.html        HTML shell, CDN scripts, Firebase init, CSS
  constants.js      Theme, status colours, tab definitions, constants
  utils.js          Cloud sync, API calls, scoring, filtering, mapping
  components.js     Shared UI components (Card, Btn, Sidebar, MobileBottomNav…)
  dashboard.js      Dashboard with pipeline overview and import summary
  jobs.js           Job list, job row, filters, bulk actions
  profiles.js       Search profiles, API keys
  cv.js             CV upload/paste, structured sections, preferences
  covers.js         Cover letter generation and delivery
  assistant.js      Gabbi AI assistant
  scheduler.js      Scheduler, reports, activity listings
  app.js            App shell, state, cloud sync, auth
build.py            Assembles src/ into index.html
.github/workflows/
  build.yml         GitHub Action: build on push → deploy via Pages
```

---

## Data Privacy

- All data is stored in **your personal Firestore document**, keyed by your Google user ID
- No data is shared between users
- API keys (Anthropic, RapidAPI) are stored encrypted in your Firestore document, never shared
- Uploaded PDF files are **not stored** — only the extracted text is saved
- The original PDF is discarded immediately after text extraction

---

## API Keys Required

| Key | Purpose | Where to get it |
|---|---|---|
| Anthropic API key | AI scoring, cover letters, Gabbi, reports | console.anthropic.com |
| RapidAPI key | JSearch (Indeed, LinkedIn, Glassdoor) | rapidapi.com → JSearch by OpenWeb Ninja |
| AF API key | Arbetsförmedlingen | Optional — the API is open and free without a key |

Add keys in the app under **Search Profiles → API keys**.

---

## Setup

See the full setup guide in `docs/` for step-by-step instructions in English and Swedish.

### Quick start

1. Fork or clone this repository
2. Enable GitHub Pages (Settings → Pages → Deploy from branch: `main`, folder: `/root`)
3. Push any change to `src/` — the Action will build and deploy automatically
4. Open your Pages URL and sign in with Google
5. Add your API keys under Search Profiles → API keys
6. Add your CV under My CV
7. Create search profiles and run your first fetch

---

## Build Locally

```bash
python3 build.py
```

Output: `index.html` — open directly in a browser or deploy to any static host.

---

## Contributing

This is a personal project. Issues and suggestions welcome via GitHub Issues.

---

## License

MIT
