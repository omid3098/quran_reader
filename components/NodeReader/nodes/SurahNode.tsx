import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SurahNodeData } from "../../../types";

function SurahNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as SurahNodeData;

  return (
    <div
      className={`px-3 py-2 rounded-full border transition-colors duration-200 cursor-pointer text-center whitespace-nowrap
        ${
          selected
            ? "border-amber-500 bg-amber-900/30"
            : "border-slate-600 bg-slate-800 hover:border-amber-600"
        }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-1.5 !h-1.5" />
      <span className="text-sm text-slate-200">{d.surahName}</span>
      <span className="text-xs text-slate-500 ml-1">({d.verseCount})</span>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-1.5 !h-1.5" />
    </div>
  );
}

export const SurahNode = memo(SurahNodeComponent);
