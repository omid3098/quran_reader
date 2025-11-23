import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "@/components/Spinner";

describe("Spinner", () => {
  it("should render an SVG element", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg).not.toBeNull();
  });

  it("should apply default className", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    const classes = svg?.getAttribute("class") || "";
    expect(classes).toContain("w-6");
    expect(classes).toContain("h-6");
  });

  it("should apply custom className", () => {
    const { container } = render(<Spinner className="w-10 h-10" />);
    const svg = container.querySelector("svg");
    const classes = svg?.getAttribute("class") || "";
    expect(classes).toContain("w-10");
    expect(classes).toContain("h-10");
  });

  it("should have animate-spin class for animation", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    const classes = svg?.getAttribute("class") || "";
    expect(classes).toContain("animate-spin");
  });

  it("should contain circle and path elements", () => {
    const { container } = render(<Spinner />);
    const circle = container.querySelector("circle");
    const path = container.querySelector("path");
    expect(circle).not.toBeNull();
    expect(path).not.toBeNull();
  });
});
