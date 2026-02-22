import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PhraseMatchType, PhraseVerseNodeData } from "../../../types";

const STYLES: Record<
  PhraseMatchType,
  {
    border: string;
    borderSelected: string;
    bg: string;
    bgSelected: string;
    shadow: string;
    text: string;
    handle: string;
  }
> = {
  lemma: {
    border: "border-amber-700",
    borderSelected: "border-amber-500",
    bg: "bg-amber-950/40",
    bgSelected: "bg-amber-900/40",
    shadow: "shadow-amber-500/10",
    text: "text-amber-200",
    handle: "!bg-amber-500",
  },
  root: {
    border: "border-teal-700",
    borderSelected: "border-teal-500",
    bg: "bg-teal-950/40",
    bgSelected: "bg-teal-900/40",
    shadow: "shadow-teal-500/10",
    text: "text-teal-200",
    handle: "!bg-teal-500",
  },
  surface: {
    border: "border-violet-700",
    borderSelected: "border-violet-500",
    bg: "bg-violet-950/40",
    bgSelected: "bg-violet-900/40",
    shadow: "shadow-violet-500/10",
    text: "text-violet-200",
    handle: "!bg-violet-500",
  },
};

function PhraseVerseNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as PhraseVerseNodeData;
  const s = STYLES[d.matchType];

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 transition-colors duration-200 cursor-pointer text-center
        ${selected ? `${s.borderSelected} ${s.bgSelected} shadow-lg ${s.shadow}` : `${s.border} ${s.bg}`}`}
    >
      <span className={`text-sm font-mono font-semibold ${s.text}`}>{d.verseKey}</span>
      <Handle type="source" position={Position.Bottom} className={`${s.handle} !w-2 !h-2`} />
    </div>
  );
}

export const PhraseVerseNode = memo(PhraseVerseNodeComponent);
