import { describe, it, expect } from "vitest";
import { alignSimpleToUthmani } from "../../../services/textAlignmentService";

describe("alignSimpleToUthmani", () => {
  it("returns simple words unchanged when lengths match", () => {
    const uthmani = ["كُتِبَ", "عَلَيْكُمُ"];
    const simple = ["كُتِبَ", "عَلَيْكُمُ"];
    expect(alignSimpleToUthmani(uthmani, simple)).toBe(simple);
  });

  it("returns simple words unchanged when simple is shorter", () => {
    const uthmani = ["a", "b", "c"];
    const simple = ["x", "y"];
    expect(alignSimpleToUthmani(uthmani, simple)).toBe(simple);
  });

  it("merges يَا + أَيُّهَا into one slot (verse 2:178 pattern)", () => {
    // Uthmani: يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا (3 words)
    // Simple:  يَا أَيُّهَا الَّذِينَ آمَنُوا (4 words)
    const uthmani = ["يَٰٓأَيُّهَا", "ٱلَّذِينَ", "ءَامَنُوا"];
    const simple = ["يَا", "أَيُّهَا", "الَّذِينَ", "آمَنُوا"];
    const aligned = alignSimpleToUthmani(uthmani, simple);
    expect(aligned).toEqual(["يَا أَيُّهَا", "الَّذِينَ", "آمَنُوا"]);
  });

  it("merges يَا + بَنِي at start (يَٰبَنِىٓ pattern)", () => {
    const uthmani = ["يَٰبَنِىٓ", "إِسْرَٰٓءِيلَ"];
    const simple = ["يَا", "بَنِي", "إِسْرَائِيلَ"];
    const aligned = alignSimpleToUthmani(uthmani, simple);
    expect(aligned).toEqual(["يَا بَنِي", "إِسْرَائِيلَ"]);
  });

  it("merges هَا + أَنْتُمْ (هَٰٓأَنتُمْ pattern)", () => {
    const uthmani = ["هَٰٓأَنتُمْ", "هَٰٓؤُلَآءِ"];
    const simple = ["هَا", "أَنْتُمْ", "هَؤُلَاءِ"];
    const aligned = alignSimpleToUthmani(uthmani, simple);
    expect(aligned).toEqual(["هَا أَنْتُمْ", "هَؤُلَاءِ"]);
  });

  it("handles mid-verse merge (يَٰٓـَٔادَمُ at index 1)", () => {
    // e.g. "وَقُلْنَا يَٰٓـَٔادَمُ ٱسْكُنْ" vs "وَقُلْنَا يَا آدَمُ اسْكُنْ"
    const uthmani = ["وَقُلْنَا", "يَٰٓـَٔادَمُ", "ٱسْكُنْ"];
    const simple = ["وَقُلْنَا", "يَا", "آدَمُ", "اسْكُنْ"];
    const aligned = alignSimpleToUthmani(uthmani, simple);
    expect(aligned).toEqual(["وَقُلْنَا", "يَا آدَمُ", "اسْكُنْ"]);
  });

  it("handles two merge points in one verse (diff=2)", () => {
    // Surah 11:44 — يَٰٓأَرْضُ ... وَيَٰسَمَآءُ
    const uthmani = ["وَقِيلَ", "يَٰٓأَرْضُ", "ٱبْلَعِى", "وَيَٰسَمَآءُ", "أَقْلِعِى"];
    const simple = ["وَقِيلَ", "يَا", "أَرْضُ", "ابْلَعِي", "وَيَا", "سَمَاءُ", "أَقْلِعِي"];
    const aligned = alignSimpleToUthmani(uthmani, simple);
    expect(aligned).toEqual(["وَقِيلَ", "يَا أَرْضُ", "ابْلَعِي", "وَيَا سَمَاءُ", "أَقْلِعِي"]);
  });

  it("handles triple merge (يَبْنَؤُمَّ = يا + ابن + أمّ)", () => {
    // Surah 20:94 — يَبْنَؤُمَّ = يَا ابْنَ أُمَّ
    const uthmani = ["قَالَ", "يَبْنَؤُمَّ", "لَا"];
    const simple = ["قَالَ", "يَا", "ابْنَ", "أُمَّ", "لَا"];
    const aligned = alignSimpleToUthmani(uthmani, simple);
    expect(aligned).toEqual(["قَالَ", "يَا ابْنَ أُمَّ", "لَا"]);
  });
});
