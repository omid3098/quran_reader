import React from "react";
import {
  Pen,
  Eraser,
  Minus,
  ArrowRight,
  Square,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnnotationState, AnnotationTool } from "../types";
import { ColorPicker } from "./ColorPicker";

interface AnnotationToolbarProps {
  annotationState: AnnotationState;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
  onClear: () => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  annotationState,
  onToolChange,
  onColorChange,
  onLineWidthChange,
  onClear,
}) => {
  const [position, setPosition] = React.useState(() => {
    const saved = localStorage.getItem("annotationToolbarPosition");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: window.innerWidth - 280, y: window.innerHeight - 450 };
      }
    }
    return { x: window.innerWidth - 280, y: window.innerHeight - 450 };
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem("annotationToolbarCollapsed");
    return saved === "true";
  });
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // Save collapse state
  React.useEffect(() => {
    localStorage.setItem("annotationToolbarCollapsed", isCollapsed.toString());
  }, [isCollapsed]);

  const tools: {
    id: AnnotationTool;
    icon: React.ReactNode;
    label: string;
    shortcut: string;
  }[] = [
    { id: "pen", icon: <Pen size={18} />, label: "Pen", shortcut: "Ctrl+P" },
    { id: "eraser", icon: <Eraser size={18} />, label: "Eraser", shortcut: "Ctrl+E" },
    { id: "line", icon: <Minus size={18} />, label: "Line", shortcut: "Ctrl+L" },
    { id: "arrow", icon: <ArrowRight size={18} />, label: "Arrow", shortcut: "Ctrl+Shift+A" },
    { id: "rectangle", icon: <Square size={18} />, label: "Rectangle", shortcut: "Ctrl+R" },
  ];

  const handleToolClick = (tool: AnnotationTool) => {
    // Toggle tool: if already active, deactivate it
    if (annotationState.activeTool === tool) {
      onToolChange("none");
    } else {
      onToolChange(tool);
    }
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the top area (not buttons)
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Handle dragging
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep toolbar within viewport bounds
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 200);
      const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 400);

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem("annotationToolbarPosition", JSON.stringify(position));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, position]);

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Drag Handle with Collapse Button */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div
          className="flex-1 cursor-grab active:cursor-grabbing flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          aria-label={isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
        >
          {isCollapsed ? (
            <ChevronUp size={16} className="text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>

      {/* Toolbar Content - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          {/* Tool Buttons */}
          <div className="flex gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={`
                relative p-3 rounded-lg transition-all border-2
                ${
                  annotationState.activeTool === tool.id
                    ? "bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-500 shadow-lg scale-105"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"
                }
              `}
                title={`${tool.label} (${tool.shortcut})`}
                aria-label={tool.label}
              >
                {tool.icon}
                {annotationState.activeTool === tool.id && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"></div>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

          {/* Color Picker */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Color</span>
            <ColorPicker selectedColor={annotationState.color} onColorChange={onColorChange} />
          </div>

          {/* Line Width */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Width</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {annotationState.lineWidth}px
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={annotationState.lineWidth}
              onChange={(e) => onLineWidthChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

          {/* Clear Button */}
          <button
            onClick={onClear}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-800"
            title="Clear all (Ctrl+C)"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">Clear All</span>
          </button>

          {/* Keyboard Shortcuts Info */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            Press{" "}
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono">
              Ctrl+D
            </kbd>{" "}
            to toggle
          </div>
        </div>
      )}
    </div>
  );
};
