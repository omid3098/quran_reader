import type { NodeTypes } from "@xyflow/react";
import { WordNode } from "./nodes/WordNode";
import { PhraseVerseNode } from "./nodes/PhraseVerseNode";

// CRITICAL: Defined outside components to prevent ReactFlow re-mounting nodes on re-render
export const nodeTypes: NodeTypes = {
  word: WordNode,
  phraseVerse: PhraseVerseNode,
};
