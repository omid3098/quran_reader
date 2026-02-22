# Project Documentation Index

This folder contains all design decisions, workflows, and architectural context for the Open Quran Reader project. **AI assistants: read this file first.**

## Current Focus & Next Steps

**Phase: Local-First Data + NodeReader Production Testing**

**Recently completed:**

- ~~**Local-first data architecture**~~ — Done. Quran text, chapter metadata, and 16 bundled translations (13 Persian + 3 English) served as static JSON from `public/data/`. Other translations downloadable on-demand to IndexedDB. No runtime API calls for core reading data. See [data-architecture.md](data-architecture.md) for details.
- ~~**NodeReader foundation + features**~~ — All done. Layout, KB, connections, familiarity, backlinks, prompt builder, color palette.

**What to do next:**

1. **Patterns (#14)** — **← NEXT** (Deferred until notes + connections are in use)

## Documents

| Document                                           | What it covers                                                                                                 | Status                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [node-reader-redesign.md](node-reader-redesign.md) | NodeReader UX: layout model, all 19 data placement decisions, 6 design constraints, TBD items, open questions  | Merged to main. All foundation + feature tasks done except Patterns (#14)                                  |
| [data-architecture.md](data-architecture.md)       | Three-layer data model, local-first data layer, personal KB (JSON schema), narrative notes                     | Fully implemented (local-first + phrases + KB + connections + familiarity + backlinks). Patterns (#14) TBD |
| [analysis-framework.md](analysis-framework.md)     | The 11-step analytical framework for reading the Quran                                                         | Documented                                                                                                 |
| [note-style-guide.md](note-style-guide.md)         | Writing voice, two-part structure, formatting patterns for tafseer notes. Used by Prompt Builder at build time | Active — imported into Prompt Builder via `?raw`                                                           |

## Quick Context for AI Assistants

1. The user studies the Quran using a spiral process: word catches attention → root → cross-references → insight → note → next word
2. The tool should serve this workflow, not impose a different one
3. Writing voice and note structure are documented in [note-style-guide.md](note-style-guide.md) (also imported into the Prompt Builder at build time)
4. Data architecture has been decided (three layers) and mostly implemented (only Patterns remain)
5. **Local-first architecture**: Quran text, chapters, and translations are bundled as static JSON — no runtime API calls for core reading. Only audio (everyayah.com) and AI (Gemini) remain external.
6. The user communicates in Persian (Farsi), documentation is in English
7. Package manager is **Bun** (not npm)

## Maintenance Rules

- **After design decisions**: Update the relevant doc immediately
- **After new topics emerge**: Create a new doc and add it to this index
- **After direction changes**: Update status in the table above and note what changed and why
- **After completing a next step**: Update "Current Focus & Next Steps" to reflect the new state
