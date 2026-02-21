import type { PartialBlock } from "@blocknote/core";
import type { Verse, Chapter, QuranWord, VerseNote } from "../types";
import { blocksToText } from "./noteContent";
import { loadKnowledgeBase } from "./knowledgeBaseService";
import { findPhrasesForVerse } from "./phrasesService";
import { computeBacklinks } from "./noteBacklinksService";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PromptContext {
  verseKey: string;
  verseText: string;
  chapterName: string;
  chapterNameArabic: string;
  revelationPlace: string;
  translations: { name: string; text: string }[];
  words: { word: string; root?: string; lemma?: string }[];
  rootNotes: Map<string, string>;
  lemmaNotes: Map<string, string>;
  phraseMatches: { pattern: string; matchType: string; verses: string[] }[];
  connections: { from: string; to: string; reason: string }[];
  verseNoteText: string;
  surahNoteText: string;
  sampleNotes: { verseKey: string; text: string }[];
}

// ---------------------------------------------------------------------------
// Condensed analysis framework (~250 words)
// ---------------------------------------------------------------------------

const ANALYSIS_FRAMEWORK = `## Analysis Framework

Use these principles when analyzing the verse:

1. **Definition Source Hierarchy** — The Quran's own contextual usage and root etymology take precedence over conventional or theological definitions. No two words are exact synonyms; subtle differences must be extracted from the text itself.

2. **Networked Thinking** — Each verse is part of a unified text. Search for every other place a word or concept appears. How is it used there? Does another verse add a condition, exception, or example?

3. **Principle of Optimality** — Every word is there for a reason. Nothing is filler. If something seems redundant, ask "why is this here?" and "what am I missing?"

4. **Grammar and Syntax Check** — Before interpreting meaning, verify the structural level: verb forms, particles, pronoun references, sentence structure. These are language mechanics, not interpretation.

5. **Process Orientation** — Many Quranic concepts that we treat as labels actually describe ongoing processes. "Muslim" means "one who submits" — submitting is continuous, not a one-time status.

6. **Principle of Uncertainty** — Any conclusion is one possible reading among many. Say "it seems" or "my reading is" — not as formality, but because we mean it.`;

// ---------------------------------------------------------------------------
// collectSampleNotes — pure helper: finds up to MAX_SAMPLES notes from linked ayahs
// ---------------------------------------------------------------------------

const MAX_SAMPLE_NOTES = 3;

export function collectSampleNotes(
  verseKey: string,
  connections: PromptContext["connections"],
  allNotes: Record<string, VerseNote>
): { verseKey: string; text: string }[] {
  const samples: { verseKey: string; text: string }[] = [];
  const used = new Set<string>([verseKey]);

  const tryAdd = (key: string): boolean => {
    if (used.has(key)) return false;
    used.add(key);
    const note = allNotes[key];
    if (!note?.blocks?.length) return false;
    const text = blocksToText(note.blocks);
    if (!text.trim()) return false;
    samples.push({ verseKey: key, text });
    return true;
  };

  // Priority 1: verses connected via KB connections
  for (const c of connections) {
    if (samples.length >= MAX_SAMPLE_NOTES) return samples;
    const other = c.from === verseKey ? c.to : c.from;
    tryAdd(other);
  }

  // Priority 2: verses that reference this verse via [x:y] backlinks
  if (samples.length < MAX_SAMPLE_NOTES) {
    const backlinks = computeBacklinks(verseKey, allNotes);
    for (const bl of backlinks) {
      if (samples.length >= MAX_SAMPLE_NOTES) break;
      tryAdd(bl.sourceVerseKey);
    }
  }

  // Fallback: previous ayahs in same surah (scan backwards)
  if (samples.length < MAX_SAMPLE_NOTES) {
    const [surahStr, ayahStr] = verseKey.split(":");
    const currentAyah = parseInt(ayahStr, 10);
    for (let ayah = currentAyah - 1; ayah >= 1 && samples.length < MAX_SAMPLE_NOTES; ayah--) {
      tryAdd(`${surahStr}:${ayah}`);
    }
  }

  return samples;
}

// ---------------------------------------------------------------------------
// buildPromptText — pure, sync, no side effects
// ---------------------------------------------------------------------------

export function buildPromptText(ctx: PromptContext): string {
  const sections: string[] = [];

  // Header
  sections.push(
    `# Quran Study Context — ${ctx.chapterName} (${ctx.chapterNameArabic}), Verse ${ctx.verseKey}`
  );

  // Verse text
  sections.push(`## Verse\n\n${ctx.verseText}`);

  // Translations
  if (ctx.translations.length > 0) {
    const items = ctx.translations.map((t) => `- **${t.name}:** ${t.text}`).join("\n");
    sections.push(`## Translations\n\n${items}`);
  }

  // Word analysis table
  if (ctx.words.length > 0) {
    const header = "| # | Word | Root | Lemma |\n|---|------|------|-------|";
    const rows = ctx.words
      .map((w, i) => `| ${i + 1} | ${w.word} | ${w.root ?? "—"} | ${w.lemma ?? "—"} |`)
      .join("\n");
    sections.push(`## Word Analysis\n\n${header}\n${rows}`);
  }

  // KB root & lemma notes
  const noteLines: string[] = [];
  for (const [root, note] of ctx.rootNotes) {
    noteLines.push(`- Root "${root}": ${note}`);
  }
  for (const [lemma, note] of ctx.lemmaNotes) {
    noteLines.push(`- Lemma "${lemma}": ${note}`);
  }
  if (noteLines.length > 0) {
    sections.push(`## Your Notes on Roots & Lemmas\n\n${noteLines.join("\n")}`);
  }

  // Cross-references (phrase matches)
  if (ctx.phraseMatches.length > 0) {
    const items = ctx.phraseMatches
      .map((m) => `- "${m.pattern}" (${m.matchType} match) → also in: ${m.verses.join(", ")}`)
      .join("\n");
    sections.push(`## Cross-References (Shared Patterns)\n\n${items}`);
  }

  // KB connections
  if (ctx.connections.length > 0) {
    const items = ctx.connections.map((c) => `- ${c.from} → ${c.to}: "${c.reason}"`).join("\n");
    sections.push(`## Connections You've Made\n\n${items}`);
  }

  // Verse notes
  if (ctx.verseNoteText.trim()) {
    sections.push(`## Your Notes on This Verse\n\n${ctx.verseNoteText}`);
  }

  // Surah notes
  if (ctx.surahNoteText.trim()) {
    sections.push(`## Your Notes on ${ctx.chapterName}\n\n${ctx.surahNoteText}`);
  }

  // Sample notes from linked ayahs
  if (ctx.sampleNotes.length > 0) {
    const items = ctx.sampleNotes.map((s) => `### [${s.verseKey}]\n\n${s.text}`).join("\n\n");
    sections.push(`## Sample Notes from Your Recent Analysis\n\n${items}`);
  }

  // Analysis framework
  sections.push(ANALYSIS_FRAMEWORK);

  // Final instruction
  const styleHint =
    ctx.sampleNotes.length > 0
      ? " Write your analysis in the same depth, tone, and style as the sample notes shown above."
      : "";
  sections.push(
    `---\nPlease analyze this verse considering all the context above.${styleHint} Respond in Persian.`
  );

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// gatherPromptContext — async, collects all data needed for the prompt
// ---------------------------------------------------------------------------

export async function gatherPromptContext(
  verse: Verse,
  chapter: Chapter,
  words: QuranWord[],
  verseNoteBlocks: PartialBlock[] | undefined,
  surahNoteBlocks: PartialBlock[] | undefined
): Promise<PromptContext> {
  const [kb, phraseMap] = await Promise.all([
    loadKnowledgeBase(),
    findPhrasesForVerse(verse.verse_key),
  ]);

  // Build word list
  const promptWords = words.map((w) => ({
    word: w.text_uthmani,
    root: w.root,
    lemma: w.lemma,
  }));

  // Collect root/lemma notes from KB for words in this verse
  const rootNotes = new Map<string, string>();
  const lemmaNotes = new Map<string, string>();
  if (kb) {
    for (const w of words) {
      if (w.root && kb.roots[w.root]?.note && !rootNotes.has(w.root)) {
        rootNotes.set(w.root, kb.roots[w.root].note);
      }
      if (w.lemma && kb.lemmas[w.lemma]?.note && !lemmaNotes.has(w.lemma)) {
        lemmaNotes.set(w.lemma, kb.lemmas[w.lemma].note);
      }
    }
  }

  // Collect phrase matches — deduplicate by pattern keys
  const phraseMatches: PromptContext["phraseMatches"] = [];
  if (phraseMap) {
    const seen = new Set<string>();
    for (const [, matches] of phraseMap) {
      for (const m of matches) {
        const key = m.keys.join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        phraseMatches.push({
          pattern: m.keys.join(" "),
          matchType: m.matchType,
          verses: m.otherOccurrences.map((o) => o.verse),
        });
      }
    }
  }

  // Collect KB connections mentioning this verse
  const connections: PromptContext["connections"] = [];
  if (kb) {
    for (const c of kb.connections) {
      if (c.from.verse === verse.verse_key || c.to.verse === verse.verse_key) {
        connections.push({
          from: c.from.verse,
          to: c.to.verse,
          reason: c.reason,
        });
      }
    }
  }

  // Extract plain text from BlockNote blocks
  const verseNoteText = verseNoteBlocks ? blocksToText(verseNoteBlocks) : "";
  const surahNoteText = surahNoteBlocks ? blocksToText(surahNoteBlocks) : "";

  // Collect sample notes from linked/nearby ayahs
  let allStoredNotes: Record<string, VerseNote> = {};
  try {
    const stored = localStorage.getItem("luminaNotes");
    if (stored) allStoredNotes = JSON.parse(stored) as Record<string, VerseNote>;
  } catch {
    /* ignore parse errors */
  }
  const sampleNotes = collectSampleNotes(verse.verse_key, connections, allStoredNotes);

  // Translations
  const translations = (verse.translations || []).map((t) => ({
    name: t.resource_name || "Translation",
    text: t.text.replace(/<[^>]*>/g, ""),
  }));

  return {
    verseKey: verse.verse_key,
    verseText: verse.text_uthmani,
    chapterName: chapter.name_simple,
    chapterNameArabic: chapter.name_arabic,
    revelationPlace: chapter.revelation_place,
    translations,
    words: promptWords,
    rootNotes,
    lemmaNotes,
    phraseMatches,
    connections,
    verseNoteText,
    surahNoteText,
    sampleNotes,
  };
}
