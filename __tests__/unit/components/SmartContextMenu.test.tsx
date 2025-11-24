import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SmartContextMenu } from "@/components/SmartContextMenu";
import { SelectionContext } from "@/types";

// Mock the analysisService
vi.mock("@/services/analysisService", () => ({
  calculateAbjad: vi.fn(() => 42),
}));

describe("SmartContextMenu", () => {
  const mockContext: SelectionContext = {
    text: "كتاب",
    verseKey: "1:1",
    rect: new DOMRect(100, 100, 50, 20),
    type: "single",
    wordIndex: 0,
  };

  const defaultProps = {
    context: mockContext,
    onClose: vi.fn(),
    onAnalyzeRoot: vi.fn(),
    onSearchPhrase: vi.fn(),
    onCopy: vi.fn(),
    onTranslate: vi.fn(),
    userLanguage: "en" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the selected text", () => {
    render(<SmartContextMenu {...defaultProps} />);
    expect(screen.getByText("كتاب")).toBeInTheDocument();
  });

  it("should show Analyze button for single word selection", () => {
    render(<SmartContextMenu {...defaultProps} />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("should show Search Phrase button for phrase selection", () => {
    const phraseContext: SelectionContext = {
      ...mockContext,
      type: "phrase",
      text: "بسم الله",
    };
    render(<SmartContextMenu {...defaultProps} context={phraseContext} />);
    expect(screen.getByText("Search Phrase")).toBeInTheDocument();
  });

  describe("Translation buttons", () => {
    it("should show Google Translate for any language", () => {
      render(<SmartContextMenu {...defaultProps} userLanguage="en" />);
      expect(screen.getByText("Google Translate")).toBeInTheDocument();
    });

    it("should show Vajehyab only for Persian users", () => {
      const { rerender } = render(<SmartContextMenu {...defaultProps} userLanguage="fa" />);
      expect(screen.getByText("Vajehyab")).toBeInTheDocument();

      rerender(<SmartContextMenu {...defaultProps} userLanguage="en" />);
      expect(screen.queryByText("Vajehyab")).not.toBeInTheDocument();
    });

    it("should show Almaany for supported languages", () => {
      const { rerender } = render(<SmartContextMenu {...defaultProps} userLanguage="en" />);
      expect(screen.getByText("Almaany")).toBeInTheDocument();

      rerender(<SmartContextMenu {...defaultProps} userLanguage="fa" />);
      expect(screen.getByText("Almaany")).toBeInTheDocument();
    });

    it("should call onTranslate with correct service when translation button clicked", () => {
      render(<SmartContextMenu {...defaultProps} userLanguage="en" />);

      const googleButton = screen.getByText("Google Translate");
      fireEvent.click(googleButton);

      expect(defaultProps.onTranslate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "google" }),
        "كتاب"
      );
    });

    it("should NOT show translation buttons for phrase selection", () => {
      const phraseContext: SelectionContext = {
        ...mockContext,
        type: "phrase",
        text: "بسم الله",
      };
      render(<SmartContextMenu {...defaultProps} context={phraseContext} />);

      // Translation buttons should not appear for phrases
      expect(screen.queryByText("Google Translate")).not.toBeInTheDocument();
      expect(screen.queryByText("Vajehyab")).not.toBeInTheDocument();
    });
  });

  it("should call onCopy when Copy button is clicked", () => {
    render(<SmartContextMenu {...defaultProps} />);
    const copyButton = screen.getByText("Copy with Citation");
    fireEvent.click(copyButton);
    expect(defaultProps.onCopy).toHaveBeenCalled();
  });

  it("should call onAnalyzeRoot when Analyze button is clicked", () => {
    render(<SmartContextMenu {...defaultProps} />);
    const analyzeButton = screen.getByText("Analyze");
    fireEvent.click(analyzeButton);
    expect(defaultProps.onAnalyzeRoot).toHaveBeenCalled();
  });
});
