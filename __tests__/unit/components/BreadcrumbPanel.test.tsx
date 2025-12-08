import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BreadcrumbPanel } from "@/components/BreadcrumbPanel";
import type { VerseRef, BreadcrumbEntry } from "@/types";

describe("BreadcrumbPanel", () => {
  const mockBookmarkedVerse: VerseRef = {
    surahId: 2,
    verseNumber: 255,
    verseKey: "2:255",
  };

  const mockBreadcrumbs: BreadcrumbEntry[] = [
    {
      verseRef: { surahId: 7, verseNumber: 54, verseKey: "7:54" },
      timestamp: Date.now() - 2000,
    },
    {
      verseRef: { surahId: 3, verseNumber: 18, verseKey: "3:18" },
      timestamp: Date.now() - 1000,
    },
  ];

  const defaultProps = {
    bookmarkedVerse: mockBookmarkedVerse,
    breadcrumbs: mockBreadcrumbs,
    currentVerseKey: "5:12",
    onNavigateToBookmark: vi.fn(),
    onBreadcrumbClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when on bookmarked verse with empty breadcrumbs", () => {
    const { container } = render(
      <BreadcrumbPanel
        {...defaultProps}
        breadcrumbs={[]}
        currentVerseKey="2:255" // Same as bookmark
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when away from bookmark even with empty breadcrumbs", () => {
    render(<BreadcrumbPanel {...defaultProps} breadcrumbs={[]} currentVerseKey="5:12" />);
    // Should show bookmark and current verse (direct navigation)
    expect(screen.getByText("2:255")).toBeDefined(); // bookmark
    expect(screen.getByText("5:12")).toBeDefined(); // current
  });

  it("should render when breadcrumbs exist", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    // Should show the bookmarked verse
    expect(screen.getByText("2:255")).toBeDefined();
  });

  it("should display the bookmarked verse with bookmark icon", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    const bookmarkButton = screen.getByTitle("Return to bookmark");
    expect(bookmarkButton).toBeDefined();
    expect(bookmarkButton.textContent).toContain("2:255");
  });

  it("should display all breadcrumb entries", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    expect(screen.getByText("7:54")).toBeDefined();
    expect(screen.getByText("3:18")).toBeDefined();
  });

  it("should display the current verse key", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    expect(screen.getByText("5:12")).toBeDefined();
  });

  it("should call onNavigateToBookmark when bookmark button is clicked", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    const bookmarkButton = screen.getByTitle("Return to bookmark");
    fireEvent.click(bookmarkButton);
    expect(defaultProps.onNavigateToBookmark).toHaveBeenCalledTimes(1);
  });

  it("should call onBreadcrumbClick with correct index when breadcrumb is clicked", () => {
    render(<BreadcrumbPanel {...defaultProps} />);

    // Click first breadcrumb (7:54)
    const firstBreadcrumb = screen.getByTitle("Go to 7:54");
    fireEvent.click(firstBreadcrumb);
    expect(defaultProps.onBreadcrumbClick).toHaveBeenCalledWith(0);

    vi.clearAllMocks();

    // Click second breadcrumb (3:18)
    const secondBreadcrumb = screen.getByTitle("Go to 3:18");
    fireEvent.click(secondBreadcrumb);
    expect(defaultProps.onBreadcrumbClick).toHaveBeenCalledWith(1);
  });

  it("should render without bookmarked verse", () => {
    render(<BreadcrumbPanel {...defaultProps} bookmarkedVerse={null} />);
    // Should still render breadcrumbs
    expect(screen.getByText("7:54")).toBeDefined();
    expect(screen.getByText("3:18")).toBeDefined();
    // Bookmark button should not exist
    expect(screen.queryByTitle("Return to bookmark")).toBeNull();
  });

  it("should render without current verse key", () => {
    render(<BreadcrumbPanel {...defaultProps} currentVerseKey={null} />);
    // Should still render breadcrumbs
    expect(screen.getByText("7:54")).toBeDefined();
    expect(screen.getByText("3:18")).toBeDefined();
    // Current verse should not be shown
    expect(screen.queryByText("5:12")).toBeNull();
  });

  it("should have correct styling for bookmark button", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    const bookmarkButton = screen.getByTitle("Return to bookmark");
    expect(bookmarkButton.className).toContain("bg-amber-50");
    expect(bookmarkButton.className).toContain("text-amber-700");
  });

  it("should have correct styling for current verse", () => {
    render(<BreadcrumbPanel {...defaultProps} />);
    const currentVerse = screen.getByText("5:12");
    expect(currentVerse.className).toContain("text-emerald-600");
  });

  it("should render with single breadcrumb", () => {
    const singleBreadcrumb: BreadcrumbEntry[] = [
      {
        verseRef: { surahId: 7, verseNumber: 54, verseKey: "7:54" },
        timestamp: Date.now(),
      },
    ];
    render(<BreadcrumbPanel {...defaultProps} breadcrumbs={singleBreadcrumb} />);
    expect(screen.getByText("7:54")).toBeDefined();
    expect(screen.getByText("2:255")).toBeDefined(); // bookmark
    expect(screen.getByText("5:12")).toBeDefined(); // current
  });
});
