# Study Workflow — How the Quran Is Actually Studied

## The Idealized vs Actual Process

The [analysis framework](analysis-framework.md) defines 11 sequential steps. In practice, the process is **not linear**. It's a **spiral** around a verse — each pass goes deeper.

## The Real Process (observed from notes 2:169-171)

```
یه کلمه توجهت رو جلب میکنه
    ↓
ریشه‌ش رو بررسی میکنی
    ↓
یه ارتباط با آیهٔ دیگه پیدا میکنی
    ↓
میری اون آیه رو میخونی
    ↓
یه بینش جدید پیدا میکنی
    ↓
یادداشت میکنی
    ↓
برمیگردی یا میری سراغ کلمهٔ بعدی
```

This is **word-centric exploration**. A word catches attention, and from there a web of connections unfolds.

## Entry Points for Each Verse

1. **Read the Arabic text** — constant reference, always visible
2. **Read translations** — once at the start, then collapse to free space
3. **Deep analysis** — driven by curiosity, not a checklist:
   - A word catches attention → check root, lemma, previous notes
   - Find cross-references (where else does this root/word/phrase appear?)
   - Compare with other verses that use similar language
   - Write observations, connections, personal reflections

## What the Tool Needs to Support

| Need                                   | Current State                                                        | Gap                                                |
| -------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Arabic text as constant reference      | On canvas (word nodes) + panel header on select                      | Canvas word spacing doesn't feel like natural text |
| Translations readable then collapsible | Bottom panel tab, toggleable + resizable                             | ~~No collapse mechanism~~ Done                     |
| Root/lemma info for words              | Panel shows root analysis on word click (1 click)                    | ~~Should be available without 2 clicks~~ Improved  |
| Cross-reference with context           | PhraseVerseNode on canvas, verse text + translation in panel         | ~~No preview~~ Done (panel shows verse on click)   |
| Previous KB notes during reading       | Familiarity dots on word nodes (yellow dot = has KB notes)           | ~~No way to see which words have notes~~ Done      |
| Bidirectional linking                  | KB connections + note backlinks (`[x:y]` auto-detection)             | ~~No way to know verse A referenced it~~ Done      |
| Writing notes in flow                  | KB notes inline-editable in panel; verse/surah notes in bottom panel | OK for short notes; long narrative in bottom panel |

## Key Insight

The biggest remaining gap is between **"this root has 114 verses"** and **"which are relevant to what I'm studying?"**. The Prompt Builder partially addresses this by exporting all study context for external AI analysis. Automated phrase matching also surfaces cross-references that share exact word sequences. But root-level "which of these 114 verses matter right now?" still requires manual exploration or AI assistance.
