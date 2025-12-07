import React, { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { AudioPlayer } from "./components/AudioPlayer";
import { AyahCard } from "./components/AyahCard";
import { AISearchModal } from "./components/AISearchModal";
import { NoteModal } from "./components/NoteModal";
import { SmartContextMenu } from "./components/SmartContextMenu";
import { AnalysisSidebar } from "./components/AnalysisSidebar";
import { IframeModal } from "./components/IframeModal";
import { LanguageSelectionModal } from "./components/LanguageSelectionModal";
import { SurahNoteModal } from "./components/SurahNoteModal";
import { getChapters, getVerses, getAudioUrl } from "./services/quranService";
import {
  getVerseWordData,
  findRootOfWord,
  findVersesByRoot,
  searchPhrase,
  normalizeArabic,
  calculateAbjad,
  findWordsWithSameAbjad,
  findRootForWord,
} from "./services/analysisService";
import { TranslationService } from "./services/translationServices";
import {
  Chapter,
  Verse,
  AppSettings,
  Note,
  VerseNote,
  BackupData,
  BackupDataV1,
  NoteExportTuple,
  SelectionContext,
  RootAnalysis,
  UserLanguage,
  SurahNote,
} from "./types";
import { textToBlocks, blocksToText } from "./components/RichNoteEditor";
import { PartialBlock } from "@blocknote/core";
import { Spinner } from "./components/Spinner";
import { useHideOnScroll } from "./hooks/useHideOnScroll";

const App: React.FC = () => {
  // --- Data State ---
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  // --- UI State ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [_loadingChapters, setLoadingChapters] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [pendingScrollAyah, setPendingScrollAyah] = useState<string | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
  const isHeaderHidden = useHideOnScroll(scrollContainer);

  // --- Analysis & Context Menu State ---
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [analysisSidebarOpen, setAnalysisSidebarOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"root" | "phrase" | null>(null);
  const [rootData, setRootData] = useState<RootAnalysis | null>(null);
  const [phraseData, setPhraseData] = useState<{
    count: number;
    verses: { verse_key: string; text: string }[];
  } | null>(null);

  // --- Iframe State ---
  const [iframeData, setIframeData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: "",
  });

  // --- Notes State (with migration from legacy plain text to blocks) ---
  const [notes, setNotes] = useState<Record<string, VerseNote>>(() => {
    const savedNotes = localStorage.getItem("luminaNotes");
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        // Migrate legacy plain text notes to block format
        const migrated: Record<string, VerseNote> = {};
        for (const [key, value] of Object.entries(parsed)) {
          const noteValue = value as Note | VerseNote;
          if ("blocks" in noteValue) {
            // Already in new format
            migrated[key] = noteValue as VerseNote;
          } else if ("text" in noteValue) {
            // Legacy format - migrate to blocks
            const legacyNote = noteValue as Note;
            const now = new Date().toISOString();
            migrated[key] = {
              verseKey: key,
              blocks: textToBlocks(legacyNote.text),
              updatedAt: legacyNote.updatedAt || now,
              createdAt: legacyNote.updatedAt || now,
            };
          }
        }
        return migrated;
      } catch (e) {
        console.error("Failed to parse notes", e);
        return {};
      }
    }
    return {};
  });

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteVerse, setEditingNoteVerse] = useState<Verse | null>(null);

  useEffect(() => {
    localStorage.setItem("luminaNotes", JSON.stringify(notes));
  }, [notes]);

  // --- Surah Notes State ---
  const [surahNotes, setSurahNotes] = useState<Record<number, SurahNote>>(() => {
    const savedSurahNotes = localStorage.getItem("luminaSurahNotes");
    if (savedSurahNotes) {
      try {
        return JSON.parse(savedSurahNotes);
      } catch (e) {
        console.error("Failed to parse surah notes", e);
        return {};
      }
    }
    return {};
  });

  const [surahNoteModalOpen, setSurahNoteModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("luminaSurahNotes", JSON.stringify(surahNotes));
  }, [surahNotes]);

  // --- Settings State (Persisted) ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("luminaSettings");
    const defaults: AppSettings = {
      fontSize: 32,
      translationIds: ["en.sahih"],
      reciterId: "alafasy",
      scriptType: "simple",
      showTranslation: true,
      autoPlay: true,
      theme: "dark",
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaults, ...parsed };
        if (
          merged.translationIds &&
          merged.translationIds.length > 0 &&
          typeof merged.translationIds[0] === "number"
        ) {
          merged.translationIds = ["en.sahih"];
        }
        return merged;
      } catch {
        return defaults;
      }
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem("luminaSettings", JSON.stringify(settings));
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  // --- Audio State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persist last read position so we can restore it on reload
  useEffect(() => {
    if (!currentChapter) return;
    const verse = verses[currentVerseIndex];
    if (!verse) return;

    localStorage.setItem("lastSurahId", currentChapter.id.toString());
    localStorage.setItem("lastVerseKey", verse.verse_key);
  }, [currentChapter, currentVerseIndex, verses]);

  // --- Global Selection Handler ---
  useEffect(() => {
    const handleSelection = (_e: MouseEvent) => {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
        return;
      }

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;

      if (!anchorNode || !focusNode) return;

      // Find the containing verse element
      const parentElement = (
        anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode
      ) as HTMLElement;
      const container = parentElement.closest("[data-verse-key]");

      if (container && container instanceof HTMLElement) {
        const verseKey = container.dataset.verseKey || "";
        const text = selection.toString().trim();

        if (text) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const isPhrase = text.includes(" ");

          // Try to find the word index from the data attribute
          let wordIndex: number | undefined;
          // If the user clicked a specific word span
          const wordSpan = parentElement.closest("[data-word-index]");
          if (wordSpan && !isPhrase) {
            const idxStr = wordSpan.getAttribute("data-word-index");
            if (idxStr) wordIndex = parseInt(idxStr, 10);
          }

          setSelectionContext({
            text,
            verseKey,
            rect,
            type: isPhrase ? "phrase" : "single",
            wordIndex,
          });
        }
      }
    };

    document.addEventListener("mouseup", handleSelection);

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".fixed.z-50")) {
        setSelectionContext(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      const chaptersData = await getChapters();
      setChapters(chaptersData);
      setLoadingChapters(false);

      if (chaptersData.length > 0) {
        const savedVerseKey = localStorage.getItem("lastVerseKey");
        const savedSurahId = localStorage.getItem("lastSurahId");

        let targetVerseKey: string | null = null;
        let initialId = 1;

        if (savedVerseKey) {
          const [surahStr, ayahStr] = savedVerseKey.split(":");
          const surahId = parseInt(surahStr, 10);
          const ayahNum = parseInt(ayahStr, 10);
          const surahExists = chaptersData.some((c) => c.id === surahId);

          if (!isNaN(surahId) && !isNaN(ayahNum) && surahExists) {
            initialId = surahId;
            targetVerseKey = `${surahId}:${ayahNum}`;
          }
        }

        if (!targetVerseKey && savedSurahId) {
          const surahId = parseInt(savedSurahId, 10);
          initialId = chaptersData.some((c) => c.id === surahId) ? surahId : 1;
        }

        handleChapterSelect(initialId, chaptersData, targetVerseKey || undefined);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Audio Logic ---
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = handleAudioEnded;
      audioRef.current.onerror = () => setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (currentChapter && verses[currentVerseIndex]) {
      const verse = verses[currentVerseIndex];
      if (!verse.verse_key) return;

      const verseNum = parseInt(verse.verse_key.split(":")[1]);
      const url = getAudioUrl(settings.reciterId, currentChapter.id, verseNum);

      if (audioRef.current && audioRef.current.src !== url) {
        audioRef.current.src = url;
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerseIndex, currentChapter, settings.reciterId, verses]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        if (!audioRef.current.src || audioRef.current.src === window.location.href) {
          setIsPlaying(false);
          return;
        }
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleAudioEnded = () => {
    // Ref will handle logic
  };

  const nextAyahRef = useRef(() => {});
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  const handleNextAyah = useCallback(() => {
    const wasPlaying = isPlaying;
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex((prev) => prev + 1);
    } else if (settings.autoPlay && currentChapter && currentChapter.id < 114) {
      handleChapterSelect(currentChapter.id + 1).then(() => {
        if (wasPlaying) {
          setPendingPlayFirst(true);
        }
      });
    } else {
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerseIndex, verses, currentChapter, settings.autoPlay, isPlaying]);

  useEffect(() => {
    nextAyahRef.current = handleNextAyah;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerseIndex, verses, currentChapter, settings.autoPlay, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (settings.autoPlay) {
          nextAyahRef.current();
        } else {
          setIsPlaying(false);
        }
      };
    }
  }, [settings.autoPlay]);

  const [pendingPlayFirst, setPendingPlayFirst] = useState(false);
  useEffect(() => {
    if (pendingPlayFirst && !loadingVerses && verses.length > 0) {
      setCurrentVerseIndex(0);
      setIsPlaying(true);
      setPendingPlayFirst(false);
    }
  }, [loadingVerses, verses, pendingPlayFirst]);

  const handlePrevAyah = useCallback(() => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  }, [currentVerseIndex]);

  // --- Scrolling Logic ---
  useEffect(() => {
    if (!loadingVerses && pendingScrollAyah) {
      const element = document.getElementById(pendingScrollAyah);
      if (element) {
        // Clear any existing highlight timeout
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
          highlightTimeoutRef.current = null;
        }

        // Remove highlight from previously highlighted element
        if (highlightedElementRef.current) {
          highlightedElementRef.current.classList.remove(
            "bg-emerald-50/50",
            "dark:bg-emerald-900/30"
          );
          highlightedElementRef.current = null;
        }

        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("bg-emerald-50/50", "dark:bg-emerald-900/30");
          highlightedElementRef.current = element;

          // Set new timeout and store reference
          highlightTimeoutRef.current = setTimeout(() => {
            element.classList.remove("bg-emerald-50/50", "dark:bg-emerald-900/30");
            highlightedElementRef.current = null;
            highlightTimeoutRef.current = null;
          }, 2000);
        }, 100);
        setPendingScrollAyah(null);
      }
    }
  }, [verses, loadingVerses, pendingScrollAyah]);

  // Auto-scroll to current verse when audio advances
  useEffect(() => {
    if (currentChapter && verses[currentVerseIndex]) {
      const verse = verses[currentVerseIndex];
      if (verse.verse_key) {
        const verseNum = verse.verse_key.split(":")[1];
        setPendingScrollAyah(`ayah-${currentChapter.id}-${verseNum}`);
      }
    }
  }, [currentVerseIndex, currentChapter, verses]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: Check if any modal/overlay is open (except analysis sidebar per user request)
      const anyModalOpen =
        searchModalOpen ||
        noteModalOpen ||
        surahNoteModalOpen ||
        settingsOpen ||
        iframeData.isOpen ||
        selectionContext !== null ||
        !settings.userLanguage; // Language selection modal (first-time user)

      if (anyModalOpen) return;

      // Guard: Ignore if user is typing in input/textarea
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      // Guard: Ignore if no verses loaded
      if (verses.length === 0) return;

      // Map keys to navigation actions
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault(); // Prevent page scroll
          handlePrevAyah();
          break;

        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          handleNextAyah();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    searchModalOpen,
    noteModalOpen,
    surahNoteModalOpen,
    settingsOpen,
    iframeData.isOpen,
    selectionContext,
    settings.userLanguage,
    verses.length,
    handleNextAyah,
    handlePrevAyah,
  ]);

  // --- Handlers ---
  const handleChapterSelect = async (
    id: number,
    chaptersList = chapters,
    targetVerseKey?: string
  ) => {
    const chapter = chaptersList.find((c) => c.id === id);
    if (!chapter) return;

    localStorage.setItem("lastSurahId", id.toString());

    setCurrentChapter(chapter);
    setLoadingVerses(true);
    setIsPlaying(false);

    const versesData = await getVerses(id, settings.translationIds);
    setVerses(versesData);

    if (targetVerseKey) {
      const targetIndex = versesData.findIndex((v) => v.verse_key === targetVerseKey);
      if (targetIndex !== -1) {
        setCurrentVerseIndex(targetIndex);
        const [, ayahStr] = targetVerseKey.split(":");
        setPendingScrollAyah(`ayah-${id}-${ayahStr}`);
      } else {
        setCurrentVerseIndex(0);
      }
    } else {
      setCurrentVerseIndex(0);
    }

    setLoadingVerses(false);

    if (!targetVerseKey && !pendingScrollAyah) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (currentChapter) {
      setLoadingVerses(true);
      getVerses(currentChapter.id, settings.translationIds).then((data) => {
        setVerses(data);
        setLoadingVerses(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.translationIds]);

  const handleVerseSelect = (index: number) => {
    setCurrentVerseIndex(index);
    setIsPlaying(false);
  };

  const handleNavigateFromSearch = (surahId: number, ayahNum: number) => {
    const verseKey = `${surahId}:${ayahNum}`;
    const targetId = `ayah-${surahId}-${ayahNum}`;
    setPendingScrollAyah(targetId);

    if (currentChapter?.id !== surahId) {
      handleChapterSelect(surahId, chapters, verseKey);
    } else {
      const targetIndex = verses.findIndex((v) => v.verse_key === verseKey);
      if (targetIndex !== -1) {
        setCurrentVerseIndex(targetIndex);
      }
      const element = document.getElementById(targetId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNavigateByKey = (verseKey: string) => {
    const [surah, ayah] = verseKey.split(":").map(Number);
    handleNavigateFromSearch(surah, ayah);
  };

  // --- Analysis Handlers ---
  const handleAnalyzeRoot = async () => {
    const context = selectionContext;
    if (!context) return;

    setAnalysisSidebarOpen(true);
    setAnalysisMode("root");
    setAnalysisLoading(true);
    setRootData(null);

    const normalized = normalizeArabic(context.text);
    const abjadValue = calculateAbjad(context.text);

    const seedData: RootAnalysis = {
      root: context.text,
      occurrences: 1,
      verses: [
        {
          verse_key: context.verseKey || "1:1",
          text: context.text,
          wordIndex: context.wordIndex || 0,
        },
      ],
      wordForms: [],
      debugInfo: {
        selectedText: context.text,
        normalizedText: normalized,
        abjadValue,
        sameAbjadWords: [],
      },
    };

    // Seed the sidebar immediately so UI can render while data loads
    setRootData(seedData);
    setAnalysisLoading(false);
    setSelectionContext(null);

    try {
      // For standalone words (no verseKey), use the word-to-root index
      if (!context.verseKey) {
        const [root, sameAbjadWords] = await Promise.all([
          findRootForWord(context.text),
          findWordsWithSameAbjad(abjadValue, normalized),
        ]);

        const debugInfo = {
          selectedText: context.text,
          normalizedText: normalized,
          abjadValue,
          sameAbjadWords,
        };

        if (root) {
          const analysis = await findVersesByRoot(root);
          setRootData({
            ...analysis,
            debugInfo,
          });
        } else {
          setRootData({
            root: "Not Found",
            occurrences: 0,
            verses: [],
            wordForms: [],
            debugInfo,
          });
        }

        return;
      }

      const [words, sameAbjadWords] = await Promise.all([
        getVerseWordData(context.verseKey),
        findWordsWithSameAbjad(abjadValue, normalized),
      ]);

      const verseWordsDebug = words.map((w) => ({
        text: w.text_uthmani,
        normalized: normalizeArabic(w.text_uthmani),
        root: w.root || null,
      }));

      // Pass the wordIndex if we have it (User clicked a specific word span)
      const root = findRootOfWord(context.text, words, context.wordIndex);

      const debugInfo = {
        selectedText: context.text,
        normalizedText: normalized,
        abjadValue,
        sameAbjadWords,
        verseWords: verseWordsDebug,
      };

      if (root) {
        const analysis = await findVersesByRoot(root);
        setRootData({
          ...analysis,
          debugInfo,
        });
      } else {
        setRootData({
          root: "Not Found",
          occurrences: 0,
          verses: [],
          wordForms: [],
          debugInfo,
        });
      }
    } catch (error) {
      console.error("Root analysis failed", error);
      setRootData(seedData);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSearchPhrase = async () => {
    if (!selectionContext) return;

    setSelectionContext(null);
    setAnalysisSidebarOpen(true);
    setAnalysisMode("phrase");
    setAnalysisLoading(true);
    setPhraseData(null);

    const result = await searchPhrase(selectionContext.text);
    setPhraseData(result);

    setAnalysisLoading(false);
  };

  const handleCopySelection = () => {
    if (!selectionContext) return;
    const textToCopy = `"${selectionContext.text}" [Quran ${selectionContext.verseKey}]`;
    navigator.clipboard.writeText(textToCopy);
    setSelectionContext(null);
  };

  // --- Translation Handler ---
  const handleTranslate = (service: TranslationService, word: string) => {
    const targetLanguage = settings.userLanguage || "en";
    const verseKey = selectionContext?.verseKey;
    const url = service.getUrl(word, targetLanguage, verseKey);

    if (service.supportsIframe) {
      // Open in iframe modal
      setIframeData({
        isOpen: true,
        url,
        title: `${service.name} - ${word}`,
      });
    } else {
      // Open in new tab (for services that block iframe embedding)
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }

    setSelectionContext(null);
  };

  // --- Single-Click Word Handler ---
  const handleWordClick = (word: string, wordIndex: number, verseKey: string, rect: DOMRect) => {
    setSelectionContext({
      text: word,
      verseKey,
      rect,
      type: "single",
      wordIndex,
    });
  };

  // --- Standalone Word Click (from same abjad list) ---
  const handleStandaloneWordClick = (word: string, rect: DOMRect) => {
    setSelectionContext({
      text: word,
      rect,
      type: "single",
    });
  };

  // --- Note Handlers ---
  const handleOpenNote = (verse: Verse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteVerse(verse);
    setNoteModalOpen(true);
  };

  const handleSaveNote = (blocks: PartialBlock[]) => {
    if (!editingNoteVerse) return;
    const now = new Date().toISOString();
    setNotes((prev) => ({
      ...prev,
      [editingNoteVerse.verse_key]: {
        verseKey: editingNoteVerse.verse_key,
        blocks,
        updatedAt: now,
        createdAt: prev[editingNoteVerse.verse_key]?.createdAt || now,
      },
    }));
  };

  const handleDeleteNote = () => {
    if (!editingNoteVerse) return;
    setNotes((prev) => {
      const copy = { ...prev };
      delete copy[editingNoteVerse.verse_key];
      return copy;
    });
  };

  // --- Surah Note Handlers ---
  const handleSaveSurahNote = (blocks: PartialBlock[]) => {
    if (!currentChapter) return;
    const now = new Date().toISOString();
    setSurahNotes((prev) => ({
      ...prev,
      [currentChapter.id]: {
        surahId: currentChapter.id,
        blocks,
        updatedAt: now,
        createdAt: prev[currentChapter.id]?.createdAt || now,
      },
    }));
  };

  const handleDeleteSurahNote = () => {
    if (!currentChapter) return;
    setSurahNotes((prev) => {
      const copy = { ...prev };
      delete copy[currentChapter.id];
      return copy;
    });
  };

  // Navigation handler for wikilinks in notes
  const handleNavigateFromNote = (surahId: number, verseNumber?: number) => {
    if (verseNumber) {
      handleNavigateFromSearch(surahId, verseNumber);
    } else {
      handleChapterSelect(surahId);
    }
  };

  // --- Import/Export Handlers ---
  const handleExportNotes = () => {
    // Export verse notes in v1 tuple format for backwards compatibility
    const notesArray: NoteExportTuple[] = Object.entries(notes).map(([key, value]) => {
      const note = value as VerseNote;
      // Convert blocks to plain text for v1 compatibility
      const text = blocksToText(note.blocks);
      return [key, text, note.updatedAt];
    });

    // Export surah notes
    const surahNotesArray = Object.values(surahNotes).map((note) => ({
      surahId: note.surahId,
      blocks: note.blocks,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    }));

    // Use v1 format with additional surahNotes field for compatibility
    const exportData: BackupDataV1 & { surahNotes?: typeof surahNotesArray } = {
      v: 1,
      bookmarks: [],
      notes: notesArray,
      surahNotes: surahNotesArray.length > 0 ? surahNotesArray : undefined,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quran_notes_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (
    data: BackupData & {
      surahNotes?: {
        surahId: number;
        blocks: PartialBlock[];
        updatedAt: string;
        createdAt: string;
      }[];
    }
  ) => {
    // Import verse notes (v1 format - tuple array, convert to blocks)
    if (data.notes && Array.isArray(data.notes)) {
      const newNotes: Record<string, VerseNote> = {};
      data.notes.forEach((item) => {
        if (Array.isArray(item) && item.length >= 2) {
          const [key, text, date] = item as NoteExportTuple;
          const now = new Date().toISOString();
          newNotes[key] = {
            verseKey: key,
            blocks: textToBlocks(text),
            updatedAt: date || now,
            createdAt: date || now,
          };
        }
      });
      setNotes((prev) => ({
        ...prev,
        ...newNotes,
      }));
    }

    // Import surah notes if present
    if (data.surahNotes && Array.isArray(data.surahNotes)) {
      const newSurahNotes: Record<number, SurahNote> = {};
      data.surahNotes.forEach((note) => {
        if (note.surahId && note.blocks) {
          newSurahNotes[note.surahId] = {
            surahId: note.surahId,
            blocks: note.blocks,
            updatedAt: note.updatedAt || new Date().toISOString(),
            createdAt: note.createdAt || new Date().toISOString(),
          };
        }
      });
      setSurahNotes((prev) => ({
        ...prev,
        ...newSurahNotes,
      }));
    }
  };

  // --- Language Selection Handler ---
  const handleLanguageSelect = (language: UserLanguage) => {
    const defaultTranslation = language === "fa" ? "fa.makarem" : "en.sahih";
    setSettings((prev) => ({
      ...prev,
      userLanguage: language,
      translationIds: [defaultTranslation],
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      <Header
        chapters={chapters}
        currentChapter={currentChapter}
        onSelectChapter={(id) => handleChapterSelect(id)}
        onOpenSearch={() => setSearchModalOpen(true)}
        onToggleSettings={() => setSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={() =>
          setSettings((prev) => ({ ...prev, theme: prev.theme === "light" ? "dark" : "light" }))
        }
        isHidden={isHeaderHidden}
      />

      <SettingsSidebar
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings({ ...settings, ...newSettings })}
        onExportNotes={handleExportNotes}
        onImportNotes={handleImportNotes}
        notes={notes}
        surahNotes={surahNotes}
        onJumpToNote={handleNavigateByKey}
      />

      {/* Main Layout Container */}
      <div className="flex flex-1 min-h-screen">
        {/* Main Content Area */}
        <main
          ref={setScrollContainer}
          className={`
            flex-1 overflow-y-auto h-screen pt-16 relative transition-all duration-300
            ${analysisSidebarOpen ? "md:mr-80 lg:mr-96" : ""}
         `}
        >
          <div className="max-w-5xl mx-auto px-4 py-8 pb-40">
            {currentChapter && currentChapter.bismillah_pre && (
              <div className="mb-12 flex justify-center">
                <h2 className="text-2xl md:text-3xl font-serif text-slate-800 dark:text-slate-200 opacity-90">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </h2>
              </div>
            )}

            {loadingVerses ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Spinner className="w-10 h-10 text-emerald-600" />
                <p className="text-slate-400">Loading verses...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {verses.map((verse, index) => (
                  <AyahCard
                    key={verse.id}
                    verse={verse}
                    chapterName={currentChapter?.name_simple || ""}
                    chapterId={currentChapter?.id || 0}
                    onNote={handleOpenNote}
                    onSelect={() => handleVerseSelect(index)}
                    onWordClick={handleWordClick}
                    isActive={currentVerseIndex === index}
                    fontSize={settings.fontSize}
                    showTranslation={settings.showTranslation}
                    noteBlocks={notes[verse.verse_key]?.blocks}
                    theme={settings.theme}
                    onNavigateToVerse={handleNavigateFromNote}
                    scriptType={settings.scriptType}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar (Analysis) */}
        <AnalysisSidebar
          isOpen={analysisSidebarOpen}
          onClose={() => setAnalysisSidebarOpen(false)}
          loading={analysisLoading}
          rootData={rootData}
          phraseData={phraseData}
          mode={analysisMode}
          onNavigate={handleNavigateByKey}
          onWordClick={handleStandaloneWordClick}
          onTranslate={handleTranslate}
          userLanguage={settings.userLanguage || "en"}
        />
      </div>

      {/* Floating Player */}
      {verses.length > 0 && (
        <AudioPlayer
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={handleNextAyah}
          onPrev={handlePrevAyah}
          onClose={() => {}}
          autoPlayEnabled={settings.autoPlay}
          onToggleAutoPlay={() => setSettings((prev) => ({ ...prev, autoPlay: !prev.autoPlay }))}
          hasSurahNotes={currentChapter ? !!surahNotes[currentChapter.id] : false}
          onOpenSurahNotes={() => setSurahNoteModalOpen(true)}
        />
      )}

      <AISearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={handleNavigateFromSearch}
      />

      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        verseKey={editingNoteVerse?.verse_key || ""}
        initialNote={editingNoteVerse ? notes[editingNoteVerse.verse_key] : undefined}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        theme={settings.theme}
        onNavigateToVerse={handleNavigateFromNote}
      />

      {/* Surah Note Modal */}
      {currentChapter && (
        <SurahNoteModal
          isOpen={surahNoteModalOpen}
          onClose={() => setSurahNoteModalOpen(false)}
          surahId={currentChapter.id}
          surahName={currentChapter.name_simple}
          initialNote={surahNotes[currentChapter.id]}
          onSave={handleSaveSurahNote}
          onDelete={handleDeleteSurahNote}
          theme={settings.theme}
          onNavigateToVerse={handleNavigateFromNote}
        />
      )}

      {/* Smart Context Menu */}
      {selectionContext && (
        <SmartContextMenu
          context={selectionContext}
          onClose={() => setSelectionContext(null)}
          onAnalyzeRoot={handleAnalyzeRoot}
          onSearchPhrase={handleSearchPhrase}
          onCopy={handleCopySelection}
          onTranslate={handleTranslate}
          userLanguage={settings.userLanguage || "en"}
          hideCopy={!selectionContext.verseKey}
        />
      )}

      <IframeModal
        isOpen={iframeData.isOpen}
        onClose={() => setIframeData({ ...iframeData, isOpen: false })}
        url={iframeData.url}
        title={iframeData.title}
      />

      {/* Language Selection Modal (First-time users) */}
      <LanguageSelectionModal
        isOpen={!settings.userLanguage}
        onSelectLanguage={handleLanguageSelect}
      />
    </div>
  );
};

export default App;
