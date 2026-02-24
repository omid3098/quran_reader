/**
 * Aligns simple-script word arrays to uthmani-script word arrays.
 *
 * In the Uthmani script, vocative particles (يا / ها) are merged with the
 * following word (e.g. "يَٰٓأَيُّهَا"), while the simple script keeps them
 * separate ("يَا" + "أَيُّهَا"). This causes text_uthmani and text_simple
 * to have different word counts (~363 of 6,236 verses).
 *
 * Since quran-roots.json indices are aligned with uthmani tokenisation,
 * we need a simple-word array of the same length where merged tokens are
 * joined with a space (e.g. "يَا أَيُّهَا").
 */

/** Strip diacritics and normalise letters so base consonants can be compared. */
function baseForm(word: string): string {
  return word
    .replace(/[\u064B-\u065F\u0670\u0653\u06DF\u06E0]/g, "") // tashkeel + superscript alef + maddah
    .replace(/[\u0610-\u061A\u06D6-\u06ED]/g, "") // Quranic annotations
    .replace(/[ٱإأآ]/g, "ا") // normalise all alef variants
    .replace(/[ى]/g, "ي") // alef maqsura → ya
    .replace(/[ؤ]/g, "و") // hamza on waw → waw
    .replace(/[ة]/g, "ه"); // ta marbuta → ha
}

/**
 * Returns a simple-word array whose length matches `uthmaniWords`.
 * At merge points, consecutive simple words are joined with a space.
 *
 * If the arrays already have the same length, `simpleWords` is returned
 * unchanged (zero allocation in the common path).
 */
export function alignSimpleToUthmani(uthmaniWords: string[], simpleWords: string[]): string[] {
  const extra = simpleWords.length - uthmaniWords.length;
  if (extra <= 0) return simpleWords;

  const aligned: string[] = [];
  let si = 0;
  let mergesRemaining = extra;

  for (let ui = 0; ui < uthmaniWords.length; ui++) {
    if (si >= simpleWords.length) {
      aligned.push(uthmaniWords[ui]);
      continue;
    }

    // If we still have extra simple words to absorb, check if this uthmani
    // word is a merge of 2+ simple words by comparing base-letter lengths.
    if (mergesRemaining > 0) {
      const uLen = baseForm(uthmaniWords[ui]).length;
      const sLen = baseForm(simpleWords[si]).length;

      if (uLen >= sLen + 2 && si + 1 < simpleWords.length) {
        const parts: string[] = [simpleWords[si++]];

        if (ui + 1 < uthmaniWords.length) {
          // Forward-lookahead: find which simple word aligns with the NEXT
          // uthmani word, then consume everything before it.
          const nextUBase = baseForm(uthmaniWords[ui + 1]);
          while (si < simpleWords.length && mergesRemaining > 0) {
            if (baseForm(simpleWords[si]) === nextUBase) break;
            parts.push(simpleWords[si++]);
            mergesRemaining--;
          }
        } else {
          // Last uthmani word — consume all remaining simple words.
          while (si < simpleWords.length) {
            parts.push(simpleWords[si++]);
            mergesRemaining--;
          }
        }

        aligned.push(parts.join(" "));
        continue;
      }
    }

    aligned.push(simpleWords[si++]);
  }

  return aligned;
}
