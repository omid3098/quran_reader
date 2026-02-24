# NodeReader Redesign

## Current State

NodeReader is a ReactFlow-based canvas with a left-side properties panel. It displays one verse at a time as word nodes, with phrase-verse cross-references. Root analysis is shown in the panel on word click (no root nodes on canvas). Merged to main and deployed to production.

### Architecture

- `components/NodeReader/NodeReader.tsx` — container, word loading, keyboard nav
- `components/NodeReader/NodeReaderCanvas.tsx` — ReactFlow wrapper, cache save/restore
- `components/NodeReader/useNodeReaderState.ts` — core state hook (nodes, edges, interactions)
- `components/NodeReader/PropertiesPanel.tsx` — left sidebar, dynamic header
- `components/NodeReader/BottomPanel.tsx` — translations, verse notes, surah notes (tabbed)
- `components/NodeReader/TranslationTabs.tsx` — translation display with FocusMode-matched font size
- `components/NodeReader/PromptBuilderModal.tsx` — lazy-loaded prompt builder
- `components/NodeReader/CanvasLegend.tsx` — color legend (bottom-right corner)
- `components/NodeReader/colorPalette.ts` — centralized color definitions
- `components/NodeReader/nodeLayout.ts` — pure layout functions
- `components/NodeReader/nodes/` — WordNode, PhraseVerseNode

### Node Types

- **WordNode**: Arabic word, click to see root analysis + phrase matches in panel
- **PhraseVerseNode**: Verse key badge (e.g. "27:40"), color-coded by match type (amber=lemma, teal=root, violet=surface)

## Core Problems

### 1. Canvas and Panel are two separate apps

Canvas is a "selector" — click something to see info in side panel. Panel is where actual exploration happens. User must look at two places constantly. (Note: moving the panel from right to left helps with RTL reading flow but doesn't fully solve this structural problem.)

### ~~2. Single-branch constraint~~ (Resolved — not needed)

RootNode was removed from the canvas entirely. Root analysis (occurrence count, word forms, verses by surah) is now shown in PropertiesPanel when a word is clicked. PhraseVerseNodes connect directly to WordNodes, so no root node intermediary was needed. This eliminates the multi-branch problem since there are no root branches to compare.

### 3. Nodes carry minimal data

- PhraseVerseNode shows only "27:40" — no preview of what the verse says
- WordNode shows only Arabic text — no root/lemma annotation

### 4. No bidirectional linking

When studying verse A, user finds connection to verse B and writes a note. Later when studying verse B, there's no way to discover that connection from A. See [data-architecture.md](data-architecture.md) for the `connections` solution.

### 5. Root and phrase analysis are separate paths

Root analysis (`findVersesByRoot()`) and phrase matching (`findPhrasesForWord()`) are independent service calls with no cross-reference.

### 6. Ephemeral session state

Closing NodeReader destroys all canvas state. No persistence across sessions. **Partial fix:** View mode (NodeReader vs default) is now persisted to `localStorage.lastViewMode` — reopening the site restores NodeReader at the last surah/ayah. Canvas node state (positions, expanded nodes, selected word) is still ephemeral.

## Data Placement Decisions (Bottom-Up Review)

> The FSCR scoring framework was attempted but didn't feel right. Instead, we went through every data input one by one, discussing actual usage patterns and deciding placement based on real workflow needs. This section documents those decisions.

### Emerging Layout Model

The review produced a clear three-zone layout:

```
                                   ┌───────────────────────────────────────────────┌──────────────────────────────────┐─────────────────────────────┐
                                   │                       │                       │ [Surah/Verse Navigation Bar]   ▾ │                             │
                                   │                       │───────────────────────└──────────────────────────────────┘──────────────────────────────
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │       Left Panel      │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                      Canvas                                            │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   ────────resizable────────                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │┌─────────────────────────────────────────────Resizable─height─────────────────────┌───┐│
                                   │                       ││ Translations │ Verse Notes │ Surah Notes                                         │ X ││
                                   │                       │└──────────────────────────────────────────────────────────────────────────────────└───┘│
                                   │      Webcam zone      │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   │                       │                                                                                        │
                                   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

**Why left panel instead of right:**

- The webcam zone (bottom-left) is naturally below the panel, so no space is wasted
- The panel's bottom section is simply kept clear for the webcam — it's dead space either way, so putting the panel above it is efficient
- Canvas gets the full right side, which is where Arabic text reads from (RTL)
- The resizable split between properties and webcam zone lets the user adjust based on whether they're recording or not

### Decision Table

| #   | Data Input                        | Placement                                                    | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-2 | Arabic text + individual words    | **Canvas (permanent) + panel header (on select)**            | Words displayed as nodes with natural reading spacing. This is the primary content — the verse text itself. Spacing between word nodes must feel natural enough that the user can read the verse fluently, not like disconnected boxes. When a word is selected, it appears in the panel header (no separate "Word" section in panel content — the header IS the word display).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3-4 | Root + lemma per word             | **Panel (on word click)**                                    | Shown in PropertiesPanel when the user clicks a word node. Root letters, KB note, occurrence count, word forms (collapsible), and verses by surah (collapsible) are all displayed in the WordInfo section. No root node on canvas — keeps Arabic text readability clean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 5   | Word position in verse            | **Panel header (on word select)**                            | Shown as compact `X/N` in the panel header when a word is selected (e.g., `10/12` = word 10 of 12). Communicates position without a separate section. Not shown when no word is selected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | Root verse list                   | **Deprioritized**                                            | The raw list of all verses containing a root is not directly useful in the study workflow. The user doesn't browse verse lists — they use AI to find contextually relevant verses. The root verse list may still exist as underlying data that feeds other features (like the Prompt Builder), but it's not a primary UI element.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | Phrase matches (shared sequences) | **Canvas (on interaction)**                                  | Automated phrase detection is critically important. Finding shared multi-word sequences automatically and presenting them is far more reliable than asking an AI to find similar verses from scratch. The automation reduces error rates significantly. These appear as PhraseVerseNode badges on canvas when a word is explored. The automated detection also feeds the Prompt Builder (see #11) to give external AI tools precise cross-reference data.                                                                                                                                                                                                                                                                                                                                                   |
| 8   | Word forms of a root              | **Hidden / collapsed by default**                            | Rarely used during analysis. If kept, should be in a collapsed section that the user can expand if needed (e.g., inside the left panel's root detail view). Not worth permanent screen space. Could also be omitted entirely from the initial redesign.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 9   | Root occurrence count             | **Deprioritized**                                            | The raw number (e.g., "114 verses") is not meaningful on its own. It doesn't tell the user anything actionable. Deprioritized along with #6. May appear as a small annotation if the root detail view is open, but not as a primary data point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 10  | Translations                      | **Bottom panel (tab)**                                       | Translations are needed when first loading a verse — the user reads them to orient. After that initial read, they're rarely consulted again during analysis. The bottom panel opens with translations visible when a verse loads, and can be toggled closed with a button click. The panel is NOT opened/closed by dragging — it's a simple button toggle. The tab-based layout (matching the current multi-translation tab UI) is preserved. The panel height can be resized for comfort.                                                                                                                                                                                                                                                                                                                  |
| 11  | AI Tafseer (Gemini)               | **Removed → replaced by Prompt Builder**                     | The built-in Gemini tafseer feature is removed. In its place, a **Prompt Builder** is introduced. The Prompt Builder collects all available data about the current study context — verse number, verse text, active translations, identified roots with user notes, lemma notes, shared phrase patterns, KB connections, even the analysis framework itself and sample notes as examples — and assembles it into a single long text. The user copies this text and pastes it into whatever external AI tool they prefer (ChatGPT, Claude, Gemini, etc.). This approach: (a) removes the API key dependency, (b) lets the user choose their AI, (c) provides far richer context than a simple "explain this verse" call, (d) leverages all the structured data the app has collected.                        |
| 12  | KB notes on roots/lemmas          | **Subtle indicator on word node + detail in left panel**     | When a verse loads and any of its words have existing notes on their root or lemma in the personal KB, a very subtle visual indicator appears on the word node — something like a tiny dot below the word or a slight border color change. The indicator must be extremely gentle: it communicates "you've studied this root before" without disrupting the Arabic text readability. The word nodes are already side-by-side and reading flow is fragile — nothing should make it harder to read. The actual note content is accessible by clicking the word and viewing the left panel.                                                                                                                                                                                                                    |
| 13  | Connections / backlinks (KB)      | **"Familiarity" indicator on the verse itself (design TBD)** | When the user opens a verse that has been referenced by other verses in their KB connections, they should somehow know "I've been here before from somewhere else." This is the same "familiarity" pattern used for words (#12), but applied at the verse level. The exact UI design is not yet decided — possibilities include a badge next to the verse number, a subtle banner at the top of the canvas, a colored accent on the navigation bar, or a section in the left panel. The key requirement: when arriving at a verse, the user should passively discover that connections exist without having to search for them.                                                                                                                                                                             |
| 14  | Patterns (mental models from KB)  | **Undecided — three options on the table**                   | Patterns are conceptual models the user builds (e.g., "threshold model: سوء is the set of all bad things, فحشاء is the subset that crosses a threshold"). Three possible approaches: **(a)** Multi-node note: select two or more word nodes and write a note that spans them. Unusual UX, may be confusing. **(b)** Pattern as a first-class entity: a note attached to the pattern itself, accessible when any of its related roots appear. Powerful but adds UX complexity. **(c)** Keep patterns in the verse narrative note and use connections to link to the next verse where the pattern appears. Simplest, but loses the structured relationship. Decision deferred until the foundational pieces (notes, connections, indicators) are implemented and the right answer becomes clearer from usage. |
| 15  | Verse narrative notes (BlockNote) | **Bottom panel (tab, toggle + resize)**                      | Personal analysis notes for the current verse (synthesis, analogies, reflections, word-in-context observations). Displayed as a tab in the bottom panel alongside translations. The panel can be toggled open/closed with a button and its height is resizable — the user may need a large area when actively writing, or a small strip when just reviewing. This replaces the current right-panel note section.                                                                                                                                                                                                                                                                                                                                                                                            |
| 16  | Surah-level notes                 | **Bottom panel (tab)**                                       | Occasionally needed for recording observations about surah structure, thematic flow, or surah-level patterns. Since it's infrequent, it lives as another tab in the bottom panel. Not visible by default — the user switches to this tab when they have something surah-level to record.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 17  | Phrase verse preview text         | **Not needed — verse key only**                              | When phrase matches produce PhraseVerseNode badges on canvas, the verse key alone (e.g., "27:40") is sufficient. The user doesn't need to see the full verse text inline. If they want to explore the referenced verse, they click through. This keeps the canvas clean and avoids fetching full verse text for every match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 18  | Match type color coding           | **Canvas (permanent) — with systematic palette + legend**    | Three match types: lemma (amber), root (teal), surface (violet). Surface matches find recurring multi-word patterns involving particles/function words. Legend at bottom-right corner of canvas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 19  | Surah/verse navigation            | **Top bar (above canvas)**                                   | Navigation between surahs and verses sits above the canvas area (not spanning the full viewport width — the left panel has its own header). Consistent with the default reader mode's navigation pattern. The navigation should feel familiar — same mental model as the main app's surah/verse selector.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Design Constraints Discovered During Review

1. **Arabic readability is sacred.** Multiple decisions were shaped by the constraint that nothing should disrupt the ability to read the verse text naturally across word nodes. Indicators, annotations, and interactive affordances must be extremely subtle when near the text.

2. **Toggle, don't drag.** The bottom panel opens and closes with a button click, not by dragging a handle. Resizing height is allowed (for when the user is actively writing notes vs. just glancing at a translation), but the open/close action is a simple toggle.

3. **AI is external, data is internal.** The app's job is to collect, structure, and present data — not to be an AI interface itself. The Prompt Builder pattern (gather all data → format for clipboard → user takes it to their preferred AI) is the preferred approach over built-in AI calls that require API keys.

4. **"Familiarity" as a design pattern.** A recurring theme: when the user encounters something they've studied before (a root, a lemma, a verse), the UI should passively signal recognition. This applies to word nodes (root/lemma KB notes → subtle indicator) and to verses (backlinks from connections → verse-level indicator). The exact visual treatment is TBD but the principle is established.

5. **Left panel = dynamic header + selected item properties + webcam zone.** The panel is on the left side (not right), split into two resizable sections. The **header changes dynamically** based on what's selected: word selected → Arabic word text + position `X/N`; phrase verse selected → verse key + pattern; no selection → current verse key + connection/backlink counts. This eliminates redundant "Word" and "Position" sections from the panel content and saves vertical space. The top section shows properties and notes for the currently selected canvas item (a word, a phrase match). The bottom section is kept clear for the webcam overlay during recording. When not recording, the user can resize the split to give more space to properties. This layout is efficient because the webcam dead zone (bottom-left corner) is naturally absorbed into the panel rather than wasting canvas space. It also frees the right side entirely for the canvas, which benefits RTL Arabic text reading.

6. **Webcam zone = bottom of left panel.** The user records video lessons with a webcam overlay (OBS) at the bottom-left corner of the viewport. The bottom portion of the left panel is kept completely clear for this purpose. The user should never worry about their webcam covering content during recording. The resizable split between properties and webcam zone lets the user adjust the boundary. The same constraint already applies in Focus Mode.

### Items Still TBD

| Item           | What's undecided                 | Depends on                                           |
| -------------- | -------------------------------- | ---------------------------------------------------- |
| Patterns (#14) | Which of three approaches to use | Usage experience after notes + connections are built |

## Current Status & Next Steps

**Status:** Merged to main and deployed to production. Foundation tasks complete. All familiarity features (word + verse + note backlinks) implemented. Connection UI and color legend done. In production testing phase.

**Foundation tasks:**

1. ~~**Layout restructuring**~~ — Done. Left panel (properties + webcam zone), bottom panel with tabs (Translations, Verse Notes, Surah Notes), resizable splits, canvas flex resize.
2. ~~**Build quran-phrases.json**~~ — Done. File at `public/quran-phrases.json` (4.5MB), generation script included.
3. ~~**Define KB TypeScript types**~~ — Done. Types in `types.ts`, CRUD service in `knowledgeBaseService.ts`.

**Feature tasks:**

4. ~~**Familiarity indicators on word nodes (#12)**~~ — Done. Pure helper in `services/familiarityService.ts` checks KB for root/lemma notes. `WordNode` shows a subtle yellow dot (`bg-yellow-400/40`, 6px) when familiar. KB loaded in parallel with root data on verse load (zero overhead — both cached). Single dot per word (root-vs-lemma detail available on click in PropertiesPanel). Flags not updated in real-time after saving a note — appears on next verse load.
5. ~~**Prompt Builder (#11)**~~ — Done. Pure `buildPromptText()` in `services/promptBuilderService.ts` assembles all study context (verse, translations, word analysis, KB root/lemma notes, phrase cross-references, KB connections, verse/surah notes, condensed analysis framework) into a Markdown prompt. `gatherPromptContext()` async helper collects data from KB + phrases services. Lazy-loaded `PromptBuilderModal` with spinner → prompt display → copy button. Sparkles button in nav bar. All sections always included (no toggles); empty sections omitted automatically.
6. ~~**Connection UI + Verse familiarity (#13)**~~ — Done. KB connection CRUD (`saveConnection`, `deleteConnection`, `getConnectionsForVerse`) in `knowledgeBaseService.ts`. `ConnectionSaveField` in `PropertiesPanel.tsx` — appears on PhraseVerseInfo with pre-filled reason, save/delete/yellow "Connected" state. `verseFamiliarityService.ts` pure function checks KB connections. Yellow dot on floating verse key when connections exist. Connections list in PropertiesPanel default view (no selection) with clickable verse links.
7. ~~**Note Backlinks**~~ — Done. `noteBacklinksService.ts` scans all verse notes for `[x:y]` references using `blocksToText()` + regex. `computeBacklinks()` pure function, `getBacklinksForVerse()` reads from localStorage. "Mentioned in Notes" section in PropertiesPanel default view with excerpts. Yellow dot on verse key also triggered by backlinks.
8. ~~**Systematic color palette + legend (#18)**~~ — Done. `colorPalette.ts` centralizes `NODE_READER_COLORS` (lemmaMatch=amber, rootMatch=teal, surfaceMatch=violet, rootAnalysis=indigo, selected=emerald, userData=yellow). Memoized `CanvasLegend` component, absolute bottom-right corner, pointer-events-none. Tests for data integrity.
9. ~~**Multi-branch support (Problem #2)**~~ — Resolved: RootNode removed from canvas, root analysis shown in PropertiesPanel on word click. Problem eliminated.
10. **Patterns (#14)** — **← NEXT** (Deferred until notes + connections are in use)

**Design decisions still TBD** (deferred intentionally, resolve when dependencies are met):

- Patterns (#14) → after notes + connections are in use

## Resolved Questions

- **Familiarity indicator threshold** (was Open Question #3): Every KB note triggers the indicator. Empty notes are auto-deleted by `saveRootNote`/`saveLemmaNote`, so any existing entry is substantial. No threshold needed.
- **Prompt Builder scope** (was Open Question #2): All sections always included — no toggles for v1. Empty sections are omitted automatically. The user decided "everything always" is the right default.
- **Backlinks indicator (#13)**: Yellow dot on floating verse key + connections list in PropertiesPanel default view. Two sources: manual KB connections + automatic note backlinks (`[x:y]` references parsed from notes).
- **Color palette (#18)**: Centralized in `colorPalette.ts`. Legend placed at bottom-right corner of canvas, `pointer-events-none`, semi-transparent dark background. Colors: amber=lemma match, teal=root match, violet=surface pattern, indigo=root analysis, emerald=selected, yellow=personal data.
- **Multi-branch support (Problem #2)**: Resolved — not needed. RootNode removed from canvas. Root analysis (occurrence count, word forms, verses by surah) now fetched on word click and shown directly in PropertiesPanel's WordInfo section. PhraseVerseNodes connect directly to WordNodes, so no intermediary root node was necessary.

## Open Questions

1. **Bottom panel tabs interaction**: When switching verses, should the bottom panel remember which tab was active? Should translations auto-open on verse change?
2. **Canvas state persistence**: View mode is now persisted (`lastViewMode` in localStorage — reopening the site restores NodeReader at the correct surah/ayah). Remaining question: should canvas-level state (selected word, expanded nodes, node positions) also be saved and restored?
