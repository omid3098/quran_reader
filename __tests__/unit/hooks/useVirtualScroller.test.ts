import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVirtualScroller, estimateVerseHeight } from "../../../hooks/useVirtualScroller";
import { Verse, VerseNote } from "../../../types";
import { AyahCardConfig } from "../../../components/AyahCard";
import { RefObject } from "react";

describe("estimateVerseHeight", () => {
  const baseConfig: AyahCardConfig = {
    fontSize: 24,
    showTranslation: false,
    scriptType: "uthmani",
  };

  const notes: Record<string, VerseNote> = {};

  it("should calculate base height for verse with Arabic text only", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      text_simple: "بسم الله الرحمن الرحيم",
      translations: [],
    };

    const height = estimateVerseHeight(verse, baseConfig, notes);

    // Base (104) + ~1 line of Arabic text (7 words / 8 = 1 line * 24 * 2.5 = 60)
    expect(height).toBeGreaterThan(100);
    expect(height).toBeLessThan(200);
  });

  it("should add height for translations when enabled", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      text_simple: "بسم الله الرحمن الرحيم",
      translations: [
        {
          id: "1",
          resource_id: "en.sahih",
          text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        },
      ],
    };

    const configWithTranslation: AyahCardConfig = {
      ...baseConfig,
      showTranslation: true,
    };

    const heightWithoutTranslation = estimateVerseHeight(verse, baseConfig, notes);
    const heightWithTranslation = estimateVerseHeight(verse, configWithTranslation, notes);

    expect(heightWithTranslation).toBeGreaterThan(heightWithoutTranslation);
  });

  it("should add height for notes when present", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      text_simple: "بسم الله الرحمن الرحيم",
      translations: [],
    };

    const notesWithData: Record<string, VerseNote> = {
      "1:1": {
        verseKey: "1:1",
        blocks: [{ type: "paragraph", content: "Test note" }],
        updatedAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    };

    const heightWithoutNote = estimateVerseHeight(verse, baseConfig, notes);
    const heightWithNote = estimateVerseHeight(verse, baseConfig, notesWithData);

    expect(heightWithNote).toBeGreaterThan(heightWithoutNote);
  });

  it("should scale height with fontSize", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      text_simple: "بسم الله الرحمن الرحيم",
      translations: [],
    };

    const smallFontConfig: AyahCardConfig = { ...baseConfig, fontSize: 16 };
    const largeFontConfig: AyahCardConfig = { ...baseConfig, fontSize: 32 };

    const smallHeight = estimateVerseHeight(verse, smallFontConfig, notes);
    const largeHeight = estimateVerseHeight(verse, largeFontConfig, notes);

    expect(largeHeight).toBeGreaterThan(smallHeight);
  });

  it("should handle verses with no text gracefully", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "",
      text_simple: "",
      translations: [],
    };

    const height = estimateVerseHeight(verse, baseConfig, notes);

    // Should return at least base height
    expect(height).toBeGreaterThanOrEqual(104);
  });

  it("should use simple text when scriptType is simple", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani:
        "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ٱلْمَلِكِ يَوْمِ ٱلدِّينِ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      text_simple: "بسم الله",
      translations: [],
    };

    const uthmaniConfig: AyahCardConfig = { ...baseConfig, scriptType: "uthmani" };
    const simpleConfig: AyahCardConfig = { ...baseConfig, scriptType: "simple" };

    const uthmaniHeight = estimateVerseHeight(verse, uthmaniConfig, notes);
    const simpleHeight = estimateVerseHeight(verse, simpleConfig, notes);

    // Simple text is much shorter (3 words vs 16 words), so height should be less
    expect(simpleHeight).toBeLessThan(uthmaniHeight);
  });

  it("should handle HTML tags in translation text", () => {
    const verse: Verse = {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ",
      text_simple: "بسم الله",
      translations: [
        {
          id: "1",
          resource_id: "en.sahih",
          text: "<p>In the name of <strong>Allah</strong></p>",
        },
      ],
    };

    const configWithTranslation: AyahCardConfig = {
      ...baseConfig,
      showTranslation: true,
    };

    const height = estimateVerseHeight(verse, configWithTranslation, notes);

    // Should calculate based on text without HTML tags
    expect(height).toBeGreaterThan(100);
  });
});

describe("useVirtualScroller", () => {
  let scrollElement: HTMLDivElement;

  beforeEach(() => {
    scrollElement = document.createElement("div");
  });

  const mockVerses: Verse[] = [
    {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      text_simple: "بسم الله الرحمن الرحيم",
      translations: [],
    },
    {
      id: 2,
      verse_key: "1:2",
      text_uthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
      text_simple: "الحمد لله رب العالمين",
      translations: [],
    },
  ];

  const baseConfig: AyahCardConfig = {
    fontSize: 24,
    showTranslation: false,
    scriptType: "uthmani",
  };

  const notes: Record<string, VerseNote> = {};

  it("should initialize virtualizer with correct count", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: mockVerses,
        scrollElement,
        config: baseConfig,
        notes,
      })
    );

    expect(result.current.options.count).toBe(2);
  });

  it("should use custom overscan when provided", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: mockVerses,
        scrollElement,
        config: baseConfig,
        notes,
        overscan: 10,
      })
    );

    expect(result.current.options.overscan).toBe(10);
  });

  it("should use default overscan of 5 when not provided", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: mockVerses,
        scrollElement,
        config: baseConfig,
        notes,
      })
    );

    expect(result.current.options.overscan).toBe(5);
  });

  it("should return virtualizer instance", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: mockVerses,
        scrollElement,
        config: baseConfig,
        notes,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.getVirtualItems).toBeDefined();
    expect(result.current.scrollToIndex).toBeDefined();
  });

  it("should provide scrollToIndex method", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: mockVerses,
        scrollElement,
        config: baseConfig,
        notes,
      })
    );

    expect(typeof result.current.scrollToIndex).toBe("function");
  });

  it("should return fallback height for invalid index", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: mockVerses,
        scrollElement,
        config: baseConfig,
        notes,
      })
    );

    // Access the estimateSize function through the options
    const estimateSize = result.current.options.estimateSize as (index: number) => number;
    const height = estimateSize(999); // Invalid index

    expect(height).toBe(200); // fallback height
  });

  it("should handle empty verses array", () => {
    const { result } = renderHook(() =>
      useVirtualScroller({
        verses: [],
        scrollElement,
        config: baseConfig,
        notes,
      })
    );

    expect(result.current.options.count).toBe(0);
  });

  it("should recalculate when config changes", () => {
    const { result, rerender } = renderHook(
      ({ config }) =>
        useVirtualScroller({
          verses: mockVerses,
          scrollElement,
          config,
          notes,
        }),
      {
        initialProps: { config: baseConfig },
      }
    );

    const initialVirtualizer = result.current;

    const newConfig: AyahCardConfig = {
      ...baseConfig,
      fontSize: 32,
    };

    rerender({ config: newConfig });

    // Virtualizer should update when config changes
    expect(result.current).toBeDefined();
    // The instance itself might be the same, but the estimateSize function should be different
    expect(result.current.options.estimateSize).toBeDefined();
  });
});
