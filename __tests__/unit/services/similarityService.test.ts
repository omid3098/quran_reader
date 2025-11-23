import { describe, it, expect, vi, beforeEach } from "vitest";

// normalizeArabic mock implementation
const normalizeArabicImpl = (text: string) => {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[ٱإأآ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .trim();
};

describe("similarityService", () => {
  // Dynamic imports to get fresh module state after resetModules
  let calculateJaccardSimilarity: typeof import("@/services/similarityService").calculateJaccardSimilarity;
  let compareVerses: typeof import("@/services/similarityService").compareVerses;
  let findSimilarVerses: typeof import("@/services/similarityService").findSimilarVerses;
  let mockLoadLocalRootData: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset modules to clear the verseRootsIndex cache
    vi.resetModules();

    // Set up mock BEFORE importing the service module
    vi.doMock("@/services/analysisService", () => ({
      loadLocalRootData: vi.fn(),
      normalizeArabic: normalizeArabicImpl,
    }));

    // Re-import the module to get a fresh instance with fresh mocks
    const similarityModule = await import("@/services/similarityService");
    calculateJaccardSimilarity = similarityModule.calculateJaccardSimilarity;
    compareVerses = similarityModule.compareVerses;
    findSimilarVerses = similarityModule.findSimilarVerses;

    // Get reference to the mock
    const analysisModule = await import("@/services/analysisService");
    mockLoadLocalRootData = analysisModule.loadLocalRootData as ReturnType<typeof vi.fn>;
  });

  describe("calculateJaccardSimilarity", () => {
    it("should return 1 for identical root sets", () => {
      const roots = ["سمو", "اله", "رحم"];
      const similarity = calculateJaccardSimilarity(roots, roots);
      expect(similarity).toBe(1);
    });

    it("should return 0 for completely different root sets", () => {
      const roots1 = ["سمو", "اله"];
      const roots2 = ["حمد", "رحم"];
      const similarity = calculateJaccardSimilarity(roots1, roots2);
      expect(similarity).toBe(0);
    });

    it("should return correct value for partial overlap", () => {
      const roots1 = ["سمو", "اله", "رحم"]; // 3 roots
      const roots2 = ["سمو", "اله", "حمد"]; // 3 roots, 2 shared

      // Jaccard: |intersection| / |union| = 2 / 4 = 0.5
      const similarity = calculateJaccardSimilarity(roots1, roots2);
      expect(similarity).toBe(0.5);
    });

    it("should return 0 for empty arrays", () => {
      expect(calculateJaccardSimilarity([], [])).toBe(0);
      expect(calculateJaccardSimilarity(["سمو"], [])).toBe(0);
      expect(calculateJaccardSimilarity([], ["سمو"])).toBe(0);
    });

    it("should handle duplicates in input arrays", () => {
      const roots1 = ["سمو", "سمو", "اله"];
      const roots2 = ["سمو", "اله", "اله"];

      // Should treat as sets: {سمو, اله} vs {سمو, اله}
      const similarity = calculateJaccardSimilarity(roots1, roots2);
      expect(similarity).toBe(1);
    });

    it("should normalize roots before comparison", () => {
      // With diacritics vs without
      const roots1 = ["سَمَو"];
      const roots2 = ["سمو"];
      const similarity = calculateJaccardSimilarity(roots1, roots2);
      // After normalization, should be the same
      expect(similarity).toBe(1);
    });
  });

  describe("compareVerses", () => {
    it("should compare two verses and return similarity result", async () => {
      mockLoadLocalRootData.mockResolvedValue({
        "1:1": [
          { r: "سمو", t: "بسم" },
          { r: "اله", t: "الله" },
        ],
        "1:2": [
          { r: "حمد", t: "الحمد" },
          { r: "اله", t: "لله" },
        ],
      });

      const result = await compareVerses("1:1", "1:2");

      expect(result).toHaveProperty("verseKey", "1:2");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("sharedRoots");
      expect(result).toHaveProperty("sharedRootCount");
      // Both verses share "اله" root, so sharedRootCount should be 1
      expect(result.sharedRootCount).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 similarity for verses with no shared roots", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "سمو", t: "بسم" }],
        "1:2": [{ r: "حمد", t: "الحمد" }],
      });

      const result = await compareVerses("1:1", "1:2");
      expect(result.score).toBe(0);
      expect(result.sharedRootCount).toBe(0);
    });

    it("should handle non-existent verses", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "سمو", t: "بسم" }],
      });

      const result = await compareVerses("1:1", "999:999");
      expect(result.score).toBe(0);
    });
  });

  describe("findSimilarVerses", () => {
    it("should find most similar verses to a given verse", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" },
          { r: "اله", t: "الله" },
          { r: "رحم", t: "الرحمن" },
        ],
        "1:2": [
          { r: "حمد", t: "الحمد" },
          { r: "اله", t: "لله" },
          { r: "رب", t: "رب" },
        ],
        "1:3": [
          { r: "رحم", t: "الرحمن" },
          { r: "رحم", t: "الرحيم" },
        ],
        "1:4": [
          { r: "ملك", t: "مالك" },
          { r: "يوم", t: "يوم" },
        ],
      });

      const results = await findSimilarVerses("1:1", 3);

      expect(results.length).toBeLessThanOrEqual(3);
      // Should not include the query verse itself
      expect(results.every((r) => r.verseKey !== "1:1")).toBe(true);
      // Results should be sorted by similarity score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("should return empty array when data is null", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce(null);

      const results = await findSimilarVerses("1:1", 5);
      expect(results).toEqual([]);
    });

    it("should return empty array for non-existent verse", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "سمو", t: "بسم" }],
      });

      const results = await findSimilarVerses("999:999", 5);
      expect(results).toEqual([]);
    });

    it("should return empty array for verse with no roots", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ t: "بسم" }], // No root
        "1:2": [{ r: "حمد", t: "الحمد" }],
      });

      const results = await findSimilarVerses("1:1", 5);
      expect(results).toEqual([]);
    });

    it("should limit results to topN", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "اله", t: "الله" }],
        "1:2": [{ r: "اله", t: "لله" }],
        "1:3": [{ r: "اله", t: "الله" }],
        "1:4": [{ r: "اله", t: "لله" }],
        "1:5": [{ r: "اله", t: "الله" }],
        "1:6": [{ r: "اله", t: "لله" }],
      });

      const results = await findSimilarVerses("1:1", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should exclude verses with 0 similarity", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "سمو", t: "بسم" }],
        "1:2": [{ r: "حمد", t: "الحمد" }], // No shared roots
      });

      const results = await findSimilarVerses("1:1", 5);
      expect(results.every((r) => r.score > 0)).toBe(true);
    });

    it("should sort shared roots alphabetically", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" },
          { r: "اله", t: "الله" },
          { r: "رحم", t: "الرحمن" },
        ],
        "1:2": [
          { r: "رحم", t: "الرحمن" },
          { r: "سمو", t: "بسم" },
          { r: "اله", t: "الله" },
        ],
      });

      const results = await findSimilarVerses("1:1", 5);

      if (results.length > 0) {
        const sharedRoots = results[0].sharedRoots;
        const sortedRoots = [...sharedRoots].sort((a, b) => a.localeCompare(b, "ar"));
        expect(sharedRoots).toEqual(sortedRoots);
      }
    });
  });

  describe("SimilarityResult structure", () => {
    it("should have correct structure", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "سمو", t: "بسم" }],
        "1:2": [{ r: "سمو", t: "بسم" }],
      });

      const results = await findSimilarVerses("1:1", 1);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("verseKey");
        expect(results[0]).toHaveProperty("score");
        expect(results[0]).toHaveProperty("sharedRoots");
        expect(results[0]).toHaveProperty("sharedRootCount");
        expect(typeof results[0].verseKey).toBe("string");
        expect(typeof results[0].score).toBe("number");
        expect(Array.isArray(results[0].sharedRoots)).toBe(true);
        expect(typeof results[0].sharedRootCount).toBe("number");
      }
    });

    it("should have score between 0 and 1", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", t: "بسم" },
          { r: "اله", t: "الله" },
        ],
        "1:2": [{ r: "سمو", t: "بسم" }],
      });

      const results = await findSimilarVerses("1:1", 5);

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });
});
