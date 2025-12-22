import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranslationContextMenu } from "../../../components/TranslationContextMenu";
import { TRANSLATION_SERVICES } from "../../../services/translationServices";

describe("TranslationContextMenu", () => {
  const mockOnClose = vi.fn();
  const mockOnTranslate = vi.fn();
  const defaultProps = {
    position: { top: 100, left: 200 },
    word: "كتاب",
    targetLanguage: "en",
    onClose: mockOnClose,
    onTranslate: mockOnTranslate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should render all 5 translation services", () => {
    render(<TranslationContextMenu {...defaultProps} />);

    // Check that all 5 services are rendered
    expect(TRANSLATION_SERVICES).toHaveLength(5);
    TRANSLATION_SERVICES.forEach((service) => {
      expect(screen.getByText(service.name)).toBeInTheDocument();
    });
  });

  it("should display the word in the header", () => {
    render(<TranslationContextMenu {...defaultProps} />);

    expect(screen.getByText("Translation Menu")).toBeInTheDocument();
    expect(screen.getByText("كتاب")).toBeInTheDocument();
  });

  it("should call onTranslate with correct service when clicked", () => {
    render(<TranslationContextMenu {...defaultProps} />);

    // Click on the first service (Abadis)
    const abadisButton = screen.getByText("Abadis");
    fireEvent.click(abadisButton);

    expect(mockOnTranslate).toHaveBeenCalledTimes(1);
    expect(mockOnTranslate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "abadis", name: "Abadis" }),
      "كتاب",
      undefined
    );
  });

  it("should call onClose when clicking outside", async () => {
    vi.useFakeTimers();
    render(<TranslationContextMenu {...defaultProps} />);

    // Fast-forward past the 100ms delay
    await vi.advanceTimersByTimeAsync(150);

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    // The callback should be called immediately
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("should not call onClose when clicking inside the menu", async () => {
    vi.useFakeTimers();
    const { container } = render(<TranslationContextMenu {...defaultProps} />);

    // Fast-forward past the 100ms delay
    await vi.advanceTimersByTimeAsync(150);

    // Click inside the menu
    const menu = container.firstChild as HTMLElement;
    fireEvent.mouseDown(menu);

    // The callback should not be called
    expect(mockOnClose).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("should position at provided coordinates", () => {
    const { container } = render(<TranslationContextMenu {...defaultProps} />);

    const menu = container.firstChild as HTMLElement;
    expect(menu.style.top).toBe("100px");
    expect(menu.style.left).toBe("200px");
  });

  it("should show Languages icon for each service", () => {
    const { container } = render(<TranslationContextMenu {...defaultProps} />);

    // Count SVG icons (Languages icons)
    const icons = container.querySelectorAll("svg");
    // Should have 5 service icons
    expect(icons.length).toBeGreaterThanOrEqual(5);
  });

  it("should not filter services by language (show all 5)", () => {
    render(<TranslationContextMenu {...defaultProps} />);

    // Verify all services are shown regardless of language
    expect(screen.getByText("Abadis")).toBeInTheDocument(); // Persian only
    expect(screen.getByText("Vajehyab")).toBeInTheDocument(); // Persian only
    expect(screen.getByText("Wiki Ahlolbait")).toBeInTheDocument(); // Persian, English
    expect(screen.getByText("Almaany")).toBeInTheDocument(); // English, Persian
    expect(screen.getByText("Google Translate")).toBeInTheDocument(); // All languages
  });

  it("should accept optional verseKey prop", () => {
    const propsWithVerseKey = {
      ...defaultProps,
      verseKey: "2:255",
    };

    render(<TranslationContextMenu {...propsWithVerseKey} />);

    const abadisButton = screen.getByText("Abadis");
    fireEvent.click(abadisButton);

    // Component should render successfully with verseKey
    expect(screen.getByText("Translation Menu")).toBeInTheDocument();
    expect(mockOnTranslate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "abadis", name: "Abadis" }),
      "كتاب",
      "2:255"
    );
  });

  it("should have correct styling classes", () => {
    const { container } = render(<TranslationContextMenu {...defaultProps} />);

    const menu = container.firstChild as HTMLElement;
    expect(menu).toHaveClass("absolute");
    expect(menu).toHaveClass("z-50");
    expect(menu).toHaveClass("w-60");
    expect(menu).toHaveClass("bg-white");
    expect(menu).toHaveClass("dark:bg-slate-900");
    expect(menu).toHaveClass("rounded-xl");
  });

  it("should call each service with correct word parameter", () => {
    render(<TranslationContextMenu {...defaultProps} />);

    // Click on each service and verify the word is passed correctly
    TRANSLATION_SERVICES.forEach((service, index) => {
      const button = screen.getByText(service.name);
      fireEvent.click(button);

      expect(mockOnTranslate).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({ id: service.id }),
        "كتاب",
        undefined
      );
    });

    expect(mockOnTranslate).toHaveBeenCalledTimes(5);
  });
});
