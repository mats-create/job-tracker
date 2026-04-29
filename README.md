# Job Tracker

A personal AI-powered job search assistant. Searches Swedish and international job boards, scores matches against your CV using Claude AI, tracks applications through a full pipeline, and helps draft cover letters. Built as a single HTML file with cloud sync across devices.

**Live app:** https://mats-create.github.io/job-tracker/

---

## What it does

- **Job ingestion** from Arbetsförmedlingen (Sweden) and JSearch (Indeed/LinkedIn/Glassdoor via RapidAPI)
- **AI match scoring** of every job against your CV, tools, skills and achievements — with a one-line rationale
- **Search profiles** — saved queries that run on a schedule or on demand
- **Profile Assistant** — scoped AI chatbot that helps build high-quality search profiles; analyses your highest-scoring jobs to suggest new profiles
- **Full pipeline tracking** — New → Reviewing → Applied → Interview → Offer → Rejected / No response
- **Timestamps** on key transitions: `appliedAt`, `rejectedAt` — used in reports for response-rate and funnel analysis
- **Cover letter generation** — grounded in your CV only, no invented skills or experience
- **Structured CV** — tools, skills and achievements sections feed precise signal into all AI features
- **Reports** — AI prose reports + tabular activity listings with CSV export
- **Cloud sync** — sign in with Google, data syncs across all devices automatically
- **Dark mode** — respects OS preference on first visit, toggle in sidebar / More menu
- **Mobile-first** — bottom tab bar on mobile, left sidebar on desktop

---

## Tech stack

- React 18 + Babel standalone (CDN — no build step)
- Firebase Auth (Google Sign-In) + Firestore (cloud database, `europe-west3`)
- Anthropic Claude API — you supply your own key
- pdf.js for CV PDF text extraction
- GitHub Pages hosting

---

## Setup notes (for future me)

**Firebase project:** `job-tracker-mph` · Region: `europe-west3` (Frankfurt — permanent, cannot change)

**Authorized domain:** `mats-create.github.io` whitelisted in Firebase Auth → Settings → Authorised domains

**Firestore security rules:** each user can only read/write `users/{their-uid}` — locked per user

**API keys** stored in Firestore (synced across devices) and localStorage (offline cache):
- Anthropic: required for all AI features (scoring, cover letters, reports, assistant)
- JSearch/RapidAPI: required for international job search (optional — AF works without it)
- Arbetsförmedlingen: no key needed, free API

**Theme:** device-local (not synced) — each device keeps its own light/dark preference

**CV import:** pre-analysed into 22 tools, 20 skills and 11 achievements. One-click import button appears on My CV tab when those sections are empty.

---

## Navigation

| Platform | Pattern |
|---|---|
| Desktop | Left sidebar — collapsed/expanded with `[` shortcut |
| Mobile | Bottom tab bar with SVG icons |

**Primary tabs:** Dashboard · My Jobs · Search · Assistant · My CV

**Secondary (More menu on mobile / same sidebar on desktop):** Schedule · Letters · Reports

---

## Application pipeline

```
New → Reviewing → Applied → Interview → Offer
                     ↓           ↓
                  Rejected    Rejected
                     ↓
               No response
```

Closed outcomes shown separately below the active pipeline strip on the Dashboard. Dashboard tiles are deep-links to filtered job views.

---

## Deploying updates

1. Replace `index.html` in this repo with the new version (drag-drop in GitHub web UI)
2. Commit with a short description
3. GitHub Pages auto-redeploys in ~30 seconds

---

## Backup

Scheduler → Backup & restore → Export JSON. Cloud sync via Firestore is the primary backup; JSON export is the manual escape hatch if migrating away from cloud.

---

## What is intentionally not built

| Feature | Reason |
|---|---|
| Apple Sign-In | Requires $99/yr Apple Developer account |
| True background scheduling | Needs server-side code; scheduler runs while tab is open |
| More job board APIs | Current coverage sufficient; more = more noise |
| Translations | Deprioritized |
| Collaboration / sharing | Single-user tool by design |

---

## Backlog

| Feature | Notes |
|---|---|
| Demo mode | Fake data, no auth required, "Try demo" on sign-in screen |
| Invite-only access | Firestore email allowlist, managed in Firebase Console |
| LinkedIn paste input | Third CV input tab — paste profile text from LinkedIn |
| Consulting/freelance sibling app | Separate repo, same Firebase, Upwork API |

---

## Privacy

- Data stored in your personal Firestore document, accessible only when signed in as you
- API keys stored alongside your data under the same access controls
- Anthropic processes prompts when AI features are triggered
- No analytics, no tracking, no third-party cookies
- Network calls: Firebase, Anthropic API, AF API, JSearch API, React/Babel/pdf.js CDNs

---

## License

Personal project. No license granted for reuse.
