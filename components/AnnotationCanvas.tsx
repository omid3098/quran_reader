import React, { useRef, useEffect, useState, useCallback } from "react";
import { AnnotationState } from "../types";

interface AnnotationCanvasProps {
  annotationState: AnnotationState;
  _onClearRequest: () => void;
}

interface Point {
  x: number;
  y: number;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  annotationState,
  _onClearRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [savedCanvas, setSavedCanvas] = useState<ImageData | null>(null);

  // Update canvas dimensions
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Get the main content container
    const mainElement = canvas.parentElement;
    if (!mainElement) return;

    // Store current canvas content
    const ctx = canvas.getContext("2d");
    const currentImage = ctx?.getImageData(0, 0, canvas.width, canvas.height);

    // Match the dimensions of the parent container (main element)
    const width = mainElement.scrollWidth;
    const height = Math.max(mainElement.scrollHeight, mainElement.clientHeight);

    // Only update if dimensions are valid
    if (width === 0 || height === 0) return;

    // Update dimensions
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Restore canvas content if it existed
    if (ctx && currentImage) {
      ctx.scale(dpr, dpr);
      ctx.putImageData(currentImage, 0, 0);
    } else if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Initialize and handle resize
  useEffect(() => {
    updateCanvasDimensions();

    const handleResize = () => {
      requestAnimationFrame(updateCanvasDimensions);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasDimensions]);

  // Update canvas when parent content changes (verses load)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const observer = new MutationObserver(() => {
      requestAnimationFrame(updateCanvasDimensions);
    });

    observer.observe(canvas.parentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [updateCanvasDimensions]);

  // Handle clear request
  useEffect(() => {
    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    // Listen for clear event through a custom event
    window.addEventListener("clearAnnotations", handleClear);
    return () => window.removeEventListener("clearAnnotations", handleClear);
  }, []);

  // Clear canvas function exposed via ref
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Expose clear function to parent
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).clearAnnotationCanvas = clearCanvas;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).clearAnnotationCanvas;
    };
  }, [clearCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Since canvas is absolutely positioned and extends full height,
    // we just need the offset from the canvas edge (rect already accounts for scroll)
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      setSavedCanvas(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  };

  const restoreCanvasState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && savedCanvas) {
      ctx.putImageData(savedCanvas, 0, 0);
    }
  };

  const drawLine = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    // Draw line
    drawLine(ctx, from, to);

    // Calculate arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = 15;

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const drawRectangle = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.beginPath();
    ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
    ctx.stroke();
  };

  const drawPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  const erase = (ctx: CanvasRenderingContext2D, point: Point) => {
    const eraserSize = annotationState.lineWidth * 5;
    ctx.clearRect(point.x - eraserSize / 2, point.y - eraserSize / 2, eraserSize, eraserSize);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationState.activeTool === "none") return;

    // Don't draw if clicking on UI elements (z-index >= 50)
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
    if (elementUnderMouse && elementUnderMouse !== e.currentTarget) {
      const zIndex = window.getComputedStyle(elementUnderMouse).zIndex;
      if (zIndex && parseInt(zIndex) >= 50) {
        return;
      }
    }

    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setStartPoint(point);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Configure drawing style
    ctx.strokeStyle = annotationState.color;
    ctx.lineWidth = annotationState.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (annotationState.activeTool === "pen") {
      setCurrentPath([point]);
    } else if (annotationState.activeTool === "eraser") {
      erase(ctx, point);
    } else {
      // For line, arrow, rectangle - save canvas state for preview
      saveCanvasState();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationState.activeTool === "none") return;

    const point = getCanvasPoint(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = annotationState.color;
    ctx.lineWidth = annotationState.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (annotationState.activeTool === "pen") {
      // Continue path
      const newPath = [...currentPath, point];
      setCurrentPath(newPath);
      drawPath(ctx, newPath);
    } else if (annotationState.activeTool === "eraser") {
      erase(ctx, point);
    } else if (startPoint) {
      // Preview for line, arrow, rectangle
      restoreCanvasState();

      if (annotationState.activeTool === "line") {
        drawLine(ctx, startPoint, point);
      } else if (annotationState.activeTool === "arrow") {
        drawArrow(ctx, startPoint, point);
      } else if (annotationState.activeTool === "rectangle") {
        drawRectangle(ctx, startPoint, point);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationState.activeTool === "none") return;

    const point = getCanvasPoint(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !startPoint) {
      setIsDrawing(false);
      return;
    }

    ctx.strokeStyle = annotationState.color;
    ctx.lineWidth = annotationState.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Finalize drawing
    if (annotationState.activeTool === "line") {
      restoreCanvasState();
      drawLine(ctx, startPoint, point);
    } else if (annotationState.activeTool === "arrow") {
      restoreCanvasState();
      drawArrow(ctx, startPoint, point);
    } else if (annotationState.activeTool === "rectangle") {
      restoreCanvasState();
      drawRectangle(ctx, startPoint, point);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPath([]);
    setSavedCanvas(null);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPath([]);
    setSavedCanvas(null);
  };

  // Determine cursor style based on active tool
  const getCursorStyle = () => {
    if (!annotationState.isEnabled || annotationState.activeTool === "none") {
      return "default";
    }
    switch (annotationState.activeTool) {
      case "pen":
        return "crosshair";
      case "eraser":
        return "pointer";
      case "line":
      case "arrow":
      case "rectangle":
        return "crosshair";
      default:
        return "default";
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0"
      style={{
        zIndex: 25,
        cursor: getCursorStyle(),
        pointerEvents: annotationState.activeTool === "none" ? "none" : "auto",
        maxWidth: "100%",
        maxHeight: "100%",
        backgroundColor: "transparent",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};
