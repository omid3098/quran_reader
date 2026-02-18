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

| Need                                   | Current State                                 | Gap                                                               |
| -------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Arabic text as constant reference      | On canvas (word nodes) + panel                | Canvas word spacing doesn't feel like natural text                |
| Translations readable then collapsible | In panel, always visible                      | No collapse mechanism                                             |
| Root/lemma info for words              | Only after clicking word → root → panel       | Should be available without 2 clicks                              |
| Cross-reference with context           | Panel shows verse keys (e.g. "27:40")         | No preview of what the verse actually says                        |
| Previous KB notes during reading       | Only visible after clicking the specific word | No way to see "which words here have notes?"                      |
| Bidirectional linking                  | Does not exist                                | When studying verse B, no way to know verse A referenced it       |
| Writing notes in flow                  | KB notes are inline-editable in panel         | OK for short notes; long narrative notes are separate (BlockNote) |

## Key Insight

The biggest gap is between **"this root has 114 verses"** (the tool gives this number) and **"what do those verses say and which are relevant?"** (the user does this manually). The tool gives counts but not **context**. The user manually builds context in external markdown notes.
