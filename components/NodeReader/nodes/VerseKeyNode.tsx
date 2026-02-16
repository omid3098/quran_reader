import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { VerseKeyNodeData } from "../../../types";

function VerseKeyNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as VerseKeyNodeData;

  return (
    <div
      className={`px-2.5 py-1.5 rounded-md border transition-colors duration-200 cursor-pointer text-center
        ${
          selected
            ? "border-emerald-500 bg-emerald-900/30"
            : "border-slate-600 bg-slate-800/80 hover:border-emerald-500 hover:bg-slate-800"
        }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-1.5 !h-1.5" />
      <span className="text-xs font-mono text-slate-300">{d.verseKey}</span>
    </div>
  );
}

export const VerseKeyNode = memo(VerseKeyNodeComponent);
