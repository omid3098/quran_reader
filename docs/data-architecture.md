# Data Architecture — Three-Layer Model

> This is the authoritative document for data architecture decisions.

## Core Principle: Separate Computed Data from Personal Data

```
┌─────────────────────────────────────────────────────────────────┐
│                    Computed Data (automatic)                     │
│         No personal oversight needed — derivable from Quran     │
│               e.g. quran-roots.json — everyone uses it          │
├─────────────────────────────────────────────────────────────────┤
│                    Personal Data (knowledge base)               │
│          Interpretation, insight, connections — only human       │
│                    ← This is what we need to design             │
└─────────────────────────────────────────────────────────────────┘
```

## Three Layers

### Layer 1: Shared Computed Data

Computed once, used by everyone. All files live in `public/` or `public/data/` as static JSON, loaded at runtime via `fetch()`.

| File                              | Status        | Content                                                              |
| --------------------------------- | ------------- | -------------------------------------------------------------------- |
| `quran-roots.json`                | Exists        | Root, lemma, text per word per verse                                 |
| `quran-phrases.json`              | Built (4.5MB) | Repeated lemma/root sequences across verses                          |
| `data/chapters.json`              | Built (~15KB) | 114 chapter metadata (name, verse count, revelation place)           |
| `data/quran/1.json`–`114.json`    | Built (~3MB)  | Per-surah Quran text (Uthmani + Simple), pre-sanitized at build time |
| `data/translations/*.json`        | Built (16)    | Bundled translations (13 Persian + 3 English), ~1.5MB each           |
| `data/translations-registry.json` | Built (~20KB) | Catalog of all available translations (bundled + downloadable)       |

**Data generation:** `bun run generate-quran-data` fetches from `api.alquran.cloud` once and writes static JSON files. Text sanitization (`sanitizeQuranText()`) applied at generation time so runtime doesn't need to.

**Translation strategy:** Persian + English translations bundled as static files. All other translations downloadable on-demand via Settings, stored in IndexedDB (not localStorage — size limits).

**quran-phrases.json decisions:**

- Search length: 2 to 5 lemmas
- Dedup: Only store the longest match between a verse pair. Shorter sub-phrases only stored if they connect to verses the longer phrase doesn't.

### Layer 2: Personal Knowledge Base (structured)

One JSON file, loaded once into memory.

```json
{
  "roots": {
    "سوأ": {
      "note": "حس آسیب‌رسانی، زشتی یا ضرر. مجموعه‌ای از بدی‌ها.",
      "discoveredIn": "2:169"
    }
  },
  "lemmas": {
    "سُوء": {
      "root": "سوأ",
      "note": "هر عمل یا نتیجه‌ای که بد و مضره. فارغ از شدتش.",
      "discoveredIn": "2:169"
    }
  },
  "connections": [
    {
      "from": { "verse": "2:169", "words": [5] },
      "to": { "verse": "17:32", "words": null },
      "reason": "فحشاء — زنا صریحاً فاحشة نامیده شده"
    }
  ],
  "patterns": [
    {
      "id": "threshold-model",
      "title": "مدل آستانه",
      "note": "سوء مجموعه‌ای از بدی‌هاست. فحشاء عناصری که از یک threshold رد شدن.",
      "discoveredIn": "2:169",
      "relatedRoots": ["سوأ", "فحش"]
    }
  ]
}
```

**Key: `connections` array enables bidirectional linking.** When viewing any verse, query connections where that verse appears in either `from` or `to`. This solves the backlink problem.

### Layer 3: Narrative Notes (existing system — no changes)

- BlockNote per-verse: synthesis + personal narrative + word-in-context analysis
- BlockNote per-surah: surah-level notes
- SyncOmid: sharing mechanism

### Why per-word-in-verse was dropped

When we have per-root and per-lemma notes, word-in-context analysis (like "innama here means a comprehensive statement about Satan's program") is part of the verse narrative note (BlockNote). No extra layer needed.

## Decisions Log

| Question                       | Decision                                     | Reason                                                                |
| ------------------------------ | -------------------------------------------- | --------------------------------------------------------------------- |
| KB file structure              | Single large JSON                            | Load once into memory, fast access                                    |
| quran-phrases.json             | Build it                                     | First step, automated, independent of personal KB                     |
| per-word-in-verse notes        | Not needed                                   | Covered by root+lemma notes + BlockNote per-verse                     |
| Core data loading              | Local-first (bundled static JSON)            | Eliminates API latency, enables offline reading, data is small (~3MB) |
| Translation strategy           | Persian+English bundled, others downloadable | Covers primary audience; others available on-demand via IndexedDB     |
| Downloaded translation storage | IndexedDB                                    | localStorage has ~5-10MB limit; single translation is ~1.5MB          |
| Text sanitization timing       | At generation time                           | Runtime doesn't need to re-sanitize; cleaner data layer               |
| Per-surah file splitting       | 114 separate files                           | Matches lazy-per-chapter loading pattern; only loads what's needed    |

## Implementation Status

**Local-first data layer:**

- [x] Build data generation script — `scripts/generate-quran-data.ts` (chapters, quran text, translations, registry)
- [x] Generate static data files — `public/data/` (chapters, 114 surah files, 16 translations, registry)
- [x] Create local data service — `services/localDataService.ts` (in-memory caching, deduplication)
- [x] Create IndexedDB storage — `services/translationStorageService.ts` (downloaded translation persistence)
- [x] Create translation download service — `services/translationDownloadService.ts` (on-demand download + IndexedDB storage)
- [x] Migrate quranService.ts to local data — all API calls replaced with `localDataService` calls
- [x] Migrate analysisService.ts to local data — `batchFetchVerseTexts()` and `searchPhrase()` now use local data
- [x] Translation download UI in SettingsSidebar — bundled indicator, download button with progress, delete for downloaded

**Computed data:**

- [x] Build quran-phrases.json generation script — `public/quran-phrases.json` (4.5MB)

**Personal KB:**

- [x] Define TypeScript types for KB structure — `types.ts`
- [x] Create KB CRUD service — `knowledgeBaseService.ts` (roots, lemmas)
- [x] Implement connection CRUD — `saveConnection`, `deleteConnection`, `getConnectionsForVerse` in `knowledgeBaseService.ts`
- [x] Integrate KB reading into NodeReader — word familiarity + verse familiarity on verse load
- [x] Implement connection queries (bidirectional lookup) — `verseFamiliarityService.ts`
- [x] Integrate KB writing — ConnectionSaveField in PropertiesPanel (save/delete connections from phrase verse nodes)
- [x] Note backlinks — `noteBacklinksService.ts` scans notes for `[x:y]` verse refs, shows "Mentioned in Notes" in PropertiesPanel
- [x] Create initial KB file — `public/knowledge-base.json` exists as seed; `ensureKB()` creates localStorage entry on first save
