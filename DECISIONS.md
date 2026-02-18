# Node-Based Quran Knowledge Graph — Design & Context

## Background: Why This Exists

This feature is part of a larger ecosystem for deep Quranic study and video production.

### The Problem

The user runs a YouTube series analyzing Quran verses. Their workflow:

1. Use AI tools (Claude CLI, Gemini CLI, Qwen CLI) to get raw analysis of verses
2. Read the AI output, think deeply, write their own personal notes
3. Record video based on their notes

**The gap**: AI output is encyclopedic and shallow (covers everything equally). The user's notes are deep, selective, and personal — they pick 2-3 angles and go all-in, include personal stories, make bold interpretive claims then question themselves, and build arguments across verse clusters. The AI output and their final notes are very different.

### The Ecosystem

```
quran_studio (local Python/Streamlit)     knowledge_base (JSON)     quran_reader (this repo, web)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━         ━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI analysis via CLI tools (paid)    →     accumulated knowledge  →   display & publish (free)
personal workshop                         roots, notes, links        open source reader
writes to knowledge_base                  plain JSON in git          reads from knowledge_base
```

- **quran_studio**: Local tool at `E:\@home\omid\Videos\obs\`. Uses CLI-based AI tools (Claude, Gemini) that the user pays subscription for. Handles analysis, translation, video upload.
- **quran_reader**: THIS repo. A React/TypeScript web app. Currently a Quran reader with root analysis, notes, similarity search. Will be extended with the node-based view and knowledge graph.
- **knowledge_base**: A shared data layer (JSON files) that quran_studio writes to and quran_reader reads from. Lives in this repo so it's version-controlled and open source.

### Why Two Tools?

Cost. The user pays for Claude CLI and Gemini CLI subscriptions. Using those APIs directly would cost extra. quran_studio runs locally and pipes to these CLI tools. quran_reader is deployed as a free web app.

### The Open Source Goal

The user wants to leave behind a free, open-source Quran reader/analyzer. The knowledge_base grows over time as they study more verses, and anyone can benefit from the accumulated analysis.

---

## The Analysis Framework

The user has a detailed analysis framework (`analyze_data/quran_analysis_framework.md` in quran_studio) with these principles:

1. **Definition Source Hierarchy**: Quran's own usage > root etymology > historical usage > conventional definitions
2. **Networked Thinking**: Every word/concept must be cross-referenced across the entire Quran
3. **Principle of Optimality**: Every word is deliberate; if something seems redundant, investigate why
4. **Behavioral Analysis**: Describe what characters did, not why (unless text explicitly states motive)
5. **Process Orientation**: Most Quranic concepts describe ongoing processes, not static labels
6. **Generalizable Patterns**: Extract patterns that apply beyond the original context
7. **Vernacular Mapping**: Analogies from daily life (cooking, work, relationships) to make concepts click
8. **Principle of Uncertainty**: Every conclusion is "one possible reading" — use hedging language

### What Makes the User's Notes Special (Examples from 2:165-170)

- **Selective depth**: In 2:165, only analyzes "أنداد" and "حُبّ" deeply, ignores everything else
- **Bold claims + self-doubt**: "ما أنزل الله might include inner revelation, not just scripture" then "به خط‌کش خودم هم ادعای بزرگیه" (even by my own standards this is a big claim)
- **Personal examples**: A friend's sausage story to illustrate blind following (2:170)
- **Cultural references**: Sheikh Abu Sa'id story (2:165), Iranian political slogans, film quotes (2:169)
- **Cross-verse structure**: Reads 2:163-170 as a unified argument, not isolated verses
- **Process focus**: Notes how verbs indicate ongoing habits, not one-time events

---

## Core Design Decisions

### 1. One Ayah at a Time (Node View)

- **Decision**: A new view mode where one ayah is displayed as a collection of word nodes on a canvas.
- **Why**: Enables word-level interaction, annotation, and cross-ayah linking. Supports the deep, focused reading style the user practices.

### 2. ReactFlow for Node Rendering

- **Decision**: Use ReactFlow to render each word as a node.
- **Why**: ReactFlow provides the canvas, zoom/pan, node interaction, and edge infrastructure needed for the knowledge graph. It's not just display — it's the foundation for cross-ayah connections.

### 3. Word-Level Granularity

- **Decision**: Each Arabic word is an independent node. Annotations can be attached at three levels:
  - **Word level**: e.g., "أَلۡفَيۡنَا" → "وراثت منفعلانه — یافتن تصادفی، نه جستجو"
  - **Phrase level**: e.g., "ما أنزل الله" (selecting multiple nodes) → "فراتر از کتاب — شامل سکینه، الهام، وحی درونی"
  - **Verse level**: Overall notes about the entire ayah
- **Why**: The user's analysis naturally operates at all three levels. In their notes for 2:170, they have word-specific insights (ألفينا), phrase insights (ما أنزل الله), and verse-level synthesis.

### 4. RTL Text Layout

- **Decision**: Nodes are spaced RTL so the ayah reads naturally as Arabic text.
- **Why**: Reading fluency. The node structure should feel invisible during reading.

### 5. No Edges Within a Single Ayah

- **Decision**: Words within the same ayah are NOT connected with edges.
- **Why**: Spatial RTL layout already implies reading order. Edges would be visual clutter.

### 6. Cross-Ayah Linking

- **Decision**: Users can link words/phrases/verses to other verses in the Quran.
- **Why**: This is the core value — building a personal knowledge graph. Examples from user's notes:
  - 2:170 links to 31:21, 43:22-24 (same pattern of "following ancestors")
  - 2:166 links to 14:22 (Satan's speech pattern)
  - 2:165's "أنداد" links to 2:166's "الذین اتُّبِعوا" (richer definition of أنداد)

### 7. Navigation

- **Decision**: Left/right arrows to move between ayahs. Surah selector in header. Audio controls at bottom.
- **Why**: Simple. One ayah at a time with easy traversal.

### 8. Dark Theme Default

- **Decision**: Dark theme as default for node view.
- **Why**: Matches the "analysis workspace" feel. Existing app already supports dark mode.

---

## Knowledge Base

A shared data layer (JSON files in this repo) that quran_studio writes to and quran_reader reads from. The exact data model will be designed organically as we build features. Key concepts to support:

- **Root analyses**: User's personal understanding of Arabic roots, accumulated over time
- **Verse annotations**: Notes at word, phrase, and verse level
- **Cross-ayah connections**: Links between related verses with reasons
- **Patterns**: Reusable behavioral/thematic patterns identified across verses

The long-term goal is that this knowledge base also feeds back into quran_studio's AI prompts, so AI starts from where the user left off rather than from zero.

---

## Implementation Plan (Prototype)

### Phase 1: Node View Foundation

Build the basic node-based verse display:

- [ ] New route/view: `/node/:surahId/:verseId`
- [ ] Fetch verse data + word-level root data from existing `quran-roots.json`
- [ ] Render each word as a ReactFlow node in RTL layout
- [ ] Show root info on hover/click
- [ ] Left/right navigation between verses
- [ ] Basic verse info display (verse key, surah name)

### Phase 2: Annotation System

Add the ability to annotate at word/phrase/verse level:

- [ ] Click a word node → open note panel for that word
- [ ] Select multiple nodes (shift+click or drag) → create phrase annotation
- [ ] Verse-level note panel (always accessible)
- [ ] Store annotations in knowledge_base JSON format
- [ ] Load existing annotations when navigating to a verse

### Phase 3: Cross-Ayah Links

Enable connecting words/phrases to other verses:

- [ ] "Link to verse" action on any word/phrase/verse note
- [ ] Search/browse to find target verse
- [ ] Store connections in knowledge_base format
- [ ] Visual indicator on nodes that have cross-ayah links
- [ ] Click link → navigate to linked verse

### Phase 4: Knowledge Base Integration

Connect the accumulated data:

- [ ] Root analysis panel: when clicking a root, show user's previous analysis if it exists in knowledge_base
- [ ] Pattern detection: highlight when a verse matches a known pattern
- [ ] Related verses sidebar: show connected verses from knowledge_base
- [ ] Import existing analyses from quran_studio markdown files

### Phase 5: Graph Visualization

A bird's-eye view of the knowledge graph:

- [ ] Separate graph view showing analyzed verses as nodes with edges
- [ ] Filter by root, pattern, or surah
- [ ] Click node → navigate to node view for that verse

---

## Interaction Design Answers

### Word Node Click Behavior

When a user clicks a word node, **the root appears as a new independent node on the canvas** (not in a sidebar or panel). This is key — everything lives on the canvas.

**Click flow:**

1. Click word node (e.g., "ٱلرَّحِيمِ")
2. A **root node** appears nearby (e.g., "ر ح م") — connected to the word with an edge
3. If the root has a note in the knowledge_base, the note content is visible on/near the root node
4. (Third interaction TBD — user had an idea but needs to recall it)

This means the canvas gradually fills with context as the user explores — word nodes spawn root nodes, root nodes may show notes, etc. It's an **organic, exploratory interaction** rather than panel-based.

### Root Node Click Behavior

Root nodes are **interactive, not static**. Clicking a root node shows all verses in the Quran containing that root.

**Click flow:**

1. Click root node (e.g., "ر ح م")
2. **Surah nodes** appear horizontally below the root node as a list — showing only surahs that contain this root, paginated (20 per page)
3. Click a surah node → **verse key nodes** expand below it, showing the specific ayahs in that surah containing the root
4. Click a verse key node → navigate to that ayah in the node view

Layout is **list-like, horizontal, below the root** — not radial/star-shaped. This keeps things readable and scannable even for roots with hundreds of occurrences.

### Properties Panel

A dedicated **Properties panel** (separate from the canvas) that shows contextual details for the currently selected node. It updates dynamically based on what's clicked:

| Selected         | Properties Panel Shows              |
| ---------------- | ----------------------------------- |
| Nothing selected | Verse-level note (if exists)        |
| Word node        | Word-level note + root info         |
| Root node        | Root-level note from knowledge_base |
| Surah node       | (surah info, optional)              |
| Verse key node   | Preview of that verse's text        |

This is the place for **reading and writing notes** — the canvas stays clean for exploration, while the Properties panel handles the detail/annotation work. Think of it like an inspector panel in design tools (Figma, Unity).

**Position:** Right side of the screen. Canvas takes the remaining space on the left.

**Q: What interactions on each word node?**

- Hover: show root + brief translation
- Click: spawn root node on canvas (connected via edge)
- Shift+Click or drag-select: create phrase selection
- Right-click: context menu (link to verse, see all occurrences, copy)

**Q: How will cross-ayah links be created?**

- From any word/phrase note, click "Link to verse" → search modal to find target verse → connection stored in knowledge_base

**Q: How will cross-ayah links be visualized?**

- Small indicator icon on nodes that have links
- When a linked node is selected, show linked verses in a side panel
- In the graph view (Phase 5), links are edges between verse nodes

**Q: How does translation display?**

- Below the node canvas, in a collapsible panel
- Shows selected translations for the current verse
- Individual word translations available on hover/click

**Q: What data does each node show?**

- Default: just the Arabic word (clean, readable)
- On hover: root letters + brief meaning
- On click: full detail panel with root analysis, occurrences, user notes

**Q: What happens to the existing reader view?**

- It stays. The node view is an ADDITIONAL view mode, not a replacement.
- User can switch between "reader mode" (current scrollable list) and "node mode" (one ayah at a time)

**Q: Should the user be able to rearrange nodes?**

- No. Layout is fixed RTL for readability. Zoom/pan only.
- Exception: in graph view (Phase 5), verse-level nodes can be rearranged.
