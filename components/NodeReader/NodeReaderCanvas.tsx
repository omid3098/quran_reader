import { useEffect, useMemo, useRef } from "react";
import { ReactFlow, Background, Controls, useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodeTypes";
import { useNodeReaderState } from "./useNodeReaderState";
import { layoutWordNodes } from "./nodeLayout";
import type { QuranWord, Chapter, PropertiesPanelSelection } from "../../types";

interface NodeReaderCanvasProps {
  words: QuranWord[];
  verseKey: string;
  chapter: Chapter;
  getSurahName: (surahId: number) => string | undefined;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
  onSelectionChange: (selection: PropertiesPanelSelection) => void;
}

export function NodeReaderCanvas({
  words,
  verseKey,
  chapter,
  getSurahName,
  onNavigateToVerse,
  onSelectionChange,
}: NodeReaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

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
  } = useNodeReaderState({
    initialNodes,
    chapter,
    verseKey,
    getSurahName,
    onNavigateToVerse,
  });

  // Sync properties selection to parent
  useEffect(() => {
    onSelectionChange(propertiesSelection);
  }, [propertiesSelection, onSelectionChange]);

  // Reset canvas when verse changes
  useEffect(() => {
    resetCanvas(initialNodes);
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
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
