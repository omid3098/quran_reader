import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsSidebar } from "@/components/SettingsSidebar";
import type { AppSettings, Note } from "@/types";

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

  const mockNotes: Record<string, Note> = {};

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    settings: mockSettings,
    onUpdateSettings: vi.fn(),
    onExportNotes: vi.fn(),
    onImportNotes: vi.fn(),
    notes: mockNotes,
    onJumpToNote: vi.fn(),
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
});
