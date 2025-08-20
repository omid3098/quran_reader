# OpenQuranReader — Development Plan (living document)

Last updated: 2025-08-20

## Current status
- Repo scaffolded as pnpm workspace monorepo
- apps/api file-backed Read API with /health, /surahs, /translations, /verses
- apps/web Next.js App Router scaffold (placeholder page)
- Tanzil importer implemented: scripts/tanzil-import.js parses assets/quran XML and outputs to scripts/out
- Data generated:
  - scripts/out/surahs.json
  - scripts/out/verses.jsonl
  - scripts/out/translations.json
  - scripts/out/verse_translations.jsonl
  - scripts/out/translations/*.jsonl (per-translation)
- Docker compose for Postgres + pgAdmin prepared (not yet used)

## Next phases (MVP path)
1) Web UI/UX Reader MVP (current)
   - App shell: header (surah selector, ayah range, translation selector), toggleable sidebar for Surah list
   - Reader view: Arabic text + 1 translation (default), ayah numbers with anchors, Bismillah handling, loading skeletons
   - Settings: font size slider, light/dark theme, Arabic font choice; persist to localStorage
   - Navigation: keyboard (←/→ or j/k) to move ayah, smooth scroll to focused ayah, URL reflects state (/s/1?from=1&to=7&t=en.arberry)
   - A11y/RTL: bidi-safe rendering, focus outlines, sufficient contrast, responsive layout
   - Error/empty states: API unavailable, no translations selected, invalid URL params

2) File-backed Read API (done)
   - GET /surahs, GET /translations, GET /verses?surah=…&from=…&to=…&translation_ids=… served from scripts/out
   - Simple CORS for local dev; basic validation & error handling

3) Database schema + seed (Postgres + Prisma)
   - Define schema for surah, verse, translation, verse_translation, user, user_prefs, note, bookmark, collection, reading_progress
   - Seed from scripts/out files and replace file-backed API with DB-backed queries

4) Auth + user prefs
   - NextAuth for sessions; persist default translations and UI prefs server-side

5) Notes
   - CRUD API + UI side panel; XSS-safe rendering

6) Bookmarks & collections
   - Toggle bookmark, organize, jump

7) Search (server FTS)
   - Normalized Arabic + translation FTS with Postgres; API + results UI with highlights

8) Multiple translations UI
   - Multi-select translations, side-by-side view

9) Performance/a11y/i18n polish
   - Caching, windowing long lists, a11y, RTL/LTR, intl

10) Legal/credits
   - Tanzil attribution and per-translation licenses

## Acceptance criteria for current phase — Web UI/UX Reader MVP
- Pages
  - Surah list page at /s lists 114 surahs with Arabic and English names
  - Reader page at /s/1 renders ayah 1–7 by default with Arabic and the selected translation
- API integration
  - Client fetches from http://localhost:4000/surahs, /translations, /verses and shows loading/error states
- Controls & persistence
  - Translation selector populated from /translations; selected translation persists in localStorage and reflects in URL as t=
  - Font size and theme toggles persist across reloads
- Navigation & deep links
  - Keyboard navigation between ayahs; focused ayah is visible and scrolled into view
  - URL query params (from, to, t) are read on load and updated on interaction
- UX quality bar
  - Basic skeletons for verse list; responsive layout; correct RTL rendering; accessible focus styles
- Explicitly out of scope for this phase: DB, Auth, Notes, Search

## Notes
- Keep displayed scripture verbatim per Tanzil; derive-only for search later
- This document must be updated after each meaningful change

