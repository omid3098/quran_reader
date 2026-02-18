import React, { memo } from "react";
import { NODE_READER_COLORS } from "./colorPalette";

const entries = Object.values(NODE_READER_COLORS);

function CanvasLegendComponent() {
  return (
    <div className="absolute bottom-4 right-4 pointer-events-none select-none z-20">
      <div className="bg-slate-950/60 backdrop-blur-sm rounded-lg px-3 py-2 flex flex-col gap-1">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${entry.swatch} flex-shrink-0`} />
            <span className="text-[10px] text-slate-400 whitespace-nowrap">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CanvasLegend = memo(CanvasLegendComponent);
