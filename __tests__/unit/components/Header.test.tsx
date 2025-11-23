import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/Header";
import type { Chapter } from "@/types";

describe("Header", () => {
  const mockChapters: Chapter[] = [
    {
      id: 1,
      revelation_place: "meccan",
      revelation_order: 5,
      bismillah_pre: false,
      name_simple: "Al-Fatiha",
      name_complex: "Al-Fatiha",
      name_arabic: "الفاتحة",
      verses_count: 7,
      translated_name: { language_name: "English", name: "The Opening" },
    },
    {
      id: 2,
      revelation_place: "medinan",
      revelation_order: 87,
      bismillah_pre: true,
      name_simple: "Al-Baqara",
      name_complex: "Al-Baqara",
      name_arabic: "البقرة",
      verses_count: 286,
      translated_name: { language_name: "English", name: "The Cow" },
    },
  ];

  const defaultProps = {
    chapters: mockChapters,
    currentChapter: mockChapters[0],
    onSelectChapter: vi.fn(),
    onOpenSearch: vi.fn(),
    onToggleSettings: vi.fn(),
    theme: "light" as const,
    onToggleTheme: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the header with brand name", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("Open Quran Reader")).toBeDefined();
  });

  it("should display current chapter name", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("1. Al-Fatiha")).toBeDefined();
  });

  it("should show 'Select Surah' when no chapter is selected", () => {
    render(<Header {...defaultProps} currentChapter={null} />);
    expect(screen.getByText("Select Surah")).toBeDefined();
  });

  it("should call onToggleSettings when menu button is clicked", () => {
    render(<Header {...defaultProps} />);
    const menuButton = screen.getByTitle("Menu");
    fireEvent.click(menuButton);
    expect(defaultProps.onToggleSettings).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenSearch when search button is clicked", () => {
    render(<Header {...defaultProps} />);
    const searchButton = screen.getByTitle("AI Search");
    fireEvent.click(searchButton);
    expect(defaultProps.onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it("should call onToggleTheme when theme button is clicked", () => {
    render(<Header {...defaultProps} />);
    const themeButton = screen.getByTitle("Switch to Dark Mode");
    fireEvent.click(themeButton);
    expect(defaultProps.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("should show correct theme toggle title for dark mode", () => {
    render(<Header {...defaultProps} theme="dark" />);
    expect(screen.getByTitle("Switch to Light Mode")).toBeDefined();
  });

  it("should open dropdown when chapter button is clicked", () => {
    render(<Header {...defaultProps} />);
    const chapterButton = screen.getByText("1. Al-Fatiha");
    fireEvent.click(chapterButton);
    expect(screen.getByPlaceholderText("Search Surah...")).toBeDefined();
  });

  it("should filter chapters based on search input", () => {
    render(<Header {...defaultProps} />);
    const chapterButton = screen.getByText("1. Al-Fatiha");
    fireEvent.click(chapterButton);

    const searchInput = screen.getByPlaceholderText("Search Surah...");
    fireEvent.change(searchInput, { target: { value: "Baqara" } });

    // Should show Al-Baqara in the dropdown
    expect(screen.getByText("Al-Baqara")).toBeDefined();
    // Al-Fatiha should be filtered out of the dropdown list
    // The button still shows "1. Al-Fatiha" so we check that there's no standalone "Al-Fatiha" text
    const dropdownItems = screen.queryAllByRole("button", { name: /Al-Fatiha$/ });
    // Only the main chapter selector button (which contains "1. Al-Fatiha") should match
    // The dropdown item with exact "Al-Fatiha" should be filtered out
    expect(dropdownItems.filter((btn) => btn.textContent === "Al-Fatiha")).toHaveLength(0);
  });

  it("should call onSelectChapter when a chapter is selected from dropdown", () => {
    render(<Header {...defaultProps} />);
    const chapterButton = screen.getByText("1. Al-Fatiha");
    fireEvent.click(chapterButton);

    const baqaraOption = screen.getByText("Al-Baqara");
    fireEvent.click(baqaraOption);

    expect(defaultProps.onSelectChapter).toHaveBeenCalledWith(2);
  });

  it("should filter chapters by ID number", () => {
    render(<Header {...defaultProps} />);
    const chapterButton = screen.getByText("1. Al-Fatiha");
    fireEvent.click(chapterButton);

    const searchInput = screen.getByPlaceholderText("Search Surah...");
    fireEvent.change(searchInput, { target: { value: "2" } });

    // Should show Al-Baqara (id: 2)
    expect(screen.getByText("Al-Baqara")).toBeDefined();
  });

  it("should filter chapters by translated name", () => {
    render(<Header {...defaultProps} />);
    const chapterButton = screen.getByText("1. Al-Fatiha");
    fireEvent.click(chapterButton);

    const searchInput = screen.getByPlaceholderText("Search Surah...");
    fireEvent.change(searchInput, { target: { value: "Cow" } });

    // Should show Al-Baqara (The Cow)
    expect(screen.getByText("Al-Baqara")).toBeDefined();
  });
});
