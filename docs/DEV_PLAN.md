# OpenQuranReader — Development Plan (living document)

Last updated: 2025-08-20

## Current status
- Repo scaffolded as pnpm workspace monorepo
- apps/api minimal HTTP server running with /health
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
1) File-backed Read API (current)
   - Load data from scripts/out at startup (in-memory) and serve:
     - GET /surahs
     - GET /translations
     - GET /verses?surah=1&from=1&to=7&translation_ids=en.arberry,fa.makarem
   - Basic validation & error handling
   - Simple CORS for local dev

2) Database schema + seed (Postgres + Prisma)
   - Define schema for surah, verse, translation, verse_translation, user, user_prefs, note, bookmark, collection, reading_progress
   - Seed from scripts/out files
   - Replace file-backed API with DB-backed queries

3) Web reader MVP (Read)
   - Surah list and verse view pages
   - Arabic text + 1 translation (default)
   - Settings: font size, theme (localStorage persisted)
   - Keyboard navigation

4) Auth + user prefs
   - NextAuth for basic sessions
   - Store/persist default translations and UI prefs

5) Notes
   - CRUD API + UI side panel
   - XSS-safe rendering

6) Bookmarks & collections
   - Toggle bookmark, organize, jump

7) Search (server FTS)
   - Normalized Arabic + translation FTS with Postgres
   - API + results UI with highlights

8) Multiple translations UI
   - Multi-select translations, side-by-side view

9) Performance/a11y/i18n polish
   - Caching, windowing long lists, a11y, RTL/LTR, intl

10) Legal/credits
   - Tanzil attribution and per-translation licenses

## Acceptance criteria for current phase
- API serves:
  - GET /surahs → 114 entries with names (from scripts/out/surahs.json)
  - GET /translations → list from scripts/out/translations.json
  - GET /verses with Arabic + selected translations using JSONL lookups
- Works without DB; suitable for web MVP wiring

## Notes
- Keep displayed scripture verbatim per Tanzil; derive-only for search later
- This document must be updated after each meaningful change

