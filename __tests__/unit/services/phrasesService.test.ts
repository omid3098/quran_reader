import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const SAMPLE_LEMMA_DATA = {
  _meta: {
    description: "Repeated lemma sequences across Quran verses",
    matchBy: "lemma",
    maxLength: 5,
    source: "computed from quran-roots.json",
    generated: "2025-01-01T00:00:00.000Z",
    sourceChecksum: "abc123",
    stats: { totalPhrases: 2, totalOccurrences: 5 },
  },
  phrases: [
    {
      keys: ["أَصَمّ", "أَبْكَم", "أَعْمَى"],
      occurrences: [
        { verse: "2:18", words: [0, 1, 2] },
        { verse: "2:171", words: [12, 13, 14] },
      ],
    },
    {
      keys: ["أَصَمّ", "أَبْكَم"],
      occurrences: [
        { verse: "6:39", words: [3, 4] },
        { verse: "8:22", words: [5, 6] },
      ],
    },
  ],
};

const SAMPLE_ROOT_DATA = {
  _meta: {
    description: "Repeated root sequences across Quran verses",
    matchBy: "root",
    maxLength: 5,
    source: "computed from quran-roots.json",
    generated: "2025-01-01T00:00:00.000Z",
    sourceChecksum: "abc123",
    stats: { totalPhrases: 1, totalOccurrences: 3 },
  },
  phrases: [
    {
      keys: ["صمم", "بكم", "عمي"],
      occurrences: [
        { verse: "2:18", words: [0, 1, 2] },
        { verse: "2:171", words: [12, 13, 14] },
        { verse: "5:71", words: [3, 4, 5] },
      ],
    },
  ],
};

/**
 * Mock fetch so that lemma file succeeds, root file succeeds.
 * The service tries two URLs per file (baseUrl + fallback).
 */
function mockFetchBothSuccess() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("quran-root-phrases")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SAMPLE_ROOT_DATA) });
    }
    if (url.includes("quran-phrases")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SAMPLE_LEMMA_DATA) });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

function mockFetchLemmaOnly() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("quran-root-phrases")) {
      return Promise.resolve({ ok: false, status: 404 });
    }
    if (url.includes("quran-phrases")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SAMPLE_LEMMA_DATA) });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

function mockFetchAllFail() {
  mockFetch.mockResolvedValue({ ok: false, status: 404 });
}

describe("phrasesService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.resetModules();
  });

  describe("findPhrasesForWord", () => {
    it("should return lemma phrase matches tagged with matchType", async () => {
      mockFetchBothSuccess();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("6:39", 3);
      expect(matches.length).toBe(1);
      expect(matches[0].matchType).toBe("lemma");
      expect(matches[0].keys).toEqual(["أَصَمّ", "أَبْكَم"]);
    });

    it("should return root phrase matches tagged with matchType", async () => {
      mockFetchBothSuccess();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("5:71", 3);
      expect(matches.length).toBe(1);
      expect(matches[0].matchType).toBe("root");
      expect(matches[0].keys).toEqual(["صمم", "بكم", "عمي"]);
    });

    it("should keep root match when it connects to verses lemma does not", async () => {
      mockFetchBothSuccess();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      // Verse 2:18 word 0: lemma connects to [2:171], root connects to [2:171, 5:71]
      // Root match survives because 5:71 is a new connection
      const matches = await fn("2:18", 0);
      expect(matches.length).toBe(2);
      expect(matches[0].matchType).toBe("lemma");
      expect(matches[1].matchType).toBe("root");
    });

    it("should deduplicate root matches fully covered by lemma matches", async () => {
      // Root phrase only connects to same verses as lemma → redundant
      const rootData = {
        ...SAMPLE_ROOT_DATA,
        phrases: [
          {
            keys: ["صمم", "بكم", "عمي"],
            occurrences: [
              { verse: "2:18", words: [0, 1, 2] },
              { verse: "2:171", words: [12, 13, 14] },
            ],
          },
        ],
      };
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("quran-root-phrases")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(rootData) });
        }
        if (url.includes("quran-phrases")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(SAMPLE_LEMMA_DATA) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("2:18", 0);
      expect(matches.length).toBe(1);
      expect(matches[0].matchType).toBe("lemma");
    });

    it("should return empty array for a word with no phrase matches", async () => {
      mockFetchBothSuccess();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("1:1", 0);
      expect(matches).toEqual([]);
    });

    it("should return matches sorted by phrase length (longest first)", async () => {
      const data = {
        ...SAMPLE_LEMMA_DATA,
        phrases: [
          {
            keys: ["X", "Y"],
            occurrences: [
              { verse: "3:1", words: [0, 1] },
              { verse: "3:2", words: [0, 1] },
            ],
          },
          {
            keys: ["X", "Y", "Z"],
            occurrences: [
              { verse: "3:1", words: [0, 1, 2] },
              { verse: "3:3", words: [0, 1, 2] },
            ],
          },
        ],
      };
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("quran-root-phrases")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url.includes("quran-phrases")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("3:1", 0);
      expect(matches.length).toBe(2);
      expect(matches[0].keys).toEqual(["X", "Y", "Z"]);
      expect(matches[1].keys).toEqual(["X", "Y"]);
    });

    it("should return empty array when all fetches fail", async () => {
      mockFetchAllFail();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("2:18", 0);
      expect(matches).toEqual([]);
    });

    it("should work when only lemma file is available", async () => {
      mockFetchLemmaOnly();
      const { findPhrasesForWord: fn } = await import("@/services/phrasesService");
      const matches = await fn("2:18", 0);
      expect(matches.length).toBe(1);
      expect(matches[0].matchType).toBe("lemma");
    });
  });

  describe("findPhrasesForVerse", () => {
    it("should return merged matches, keeping root when it has unique verses", async () => {
      mockFetchBothSuccess();
      const { findPhrasesForVerse: fn } = await import("@/services/phrasesService");
      const result = await fn("2:18");
      expect(result).not.toBeNull();
      // Root connects to 5:71 which lemma doesn't → both survive
      expect(result!.get(0)!.length).toBe(2);
    });

    it("should return null for a verse with no matches", async () => {
      mockFetchBothSuccess();
      const { findPhrasesForVerse: fn } = await import("@/services/phrasesService");
      const result = await fn("99:1");
      expect(result).toBeNull();
    });
  });
});
