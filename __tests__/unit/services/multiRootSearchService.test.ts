import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchByRoots,
  searchWithProximity,
  type SearchQuery,
} from "@/services/multiRootSearchService";

// Define mock data type (all properties optional for test flexibility)
type MockRootEntry = { r?: string; l?: string; t?: string } | null;
type MockRootData = Record<string, MockRootEntry[]>;

// Mock dependencies
vi.mock("@/services/analysisService", () => ({
  loadLocalRootData: vi.fn(),
  normalizeArabic: vi.fn((text: string) => {
    if (!text) return "";
    return text
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[ٱإأآ]/g, "ا")
      .replace(/[ى]/g, "ي")
      .trim();
  }),
}));

vi.mock("@/services/textSanitizer", () => ({
  sanitizeQuranText: vi.fn((text: string) => text),
}));

import { loadLocalRootData } from "@/services/analysisService";

const mockLoadLocalRootData = loadLocalRootData as ReturnType<typeof vi.fn>;

describe("multiRootSearchService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchByRoots", () => {
    describe("AND operator", () => {
      it("should find verses containing all specified roots", async () => {
        mockLoadLocalRootData.mockResolvedValueOnce({
          "1:1": [
            { r: "سمو", t: "بسم" },
            { r: "اله", t: "الله" },
          ],
          "1:2": [
            { r: "حمد", t: "الحمد" },
            { r: "اله", t: "لله" },
          ],
        });

        const query: SearchQuery = {
          roots: ["سمو", "اله"],
          operator: "AND",
        };

        const results = await searchByRoots(query);

        expect(results.length).toBe(1);
        expect(results[0].verseKey).toBe("1:1");
      });

      it("should return empty when not all roots are present", async () => {
        mockLoadLocalRootData.mockResolvedValueOnce({
          "1:1": [{ r: "سمو", t: "بسم" }],
        });

        const query: SearchQuery = {
          roots: ["سمو", "اله"],
          operator: "AND",
        };

        const results = await searchByRoots(query);
        expect(results.length).toBe(0);
      });
    });

    describe("OR operator", () => {
      it("should find verses containing any of the specified roots", async () => {
        mockLoadLocalRootData.mockResolvedValueOnce({
          "1:1": [{ r: "سمو", t: "بسم" }],
          "1:2": [{ r: "حمد", t: "الحمد" }],
          "1:3": [{ r: "رحم", t: "الرحمن" }],
        });

        const query: SearchQuery = {
          roots: ["سمو", "حمد"],
          operator: "OR",
        };

        const results = await searchByRoots(query);

        expect(results.length).toBe(2);
        expect(results.map((r) => r.verseKey)).toContain("1:1");
        expect(results.map((r) => r.verseKey)).toContain("1:2");
      });
    });

    describe("NOT operator", () => {
      it("should find verses NOT containing the specified roots", async () => {
        mockLoadLocalRootData.mockResolvedValueOnce({
          "1:1": [{ r: "سمو", t: "بسم" }],
          "1:2": [{ r: "حمد", t: "الحمد" }],
          "1:3": [{ r: "رحم", t: "الرحمن" }],
        });

        const query: SearchQuery = {
          roots: ["سمو", "حمد"],
          operator: "NOT",
        };

        const results = await searchByRoots(query);

        expect(results.length).toBe(1);
        expect(results[0].verseKey).toBe("1:3");
      });
    });

    describe("proximity constraint", () => {
      it("should filter results by word proximity", async () => {
        mockLoadLocalRootData.mockResolvedValueOnce({
          "1:1": [
            { r: "سمو", t: "بسم" }, // position 1
            { r: "اله", t: "الله" }, // position 2 - distance = 1
            { r: "رحم", t: "الرحمن" }, // position 3
          ],
          "1:2": [
            { r: "سمو", t: "بسم" }, // position 1
            { r: "xxx", t: "xxx" }, // position 2
            { r: "xxx", t: "xxx" }, // position 3
            { r: "xxx", t: "xxx" }, // position 4
            { r: "اله", t: "الله" }, // position 5 - distance = 4
          ],
        });

        const query: SearchQuery = {
          roots: ["سمو", "اله"],
          operator: "AND",
          proximity: 2, // Max distance of 2 words
        };

        const results = await searchByRoots(query);

        expect(results.length).toBe(1);
        expect(results[0].verseKey).toBe("1:1");
      });
    });

    it("should return empty array for empty roots", async () => {
      const query: SearchQuery = {
        roots: [],
        operator: "AND",
      };

      const results = await searchByRoots(query);
      expect(results).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce(null);

      const query: SearchQuery = {
        roots: ["سمو"],
        operator: "OR",
      };

      const results = await searchByRoots(query);
      expect(results).toEqual([]);
    });

    it("should deduplicate roots in query", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "سمو", t: "بسم" }],
      });

      const query: SearchQuery = {
        roots: ["سمو", "سمو", "سمو"],
        operator: "AND",
      };

      const results = await searchByRoots(query);
      expect(results.length).toBe(1);
    });

    it("should sort results by verse order", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "2:1": [{ r: "سمو", t: "test" }],
        "1:3": [{ r: "سمو", t: "test" }],
        "1:1": [{ r: "سمو", t: "test" }],
      });

      const query: SearchQuery = {
        roots: ["سمو"],
        operator: "OR",
      };

      const results = await searchByRoots(query);

      expect(results[0].verseKey).toBe("1:1");
      expect(results[1].verseKey).toBe("1:3");
      expect(results[2].verseKey).toBe("2:1");
    });
  });

  describe("searchWithProximity", () => {
    it("should find verses where two roots appear within specified distance", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" }, // position 1
          { r: "اله", t: "الله" }, // position 2
        ],
      });

      const results = await searchWithProximity("سمو", "اله", 2);

      expect(results.length).toBe(1);
      expect(results[0].verseKey).toBe("1:1");
      expect(results[0].positions).toHaveLength(2);
    });

    it("should return empty for roots too far apart", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" }, // position 1
          { r: "xxx", t: "xxx" },
          { r: "xxx", t: "xxx" },
          { r: "xxx", t: "xxx" },
          { r: "xxx", t: "xxx" },
          { r: "اله", t: "الله" }, // position 6
        ],
      });

      const results = await searchWithProximity("سمو", "اله", 2);
      expect(results.length).toBe(0);
    });

    it("should return empty for invalid roots", async () => {
      const results1 = await searchWithProximity("", "اله", 2);
      expect(results1).toEqual([]);

      const results2 = await searchWithProximity("سمو", "", 2);
      expect(results2).toEqual([]);
    });

    it("should return empty for negative distance", async () => {
      const results = await searchWithProximity("سمو", "اله", -1);
      expect(results).toEqual([]);
    });

    it("should return empty when data is null", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce(null);

      const results = await searchWithProximity("سمو", "اله", 2);
      expect(results).toEqual([]);
    });

    it("should return closest pair of positions", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" }, // position 1
          { r: "اله", t: "الله" }, // position 2 - closest pair
          { r: "سمو", t: "بسم" }, // position 3
          { r: "xxx", t: "xxx" },
          { r: "اله", t: "الله" }, // position 5
        ],
      });

      const results = await searchWithProximity("سمو", "اله", 5);

      expect(results.length).toBe(1);
      // Should return the closest pair (positions 1 and 2, or 2 and 3)
      const positions = results[0].positions;
      const distance = Math.abs(positions[0] - positions[1]);
      expect(distance).toBeLessThanOrEqual(2);
    });
  });

  describe("SearchResult structure", () => {
    it("should have correct structure", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" },
          { r: "اله", t: "الله" },
        ],
      });

      const query: SearchQuery = {
        roots: ["سمو"],
        operator: "OR",
      };

      const results = await searchByRoots(query);

      expect(results[0]).toHaveProperty("verseKey");
      expect(results[0]).toHaveProperty("verseText");
      expect(results[0]).toHaveProperty("matchedRoots");
      expect(results[0]).toHaveProperty("positions");
      expect(Array.isArray(results[0].matchedRoots)).toBe(true);
      expect(Array.isArray(results[0].positions)).toBe(true);
    });
  });
});
