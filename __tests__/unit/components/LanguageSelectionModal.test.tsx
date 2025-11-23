import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSelectionModal } from "@/components/LanguageSelectionModal";

describe("LanguageSelectionModal", () => {
  const defaultProps = {
    isOpen: true,
    onSelectLanguage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the modal when isOpen is true", () => {
    render(<LanguageSelectionModal {...defaultProps} />);
    expect(screen.getByText("Welcome")).toBeDefined();
  });

  it("should not render content when isOpen is false", () => {
    render(<LanguageSelectionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Welcome")).toBeNull();
  });

  it("should display English language option", () => {
    render(<LanguageSelectionModal {...defaultProps} />);
    expect(screen.getByText("English")).toBeDefined();
  });

  it("should display Persian language option", () => {
    render(<LanguageSelectionModal {...defaultProps} />);
    expect(screen.getByText("فارسی")).toBeDefined();
  });

  it("should call onSelectLanguage with 'en' when English is selected", () => {
    render(<LanguageSelectionModal {...defaultProps} />);
    const englishButton = screen.getByText("English");
    fireEvent.click(englishButton);
    expect(defaultProps.onSelectLanguage).toHaveBeenCalledWith("en");
  });

  it("should call onSelectLanguage with 'fa' when Persian is selected", () => {
    render(<LanguageSelectionModal {...defaultProps} />);
    const persianButton = screen.getByText("فارسی");
    fireEvent.click(persianButton);
    expect(defaultProps.onSelectLanguage).toHaveBeenCalledWith("fa");
  });

  it("should display a prompt asking for language preference", () => {
    render(<LanguageSelectionModal {...defaultProps} />);
    expect(screen.getByText("Please select your preferred language")).toBeDefined();
  });
});
