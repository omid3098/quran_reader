# Project Documentation Index

This folder contains all design decisions, workflows, and architectural context for the Open Quran Reader project. **AI assistants: read this file first.**

## Current Focus & Next Steps

**Phase: NodeReader Implementation** — Foundation tasks complete. Building features.

**What to do next:**

1. ~~**Layout restructuring**~~ — Done. Left panel + bottom panel with tabs + webcam zone + resizable splits.
2. ~~**Build quran-phrases.json**~~ — Done. File exists at `public/quran-phrases.json` (4.5MB) with generation script.
3. ~~**Define KB TypeScript types**~~ — Done. Types in `types.ts`, CRUD service in `knowledgeBaseService.ts`.
4. ~~**Familiarity indicators on word nodes (#12)**~~ — Done. Subtle yellow dot on words with KB notes. Pure helper in `services/familiarityService.ts`.
5. **Familiarity indicators at verse level (#13)** — Deferred until KB connections UI exists. **← NEXT (blocked)**
6. **Prompt Builder (#11)** — Replaces built-in AI tafseer. **← NEXT**
7. **Multi-branch support (Problem #2)**
8. **Systematic color palette + legend (#18)**

## Documents

| Document                                           | What it covers                                                                                                | Status                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [node-reader-redesign.md](node-reader-redesign.md) | NodeReader UX: layout model, all 19 data placement decisions, 6 design constraints, TBD items, open questions | Layout done, word familiarity done                            |
| [data-architecture.md](data-architecture.md)       | Three-layer data model: computed data, personal KB (JSON schema), narrative notes                             | Partially implemented (phrases + KB types + familiarity done) |
| [study-workflow.md](study-workflow.md)             | How the user actually studies the Quran (spiral process, not linear)                                          | Documented                                                    |
| [analysis-framework.md](analysis-framework.md)     | The 11-step analytical framework for reading the Quran                                                        | Documented                                                    |
| [sample-notes.md](sample-notes.md)                 | Patterns extracted from real study notes (2:169-171) — informs tool design                                    | Documented                                                    |

## Quick Context for AI Assistants

1. The user studies the Quran using a spiral process: word catches attention → root → cross-references → insight → note → next word
2. The tool should serve this workflow, not impose a different one
3. Patterns from real study notes are documented in [sample-notes.md](sample-notes.md)
4. Data architecture has been decided (three layers) but not fully implemented yet
5. The user communicates in Persian (Farsi), documentation is in English
6. Package manager is **Bun** (not npm)

## Maintenance Rules

- **After design decisions**: Update the relevant doc immediately
- **After new topics emerge**: Create a new doc and add it to this index
- **After direction changes**: Update status in the table above and note what changed and why
- **After completing a next step**: Update "Current Focus & Next Steps" to reflect the new state
