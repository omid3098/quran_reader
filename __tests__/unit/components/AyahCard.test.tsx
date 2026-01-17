import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AyahCard,
  AyahCardConfig,
  AyahCardCallbacks,
  AyahCardNavigation,
} from "@/components/AyahCard";
import type { Verse } from "@/types";

describe("AyahCard", () => {
  const mockVerse: Verse = {
    id: 1,
    verse_key: "1:1",
    text_uthmani: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    text_simple: "بسم الله الرحمن الرحيم",
    translations: [
      {
        id: "en.sahih",
        resource_id: "en.sahih",
        text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        direction: "ltr",
        resource_name: "Sahih International",
      },
    ],
  };

  const mockConfig: AyahCardConfig = {
    fontSize: 28,
    showTranslation: true,
    scriptType: "uthmani" as const,
  };

  const mockCallbacks: AyahCardCallbacks = {
    onNote: vi.fn(),
    onSelect: vi.fn(),
  };

  const mockNavigation: AyahCardNavigation = {};

  const defaultProps = {
    verse: mockVerse,
    chapterName: "Al-Fatiha",
    chapterId: 1,
    isActive: false,
    config: mockConfig,
    callbacks: mockCallbacks,
    navigation: mockNavigation,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the verse key", () => {
    render(<AyahCard {...defaultProps} />);
    expect(screen.getByText("1:1")).toBeDefined();
  });

  it("should render Arabic text in uthmani script by default", () => {
    render(<AyahCard {...defaultProps} />);
    // The text is split into words, so we check for part of it
    expect(screen.getByText("بِسْمِ")).toBeDefined();
  });

  it("should render Arabic text in simple script when specified", () => {
    const simpleConfig = { ...mockConfig, scriptType: "simple" as const };
    render(<AyahCard {...defaultProps} config={simpleConfig} />);
    expect(screen.getByText("بسم")).toBeDefined();
  });

  it("should render translation when showTranslation is true", () => {
    render(<AyahCard {...defaultProps} />);
    expect(
      screen.getByText("In the name of Allah, the Entirely Merciful, the Especially Merciful.")
    ).toBeDefined();
  });

  it("should not render translation when showTranslation is false", () => {
    const noTransConfig = { ...mockConfig, showTranslation: false };
    render(<AyahCard {...defaultProps} config={noTransConfig} />);
    expect(
      screen.queryByText("In the name of Allah, the Entirely Merciful, the Especially Merciful.")
    ).toBeNull();
  });

  it("should render translation resource name", () => {
    render(<AyahCard {...defaultProps} />);
    expect(screen.getByText("Sahih International")).toBeDefined();
  });

  it("should call onSelect with verseKey when card is clicked", () => {
    render(<AyahCard {...defaultProps} />);
    const card = screen.getByText("1:1").closest("div[id^='ayah-']");
    if (card) {
      fireEvent.click(card);
      expect(mockCallbacks.onSelect).toHaveBeenCalledWith("1:1");
    }
  });

  it("should call onNote when note button is clicked", () => {
    render(<AyahCard {...defaultProps} />);
    const noteButton = screen.getByTitle("Personal Note");
    fireEvent.click(noteButton);
    expect(mockCallbacks.onNote).toHaveBeenCalledWith(mockVerse, expect.any(Object));
  });

  it("should display note when provided", () => {
    const noteBlocks = [
      {
        type: "paragraph" as const,
        content: "This is my personal note",
      },
    ];
    render(<AyahCard {...defaultProps} noteBlocks={noteBlocks} />);
    expect(screen.getByText("Personal Note")).toBeDefined();
  });

  it("should render note with BlockNote editor", () => {
    const noteBlocks = [
      {
        type: "paragraph" as const,
        content: "Test note content",
      },
    ];
    const { container } = render(<AyahCard {...defaultProps} noteBlocks={noteBlocks} />);
    // Check that the note container exists with yellow styling
    const noteContainer = container.querySelector(".bg-yellow-50");
    expect(noteContainer).not.toBeNull();
  });

  it("should not display note when noteBlocks is empty", () => {
    const { container } = render(<AyahCard {...defaultProps} noteBlocks={[]} />);
    const noteContainer = container.querySelector(".bg-yellow-50");
    expect(noteContainer).toBeNull();
  });

  it("should have active styling when isActive is true", () => {
    const { container } = render(<AyahCard {...defaultProps} isActive={true} />);
    const card = container.querySelector('[id^="ayah-"]');
    expect(card?.className).toContain("bg-emerald");
  });

  it("should apply correct font size to Arabic text", () => {
    const customConfig = { ...mockConfig, fontSize: 32 };
    const { container } = render(<AyahCard {...defaultProps} config={customConfig} />);
    const arabicText = container.querySelector("[dir='rtl'] p");
    expect(arabicText?.getAttribute("style")).toContain("font-size: 32px");
  });

  it("should call onWordClick when a word is clicked on active verse", () => {
    const onWordClick = vi.fn();
    const callbacksWithWordClick = { ...mockCallbacks, onWordClick };
    render(<AyahCard {...defaultProps} isActive={true} callbacks={callbacksWithWordClick} />);

    const wordSpan = screen.getByText("بِسْمِ");
    fireEvent.click(wordSpan);

    expect(onWordClick).toHaveBeenCalledWith("بِسْمِ", 0, "1:1", expect.any(Object));
  });

  it("should not call onWordClick when a word is clicked on non-active verse", () => {
    const onWordClick = vi.fn();
    const callbacksWithWordClick = { ...mockCallbacks, onWordClick };
    render(<AyahCard {...defaultProps} isActive={false} callbacks={callbacksWithWordClick} />);

    const wordSpan = screen.getByText("بِسْمِ");
    fireEvent.click(wordSpan);

    expect(onWordClick).not.toHaveBeenCalled();
  });

  it("should handle multiple translations", () => {
    const verseWithMultipleTranslations: Verse = {
      ...mockVerse,
      translations: [
        {
          id: "en.sahih",
          resource_id: "en.sahih",
          text: "In the name of Allah",
          direction: "ltr",
          resource_name: "Sahih",
        },
        {
          id: "fa.fooladvand",
          resource_id: "fa.fooladvand",
          text: "به نام خداوند بخشنده مهربان",
          direction: "rtl",
          resource_name: "فولادوند",
        },
      ],
    };

    render(<AyahCard {...defaultProps} verse={verseWithMultipleTranslations} />);

    expect(screen.getByText("In the name of Allah")).toBeDefined();
    expect(screen.getByText("به نام خداوند بخشنده مهربان")).toBeDefined();
  });

  it("should strip HTML tags from translation text", () => {
    const verseWithHtmlTranslation: Verse = {
      ...mockVerse,
      translations: [
        {
          id: "test",
          resource_id: "test",
          text: "<p>Test <b>translation</b></p>",
          direction: "ltr",
          resource_name: "Test",
        },
      ],
    };

    render(<AyahCard {...defaultProps} verse={verseWithHtmlTranslation} />);
    expect(screen.getByText("Test translation")).toBeDefined();
  });

  it("should set correct element ID", () => {
    const { container } = render(<AyahCard {...defaultProps} />);
    const card = container.querySelector("#ayah-1-1");
    expect(card).not.toBeNull();
  });

  it("should call onBookmark with verseKey when bookmark button is clicked", () => {
    const onBookmark = vi.fn();
    const callbacksWithBookmark = { ...mockCallbacks, onBookmark };
    render(<AyahCard {...defaultProps} callbacks={callbacksWithBookmark} />);
    const bookmarkButton = screen.getByTitle("Set Bookmark");
    fireEvent.click(bookmarkButton);
    expect(onBookmark).toHaveBeenCalledWith("1:1");
  });
});
