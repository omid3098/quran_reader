import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchQuran, explainAyah } from "@/services/geminiService";

// Mock the @google/genai module
vi.mock("@google/genai", () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      INTEGER: "INTEGER",
      STRING: "STRING",
    },
    __mockGenerateContent: mockGenerateContent,
  };
});

// Get the mock function
const getMockGenerateContent = async () => {
  const mod = await import("@google/genai");
  return (mod as unknown as { __mockGenerateContent: ReturnType<typeof vi.fn> })
    .__mockGenerateContent;
};

describe("geminiService", () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockGenerateContent = await getMockGenerateContent();
    mockGenerateContent.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("searchQuran", () => {
    it("should return search results for valid query", async () => {
      const mockResults = {
        results: [
          { surah: 1, ayah: 1, context: "Opening verse of Quran" },
          { surah: 2, ayah: 255, context: "Ayatul Kursi - throne verse" },
        ],
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResults),
      });

      const results = await searchQuran("mercy and forgiveness");

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        surah: 1,
        ayah: 1,
        context: "Opening verse of Quran",
      });
    });

    it("should handle JSON with markdown code fences", async () => {
      const mockResults = {
        results: [{ surah: 1, ayah: 1, context: "Test context" }],
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: "```json\n" + JSON.stringify(mockResults) + "\n```",
      });

      const results = await searchQuran("test query");

      expect(results).toHaveLength(1);
    });

    it("should return empty array when response text is empty", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "",
      });

      const results = await searchQuran("test query");
      expect(results).toEqual([]);
    });

    it("should return empty array when response text is null", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: null,
      });

      const results = await searchQuran("test query");
      expect(results).toEqual([]);
    });

    it("should return empty array on API error", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));

      const results = await searchQuran("test query");
      expect(results).toEqual([]);
    });

    it("should return empty array for malformed JSON", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "not valid json",
      });

      const results = await searchQuran("test query");
      expect(results).toEqual([]);
    });

    it("should handle response without results key", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ data: [] }),
      });

      const results = await searchQuran("test query");
      expect(results).toEqual([]);
    });
  });

  describe("explainAyah", () => {
    it("should return explanation for valid verse", async () => {
      const mockExplanation = "This verse emphasizes the importance of gratitude to Allah.";

      mockGenerateContent.mockResolvedValueOnce({
        text: mockExplanation,
      });

      const result = await explainAyah("Al-Fatiha", 1, 2, "Praise be to Allah");

      expect(result).toBe(mockExplanation);
    });

    it("should return default message when response is empty", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "",
      });

      const result = await explainAyah("Al-Fatiha", 1, 1, "test");
      expect(result).toBe("Could not generate explanation.");
    });

    it("should return error message on API error", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));

      const result = await explainAyah("Al-Fatiha", 1, 1, "test");
      expect(result).toBe("Sorry, I couldn't fetch the explanation at this time.");
    });

    it("should handle null response text", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: null,
      });

      const result = await explainAyah("Al-Fatiha", 1, 1, "test");
      expect(result).toBe("Could not generate explanation.");
    });
  });
});
