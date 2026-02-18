import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BottomPanel } from "@/components/NodeReader/BottomPanel";

// Mock RichNoteEditor since it imports heavy BlockNote dependencies
vi.mock("@/components/RichNoteEditor", () => ({
  RichNoteEditor: ({ onChange }: { onChange?: (blocks: unknown[]) => void }) => (
    <div data-testid="rich-note-editor">
      <button onClick={() => onChange?.([{ type: "paragraph", content: "test" }])}>Type</button>
    </div>
  ),
}));

const defaultProps = {
  containerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
  translations: [
    {
      id: "1",
      resource_id: "en-sahih",
      text: "In the name of Allah",
      direction: "ltr" as const,
      resource_name: "Sahih International",
    },
  ],
  verseKey: "1:1",
  verseNote: undefined,
  onSaveVerseNote: vi.fn(),
  surahId: 1,
  surahNote: undefined,
  onSaveSurahNote: vi.fn(),
  theme: "dark" as const,
  onNavigateToVerse: vi.fn(),
  getSurahName: vi.fn(),
};

describe("BottomPanel", () => {
  it("should render all three tabs", () => {
    render(<BottomPanel {...defaultProps} />);
    expect(screen.getByText("Translations")).toBeDefined();
    expect(screen.getByText("Verse Notes")).toBeDefined();
    expect(screen.getByText("Surah Notes")).toBeDefined();
  });

  it("should show translations tab by default", () => {
    render(<BottomPanel {...defaultProps} />);
    expect(screen.getByText("In the name of Allah")).toBeDefined();
  });

  it("should switch to verse notes tab", async () => {
    render(<BottomPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Verse Notes"));
    await waitFor(() => {
      expect(screen.getByTestId("rich-note-editor")).toBeDefined();
    });
  });

  it("should switch to surah notes tab", async () => {
    render(<BottomPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Surah Notes"));
    await waitFor(() => {
      expect(screen.getByTestId("rich-note-editor")).toBeDefined();
    });
  });

  it("should toggle panel closed and open", () => {
    render(<BottomPanel {...defaultProps} />);
    // Panel is open by default, close it
    fireEvent.click(screen.getByLabelText("Close panel"));
    // Should show the open button
    expect(screen.getByText("Panel")).toBeDefined();
    // Open it again
    fireEvent.click(screen.getByText("Panel"));
    // Tabs should be visible again
    expect(screen.getByText("Translations")).toBeDefined();
  });

  it("should show yellow indicator when verse note exists", () => {
    const propsWithNote = {
      ...defaultProps,
      verseNote: {
        verseKey: "1:1",
        blocks: [{ type: "paragraph", content: "test" }],
        updatedAt: "2024-01-01",
        createdAt: "2024-01-01",
      },
    };
    const { container } = render(<BottomPanel {...propsWithNote} />);
    // Yellow dot indicator should exist
    const dots = container.querySelectorAll(".bg-yellow-400");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("should show yellow indicator when surah note exists", () => {
    const propsWithNote = {
      ...defaultProps,
      surahNote: {
        surahId: 1,
        blocks: [{ type: "paragraph", content: "test" }],
        updatedAt: "2024-01-01",
        createdAt: "2024-01-01",
      },
    };
    const { container } = render(<BottomPanel {...propsWithNote} />);
    const dots = container.querySelectorAll(".bg-yellow-400");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("should show no translations message when translations are empty", () => {
    render(<BottomPanel {...defaultProps} translations={[]} />);
    expect(screen.getByText("No translations available")).toBeDefined();
  });
});
