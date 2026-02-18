import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResizablePanel } from "@/hooks/useResizablePanel";

describe("useResizablePanel", () => {
  afterEach(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  it("should return initial percentage", () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initial: 50, min: 20, max: 80, direction: "vertical" })
    );
    expect(result.current.percentage).toBe(50);
  });

  it("should clamp percentage to min bound", () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initial: 50, min: 30, max: 80, direction: "vertical" })
    );

    // Start resizing
    act(() => {
      result.current.startResizing({
        target: document.createElement("div"),
      } as unknown as React.MouseEvent);
    });

    // Move mouse to very top (5% position)
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientY: window.innerHeight * 0.05 }));
    });

    expect(result.current.percentage).toBe(30);

    // Stop resizing
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("should clamp percentage to max bound", () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initial: 50, min: 20, max: 70, direction: "vertical" })
    );

    act(() => {
      result.current.startResizing({
        target: document.createElement("div"),
      } as unknown as React.MouseEvent);
    });

    // Move mouse to very bottom (95% position)
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientY: window.innerHeight * 0.95 }));
    });

    expect(result.current.percentage).toBe(70);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("should set cursor style during resize", () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initial: 50, min: 20, max: 80, direction: "vertical" })
    );

    act(() => {
      result.current.startResizing({
        target: document.createElement("div"),
      } as unknown as React.MouseEvent);
    });

    expect(document.body.style.cursor).toBe("row-resize");

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(document.body.style.cursor).toBe("");
  });

  it("should use col-resize cursor for horizontal direction", () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initial: 50, min: 20, max: 80, direction: "horizontal" })
    );

    act(() => {
      result.current.startResizing({
        target: document.createElement("div"),
      } as unknown as React.MouseEvent);
    });

    expect(document.body.style.cursor).toBe("col-resize");

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("should not start resizing if target is a button", () => {
    const { result } = renderHook(() =>
      useResizablePanel({ initial: 50, min: 20, max: 80, direction: "vertical" })
    );

    const button = document.createElement("button");
    act(() => {
      result.current.startResizing({
        target: button,
      } as unknown as React.MouseEvent);
    });

    expect(document.body.style.cursor).toBe("");
  });
});
