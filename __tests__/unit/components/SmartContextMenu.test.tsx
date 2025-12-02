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

  it("should not render translation shortcuts (handled in analysis sidebar)", () => {
    render(<SmartContextMenu {...defaultProps} />);

    expect(screen.queryByText("Google Translate")).not.toBeInTheDocument();
    expect(screen.queryByText("Abadis")).not.toBeInTheDocument();
    expect(screen.queryByText("Almaany")).not.toBeInTheDocument();
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
