import type { KnowledgeBase, QuranWord } from "../types";

export interface FamiliarityFlags {
  hasFamiliarRoot: boolean;
  hasFamiliarLemma: boolean;
}

/**
 * Check if a word's root or lemma has a note in the Knowledge Base.
 * Pure function — no side effects, no async.
 */
export function computeWordFamiliarity(
  root: string | undefined,
  lemma: string | undefined,
  kb: KnowledgeBase | null
): FamiliarityFlags {
  if (!kb) return { hasFamiliarRoot: false, hasFamiliarLemma: false };
  return {
    hasFamiliarRoot: !!root && !!kb.roots[root]?.note,
    hasFamiliarLemma: !!lemma && !!kb.lemmas[lemma]?.note,
  };
}

/**
 * Annotate an array of QuranWords with familiarity flags from the KB.
 * Returns a new array (does not mutate input). Words without familiarity
 * are returned as the original object reference (no unnecessary copies).
 */
export function annotateWordsWithFamiliarity(
  words: QuranWord[],
  kb: KnowledgeBase | null
): QuranWord[] {
  if (!kb) return words;
  return words.map((w) => {
    const flags = computeWordFamiliarity(w.root, w.lemma, kb);
    if (!flags.hasFamiliarRoot && !flags.hasFamiliarLemma) return w;
    return { ...w, ...flags };
  });
}
