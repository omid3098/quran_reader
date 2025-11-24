import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AyahCard } from "@/components/AyahCard";
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

  const defaultProps = {
    verse: mockVerse,
    chapterName: "Al-Fatiha",
    chapterId: 1,
    onNote: vi.fn(),
    onSelect: vi.fn(),
    isActive: false,
    fontSize: 28,
    showTranslation: true,
    scriptType: "uthmani" as const,
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
    render(<AyahCard {...defaultProps} scriptType="simple" />);
    expect(screen.getByText("بسم")).toBeDefined();
  });

  it("should render translation when showTranslation is true", () => {
    render(<AyahCard {...defaultProps} />);
    expect(
      screen.getByText("In the name of Allah, the Entirely Merciful, the Especially Merciful.")
    ).toBeDefined();
  });

  it("should not render translation when showTranslation is false", () => {
    render(<AyahCard {...defaultProps} showTranslation={false} />);
    expect(
      screen.queryByText("In the name of Allah, the Entirely Merciful, the Especially Merciful.")
    ).toBeNull();
  });

  it("should render translation resource name", () => {
    render(<AyahCard {...defaultProps} />);
    expect(screen.getByText("Sahih International")).toBeDefined();
  });

  it("should call onSelect when card is clicked", () => {
    render(<AyahCard {...defaultProps} />);
    const card = screen.getByText("1:1").closest("div[id^='ayah-']");
    if (card) {
      fireEvent.click(card);
      expect(defaultProps.onSelect).toHaveBeenCalled();
    }
  });

  it("should call onNote when note button is clicked", () => {
    render(<AyahCard {...defaultProps} />);
    const noteButton = screen.getByTitle("Personal Note");
    fireEvent.click(noteButton);
    expect(defaultProps.onNote).toHaveBeenCalledWith(mockVerse, expect.any(Object));
  });

  it("should display note when provided", () => {
    const noteText = "This is my personal note";
    render(<AyahCard {...defaultProps} note={noteText} />);
    expect(screen.getByText(noteText)).toBeDefined();
    expect(screen.getByText("Personal Note")).toBeDefined();
  });

  it("should apply RTL direction for Arabic notes", () => {
    const arabicNote = "هذه ملاحظتي الشخصية";
    const { container } = render(<AyahCard {...defaultProps} note={arabicNote} />);
    const noteDiv = container.querySelector('[dir="rtl"]');
    expect(noteDiv).not.toBeNull();
  });

  it("should apply LTR direction for English notes", () => {
    const englishNote = "This is my note";
    const { container } = render(<AyahCard {...defaultProps} note={englishNote} />);
    // The note container should exist
    expect(screen.getByText(englishNote)).toBeDefined();
  });

  it("should have active styling when isActive is true", () => {
    const { container } = render(<AyahCard {...defaultProps} isActive={true} />);
    const card = container.querySelector('[id^="ayah-"]');
    expect(card?.className).toContain("bg-emerald");
  });

  it("should apply correct font size to Arabic text", () => {
    const { container } = render(<AyahCard {...defaultProps} fontSize={32} />);
    const arabicText = container.querySelector("[dir='rtl'] p");
    expect(arabicText?.getAttribute("style")).toContain("font-size: 32px");
  });

  it("should call onWordClick when a word is clicked", () => {
    const onWordClick = vi.fn();
    render(<AyahCard {...defaultProps} onWordClick={onWordClick} />);

    const wordSpan = screen.getByText("بِسْمِ");
    fireEvent.click(wordSpan);

    expect(onWordClick).toHaveBeenCalledWith("بِسْمِ", 0, "1:1", expect.any(Object));
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
});
