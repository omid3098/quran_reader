import { describe, it, expect } from "vitest";
import { NODE_READER_COLORS } from "../../../components/NodeReader/colorPalette";

describe("colorPalette", () => {
  it("has all expected color entries", () => {
    const expectedKeys = ["lemmaMatch", "rootMatch", "rootAnalysis", "selected", "userData"];
    for (const key of expectedKeys) {
      expect(NODE_READER_COLORS[key]).toBeDefined();
    }
  });

  it("all entries have non-empty label, swatch, and description", () => {
    for (const [key, entry] of Object.entries(NODE_READER_COLORS)) {
      expect(entry.label, `${key}.label`).toBeTruthy();
      expect(entry.swatch, `${key}.swatch`).toBeTruthy();
      expect(entry.description, `${key}.description`).toBeTruthy();
    }
  });

  it("swatch values are valid Tailwind bg classes", () => {
    for (const entry of Object.values(NODE_READER_COLORS)) {
      expect(entry.swatch).toMatch(/^bg-/);
    }
  });

  it("has no duplicate labels", () => {
    const labels = Object.values(NODE_READER_COLORS).map((e) => e.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
