import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const SAMPLE_KB = {
  _meta: { author: "omid", version: 1 },
  roots: {
    سوأ: { note: "حس آسیب‌رسانی", discoveredIn: "2:169" },
  },
  lemmas: {
    سُوء: { root: "سوأ", note: "هر عمل بد", discoveredIn: "2:169" },
  },
  connections: [],
  patterns: [],
};

function mockFetchKB() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(SAMPLE_KB),
  });
}

describe("knowledgeBaseService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.resetModules();
    // Clear localStorage mock
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe("getRootNote", () => {
    it("should return the note for an existing root", async () => {
      mockFetchKB();
      const { getRootNote } = await import("@/services/knowledgeBaseService");
      const note = await getRootNote("سوأ");
      expect(note).toBe("حس آسیب‌رسانی");
    });

    it("should return null for a non-existent root", async () => {
      mockFetchKB();
      const { getRootNote } = await import("@/services/knowledgeBaseService");
      const note = await getRootNote("ابت");
      expect(note).toBeNull();
    });
  });

  describe("getLemmaNote", () => {
    it("should return the note and root for an existing lemma", async () => {
      mockFetchKB();
      const { getLemmaNote } = await import("@/services/knowledgeBaseService");
      const result = await getLemmaNote("سُوء");
      expect(result).toEqual({ note: "هر عمل بد", root: "سوأ" });
    });

    it("should return null for a non-existent lemma", async () => {
      mockFetchKB();
      const { getLemmaNote } = await import("@/services/knowledgeBaseService");
      const result = await getLemmaNote("فعل");
      expect(result).toBeNull();
    });
  });

  describe("loadKnowledgeBase with localStorage", () => {
    it("should prefer localStorage data over static file", async () => {
      const localKB = {
        ...SAMPLE_KB,
        roots: { test: { note: "from localStorage" } },
      };
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify(localKB)
      );

      const { getRootNote } = await import("@/services/knowledgeBaseService");
      const note = await getRootNote("test");
      expect(note).toBe("from localStorage");
      // fetch should not have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("saveKnowledgeBase", () => {
    it("should save to localStorage", async () => {
      mockFetchKB();
      const { loadKnowledgeBase, saveKnowledgeBase } =
        await import("@/services/knowledgeBaseService");
      const kb = await loadKnowledgeBase();
      expect(kb).not.toBeNull();

      const modified = { ...kb!, roots: { ...kb!.roots, جدد: { note: "test note" } } };
      saveKnowledgeBase(modified);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "luminaKnowledgeBase",
        JSON.stringify(modified)
      );
    });
  });

  describe("saveRootNote", () => {
    it("should add a root note and persist to localStorage", async () => {
      mockFetchKB();
      const { saveRootNote, getRootNote } = await import("@/services/knowledgeBaseService");
      await saveRootNote("جدد", "تجدید و نو شدن", "2:1");
      const note = await getRootNote("جدد");
      expect(note).toBe("تجدید و نو شدن");
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it("should delete root note when saving empty string", async () => {
      mockFetchKB();
      const { saveRootNote, getRootNote } = await import("@/services/knowledgeBaseService");
      // Root "سوأ" exists in SAMPLE_KB
      await saveRootNote("سوأ", "");
      const note = await getRootNote("سوأ");
      expect(note).toBeNull();
    });

    it("should create KB from scratch if none exists", async () => {
      mockFetch.mockResolvedValue({ ok: false });
      const { saveRootNote, getRootNote } = await import("@/services/knowledgeBaseService");
      await saveRootNote("جدد", "new note");
      const note = await getRootNote("جدد");
      expect(note).toBe("new note");
    });
  });

  describe("saveLemmaNote", () => {
    it("should add a lemma note with root reference", async () => {
      mockFetchKB();
      const { saveLemmaNote, getLemmaNote } = await import("@/services/knowledgeBaseService");
      await saveLemmaNote("جَدِيد", "چیز نو", "جدد", "2:1");
      const result = await getLemmaNote("جَدِيد");
      expect(result).toEqual({ note: "چیز نو", root: "جدد" });
    });

    it("should delete lemma note when saving empty string", async () => {
      mockFetchKB();
      const { saveLemmaNote, getLemmaNote } = await import("@/services/knowledgeBaseService");
      await saveLemmaNote("سُوء", "");
      const result = await getLemmaNote("سُوء");
      expect(result).toBeNull();
    });
  });
});
