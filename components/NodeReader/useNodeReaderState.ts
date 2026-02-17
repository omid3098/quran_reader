import { useState, useCallback, useRef } from "react";
import { useNodesState, useEdgesState } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import type {
  WordNodeData,
  RootNodeData,
  PropertiesPanelSelection,
  NodeReaderNodeData,
  Chapter,
  SurahGroup,
} from "../../types";
import { findVersesByRoot } from "../../services/analysisService";
import { findPhrasesForWord } from "../../services/phrasesService";
import { getRootNote } from "../../services/knowledgeBaseService";
import { layoutRootNode } from "./nodeLayout";

interface UseNodeReaderStateOptions {
  initialNodes: Node[];
  chapter: Chapter;
  verseKey: string;
  getSurahName: (surahId: number) => string | undefined;
}

export function useNodeReaderState({
  initialNodes,
  chapter,
  verseKey,
  getSurahName,
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
  }, [setNodes, setEdges, collectDescendants]);

  const handleWordClick = useCallback(
    (nodeId: string, wordData: WordNodeData) => {
      // Toggle: if this word already has a branch, collapse it
      if (childrenMapRef.current.has(nodeId)) {
        collapseChildren(nodeId);
        setPropertiesSelection({ type: "word", data: wordData });
        // Async: look up phrase matches
        findPhrasesForWord(wordData.verseKey, wordData.wordIndex).then((phraseMatches) => {
          if (phraseMatches.length > 0) {
            setPropertiesSelection({ type: "word", data: wordData, phraseMatches });
          }
        });
        return;
      }

      // Collapse any other open branches first
      collapseAll();

      if (!wordData.root) {
        // No root data for this word (particle, etc.)
        setPropertiesSelection({ type: "word", data: wordData });
        findPhrasesForWord(wordData.verseKey, wordData.wordIndex).then((phraseMatches) => {
          if (phraseMatches.length > 0) {
            setPropertiesSelection({ type: "word", data: wordData, phraseMatches });
          }
        });
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

      // Set immediate selection, then enrich with phrase matches
      setPropertiesSelection({ type: "word", data: wordData });
      findPhrasesForWord(wordData.verseKey, wordData.wordIndex).then((phraseMatches) => {
        if (phraseMatches.length > 0) {
          setPropertiesSelection({ type: "word", data: wordData, phraseMatches });
        }
      });
    },
    [setNodes, setEdges, collapseChildren, collapseAll]
  );

  const handleRootClick = useCallback(
    async (_nodeId: string, rootData: RootNodeData) => {
      // Fetch all verses with this root + KB note in parallel
      const [analysis, rootNote] = await Promise.all([
        findVersesByRoot(rootData.root),
        getRootNote(rootData.root),
      ]);

      // Group ALL verse keys by surah
      const allKeys = analysis.allVerseKeys ?? analysis.verses.map((v) => v.verse_key);
      const bySurah = new Map<number, string[]>();
      for (const vk of allKeys) {
        const [surahStr] = vk.split(":");
        const surahId = parseInt(surahStr, 10);
        if (!bySurah.has(surahId)) bySurah.set(surahId, []);
        bySurah.get(surahId)!.push(vk);
      }

      const surahGroups: SurahGroup[] = Array.from(bySurah.entries()).map(
        ([surahId, verseKeys]) => ({
          surahId,
          surahName: getSurahName(surahId) || `Surah ${surahId}`,
          verseKeys,
        })
      );

      // Update root node occurrences on canvas
      setNodes((currentNodes) =>
        currentNodes.map((n) =>
          n.id === _nodeId ? { ...n, data: { ...n.data, occurrences: analysis.occurrences } } : n
        )
      );

      setPropertiesSelection({
        type: "root",
        data: rootData,
        analysis,
        surahGroups,
        rootNote: rootNote || undefined,
      });
    },
    [setNodes, getSurahName]
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
      }
    },
    [handleWordClick, handleRootClick]
  );

  const handlePaneClick = useCallback(() => {
    collapseAll();
    setPropertiesSelection({ type: "verse", verseKey, chapter });
  }, [verseKey, chapter, collapseAll]);

  const resetCanvas = useCallback(
    (newNodes: Node[]) => {
      childrenMapRef.current.clear();
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
