import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RootNodeData } from "../../../types";

function RootNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as RootNodeData;
  // Space the root letters for readability
  const spacedRoot = d.root.split("").join(" ");

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 transition-colors duration-200 cursor-pointer text-center
        ${
          selected
            ? "border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/10"
            : "border-indigo-800 bg-indigo-950/50 hover:border-indigo-600"
        }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2" />
      <span className="font-quran text-xl text-indigo-300">{spacedRoot}</span>
      {d.occurrences !== undefined && (
        <div className="text-xs text-indigo-400/60 mt-1">{d.occurrences} verses</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2 !h-2" />
    </div>
  );
}

export const RootNode = memo(RootNodeComponent);
