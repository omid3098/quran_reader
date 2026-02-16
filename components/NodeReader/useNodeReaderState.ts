import { useState, useCallback, useRef } from "react";
import { useNodesState, useEdgesState } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import type {
  WordNodeData,
  RootNodeData,
  SurahNodeData,
  VerseKeyNodeData,
  PropertiesPanelSelection,
  NodeReaderNodeData,
  Chapter,
} from "../../types";
import { findVersesByRoot } from "../../services/analysisService";
import {
  layoutRootNode,
  layoutSurahNodes,
  layoutVerseKeyNodes,
  estimateSurahNodeWidth,
} from "./nodeLayout";

interface UseNodeReaderStateOptions {
  initialNodes: Node[];
  chapter: Chapter;
  verseKey: string;
  getSurahName: (surahId: number) => string | undefined;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
}

export function useNodeReaderState({
  initialNodes,
  chapter,
  verseKey,
  getSurahName,
  onNavigateToVerse,
}: UseNodeReaderStateOptions) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [propertiesSelection, setPropertiesSelection] = useState<PropertiesPanelSelection>({
    type: "verse",
    verseKey,
    chapter,
  });

  // Track spawned children per node for cleanup
  const childrenMapRef = useRef<Map<string, string[]>>(new Map());
  // Store verse keys grouped by surah for each root node expansion
  const surahVerseMapRef = useRef<Map<string, Map<number, string[]>>>(new Map());
  // Edges produced inside setNodes callbacks, applied by a separate setEdges call
  const pendingEdgesRef = useRef<Edge[]>([]);

  // Collect all node IDs to remove (recursive), then batch-remove once
  const collectDescendants = useCallback((nodeId: string, toRemove: Set<string>) => {
    const children = childrenMapRef.current.get(nodeId) || [];
    for (const childId of children) {
      toRemove.add(childId);
      collectDescendants(childId, toRemove);
    }
    childrenMapRef.current.delete(nodeId);
  }, []);

  const collapseChildren = useCallback(
    (nodeId: string) => {
      const toRemove = new Set<string>();
      collectDescendants(nodeId, toRemove);
      if (toRemove.size > 0) {
        setNodes((prev) => prev.filter((n) => !toRemove.has(n.id)));
        setEdges((prev) => prev.filter((e) => !toRemove.has(e.source) && !toRemove.has(e.target)));
      }
    },
    [setNodes, setEdges, collectDescendants]
  );

  // Collapse ALL spawned branches — clears all edges (all edges are spawned, never initial)
  const collapseAll = useCallback(() => {
    const allSpawnedIds = new Set<string>();
    for (const [parentId] of childrenMapRef.current) {
      collectDescendants(parentId, allSpawnedIds);
    }
    if (allSpawnedIds.size > 0) {
      setNodes((prev) => prev.filter((n) => !allSpawnedIds.has(n.id)));
    }
    setEdges([]);
    childrenMapRef.current.clear();
    surahVerseMapRef.current.clear();
  }, [setNodes, setEdges, collectDescendants]);

  const handleWordClick = useCallback(
    (nodeId: string, wordData: WordNodeData) => {
      // Toggle: if this word already has a branch, collapse it
      if (childrenMapRef.current.has(nodeId)) {
        collapseChildren(nodeId);
        setPropertiesSelection({ type: "word", data: wordData });
        return;
      }

      // Collapse any other open branches first
      collapseAll();

      if (!wordData.root) {
        // No root data for this word (particle, etc.)
        setPropertiesSelection({ type: "word", data: wordData });
        return;
      }

      // Compute new nodes inside setNodes callback (fresh state after collapseAll).
      // Edges are stored in pendingEdgesRef and applied by a separate setEdges call
      // to avoid nesting setEdges inside setNodes (which causes stale-edge bugs).
      pendingEdgesRef.current = [];
      setNodes((currentNodes) => {
        const wordNode = currentNodes.find((n) => n.id === nodeId);
        if (!wordNode) return currentNodes;

        const { node: rootNode, edge } = layoutRootNode(wordNode.position, nodeId, {
          root: wordData.root,
        });

        pendingEdgesRef.current = [edge as Edge];
        childrenMapRef.current.set(nodeId, [rootNode.id]);
        return [...currentNodes, rootNode as Node];
      });
      // useNodesState is declared before useEdgesState, so React processes
      // nodes updaters first — pendingEdgesRef is set by the time this runs.
      setEdges((prev) => [...prev, ...pendingEdgesRef.current]);

      setPropertiesSelection({ type: "word", data: wordData });
    },
    [setNodes, setEdges, collapseChildren, collapseAll]
  );

  const handleRootClick = useCallback(
    async (nodeId: string, rootData: RootNodeData) => {
      // Toggle: if surahs already spawned, collapse
      if (childrenMapRef.current.has(nodeId)) {
        collapseChildren(nodeId);
        setPropertiesSelection({ type: "root", data: rootData });
        return;
      }

      // Fetch all verses with this root
      const analysis = await findVersesByRoot(rootData.root);

      // Group ALL verse keys by surah (not just the limited 50)
      const allKeys = analysis.allVerseKeys ?? analysis.verses.map((v) => v.verse_key);
      const bySurah = new Map<number, string[]>();
      for (const vk of allKeys) {
        const [surahStr] = vk.split(":");
        const surahId = parseInt(surahStr, 10);
        if (!bySurah.has(surahId)) bySurah.set(surahId, []);
        bySurah.get(surahId)!.push(vk);
      }

      const surahList = Array.from(bySurah.entries()).map(([surahId, verseKeys]) => ({
        surahId,
        name: getSurahName(surahId) || `Surah ${surahId}`,
        verseCount: verseKeys.length,
      }));

      pendingEdgesRef.current = [];
      setNodes((currentNodes) => {
        const rootNode = currentNodes.find((n) => n.id === nodeId);
        if (!rootNode) return currentNodes;

        const { nodes: surahNodes, edges: surahEdges } = layoutSurahNodes(
          rootNode.position,
          nodeId,
          surahList,
          0
        );

        pendingEdgesRef.current = surahEdges as Edge[];
        childrenMapRef.current.set(
          nodeId,
          surahNodes.map((n) => n.id)
        );

        // Store the grouped data on the ref for later use by surah click
        surahVerseMapRef.current.set(nodeId, bySurah);

        // Update root node occurrences + add surah nodes
        return currentNodes
          .map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, occurrences: analysis.occurrences } } : n
          )
          .concat(surahNodes as Node[]);
      });
      setEdges((prev) => [...prev, ...pendingEdgesRef.current]);

      setPropertiesSelection({ type: "root", data: rootData, analysis });
    },
    [setNodes, setEdges, collapseChildren, getSurahName]
  );

  const handleSurahClick = useCallback(
    (nodeId: string, surahData: SurahNodeData) => {
      // Toggle
      if (childrenMapRef.current.has(nodeId)) {
        collapseChildren(nodeId);
        return;
      }

      // Find verse keys for this surah from the stored data
      const rootBySurah = surahVerseMapRef.current.get(surahData.rootNodeId);
      const verseKeys = rootBySurah?.get(surahData.surahId) || [];

      const surahWidth = estimateSurahNodeWidth(surahData.surahName, surahData.verseCount);

      pendingEdgesRef.current = [];
      setNodes((currentNodes) => {
        const surahNode = currentNodes.find((n) => n.id === nodeId);
        if (!surahNode) return currentNodes;

        const { nodes: vkNodes, edges: vkEdges } = layoutVerseKeyNodes(
          surahNode.position,
          nodeId,
          verseKeys,
          surahWidth
        );

        pendingEdgesRef.current = vkEdges as Edge[];
        childrenMapRef.current.set(
          nodeId,
          vkNodes.map((n) => n.id)
        );
        return [...currentNodes, ...(vkNodes as Node[])];
      });
      setEdges((prev) => [...prev, ...pendingEdgesRef.current]);
    },
    [setNodes, setEdges, collapseChildren]
  );

  const handleVerseKeyClick = useCallback(
    (_nodeId: string, vkData: VerseKeyNodeData) => {
      const [surahStr, verseStr] = vkData.verseKey.split(":");
      onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10));
    },
    [onNavigateToVerse]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as unknown as NodeReaderNodeData;
      switch (data.type) {
        case "word":
          handleWordClick(node.id, data);
          break;
        case "root":
          handleRootClick(node.id, data);
          break;
        case "surah":
          handleSurahClick(node.id, data);
          break;
        case "verseKey":
          handleVerseKeyClick(node.id, data);
          break;
      }
    },
    [handleWordClick, handleRootClick, handleSurahClick, handleVerseKeyClick]
  );

  const handlePaneClick = useCallback(() => {
    collapseAll();
    setPropertiesSelection({ type: "verse", verseKey, chapter });
  }, [verseKey, chapter, collapseAll]);

  const resetCanvas = useCallback(
    (newNodes: Node[]) => {
      // Clear all spawned children
      childrenMapRef.current.clear();
      surahVerseMapRef.current.clear();
      setNodes(newNodes);
      setEdges([]);
      setPropertiesSelection({ type: "verse", verseKey, chapter });
    },
    [setNodes, setEdges, verseKey, chapter]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleNodeClick,
    handlePaneClick,
    propertiesSelection,
    resetCanvas,
  };
}
