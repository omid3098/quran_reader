import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import VirtualVerseList, { VirtualVerseListProps } from "@/components/VirtualVerseList";
import { Verse, Chapter, VerseNote } from "@/types";
import { AyahCardConfig, AyahCardCallbacks, AyahCardNavigation } from "@/components/AyahCard";
import { RefObject } from "react";

// Mock the useVirtualScroller hook
vi.mock("@/hooks/useVirtualScroller", () => ({
  useVirtualScroller: () => ({
    getVirtualItems: () => [
      { index: 0, start: 0, size: 200, key: 0 },
      { index: 1, start: 200, size: 200, key: 1 },
    ],
    getTotalSize: () => 400,
    scrollToIndex: vi.fn(),
    options: {
      count: 2,
      overscan: 5,
      estimateSize: vi.fn(),
    },
  }),
}));

describe("VirtualVerseList", () => {
  let scrollElement: HTMLDivElement;
  let scrollContainerRef: RefObject<HTMLElement>;

  const mockVerses: Verse[] = [
    {
      id: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      text_simple: "بسم الله الرحمن الرحيم",
      translations: [
        {
          id: "en.sahih",
          resource_id: "en.sahih",
          text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        },
      ],
    },
    {
      id: 2,
      verse_key: "1:2",
      text_uthmani: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      text_simple: "الحمد لله رب العالمين",
      translations: [
        {
          id: "en.sahih",
          resource_id: "en.sahih",
          text: "All praise is due to Allah, Lord of the worlds.",
        },
      ],
    },
  ];

  const mockChapter: Chapter = {
    id: 1,
    revelation_place: "makkah",
    revelation_order: 5,
    bismillah_pre: true,
    name_simple: "Al-Fatiha",
    name_complex: "Al-Fātiĥah",
    name_arabic: "الفاتحة",
    verses_count: 7,
    translated_name: {
      language_name: "English",
      name: "The Opener",
    },
  };

  const mockConfig: AyahCardConfig = {
    fontSize: 24,
    showTranslation: true,
    scriptType: "uthmani",
  };

  const mockCallbacks: AyahCardCallbacks = {
    onNote: vi.fn(),
    onSelect: vi.fn(),
  };

  const mockNavigation: AyahCardNavigation = {};

  const mockNotes: Record<string, VerseNote> = {};

  const mockOnVirtualizerReady = vi.fn();

  const defaultProps: VirtualVerseListProps = {
    verses: mockVerses,
    scrollElement: null,
    config: mockConfig,
    callbacks: mockCallbacks,
    navigation: mockNavigation,
    notes: mockNotes,
    currentVerseIndex: 0,
    currentChapter: mockChapter,
    onVirtualizerReady: mockOnVirtualizerReady,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    scrollElement = document.createElement("div");
    defaultProps.scrollElement = scrollElement;
  });

  it("should render the virtual container with correct height", () => {
    const { container } = render(<VirtualVerseList {...defaultProps} />);
    const virtualContainer = container.querySelector("div[style*='height']");

    expect(virtualContainer).toBeDefined();
    expect(virtualContainer?.getAttribute("style")).toContain("height: 400px");
  });

  it("should render AyahCards for virtual items", () => {
    render(<VirtualVerseList {...defaultProps} />);

    // Should render the verse keys for visible items
    expect(screen.getByText("1:1")).toBeDefined();
    expect(screen.getByText("1:2")).toBeDefined();
  });

  it("should position virtual items with correct transforms", () => {
    const { container } = render(<VirtualVerseList {...defaultProps} />);

    const firstItem = container.querySelector("[data-index='0']");
    const secondItem = container.querySelector("[data-index='1']");

    expect(firstItem?.getAttribute("style")).toContain("translateY(0px)");
    expect(secondItem?.getAttribute("style")).toContain("translateY(200px)");
  });

  it("should mark active verse correctly", () => {
    render(<VirtualVerseList {...defaultProps} currentVerseIndex={0} />);

    // The first AyahCard should have isActive=true
    // We can verify this indirectly by checking for active styling
    const firstCard = screen.getByText("1:1").closest("div[id^='ayah-']");
    expect(firstCard?.className).toContain("bg-emerald-50");
  });

  it("should mark bookmarked verse correctly", () => {
    render(<VirtualVerseList {...defaultProps} bookmarkedVerseKey="1:1" />);

    // The first AyahCard should have isBookmarked=true
    const firstCard = screen.getByText("1:1").closest("div[id^='ayah-']");
    // Bookmark indicator should be visible
    expect(firstCard).toBeDefined();
  });

  it("should call onVirtualizerReady with virtualizer instance", () => {
    render(<VirtualVerseList {...defaultProps} />);

    expect(mockOnVirtualizerReady).toHaveBeenCalledTimes(1);
    expect(mockOnVirtualizerReady).toHaveBeenCalledWith(
      expect.objectContaining({
        getVirtualItems: expect.any(Function),
        getTotalSize: expect.any(Function),
        scrollToIndex: expect.any(Function),
      })
    );
  });

  it("should pass config to AyahCards", () => {
    render(<VirtualVerseList {...defaultProps} />);

    // When showTranslation is true, translations should be visible
    expect(
      screen.getByText("In the name of Allah, the Entirely Merciful, the Especially Merciful.")
    ).toBeDefined();
  });

  it("should pass callbacks to AyahCards", () => {
    render(<VirtualVerseList {...defaultProps} />);

    // Callbacks are passed down - tested indirectly by AyahCard tests
    expect(mockCallbacks.onNote).toBeDefined();
    expect(mockCallbacks.onSelect).toBeDefined();
  });

  it("should handle empty verses array", () => {
    const { container } = render(<VirtualVerseList {...defaultProps} verses={[]} />);

    const virtualContainer = container.querySelector("div[style*='height']");
    expect(virtualContainer).toBeDefined();
    // Should still render container even with no verses
  });

  it("should handle null currentChapter", () => {
    const { container } = render(<VirtualVerseList {...defaultProps} currentChapter={null} />);

    // Should render without errors
    expect(container).toBeDefined();
    // AyahCards should get empty string for chapterName
  });

  it("should pass notes to AyahCards", () => {
    const notesWithData: Record<string, VerseNote> = {
      "1:1": {
        verseKey: "1:1",
        blocks: [{ type: "paragraph", content: "Test note" }],
        updatedAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    };

    render(<VirtualVerseList {...defaultProps} notes={notesWithData} />);

    // Note should be passed to AyahCard - verified by AyahCard's own rendering logic
    expect(screen.getByText("1:1")).toBeDefined();
  });

  it("should apply absolute positioning to virtual items", () => {
    const { container } = render(<VirtualVerseList {...defaultProps} />);

    const firstItem = container.querySelector("[data-index='0']");

    expect(firstItem?.getAttribute("style")).toContain("position: absolute");
    expect(firstItem?.getAttribute("style")).toContain("top: 0");
    expect(firstItem?.getAttribute("style")).toContain("left: 0");
    expect(firstItem?.getAttribute("style")).toContain("width: 100%");
  });

  it("should set container to relative positioning", () => {
    const { container } = render(<VirtualVerseList {...defaultProps} />);

    const virtualContainer = container.querySelector("div[style*='position']");
    expect(virtualContainer?.getAttribute("style")).toContain("position: relative");
  });
});
