import { useState, useCallback, useRef } from "react";
import { useNodesState, useEdgesState } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import type {
  WordNodeData,
  RootNodeData,
  PhraseVerseNodeData,
  PhraseMatch,
  PropertiesPanelSelection,
  NodeReaderNodeData,
  Chapter,
  SurahGroup,
  CanvasSnapshot,
} from "../../types";
import { findVersesByRoot } from "../../services/analysisService";
import { findPhrasesForWord } from "../../services/phrasesService";
import { getRootNote, getLemmaNote } from "../../services/knowledgeBaseService";
import { layoutRootNode, layoutPhraseVerseNodes, estimateWordNodeWidth } from "./nodeLayout";

interface UseNodeReaderStateOptions {
  initialNodes: Node[];
  chapter: Chapter;
  verseKey: string;
  getSurahName: (surahId: number) => string | undefined;
  cachedSnapshot?: CanvasSnapshot;
}

export function useNodeReaderState({
  initialNodes,
  chapter,
  verseKey,
  getSurahName,
  cachedSnapshot,
}: UseNodeReaderStateOptions) {
  const [nodes, setNodes, onNodesChange] = useNodesState(cachedSnapshot?.nodes ?? initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(cachedSnapshot?.edges ?? []);
  const [propertiesSelection, setPropertiesSelection] = useState<PropertiesPanelSelection>(
    cachedSnapshot?.propertiesSelection ?? { type: "verse", verseKey, chapter }
  );

  // Track spawned children per node for cleanup
  const childrenMapRef = useRef<Map<string, string[]>>(
    cachedSnapshot ? new Map(cachedSnapshot.childrenMap) : new Map()
  );
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

  /** Load phrase matches + KB notes for a word, then update selection. */
  const enrichWordSelection = useCallback((wordData: WordNodeData) => {
    setPropertiesSelection({ type: "word", data: wordData });

    Promise.all([
      findPhrasesForWord(wordData.verseKey, wordData.wordIndex),
      wordData.root ? getRootNote(wordData.root) : null,
      wordData.lemma ? getLemmaNote(wordData.lemma) : null,
    ]).then(([phraseMatches, rootNote, lemmaResult]) => {
      const enriched: PropertiesPanelSelection = {
        type: "word",
        data: wordData,
        ...(phraseMatches.length > 0 ? { phraseMatches } : {}),
        ...(rootNote ? { rootNote } : {}),
        ...(lemmaResult?.note ? { lemmaNote: lemmaResult.note } : {}),
      };
      setPropertiesSelection(enriched);
    });
  }, []);

  const handleWordClick = useCallback(
    (nodeId: string, wordData: WordNodeData) => {
      // Toggle: if this word already has a branch, collapse it
      if (childrenMapRef.current.has(nodeId)) {
        collapseChildren(nodeId);
        enrichWordSelection(wordData);
        return;
      }

      // Collapse any other open branches first
      collapseAll();

      if (!wordData.root) {
        enrichWordSelection(wordData);
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

      enrichWordSelection(wordData);
    },
    [setNodes, setEdges, collapseChildren, collapseAll, enrichWordSelection]
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
        case "phraseVerse": {
          const pvData = data as PhraseVerseNodeData;
          setPropertiesSelection({
            type: "phraseVerse",
            verseKey: pvData.verseKey,
            matchType: pvData.matchType,
            patternKeys: pvData.patternKeys,
          });
          break;
        }
      }
    },
    [handleWordClick, handleRootClick]
  );

  const handlePaneClick = useCallback(() => {
    collapseAll();
    setPropertiesSelection({ type: "verse", verseKey, chapter });
  }, [verseKey, chapter, collapseAll]);

  const togglePhraseOnCanvas = useCallback(
    (match: PhraseMatch, show: boolean) => {
      const phraseKey = `phrase-${match.matchType}-${match.keys.join("-")}`;

      if (!show) {
        collapseChildren(phraseKey);
        return;
      }

      // Collapse any previous toggle for this phrase before re-spawning
      collapseChildren(phraseKey);

      // Determine row index: count existing phrase groups in childrenMapRef
      let rowIndex = 0;
      for (const key of childrenMapRef.current.keys()) {
        if (key.startsWith("phrase-")) rowIndex++;
      }

      pendingEdgesRef.current = [];
      setNodes((currentNodes) => {
        // Get current word nodes with their widths for proper centering
        const wordNodes = currentNodes
          .filter((n) => n.id.startsWith("word-"))
          .map((n) => {
            const d = n.data as unknown as WordNodeData;
            return { id: n.id, position: n.position, width: estimateWordNodeWidth(d.word) };
          });

        const { nodes: pvNodes, edges: pvEdges } = layoutPhraseVerseNodes(
          match.otherOccurrences,
          match.matchType,
          match.wordIndices,
          verseKey,
          wordNodes,
          match.keys,
          rowIndex
        );

        if (pvNodes.length === 0) return currentNodes;

        pendingEdgesRef.current = pvEdges as Edge[];
        childrenMapRef.current.set(
          phraseKey,
          pvNodes.map((n) => n.id)
        );
        return [...currentNodes, ...(pvNodes as Node[])];
      });
      setEdges((prev) => [...prev, ...pendingEdgesRef.current]);
    },
    [setNodes, setEdges, collapseChildren, verseKey]
  );

  const resetCanvas = useCallback(
    (newNodes: Node[]) => {
      childrenMapRef.current.clear();
      setNodes(newNodes);
      setEdges([]);
      setPropertiesSelection({ type: "verse", verseKey, chapter });
    },
    [setNodes, setEdges, verseKey, chapter]
  );

  const restoreCanvas = useCallback(
    (snapshot: CanvasSnapshot) => {
      childrenMapRef.current = new Map(snapshot.childrenMap);
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setPropertiesSelection(snapshot.propertiesSelection);
    },
    [setNodes, setEdges]
  );

  const getSnapshot = useCallback(
    (): CanvasSnapshot => ({
      nodes,
      edges,
      childrenMap: new Map(childrenMapRef.current),
      propertiesSelection,
    }),
    [nodes, edges, propertiesSelection]
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
    restoreCanvas,
    togglePhraseOnCanvas,
    getSnapshot,
  };
}
