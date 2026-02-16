import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WordNodeData } from "../../../types";
import { estimateWordNodeWidth } from "../nodeLayout";

function WordNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WordNodeData;
  const width = estimateWordNodeWidth(d.word);
  return (
    <div
      style={{ width }}
      className={`py-4 rounded-xl border-2 transition-colors duration-200 cursor-pointer text-center
        ${
          selected
            ? "border-emerald-500 bg-emerald-50/10 shadow-lg shadow-emerald-500/10"
            : "border-slate-700 bg-slate-900 hover:border-emerald-600"
        }`}
    >
      <span className="font-quran text-3xl text-slate-100 leading-relaxed whitespace-nowrap">
        {d.word}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-2 !h-2" />
    </div>
  );
}

export const WordNode = memo(WordNodeComponent);
