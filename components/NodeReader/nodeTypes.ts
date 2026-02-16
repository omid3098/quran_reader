import type { NodeTypes } from "@xyflow/react";
import { WordNode } from "./nodes/WordNode";
import { RootNode } from "./nodes/RootNode";
import { SurahNode } from "./nodes/SurahNode";
import { VerseKeyNode } from "./nodes/VerseKeyNode";

// CRITICAL: Defined outside components to prevent ReactFlow re-mounting nodes on re-render
export const nodeTypes: NodeTypes = {
  word: WordNode,
  root: RootNode,
  surah: SurahNode,
  verseKey: VerseKeyNode,
};
