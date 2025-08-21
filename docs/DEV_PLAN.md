# OpenQuranReader — Development Plan (living document)

Last updated: 2025-08-21

## Current status
- Repo scaffolded as pnpm workspace monorepo
- apps/api file-backed Read API with /health, /surahs, /translations, /verses (served from scripts/out)
- apps/web Next.js App Router MVP complete:
  - Surah list page at /s (server component) listing surahs (Arabic names)
  - Reader page at /s/[surah] with Arabic text, multi-select translations, RTL layout, skeleton states
  - URL reflects state via t= (translations) and v= (focused ayah); last read position persisted
  - Next.js rewrite config proxies /api/* -> http://localhost:4000/*
- Tanzil importer implemented: scripts/tanzil-import.js parses assets/quran XML and outputs to scripts/out
- Data generated:
  - scripts/out/surahs.json
  - scripts/out/verses.jsonl
  - scripts/out/translations.json
  - scripts/out/verse_translations.jsonl
  - scripts/out/translations/*.jsonl (per-translation)
- Docker compose for Postgres + pgAdmin prepared (not yet used)
 - Prisma introduced for DB-backed mode (schema defined); seed script added; API can run in DB mode via USE_DATABASE=true

## Next phases (MVP path)
1) Web UI/UX Reader MVP (done)
   - Already done:
     - Header with Surah selector (dropdown) and translations multi-select; theme and font size controls; state persisted to localStorage
     - Reader view: Arabic text, ayah numbers, selected translations, loading skeletons, smooth scroll to focused ayah
     - A11y/RTL: basic bidi-safe rendering, focusable ayahs, responsive layout
     - API integration via Next.js rewrite (/api -> localhost:4000)
     - Keyboard navigation between ayahs (←/→ or j/k) updating focused ayah
     - Bismillah handling rules (show/hide appropriately per surah)
     - Performance: progressive lazy rendering/windowing of verses (no explicit range control in UX)
     - Consistent API usage in web (/api everywhere)
   - Optional polish:
     - Surah list: English names (dataset currently provides Arabic names only)

2) File-backed Read API (done)
   - GET /surahs, GET /translations, GET /verses?surah=…&from=…&to=…&translation_ids=… served from scripts/out
   - Simple CORS for local dev; basic validation & error handling

3) Database schema + seed (Postgres + Prisma) — in progress
   - Schema defined for surah, verse, translation, verse_translation, user, user_prefs, note, bookmark, reading_progress
   - Seed script implemented to load from scripts/out
   - API supports DB-backed responses behind env flag (USE_DATABASE=true)
   - Remaining: run migrations and seed on local Postgres

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
  - Surah list page at /s lists 114 surahs with Arabic names (English names optional)
  - Reader page at /s/[surah] renders the surah with Arabic and the selected translations; can deep-link to an ayah via v=
- API integration
  - Client uses Next.js rewrite `/api/*` -> `http://localhost:4000/*`; shows loading and error states
- Controls & persistence
  - Translations multi-select populated from /translations; selection persists in localStorage and reflects in URL as t=
  - Font size and theme toggles persist across reloads; theme applied before hydration
- Navigation & deep links
  - Smooth scroll to focused ayah; keyboard navigation (←/→ or j/k) moves focus
  - URL query params (t, v) are read on load and updated on interaction
- UX quality bar
  - Skeletons for verse list; responsive layout; correct RTL rendering; accessible focus styles
- Explicitly out of scope for this phase: DB, Auth, Notes, Search

## Acceptance criteria — Database schema + seed
- Migrations applied to local Postgres
- Seed completes from scripts/out
- API endpoints (/surahs, /translations, /verses) serve identical payloads in DB mode vs file-backed mode
- Toggleable via USE_DATABASE=true and DATABASE_URL env vars

## How to run DB locally (dev)
- Start Docker Desktop, then:
  - docker compose up -d db
- In apps/api/.env set:
  - DATABASE_URL=postgresql://oqr:oqr@localhost:5432/oqr?schema=public
  - USE_DATABASE=true
- Generate client + migrate + seed (from apps/api):
  - pnpm prisma generate
  - pnpm prisma migrate dev --name init
  - pnpm db:seed

## Notes
- Keep displayed scripture verbatim per Tanzil; derive-only for search later
- This document must be updated after each meaningful change

