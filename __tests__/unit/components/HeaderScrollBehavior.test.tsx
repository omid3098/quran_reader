import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React, { useRef, useState } from "react";
import { Header } from "@/components/Header";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import type { Chapter } from "@/types";

const mockChapters: Chapter[] = [
  {
    id: 1,
    revelation_place: "meccan",
    revelation_order: 5,
    bismillah_pre: false,
    name_simple: "Al-Fatiha",
    name_complex: "Al-Fatiha",
    name_arabic: "الفاتحة",
    verses_count: 7,
    translated_name: { language_name: "English", name: "The Opening" },
  },
];

const ScrollTester = ({ threshold = 0 }: { threshold?: number }) => {
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const isHidden = useHideOnScroll(container, threshold);

  return (
    <div>
      <Header
        chapters={mockChapters}
        currentChapter={mockChapters[0]}
        onSelectChapter={() => {}}
        onOpenSearch={() => {}}
        onToggleSettings={() => {}}
        theme="light"
        onToggleTheme={() => {}}
        isHidden={false}
        onOpenFocusMode={() => {}}
      />
      );
      <main
        ref={(node) => {
          scrollContainerRef.current = node;
          setContainer(node);
        }}
        data-testid="scroll-container"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
        <div style={{ height: "1000px" }} />
      </main>
    </div>
  );
};

describe("Header hide/show on scroll", () => {
  it("hides on scroll down and shows on scroll up", () => {
    render(<ScrollTester threshold={0} />);

    const header = screen.getByRole("banner");
    const scrollContainer = screen.getByTestId("scroll-container");

    scrollContainer.scrollTop = 120;
    fireEvent.scroll(scrollContainer);
    expect(header.className).toContain("-translate-y-full");

    scrollContainer.scrollTop = 20;
    fireEvent.scroll(scrollContainer);
    expect(header.className).not.toContain("-translate-y-full");
  });
});
