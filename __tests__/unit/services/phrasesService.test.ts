import { describe, it, expect, vi, beforeEach } from "vitest";
import { findPhrasesForWord, findPhrasesForVerse } from "@/services/phrasesService";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const SAMPLE_PHRASES_DATA = {
  _meta: {
    description: "Repeated lemma sequences across Quran verses",
    maxLength: 5,
    source: "computed from quran-roots.json",
    generated: "2025-01-01T00:00:00.000Z",
    sourceChecksum: "abc123",
    stats: { totalPhrases: 2, totalOccurrences: 5 },
  },
  phrases: [
    {
      lemmas: ["أَصَمّ", "أَبْكَم", "أَعْمَى"],
      occurrences: [
        { verse: "2:18", words: [0, 1, 2] },
        { verse: "2:171", words: [12, 13, 14] },
      ],
    },
    {
      lemmas: ["أَصَمّ", "أَبْكَم"],
      occurrences: [
        { verse: "6:39", words: [3, 4] },
        { verse: "8:22", words: [5, 6] },
      ],
    },
  ],
};

function mockFetchSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(SAMPLE_PHRASES_DATA),
  });
}

describe("phrasesService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Reset module-level cache by re-importing
    vi.resetModules();
  });

  describe("findPhrasesForWord", () => {
    it("should return phrase matches for a word in a verse", async () => {
      mockFetchSuccess();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("2:18", 0);
      expect(matches.length).toBe(1);
      expect(matches[0].lemmas).toEqual(["أَصَمّ", "أَبْكَم", "أَعْمَى"]);
      expect(matches[0].wordIndices).toEqual([0, 1, 2]);
      expect(matches[0].otherOccurrences).toEqual([{ verse: "2:171", words: [12, 13, 14] }]);
    });

    it("should return empty array for a word with no phrase matches", async () => {
      mockFetchSuccess();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("1:1", 0);
      expect(matches).toEqual([]);
    });

    it("should return matches sorted by phrase length (longest first)", async () => {
      // Create data where one word is in both a 3-word and 2-word phrase
      const data = {
        ...SAMPLE_PHRASES_DATA,
        phrases: [
          {
            lemmas: ["X", "Y"],
            occurrences: [
              { verse: "3:1", words: [0, 1] },
              { verse: "3:2", words: [0, 1] },
            ],
          },
          {
            lemmas: ["X", "Y", "Z"],
            occurrences: [
              { verse: "3:1", words: [0, 1, 2] },
              { verse: "3:3", words: [0, 1, 2] },
            ],
          },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("3:1", 0);
      expect(matches.length).toBe(2);
      // Longest first
      expect(matches[0].lemmas).toEqual(["X", "Y", "Z"]);
      expect(matches[1].lemmas).toEqual(["X", "Y"]);
    });

    it("should return empty array when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("2:18", 0);
      expect(matches).toEqual([]);
    });
  });

  describe("findPhrasesForVerse", () => {
    it("should return a map of word indices to phrase matches", async () => {
      mockFetchSuccess();
      const { findPhrasesForVerse: fn } = await import("@/services/phrasesService");
      const result = await fn("2:18");
      expect(result).not.toBeNull();
      // Word 0, 1, 2 should all have the ABC phrase
      expect(result!.get(0)!.length).toBe(1);
      expect(result!.get(1)!.length).toBe(1);
      expect(result!.get(2)!.length).toBe(1);
    });

    it("should return null for a verse with no matches", async () => {
      mockFetchSuccess();
      const { findPhrasesForVerse: fn } = await import("@/services/phrasesService");
      const result = await fn("99:1");
      expect(result).toBeNull();
    });
  });
});
