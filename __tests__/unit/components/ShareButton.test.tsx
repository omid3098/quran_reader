import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "../../../components/ShareButton";

describe("ShareButton", () => {
  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://example.com",
        pathname: "/quran_reader/",
      },
      writable: true,
    });

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render share icon by default", () => {
    render(<ShareButton surahId={2} verseNumber={255} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Share verse");
  });

  it("should copy URL to clipboard on click", async () => {
    const writeTextMock = vi.fn(() => Promise.resolve());
    Object.assign(navigator.clipboard, {
      writeText: writeTextMock,
    });

    render(<ShareButton surahId={2} verseNumber={255} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("https://example.com/quran_reader/2/255");
    });
  });

  it("should show check icon after successful copy", async () => {
    render(<ShareButton surahId={2} verseNumber={255} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute("title", "Copied!");
    });
  });

  it("should stop event propagation on click", async () => {
    const parentClickHandler = vi.fn();

    const { container } = render(
      <div onClick={parentClickHandler}>
        <ShareButton surahId={2} verseNumber={255} />
      </div>
    );

    const button = container.querySelector("button")!;
    fireEvent.click(button);

    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    render(<ShareButton surahId={2} verseNumber={255} className="custom-class" />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should call clipboard API with correct URL for verse 1:1", () => {
    const writeTextMock = vi.fn(() => Promise.resolve());
    Object.assign(navigator.clipboard, {
      writeText: writeTextMock,
    });

    render(<ShareButton surahId={1} verseNumber={1} />);
    fireEvent.click(screen.getByRole("button"));

    expect(writeTextMock).toHaveBeenCalledWith("https://example.com/quran_reader/1/1");
  });

  it("should call clipboard API with correct URL for verse 114:6", () => {
    const writeTextMock = vi.fn(() => Promise.resolve());
    Object.assign(navigator.clipboard, {
      writeText: writeTextMock,
    });

    render(<ShareButton surahId={114} verseNumber={6} />);
    fireEvent.click(screen.getByRole("button"));

    expect(writeTextMock).toHaveBeenCalledWith("https://example.com/quran_reader/114/6");
  });
});
