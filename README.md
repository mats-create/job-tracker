# Job Tracker

A personal AI-powered job-search assistant. Searches Swedish and international job boards, scores matches against your CV, helps draft cover letters, and tracks applications through a pipeline. Built as a single HTML file with React + Firebase for cloud sync across devices.

**Live app:** https://mats-create.github.io/job-tracker/

---

## What it does

- **Job ingestion** from Arbetsförmedlingen (Sweden) and JSearch (Indeed/LinkedIn/Glassdoor via RapidAPI)
- **AI match scoring** of every job against your CV with a one-line rationale (powered by Claude)
- **Search profiles** — saved queries that run on a schedule or on demand
- **Profile Assistant** — a scoped chatbot that helps you build high-quality search profiles based on your CV and your highest-scoring matches
- **Pipeline tracking** through statuses: New, Reviewing, Applied, Interview, Offer, Rejected, No response
- **Cover letter generation** grounded in your CV (no fabricated skills)
- **Reports** with response rates and funnel insights
- **Cloud sync** — sign in with Google, your data follows you across devices
- **Single HTML file** — no build step, deployed via GitHub Pages

## Tech stack

- React 18 + Babel standalone (loaded via CDN — no build step)
- Firebase Auth (Google Sign-In) + Firestore (cloud database)
- Anthropic Claude API for AI features (you supply your own key)
- pdf.js for CV PDF text extraction
- Hosted on GitHub Pages

## Setup notes for future me

- **Firebase project**: `job-tracker-mph` (created in `europe-west3`, Frankfurt)
- **Authorized domain**: `mats-create.github.io` is whitelisted in Firebase Auth
- **Firestore security rules**: each user can only read/write `users/{their-uid}` — locked down per user
- **API keys are stored in Firestore** (synced across devices) AND localStorage (offline cache)
- **Anthropic key** must be added in Search Profiles → API keys before AI features work
- **Theme is device-local** (not synced) — set per browser/device

## Deploying updates

1. Replace `index.html` in this repo with the new version (drag-drop in the GitHub web UI)
2. Commit with a short message describing the change
3. GitHub Pages auto-redeploys in ~30 seconds

## Backup

The app supports JSON export/import (Scheduler → Backup & restore). The cloud sync is the primary backup; export is the "leave the cloud" escape hatch.

## What's intentionally not built

These were considered and deferred:

- **Apple Sign-In** — requires a $99/year Apple Developer account; Google alone covers all current devices
- **More job boards beyond AF/JSearch** — coverage is good enough; more sources mean more noise without much new signal
- **Apple Watch / native iOS app** — PWA install handles mobile use cases
- **Sharing or collaboration features** — single-user tool by design

## Privacy

- Job and application data is stored in your personal Firestore document, accessible only to you when signed in
- API keys (AF, JSearch, Anthropic) are stored alongside your other data in Firestore
- Anthropic processes prompts when AI features are used; review their privacy policy if this matters to you
- No analytics, no tracking, no third-party cookies — the only network calls are to Firebase, Anthropic, AF, JSearch, and the CDNs that load the libraries

## License

Personal project. No license granted for reuse.
