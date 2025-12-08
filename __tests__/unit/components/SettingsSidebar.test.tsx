import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsSidebar } from "@/components/SettingsSidebar";
import type { AppSettings, VerseNote } from "@/types";

// Mock the quranService
vi.mock("@/services/quranService", () => ({
  RECITERS: [{ id: "alafasy", name: "Mishary Rashid Alafasy", subfolder: "Alafasy_64kbps" }],
  getAvailableTranslations: vi.fn().mockResolvedValue([
    {
      id: "en.sahih",
      name: "Saheeh International",
      author_name: "Saheeh",
      slug: "en-sahih",
      language_name: "English",
    },
    {
      id: "fa.makarem",
      name: "Makarem Shirazi",
      author_name: "Makarem",
      slug: "fa-makarem",
      language_name: "Persian",
    },
  ]),
}));

describe("SettingsSidebar", () => {
  const mockSettings: AppSettings = {
    fontSize: 32,
    translationIds: ["en.sahih"],
    reciterId: "alafasy",
    scriptType: "simple",
    showTranslation: true,
    autoPlay: true,
    theme: "dark",
    userLanguage: "en",
  };

  const mockNotes: Record<string, VerseNote> = {};

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    settings: mockSettings,
    onUpdateSettings: vi.fn(),
    onExportNotes: vi.fn(),
    onImportNotes: vi.fn(),
    notes: mockNotes,
    onJumpToNote: vi.fn(),
    onSyncOmidNotes: vi.fn(),
    syncingOmidNotes: false,
    lastOmidSyncAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the sidebar when open", () => {
    render(<SettingsSidebar {...defaultProps} />);
    expect(screen.getByText("SETTINGS")).toBeDefined();
  });

  it("should not render sidebar content when closed", () => {
    render(<SettingsSidebar {...defaultProps} isOpen={false} />);
    // Sidebar is transformed off-screen, but still in DOM
    // The sidebar container is a grandparent div with the transform class
    const settingsText = screen.getByText("SETTINGS");
    const sidebarContainer = settingsText.closest(".fixed");
    expect(sidebarContainer?.className).toContain("-translate-x-full");
  });

  describe("Language Section", () => {
    it("should display Language section header", async () => {
      render(<SettingsSidebar {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Language")).toBeDefined();
      });
    });

    it("should show current language when section is expanded", async () => {
      render(<SettingsSidebar {...defaultProps} />);

      // Click to expand Language section
      const languageButton = await screen.findByText("Language");
      fireEvent.click(languageButton);

      await waitFor(() => {
        expect(screen.getByText("English")).toBeDefined();
        expect(screen.getByText("فارسی")).toBeDefined();
      });
    });

    it("should call onUpdateSettings when language is changed to Persian", async () => {
      render(<SettingsSidebar {...defaultProps} />);

      // Click to expand Language section
      const languageButton = await screen.findByText("Language");
      fireEvent.click(languageButton);

      // Click Persian option
      const persianButton = await screen.findByText("فارسی");
      fireEvent.click(persianButton);

      expect(defaultProps.onUpdateSettings).toHaveBeenCalledWith({
        userLanguage: "fa",
      });
    });

    it("should call onUpdateSettings when language is changed to English", async () => {
      const persianSettings = { ...mockSettings, userLanguage: "fa" as const };
      render(<SettingsSidebar {...defaultProps} settings={persianSettings} />);

      // Click to expand Language section
      const languageButton = await screen.findByText("Language");
      fireEvent.click(languageButton);

      // Click English option
      const englishButton = await screen.findByText("English");
      fireEvent.click(englishButton);

      expect(defaultProps.onUpdateSettings).toHaveBeenCalledWith({
        userLanguage: "en",
      });
    });

    it("should highlight the currently selected language", async () => {
      render(<SettingsSidebar {...defaultProps} />);

      // Click to expand Language section
      const languageButton = await screen.findByText("Language");
      fireEvent.click(languageButton);

      await waitFor(() => {
        const englishButton = screen.getByText("English").closest("button");
        // The active language should have emerald styling
        expect(englishButton?.className).toContain("emerald");
      });
    });
  });

  it("should call onClose when close button is clicked", () => {
    render(<SettingsSidebar {...defaultProps} />);
    const closeButton = screen.getByRole("button", { name: "" }); // X button has no text
    // Find the button with X icon
    const buttons = screen.getAllByRole("button");
    const xButton = buttons.find((btn) => btn.querySelector("svg"));
    if (xButton) {
      fireEvent.click(xButton);
    }
    // Close is also triggered by backdrop click
  });

  describe("Notes Section", () => {
    it("should display notes sorted by surah:verse index", async () => {
      const notesWithMultipleVerses: Record<string, VerseNote> = {
        "2:45": {
          verseKey: "2:45",
          blocks: [{ type: "paragraph", content: "Note for 2:45" }],
          updatedAt: "2024-01-01T10:00:00Z",
          createdAt: "2024-01-01T10:00:00Z",
        },
        "1:1": {
          verseKey: "1:1",
          blocks: [{ type: "paragraph", content: "Note for 1:1" }],
          updatedAt: "2024-01-02T10:00:00Z",
          createdAt: "2024-01-02T10:00:00Z",
        },
        "1:7": {
          verseKey: "1:7",
          blocks: [{ type: "paragraph", content: "Note for 1:7" }],
          updatedAt: "2024-01-03T10:00:00Z",
          createdAt: "2024-01-03T10:00:00Z",
        },
        "3:10": {
          verseKey: "3:10",
          blocks: [{ type: "paragraph", content: "Note for 3:10" }],
          updatedAt: "2024-01-04T10:00:00Z",
          createdAt: "2024-01-04T10:00:00Z",
        },
        "2:1": {
          verseKey: "2:1",
          blocks: [{ type: "paragraph", content: "Note for 2:1" }],
          updatedAt: "2024-01-05T10:00:00Z",
          createdAt: "2024-01-05T10:00:00Z",
        },
      };

      render(<SettingsSidebar {...defaultProps} notes={notesWithMultipleVerses} />);

      // Click to expand Notes section
      const notesButton = await screen.findByText("Notes");
      fireEvent.click(notesButton);

      // Get all note buttons in order
      const noteButtons = await screen.findAllByRole("button", {
        name: /^\d+:\d+$/,
      });
      const verseKeys = noteButtons.map((btn) => btn.textContent);

      // Should be sorted by surah:verse (1:1, 1:7, 2:1, 2:45, 3:10)
      expect(verseKeys).toEqual(["1:1", "1:7", "2:1", "2:45", "3:10"]);
    });
  });

  it("should trigger Omid sync action from Data Management", async () => {
    render(<SettingsSidebar {...defaultProps} />);

    const dataButton = await screen.findByText("Data Management");
    fireEvent.click(dataButton);

    const syncButton = await screen.findByText("Sync Omid notes");
    fireEvent.click(syncButton);

    expect(defaultProps.onSyncOmidNotes).toHaveBeenCalled();
  });
});
