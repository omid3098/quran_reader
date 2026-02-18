import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationTabs } from "@/components/NodeReader/TranslationTabs";

const mockTranslations = [
  {
    id: "1",
    resource_id: "en-sahih",
    text: "In the name of Allah, the Most Gracious",
    direction: "ltr",
    resource_name: "Sahih International",
  },
  {
    id: "2",
    resource_id: "fa-makarem",
    text: "<b>به نام خداوند</b> بخشنده مهربان",
    direction: "rtl",
    resource_name: "مکارم شیرازی",
  },
];

describe("TranslationTabs", () => {
  it("should render tab buttons for each translation", () => {
    render(<TranslationTabs translations={mockTranslations} />);
    expect(screen.getByText("Sahih International")).toBeDefined();
    expect(screen.getByText("مکارم شیرازی")).toBeDefined();
  });

  it("should show first translation by default", () => {
    render(<TranslationTabs translations={mockTranslations} />);
    expect(screen.getByText("In the name of Allah, the Most Gracious")).toBeDefined();
  });

  it("should switch tabs on click", () => {
    render(<TranslationTabs translations={mockTranslations} />);
    fireEvent.click(screen.getByText("مکارم شیرازی"));
    // HTML tags should be stripped
    expect(screen.getByText("به نام خداوند بخشنده مهربان")).toBeDefined();
  });

  it("should strip HTML tags from translation text", () => {
    render(<TranslationTabs translations={mockTranslations} />);
    fireEvent.click(screen.getByText("مکارم شیرازی"));
    const text = screen.getByText("به نام خداوند بخشنده مهربان");
    expect(text.innerHTML).not.toContain("<b>");
  });

  it("should show fallback name when resource_name is missing", () => {
    const translations = [{ id: "1", resource_id: "test", text: "Test text", direction: "ltr" }];
    render(<TranslationTabs translations={translations} />);
    expect(screen.getByText("Translation 1")).toBeDefined();
  });

  it("should apply RTL direction for RTL translations", () => {
    render(<TranslationTabs translations={mockTranslations} />);
    fireEvent.click(screen.getByText("مکارم شیرازی"));
    const textEl = screen.getByText("به نام خداوند بخشنده مهربان");
    expect(textEl.getAttribute("dir")).toBe("rtl");
  });
});
