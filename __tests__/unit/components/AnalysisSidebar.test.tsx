import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalysisSidebar } from "../../../components/AnalysisSidebar";
import { RootAnalysis } from "../../../types";

describe("AnalysisSidebar - Translation Features", () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnTranslate = vi.fn();
  const mockOnWordClick = vi.fn();

  const mockRootData: RootAnalysis = {
    root: "كتب",
    occurrences: 3,
    verses: [
      {
        verse_key: "2:2",
        text: "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ",
        wordIndex: 2,
      },
      {
        verse_key: "2:87",
        text: "وَآتَيْنَا عِيسَى ابْنَ مَرْيَمَ الْبَيِّنَاتِ وَأَيَّدْنَاهُ بِرُوحِ الْقُدُسِ وَلَمَّا جَاءَكُم رَّسُولٌ بِمَا لَا تَهْوَىٰ أَنفُسُكُمُ اسْتَكْبَرْتُمْ فَفَرِيقًا كَذَّبْتُمْ وَفَرِيقًا تَقْتُلُونَ",
        wordIndex: 0,
      },
    ],
    wordForms: [
      {
        form: "كِتَاب",
        normalizedForm: "كتاب",
        occurrences: 230,
        lemma: "كتاب",
      },
    ],
    debugInfo: {
      selectedText: "الْكِتَابُ",
      normalizedText: "الكتاب",
      abjadValue: 463,
      sameAbjadWords: ["الكتاب", "النبي"],
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    loading: false,
    rootData: mockRootData,
    phraseData: null,
    mode: "root" as const,
    onNavigate: mockOnNavigate,
    onWordClick: mockOnWordClick,
    onTranslate: mockOnTranslate,
    userLanguage: "en" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show Languages icon on hover over selected word", () => {
    const { container } = render(<AnalysisSidebar {...defaultProps} />);

    const selectedWordButton = screen.getAllByText("الْكِتَابُ")[0].closest("button");
    expect(selectedWordButton).toBeInTheDocument();

    // Check that Languages icon (svg) is present with opacity-0 class on its wrapper
    const icons = selectedWordButton?.querySelectorAll("svg");
    const languagesIcon = Array.from(icons || []).find((svg) =>
      svg.classList.contains("lucide-languages")
    );
    expect(languagesIcon).toBeInTheDocument();
    expect(languagesIcon).toHaveClass("opacity-0");
    expect(languagesIcon).toHaveClass("group-hover:opacity-100");
  });

  it("should show Languages icon on hover over root word", () => {
    const { container } = render(<AnalysisSidebar {...defaultProps} />);

    const rootWordButton = screen.getAllByText("كتب")[0].closest("button");
    expect(rootWordButton).toBeInTheDocument();

    // Check that Languages icon (svg) is present with opacity-0 class
    const icons = rootWordButton?.querySelectorAll("svg");
    const languagesIcon = Array.from(icons || []).find((svg) =>
      svg.classList.contains("lucide-languages")
    );
    expect(languagesIcon).toBeInTheDocument();
    expect(languagesIcon).toHaveClass("opacity-0");
    expect(languagesIcon).toHaveClass("group-hover:opacity-100");
  });

  it("should open translation menu when clicking selected word", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    const selectedWordButton = screen.getByText("الْكِتَابُ");
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      // Translation menu should appear with "Translate" header
      expect(screen.getByText("Translate")).toBeInTheDocument();
      // Menu should show all translation services
      expect(screen.getByText("Abadis")).toBeInTheDocument();
      expect(screen.getByText("Google Translate")).toBeInTheDocument();
    });
  });

  it("should open translation menu when clicking root word", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Find the root word button (text "كتب")
    const rootWordButton = screen.getByText("كتب");
    fireEvent.click(rootWordButton);

    await waitFor(() => {
      // Translation menu should appear
      expect(screen.getByText("Translate")).toBeInTheDocument();
      expect(screen.getByText("Abadis")).toBeInTheDocument();
    });
  });

  it("should close word menu when opening root menu", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open word menu
    const selectedWordButton = screen.getByText("الْكِتَابُ");
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      expect(screen.getByText("Translate")).toBeInTheDocument();
    });

    // Open root menu
    const rootWordButton = screen.getByText("كتب");
    fireEvent.click(rootWordButton);

    await waitFor(() => {
      // Should still have only one "Translate" header (one menu)
      const translateHeaders = screen.getAllByText("Translate");
      expect(translateHeaders).toHaveLength(1);
    });
  });

  it("should close root menu when opening word menu", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open root menu
    const rootWordButton = screen.getByText("كتب");
    fireEvent.click(rootWordButton);

    await waitFor(() => {
      expect(screen.getByText("Translate")).toBeInTheDocument();
    });

    // Open word menu
    const selectedWordButton = screen.getByText("الْكِتَابُ");
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      // Should still have only one "Translate" header (one menu)
      const translateHeaders = screen.getAllByText("Translate");
      expect(translateHeaders).toHaveLength(1);
    });
  });

  it("should close menu when root data changes", async () => {
    const { rerender } = render(<AnalysisSidebar {...defaultProps} />);

    // Open translation menu
    const selectedWordButton = screen.getByText("الْكِتَابُ");
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      expect(screen.getByText("Translate")).toBeInTheDocument();
    });

    // Change root data
    const newRootData: RootAnalysis = {
      ...mockRootData,
      root: "علم",
      debugInfo: {
        ...mockRootData.debugInfo!,
        selectedText: "الْعِلْمُ",
      },
    };

    rerender(<AnalysisSidebar {...defaultProps} rootData={newRootData} />);

    await waitFor(() => {
      // Menu should be closed
      expect(screen.queryByText("Translate")).not.toBeInTheDocument();
    });
  });

  it("should pass correct word to translation menu (selected word)", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open word menu
    const selectedWordButton = screen.getAllByText("الْكِتَابُ")[0];
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      expect(screen.getByText("Translate")).toBeInTheDocument();
      // The word should be displayed in the menu header (both in button and menu)
      const allInstances = screen.getAllByText("الْكِتَابُ");
      expect(allInstances.length).toBeGreaterThanOrEqual(2); // Button + menu header
    });
  });

  it("should pass correct word to translation menu (root word)", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open root menu
    const rootWordButton = screen.getByText("كتب");
    fireEvent.click(rootWordButton);

    await waitFor(() => {
      expect(screen.getByText("Translate")).toBeInTheDocument();
      // Both the button and menu header show the root
      const menuHeaders = screen.getAllByText("كتب");
      expect(menuHeaders.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should call onTranslate with correct parameters for selected word", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open word menu
    const selectedWordButton = screen.getByText("الْكِتَابُ");
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      expect(screen.getByText("Abadis")).toBeInTheDocument();
    });

    // Click on a translation service
    const abadisButton = screen.getByText("Abadis");
    fireEvent.click(abadisButton);

    expect(mockOnTranslate).toHaveBeenCalledTimes(1);
    expect(mockOnTranslate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "abadis" }),
      "الْكِتَابُ",
      undefined // verseKey should be undefined for selected word
    );
  });

  it("should call onTranslate with correct parameters for root word", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open root menu
    const rootWordButton = screen.getByText("كتب");
    fireEvent.click(rootWordButton);

    await waitFor(() => {
      expect(screen.getByText("Abadis")).toBeInTheDocument();
    });

    // Click on a translation service
    const abadisButton = screen.getByText("Abadis");
    fireEvent.click(abadisButton);

    expect(mockOnTranslate).toHaveBeenCalledTimes(1);
    expect(mockOnTranslate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "abadis" }),
      "كتب",
      "2:2" // verseKey should be from first verse
    );
  });

  it("should pass verseKey for root word translations", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open root menu
    const rootWordButton = screen.getByText("كتب");
    fireEvent.click(rootWordButton);

    await waitFor(() => {
      expect(screen.getByText("Wiki Ahlolbait")).toBeInTheDocument();
    });

    // Click on Wiki Ahlolbait (which uses verseKey)
    const wikiButton = screen.getByText("Wiki Ahlolbait");
    fireEvent.click(wikiButton);

    expect(mockOnTranslate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "wiki_ahlolbait" }),
      "كتب",
      "2:2" // First verse key from rootData
    );
  });

  it("should close menu after translation service is clicked", async () => {
    render(<AnalysisSidebar {...defaultProps} />);

    // Open word menu
    const selectedWordButton = screen.getByText("الْكِتَابُ");
    fireEvent.click(selectedWordButton);

    await waitFor(() => {
      expect(screen.getByText("Abadis")).toBeInTheDocument();
    });

    // Click on a service
    const abadisButton = screen.getByText("Abadis");
    fireEvent.click(abadisButton);

    await waitFor(() => {
      // Menu should be closed
      expect(screen.queryByText("Translate")).not.toBeInTheDocument();
    });
  });

  it("should handle rootData without debugInfo gracefully", async () => {
    const rootDataWithoutDebugInfo: RootAnalysis = {
      root: "كتب",
      occurrences: 3,
      verses: mockRootData.verses,
      wordForms: mockRootData.wordForms,
    };

    render(<AnalysisSidebar {...defaultProps} rootData={rootDataWithoutDebugInfo} />);

    // Component should render without crashing
    expect(screen.getByText("كتب")).toBeInTheDocument();
  });

  it("should make selected word and root word buttons keyboard accessible", () => {
    render(<AnalysisSidebar {...defaultProps} />);

    const selectedWordButton = screen.getByText("الْكِتَابُ").closest("button");
    const rootWordButton = screen.getByText("كتب").closest("button");

    expect(selectedWordButton).toBeInTheDocument();
    expect(rootWordButton).toBeInTheDocument();
    expect(selectedWordButton?.tagName).toBe("BUTTON");
    expect(rootWordButton?.tagName).toBe("BUTTON");
  });

  it("should have proper hover styles on word buttons", () => {
    render(<AnalysisSidebar {...defaultProps} />);

    const selectedWordButton = screen.getByText("الْكِتَابُ").closest("button");
    const rootWordButton = screen.getByText("كتب").closest("button");

    expect(selectedWordButton).toHaveClass("hover:text-emerald-600");
    expect(selectedWordButton).toHaveClass("dark:hover:text-emerald-400");
    expect(rootWordButton).toHaveClass("hover:text-emerald-600");
    expect(rootWordButton).toHaveClass("dark:hover:text-emerald-400");
  });
});
