import { useCallback, useEffect, useMemo, useRef } from "react";
import { ReactFlow, Background, Controls, useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodeTypes";
import { useNodeReaderState } from "./useNodeReaderState";
import { layoutWordNodes } from "./nodeLayout";
import type {
  QuranWord,
  Chapter,
  CanvasSnapshot,
  PhraseMatch,
  PhraseVerseNodeData,
  PropertiesPanelSelection,
} from "../../types";

export type TogglePhraseOnCanvas = (match: PhraseMatch, show: boolean) => void;

interface NodeReaderCanvasProps {
  words: QuranWord[];
  verseKey: string;
  chapter: Chapter;
  getSurahName: (surahId: number) => string | undefined;
  onSelectionChange: (selection: PropertiesPanelSelection) => void;
  togglePhraseRef: React.MutableRefObject<TogglePhraseOnCanvas | null>;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
  canvasCacheRef: React.MutableRefObject<Map<string, CanvasSnapshot>>;
}

export function NodeReaderCanvas({
  words,
  verseKey,
  chapter,
  getSurahName,
  onSelectionChange,
  togglePhraseRef,
  onNavigateToVerse,
  canvasCacheRef,
}: NodeReaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // Check for cached state on mount
  const cachedSnapshot = useMemo(
    () => canvasCacheRef.current.get(verseKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only on mount
  );

  // Compute initial word nodes
  const initialNodes = useMemo(() => {
    const width = containerRef.current?.clientWidth ?? 800;
    return layoutWordNodes(words, verseKey, width).nodes as Node[];
  }, [words, verseKey]);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleNodeClick,
    handlePaneClick,
    propertiesSelection,
    resetCanvas,
    restoreCanvas,
    togglePhraseOnCanvas,
    getSnapshot,
  } = useNodeReaderState({
    initialNodes,
    chapter,
    verseKey,
    getSurahName,
    cachedSnapshot,
  });

  // Keep a ref to getSnapshot so effects always have the latest version
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  // Track previous verseKey so we can save state before switching
  const prevVerseKeyRef = useRef(verseKey);

  // Double-click on phraseVerse nodes → navigate to that verse
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const d = node.data as unknown as PhraseVerseNodeData;
      if (d.type === "phraseVerse") {
        const [surahStr, verseStr] = d.verseKey.split(":");
        onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10));
      }
    },
    [onNavigateToVerse]
  );

  // Expose togglePhraseOnCanvas to parent via ref
  useEffect(() => {
    togglePhraseRef.current = togglePhraseOnCanvas;
  }, [togglePhraseOnCanvas, togglePhraseRef]);

  // Sync properties selection to parent
  useEffect(() => {
    onSelectionChange(propertiesSelection);
  }, [propertiesSelection, onSelectionChange]);

  // Save old state BEFORE resetting, then restore or reset for new verse.
  // On initial mount, skip (state is already initialized via cachedSnapshot or initialNodes).
  useEffect(() => {
    if (prevVerseKeyRef.current !== verseKey) {
      // Save canvas state for the verse we're leaving (before any reset)
      canvasCacheRef.current.set(prevVerseKeyRef.current, getSnapshotRef.current());
      prevVerseKeyRef.current = verseKey;

      // Check if we have cached state for the new verse
      const cached = canvasCacheRef.current.get(verseKey);
      if (cached) {
        restoreCanvas(cached);
      } else {
        resetCanvas(initialNodes);
      }
    }
  }, [verseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit view when word nodes first load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
    }
  }, [verseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="rgb(30, 41, 59)" />
        <Controls position="top-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
