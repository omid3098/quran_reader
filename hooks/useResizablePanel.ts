import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizablePanelOptions {
  initial: number;
  min: number;
  max: number;
  direction: "vertical" | "horizontal";
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function useResizablePanel({
  initial,
  min,
  max,
  direction,
  containerRef,
}: UseResizablePanelOptions) {
  const [percentage, setPercentage] = useState(initial);
  const isResizingRef = useRef(false);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      // Don't start resizing if clicking a button inside the handle
      if ((e.target as HTMLElement).closest("button")) return;
      isResizingRef.current = true;
      document.body.style.cursor = direction === "vertical" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    },
    [direction]
  );

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      let containerSize: number;
      let position: number;

      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (direction === "vertical") {
          containerSize = rect.height;
          position = e.clientY - rect.top;
        } else {
          containerSize = rect.width;
          position = e.clientX - rect.left;
        }
      } else {
        if (direction === "vertical") {
          containerSize = window.innerHeight;
          position = e.clientY;
        } else {
          containerSize = window.innerWidth;
          position = e.clientX;
        }
      }

      const newPercentage = (position / containerSize) * 100;
      const clamped = Math.min(Math.max(newPercentage, min), max);
      setPercentage(clamped);
    },
    [direction, min, max, containerRef]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return { percentage, isResizing: isResizingRef.current, startResizing };
}
