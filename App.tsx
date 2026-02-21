import React, { useEffect, useState, useRef, useCallback, Suspense, useMemo } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { Header } from "./components/Header";
import { AudioPlayer } from "./components/AudioPlayer";
import { AyahCardConfig, AyahCardCallbacks, AyahCardNavigation } from "./components/AyahCard";
import VirtualVerseList from "./components/VirtualVerseList";
import { BreadcrumbPanel } from "./components/BreadcrumbPanel";
import { SmartContextMenu } from "./components/SmartContextMenu";
import { IframeModal } from "./components/IframeModal";
import { LanguageSelectionModal } from "./components/LanguageSelectionModal";

// Lazy load heavy components to reduce initial bundle size
const SettingsSidebar = React.lazy(() =>
  import("./components/SettingsSidebar").then((m) => ({ default: m.SettingsSidebar }))
);
const NoteModal = React.lazy(() =>
  import("./components/NoteModal").then((m) => ({ default: m.NoteModal }))
);
const AnalysisSidebar = React.lazy(() =>
  import("./components/AnalysisSidebar").then((m) => ({ default: m.AnalysisSidebar }))
);
const SurahNoteModal = React.lazy(() =>
  import("./components/SurahNoteModal").then((m) => ({ default: m.SurahNoteModal }))
);
const UnifiedSearchModal = React.lazy(() =>
  import("./components/UnifiedSearchModal").then((m) => ({ default: m.UnifiedSearchModal }))
);
const FocusMode = React.lazy(() =>
  import("./components/FocusMode").then((m) => ({ default: m.FocusMode }))
);
const NodeReader = React.lazy(() =>
  import("./components/NodeReader/NodeReader").then((m) => ({ default: m.NodeReader }))
);
import { getChapters, getVerses, getAudioUrl } from "./services/quranService";
import { parseUrlPath, buildVersePath, buildNodePath } from "./services/urlService";
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
  BackupData,
  SelectionContext,
  RootAnalysis,
  UserLanguage,
  VerseRef,
  BreadcrumbEntry,
} from "./types";
import { parseBackupData, mergeParsedBackupData, buildBackupData } from "./services/backupService";
import {
  loadKnowledgeBase,
  importKnowledgeBase,
  clearKnowledgeBaseCache,
} from "./services/knowledgeBaseService";
import { PartialBlock } from "@blocknote/core";
import { Spinner } from "./components/Spinner";
import { useHideOnScroll } from "./hooks/useHideOnScroll";
import { useNotes } from "./hooks/useNotes";

const App: React.FC = () => {
  // --- Data State ---
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const surahNameLookup = useMemo(() => {
    const lookup: Record<number, string> = {};
    chapters.forEach((chapter) => {
      lookup[chapter.id] = chapter.name_simple;
    });
    return lookup;
  }, [chapters]);
  const getSurahName = useCallback(
    (surahId: number) => surahNameLookup[surahId],
    [surahNameLookup]
  );

  // --- UI State ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [_loadingChapters, setLoadingChapters] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [unifiedSearchOpen, setUnifiedSearchOpen] = useState(false);
  const [pendingScrollAyah, setPendingScrollAyah] = useState<string | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
  const virtualizerRef = useRef<Virtualizer<HTMLElement, Element> | null>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
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

  // --- Focus Mode State ---
  const [focusModeData, setFocusModeData] = useState<{
    verse: Verse;
    chapter: Chapter;
  } | null>(null);

  // --- Node Reader State ---
  const [nodeReaderData, setNodeReaderData] = useState<{
    verse: Verse;
    chapter: Chapter;
  } | null>(null);

  // --- Iframe State ---
  const [iframeData, setIframeData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: "",
  });

  // --- Sync State ---
  const [syncingOmidNotes, setSyncingOmidNotes] = useState(false);
  const [lastOmidSyncAt, setLastOmidSyncAt] = useState<string | null>(() => {
    return localStorage.getItem("luminaOmidSyncAt");
  });

  // --- Notes State (with debounced persistence via useNotes hook) ---
  const {
    notes,
    surahNotes,
    saveVerseNote,
    deleteVerseNote,
    saveSurahNote,
    deleteSurahNote,
    getNoteForSurah,
    hasNoteForSurah,
    searchNotes,
    setAllNotes,
    setAllSurahNotes,
  } = useNotes();
  const [noteSearchResults, setNoteSearchResults] = useState<ReturnType<typeof searchNotes>>([]);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteVerse, setEditingNoteVerse] = useState<Verse | null>(null);
  const [surahNoteModalOpen, setSurahNoteModalOpen] = useState(false);

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

  // --- Bookmark & Breadcrumb State ---
  const [bookmarkedVerse, setBookmarkedVerse] = useState<VerseRef | null>(() => {
    const saved = localStorage.getItem("luminaBookmark");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  // Persist bookmark to localStorage
  useEffect(() => {
    if (bookmarkedVerse) {
      localStorage.setItem("luminaBookmark", JSON.stringify(bookmarkedVerse));
    }
  }, [bookmarkedVerse]);

  // Helper: Get current selected verse as VerseRef
  const getSelectedVerseRef = useCallback((): VerseRef | null => {
    if (!currentChapter || !verses[currentVerseIndex]) return null;
    const verse = verses[currentVerseIndex];
    return {
      surahId: currentChapter.id,
      verseNumber: parseInt(verse.verse_key.split(":")[1]),
      verseKey: verse.verse_key,
    };
  }, [currentChapter, verses, currentVerseIndex]);

  // Helper: Add breadcrumb with deduplication
  const addBreadcrumb = useCallback(
    (verseRef: VerseRef) => {
      setBreadcrumbs((prev) => {
        // Don't add if same as last entry
        if (prev.length > 0 && prev[prev.length - 1].verseRef.verseKey === verseRef.verseKey) {
          return prev;
        }
        // Don't add if it's the bookmarked verse
        if (bookmarkedVerse && verseRef.verseKey === bookmarkedVerse.verseKey) {
          return prev;
        }
        return [...prev.slice(-9), { verseRef, timestamp: Date.now() }];
      });
    },
    [bookmarkedVerse]
  );

  // Persist last read position so we can restore it on reload
  useEffect(() => {
    if (!currentChapter) return;
    const verse = verses[currentVerseIndex];
    if (!verse) return;

    localStorage.setItem("lastSurahId", currentChapter.id.toString());
    localStorage.setItem("lastVerseKey", verse.verse_key);
  }, [currentChapter, currentVerseIndex, verses]);

  // Sync URL with current verse position
  useEffect(() => {
    if (!currentChapter || !verses[currentVerseIndex] || loadingVerses) return;

    const verse = verses[currentVerseIndex];
    const verseNumber = parseInt(verse.verse_key.split(":")[1]);
    const newPath = nodeReaderData
      ? buildNodePath(currentChapter.id, verseNumber)
      : buildVersePath(currentChapter.id, verseNumber);

    // Only update if path changed to avoid unnecessary history entries
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, "", newPath);
    }
  }, [currentChapter, currentVerseIndex, verses, loadingVerses, nodeReaderData]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = parseUrlPath(window.location.pathname);
      if (urlParams.isValid && urlParams.surahId) {
        // Open/close node reader based on URL
        if (urlParams.viewMode === "node") {
          if (!nodeReaderData && currentChapter && verses[currentVerseIndex]) {
            setNodeReaderData({ verse: verses[currentVerseIndex], chapter: currentChapter });
          }
        } else {
          if (nodeReaderData) setNodeReaderData(null);
        }

        if (currentChapter?.id !== urlParams.surahId) {
          handleChapterSelect(
            urlParams.surahId,
            chapters,
            urlParams.verseNumber ? `${urlParams.surahId}:${urlParams.verseNumber}` : undefined
          );
        } else if (urlParams.verseNumber) {
          const targetIndex = verses.findIndex(
            (v) => v.verse_key === `${urlParams.surahId}:${urlParams.verseNumber}`
          );
          if (targetIndex !== -1) {
            setCurrentVerseIndex(targetIndex);
          }
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter, chapters, verses]);

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
        // PRIORITY 0: Check sessionStorage for 404 redirect path
        const redirectPath = sessionStorage.getItem("redirect");
        let urlParams;

        if (redirectPath) {
          // Parse the redirect path and clear it
          urlParams = parseUrlPath(redirectPath);
          sessionStorage.removeItem("redirect");
        } else {
          // PRIORITY 1: Check current URL path
          urlParams = parseUrlPath(window.location.pathname);
        }

        let targetVerseKey: string | null = null;
        let initialId = 1;

        if (urlParams.isValid && urlParams.surahId) {
          const surahExists = chaptersData.some((c) => c.id === urlParams.surahId);
          if (surahExists) {
            initialId = urlParams.surahId;
            if (urlParams.verseNumber) {
              targetVerseKey = `${urlParams.surahId}:${urlParams.verseNumber}`;
            }
          }
        } else {
          // PRIORITY 2: Check localStorage (existing logic)
          const savedVerseKey = localStorage.getItem("lastVerseKey");
          const savedSurahId = localStorage.getItem("lastSurahId");
          const savedBookmark = localStorage.getItem("luminaBookmark");

          // Migrate: If no bookmark exists but lastVerseKey does, create bookmark
          if (!savedBookmark && savedVerseKey) {
            const [surahStr, ayahStr] = savedVerseKey.split(":");
            const surahId = parseInt(surahStr, 10);
            const ayahNum = parseInt(ayahStr, 10);
            if (!isNaN(surahId) && !isNaN(ayahNum)) {
              const migratedBookmark: VerseRef = {
                surahId,
                verseNumber: ayahNum,
                verseKey: savedVerseKey,
              };
              setBookmarkedVerse(migratedBookmark);
            }
          }

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
    const currentVerse = verses[currentVerseIndex];
    const isOnBookmark =
      bookmarkedVerse && currentVerse && currentVerse.verse_key === bookmarkedVerse.verseKey;

    if (currentVerseIndex < verses.length - 1) {
      const newIndex = currentVerseIndex + 1;
      setCurrentVerseIndex(newIndex);

      // Update bookmark only if we were on the bookmarked verse
      if (isOnBookmark && currentChapter) {
        const nextVerse = verses[newIndex];
        const newBookmark: VerseRef = {
          surahId: currentChapter.id,
          verseNumber: parseInt(nextVerse.verse_key.split(":")[1]),
          verseKey: nextVerse.verse_key,
        };
        setBookmarkedVerse(newBookmark);
        setBreadcrumbs([]); // Clear breadcrumbs when bookmark moves
      }
    } else if (settings.autoPlay && currentChapter && currentChapter.id < 114) {
      // Moving to next chapter - update bookmark if on bookmark
      const willUpdateBookmark = isOnBookmark;
      handleChapterSelect(currentChapter.id + 1).then(() => {
        if (wasPlaying) {
          setPendingPlayFirst(true);
        }
        // Set bookmark to first verse of new chapter if we were on bookmark
        if (willUpdateBookmark) {
          const newChapterId = currentChapter.id + 1;
          setBookmarkedVerse({
            surahId: newChapterId,
            verseNumber: 1,
            verseKey: `${newChapterId}:1`,
          });
          setBreadcrumbs([]);
        }
      });
    } else {
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerseIndex, verses, currentChapter, settings.autoPlay, isPlaying, bookmarkedVerse]);

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
      const currentVerse = verses[currentVerseIndex];
      const isOnBookmark =
        bookmarkedVerse && currentVerse && currentVerse.verse_key === bookmarkedVerse.verseKey;

      const newIndex = currentVerseIndex - 1;
      setCurrentVerseIndex(newIndex);

      // Update bookmark only if we were on the bookmarked verse
      if (isOnBookmark && currentChapter) {
        const prevVerse = verses[newIndex];
        const newBookmark: VerseRef = {
          surahId: currentChapter.id,
          verseNumber: parseInt(prevVerse.verse_key.split(":")[1]),
          verseKey: prevVerse.verse_key,
        };
        setBookmarkedVerse(newBookmark);
        setBreadcrumbs([]); // Clear breadcrumbs when bookmark moves
      }
    }
  }, [currentVerseIndex, verses, currentChapter, bookmarkedVerse]);

  // --- Scrolling Logic ---
  useEffect(() => {
    if (!loadingVerses && pendingScrollAyah && virtualizerRef.current) {
      // Extract verse key from ayah ID format: "ayah-1-1" -> "1:1"
      const match = pendingScrollAyah.match(/ayah-(\d+)-(\d+)/);
      if (match) {
        const verseKey = `${match[1]}:${match[2]}`;
        const targetIndex = verses.findIndex((v) => v.verse_key === verseKey);

        if (targetIndex !== -1) {
          // Scroll to the verse using virtualizer
          setTimeout(() => {
            virtualizerRef.current?.scrollToIndex(targetIndex, {
              align: "center",
              behavior: "auto",
            });

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

            // Add highlight to new element after scroll
            setTimeout(() => {
              const element = document.getElementById(pendingScrollAyah);
              if (element) {
                element.classList.add("bg-emerald-50/50", "dark:bg-emerald-900/30");
                highlightedElementRef.current = element;

                // Set new timeout and store reference
                highlightTimeoutRef.current = setTimeout(() => {
                  element.classList.remove("bg-emerald-50/50", "dark:bg-emerald-900/30");
                  highlightedElementRef.current = null;
                  highlightTimeoutRef.current = null;
                }, 2000);
              }
            }, 300);
          }, 100);
        }
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

  // Refs for keyboard navigation to avoid re-attaching listener on modal changes
  const keyboardStateRef = useRef({
    unifiedSearchOpen,
    noteModalOpen,
    surahNoteModalOpen,
    settingsOpen,
    iframeDataIsOpen: iframeData.isOpen,
    selectionContext,
    userLanguage: settings.userLanguage,
    versesLength: verses.length,
  });

  // Keep refs in sync with state
  useEffect(() => {
    keyboardStateRef.current = {
      unifiedSearchOpen,
      noteModalOpen,
      surahNoteModalOpen,
      settingsOpen,
      iframeDataIsOpen: iframeData.isOpen,
      selectionContext,
      userLanguage: settings.userLanguage,
      versesLength: verses.length,
    };
  }, [
    unifiedSearchOpen,
    noteModalOpen,
    surahNoteModalOpen,
    settingsOpen,
    iframeData.isOpen,
    selectionContext,
    settings.userLanguage,
    verses.length,
  ]);

  // Refs for navigation handlers
  const handleNextAyahRef = useRef(handleNextAyah);
  const handlePrevAyahRef = useRef(handlePrevAyah);

  useEffect(() => {
    handleNextAyahRef.current = handleNextAyah;
    handlePrevAyahRef.current = handlePrevAyah;
  }, [handleNextAyah, handlePrevAyah]);

  // Keyboard navigation - single listener, reads from refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = keyboardStateRef.current;

      // Ctrl+F / Cmd+F opens unified search modal
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setUnifiedSearchOpen(true);
        return;
      }

      // Guard: Check if any modal/overlay is open (except analysis sidebar per user request)
      const anyModalOpen =
        state.unifiedSearchOpen ||
        state.noteModalOpen ||
        state.surahNoteModalOpen ||
        state.settingsOpen ||
        state.iframeDataIsOpen ||
        state.selectionContext !== null ||
        !state.userLanguage; // Language selection modal (first-time user)

      if (anyModalOpen) return;

      // Guard: Ignore if user is typing in input/textarea
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      // Guard: Ignore if no verses loaded
      if (state.versesLength === 0) return;

      // Map keys to navigation actions
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault(); // Prevent page scroll
          handlePrevAyahRef.current();
          break;

        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          handleNextAyahRef.current();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // Empty deps - listener never re-attaches

  // --- Handlers ---
  const handleChapterSelect = useCallback(
    async (id: number, chaptersList = chapters, targetVerseKey?: string) => {
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
    },
    [chapters, pendingScrollAyah, settings.translationIds]
  );

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

  // Stable callback that accepts verseKey (for React.memo optimization)
  const handleVerseSelectByKey = useCallback(
    (verseKey: string) => {
      const index = verses.findIndex((v) => v.verse_key === verseKey);
      if (index === -1) return;

      // Add current position to breadcrumbs before navigating
      const currentRef = getSelectedVerseRef();
      if (currentRef && currentRef.verseKey !== verseKey) {
        addBreadcrumb(currentRef);
      }

      setCurrentVerseIndex(index);
      setIsPlaying(false);
    },
    [verses, getSelectedVerseRef, addBreadcrumb]
  );

  const handleNavigateFromSearch = useCallback(
    (surahId: number, ayahNum: number) => {
      const verseKey = `${surahId}:${ayahNum}`;
      const targetId = `ayah-${surahId}-${ayahNum}`;

      // Add current position to breadcrumbs before navigating
      const currentRef = getSelectedVerseRef();
      if (currentRef && currentRef.verseKey !== verseKey) {
        addBreadcrumb(currentRef);
      }

      setPendingScrollAyah(targetId);

      if (currentChapter?.id !== surahId) {
        handleChapterSelect(surahId, chapters, verseKey);
      } else {
        const targetIndex = verses.findIndex((v) => v.verse_key === verseKey);
        if (targetIndex !== -1) {
          setCurrentVerseIndex(targetIndex);
        }
        // pendingScrollAyah effect will handle scrolling via virtualizer
      }
    },
    [currentChapter, chapters, verses, getSelectedVerseRef, addBreadcrumb, handleChapterSelect]
  );

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
        selectedVerseKey: context.verseKey,
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
          selectedVerseKey: context.verseKey,
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
        selectedVerseKey: context.verseKey,
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
  const handleTranslate = (
    service: TranslationService,
    word: string,
    explicitVerseKey?: string
  ) => {
    const targetLanguage = settings.userLanguage || "en";
    const verseKey = explicitVerseKey ?? selectionContext?.verseKey;
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
  const handleWordClick = useCallback(
    (word: string, wordIndex: number, verseKey: string, rect: DOMRect) => {
      setSelectionContext({
        text: word,
        verseKey,
        rect,
        type: "single",
        wordIndex,
      });
    },
    []
  );

  // --- Standalone Word Click (from same abjad list) ---
  const handleStandaloneWordClick = (word: string, rect: DOMRect) => {
    setSelectionContext({
      text: word,
      rect,
      type: "single",
    });
  };

  // --- Focus Mode Handlers ---
  const handleFocusModeNext = useCallback(() => {
    handleNextAyah();
    // Update focus mode data after a short delay to allow index to update
    // Or better, use the updated index directly if possible, but index is state
    // So we need to rely on the effect that updates currentVerseIndex?
    // Actually, handleNextAyah updates currentVerseIndex.
    // We can use an effect to sync focusModeData with currentVerseIndex when focus mode is open.
  }, [handleNextAyah]);

  const handleFocusModePrev = useCallback(() => {
    handlePrevAyah();
  }, [handlePrevAyah]);

  // Sync Focus Mode with current verse index
  useEffect(() => {
    if (focusModeData && currentChapter && verses[currentVerseIndex]) {
      const verse = verses[currentVerseIndex];
      if (verse.id !== focusModeData.verse.id) {
        setFocusModeData({ verse, chapter: currentChapter });
      }
    }
  }, [currentVerseIndex, verses, currentChapter, focusModeData]);

  // Sync Node Reader with current verse index
  useEffect(() => {
    if (nodeReaderData && currentChapter && verses[currentVerseIndex]) {
      const verse = verses[currentVerseIndex];
      if (verse.id !== nodeReaderData.verse.id) {
        setNodeReaderData({ verse, chapter: currentChapter });
      }
    }
  }, [currentVerseIndex, verses, currentChapter, nodeReaderData]);

  // --- Note Handlers ---
  const handleOpenNote = useCallback((verse: Verse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteVerse(verse);
    setNoteModalOpen(true);
  }, []);

  const handleSaveNote = (blocks: PartialBlock[]) => {
    if (!editingNoteVerse) return;
    saveVerseNote(editingNoteVerse.verse_key, blocks);
  };

  const handleDeleteNote = () => {
    if (!editingNoteVerse) return;
    deleteVerseNote(editingNoteVerse.verse_key);
  };

  // --- Surah Note Handlers ---
  const handleSaveSurahNote = (blocks: PartialBlock[]) => {
    if (!currentChapter) return;
    saveSurahNote(currentChapter.id, blocks);
  };

  const handleDeleteSurahNote = () => {
    if (!currentChapter) return;
    deleteSurahNote(currentChapter.id);
  };

  // Navigation handler for wikilinks in notes
  const handleNavigateFromNote = useCallback(
    (surahId: number, verseNumber?: number) => {
      if (verseNumber) {
        handleNavigateFromSearch(surahId, verseNumber);
      } else {
        handleChapterSelect(surahId);
      }
    },
    [handleChapterSelect, handleNavigateFromSearch]
  );

  // --- Bookmark & Breadcrumb Handlers ---
  const handleBookmarkVerse = useCallback((verseRef: VerseRef) => {
    setBookmarkedVerse(verseRef);
    setBreadcrumbs([]); // Clear breadcrumbs when bookmark moves
  }, []);

  // Stable callback version for bookmark that accepts verseKey (for React.memo optimization)
  const handleBookmarkByKey = useCallback(
    (verseKey: string) => {
      const [surahIdStr, verseNumStr] = verseKey.split(":");
      const surahId = parseInt(surahIdStr);
      const verseNumber = parseInt(verseNumStr);
      handleBookmarkVerse({
        surahId,
        verseNumber,
        verseKey,
      });
    },
    [handleBookmarkVerse]
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const entry = breadcrumbs[index];
      if (!entry) return;

      // Trim breadcrumbs after clicked position
      setBreadcrumbs((prev) => prev.slice(0, index));

      // Navigate to the breadcrumb
      const { surahId, verseNumber, verseKey } = entry.verseRef;

      if (currentChapter?.id !== surahId) {
        handleChapterSelect(surahId, chapters, verseKey);
      } else {
        const targetIndex = verses.findIndex((v) => v.verse_key === verseKey);
        if (targetIndex !== -1) {
          setCurrentVerseIndex(targetIndex);
          const targetId = `ayah-${surahId}-${verseNumber}`;
          setPendingScrollAyah(targetId);
        }
      }
    },
    [breadcrumbs, currentChapter, chapters, verses, handleChapterSelect]
  );

  const handleNavigateToBookmark = useCallback(() => {
    if (!bookmarkedVerse) return;

    // Clear all breadcrumbs when returning to bookmark
    setBreadcrumbs([]);

    const { surahId, verseNumber, verseKey } = bookmarkedVerse;

    if (currentChapter?.id !== surahId) {
      handleChapterSelect(surahId, chapters, verseKey);
    } else {
      const targetIndex = verses.findIndex((v) => v.verse_key === verseKey);
      if (targetIndex !== -1) {
        setCurrentVerseIndex(targetIndex);
        const targetId = `ayah-${surahId}-${verseNumber}`;
        setPendingScrollAyah(targetId);
      }
    }
  }, [bookmarkedVerse, currentChapter, chapters, verses, handleChapterSelect]);

  // --- Import/Export Handlers ---
  const handleExportNotes = async () => {
    const exportData = await buildBackupData(notes, surahNotes);

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

  const handleImportNotes = async (
    data: BackupData & {
      surahNotes?: {
        surahId: number;
        blocks: PartialBlock[];
        updatedAt: string;
        createdAt: string;
      }[];
    }
  ) => {
    const parsed = parseBackupData(data);
    const currentKb = await loadKnowledgeBase();
    const merged = mergeParsedBackupData(
      { notes, surahNotes, bookmark: bookmarkedVerse, knowledgeBase: currentKb },
      parsed
    );

    setAllNotes(merged.notes);
    setAllSurahNotes(merged.surahNotes);
    if (merged.bookmark) {
      setBookmarkedVerse(merged.bookmark);
    }
    if (merged.knowledgeBase) {
      importKnowledgeBase(merged.knowledgeBase);
      clearKnowledgeBaseCache();
    }
  };

  const handleSyncOmidNotes = async () => {
    const proceed = window.confirm(
      "This will merge Omid's public notes from GitHub into your notes. Please export your notes first so you have a backup. Continue?"
    );
    if (!proceed) return;

    setSyncingOmidNotes(true);
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/omid3098/quran_notes/main/quran_notes_backup.json"
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch backup (status ${response.status})`);
      }

      const json = await response.json();
      const parsed = parseBackupData(json as BackupData);
      const currentKb = await loadKnowledgeBase();
      const merged = mergeParsedBackupData(
        { notes, surahNotes, bookmark: bookmarkedVerse, knowledgeBase: currentKb },
        parsed
      );

      setAllNotes(merged.notes);
      setAllSurahNotes(merged.surahNotes);
      if (merged.bookmark) {
        setBookmarkedVerse(merged.bookmark);
      }
      if (merged.knowledgeBase) {
        importKnowledgeBase(merged.knowledgeBase);
        clearKnowledgeBaseCache();
      }

      const now = new Date().toISOString();
      setLastOmidSyncAt(now);
      localStorage.setItem("luminaOmidSyncAt", now);
      localStorage.setItem("luminaOmidCachedBackup", JSON.stringify(json));
      alert("Omid's notes have been merged into your notes.");
    } catch (error) {
      console.error("Failed to sync Omid notes", error);
      alert("Failed to sync Omid notes. Please try again later.");
    } finally {
      setSyncingOmidNotes(false);
    }
  };

  // --- Sync Bridge: auto-send backup when opened with ?sync=PORT ---
  const syncSentRef = useRef(false);
  useEffect(() => {
    if (syncSentRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const syncPort = params.get("sync");
    if (!syncPort) return;

    // Validate port: must be a number in valid range
    const port = Number(syncPort);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) return;

    // Notes are loaded synchronously from localStorage by useNotes,
    // so they are available on first render. Guard against empty state
    // in case localStorage is genuinely empty.
    const hasData = Object.keys(notes).length > 0 || Object.keys(surahNotes).length > 0;
    if (!hasData) return;

    syncSentRef.current = true;

    const doSync = async () => {
      try {
        const backup = await buildBackupData(notes, surahNotes);
        // Only send to localhost — never to a remote server
        await fetch(`http://127.0.0.1:${port}/backup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backup),
        });
      } catch (err) {
        console.error("Sync bridge failed:", err);
      }
      // Clean the URL so it doesn't re-trigger
      window.history.replaceState({}, "", window.location.pathname);
    };

    doSync();
  }, [notes, surahNotes]);

  // --- Language Selection Handler ---
  const handleLanguageSelect = (language: UserLanguage) => {
    const defaultTranslation = language === "fa" ? "fa.makarem" : "en.sahih";
    setSettings((prev) => ({
      ...prev,
      userLanguage: language,
      translationIds: [defaultTranslation],
    }));
  };

  // --- Memoized Prop Groups for AyahCard (Phase 2 Optimization) ---

  // Config: Stable settings that change together
  const ayahCardConfig: AyahCardConfig = useMemo(
    () => ({
      fontSize: settings.fontSize,
      showTranslation: settings.showTranslation,
      scriptType: settings.scriptType,
    }),
    [settings.fontSize, settings.showTranslation, settings.scriptType]
  );

  // Callbacks: All event handlers
  const ayahCardCallbacks: AyahCardCallbacks = useMemo(
    () => ({
      onNote: handleOpenNote,
      onSelect: handleVerseSelectByKey,
      onWordClick: handleWordClick,
      onBookmark: handleBookmarkByKey,
    }),
    [handleOpenNote, handleVerseSelectByKey, handleWordClick, handleBookmarkByKey]
  );

  const handleOpenFocusMode = useCallback(() => {
    if (currentChapter && verses[currentVerseIndex]) {
      const verse = verses[currentVerseIndex];
      setFocusModeData({ verse, chapter: currentChapter });
    }
  }, [currentChapter, verses, currentVerseIndex]);

  const handleOpenNodeReader = useCallback(() => {
    if (currentChapter && verses[currentVerseIndex]) {
      const verse = verses[currentVerseIndex];
      setNodeReaderData({ verse, chapter: currentChapter });
    }
  }, [currentChapter, verses, currentVerseIndex]);

  // Navigation: Verse navigation helpers
  const ayahCardNavigation: AyahCardNavigation = useMemo(
    () => ({
      onNavigateToVerse: handleNavigateFromNote,
      getSurahName,
    }),
    [handleNavigateFromNote, getSurahName]
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      <Header
        chapters={chapters}
        currentChapter={currentChapter}
        onSelectChapter={(id) => handleChapterSelect(id)}
        onOpenSearch={() => setUnifiedSearchOpen(true)}
        onToggleSettings={() => setSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={() =>
          setSettings((prev) => ({ ...prev, theme: prev.theme === "light" ? "dark" : "light" }))
        }
        onOpenFocusMode={handleOpenFocusMode}
        onOpenNodeReader={handleOpenNodeReader}
        isHidden={isHeaderHidden}
      />

      <Suspense fallback={null}>
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
          onSyncOmidNotes={handleSyncOmidNotes}
          syncingOmidNotes={syncingOmidNotes}
          lastOmidSyncAt={lastOmidSyncAt}
        />
      </Suspense>

      {/* Main Layout Container */}
      <div className="flex flex-1 min-h-screen">
        {/* Main Content Area */}
        <main
          ref={(el) => {
            setScrollContainer(el);
            scrollContainerRef.current = el;
          }}
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
              <VirtualVerseList
                verses={verses}
                scrollElement={scrollContainer}
                config={ayahCardConfig}
                callbacks={ayahCardCallbacks}
                navigation={ayahCardNavigation}
                notes={notes}
                currentVerseIndex={currentVerseIndex}
                bookmarkedVerseKey={bookmarkedVerse?.verseKey}
                currentChapter={currentChapter}
                onVirtualizerReady={(virtualizer) => {
                  virtualizerRef.current = virtualizer;
                }}
              />
            )}
          </div>
        </main>

        {/* Right Sidebar (Analysis) */}
        <Suspense fallback={null}>
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
        </Suspense>
      </div>

      {/* Breadcrumb Navigation Panel */}
      <BreadcrumbPanel
        bookmarkedVerse={bookmarkedVerse}
        breadcrumbs={breadcrumbs}
        currentVerseKey={verses[currentVerseIndex]?.verse_key || null}
        onNavigateToBookmark={handleNavigateToBookmark}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

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
          hasSurahNotes={currentChapter ? hasNoteForSurah(currentChapter.id) : false}
          onOpenSurahNotes={() => setSurahNoteModalOpen(true)}
        />
      )}

      <Suspense fallback={null}>
        <UnifiedSearchModal
          isOpen={unifiedSearchOpen}
          onClose={() => setUnifiedSearchOpen(false)}
          onNavigate={handleNavigateFromSearch}
          currentVerses={verses}
          currentChapterId={currentChapter?.id || null}
          currentChapterName={currentChapter?.name_simple}
          noteSearchResults={noteSearchResults}
          onSearchNotes={(query) => setNoteSearchResults(searchNotes(query))}
          getSurahName={getSurahName}
        />
      </Suspense>

      <Suspense fallback={null}>
        <NoteModal
          isOpen={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          verseKey={editingNoteVerse?.verse_key || ""}
          initialNote={editingNoteVerse ? notes[editingNoteVerse.verse_key] : undefined}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          theme={settings.theme}
          onNavigateToVerse={handleNavigateFromNote}
          getSurahName={getSurahName}
        />
      </Suspense>

      {/* Surah Note Modal */}
      {currentChapter && (
        <Suspense fallback={null}>
          <SurahNoteModal
            isOpen={surahNoteModalOpen}
            onClose={() => setSurahNoteModalOpen(false)}
            surahId={currentChapter.id}
            surahName={currentChapter.name_simple}
            initialNote={getNoteForSurah(currentChapter.id)}
            onSave={handleSaveSurahNote}
            onDelete={handleDeleteSurahNote}
            theme={settings.theme}
            onNavigateToVerse={handleNavigateFromNote}
            getSurahName={getSurahName}
          />
        </Suspense>
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

      {/* Focus Mode Overlay */}
      {focusModeData && (
        <Suspense fallback={null}>
          <FocusMode
            verse={focusModeData.verse}
            chapter={focusModeData.chapter}
            onExit={() => setFocusModeData(null)}
            onNextVerse={handleFocusModeNext}
            onPrevVerse={handleFocusModePrev}
            note={notes[focusModeData.verse.verse_key]}
            onSaveNote={saveVerseNote}
            theme={settings.theme}
            onNavigateToVerse={handleNavigateFromNote}
            getSurahName={getSurahName}
            settings={{ fontSize: settings.fontSize, scriptType: settings.scriptType }}
            breadcrumbs={breadcrumbs}
            bookmark={bookmarkedVerse}
            onNavigateToBookmark={handleNavigateToBookmark}
            onBreadcrumbClick={handleBreadcrumbClick}
            currentVerseKey={focusModeData.verse.verse_key}
            onBookmark={handleBookmarkByKey}
            isBookmarked={bookmarkedVerse?.verseKey === focusModeData.verse.verse_key}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            autoPlayEnabled={settings.autoPlay}
            onToggleAutoPlay={() => setSettings((prev) => ({ ...prev, autoPlay: !prev.autoPlay }))}
            hasSurahNotes={currentChapter ? hasNoteForSurah(currentChapter.id) : false}
            onOpenSurahNotes={() => setSurahNoteModalOpen(true)}
          />
        </Suspense>
      )}

      {/* Node Reader Overlay */}
      {nodeReaderData && (
        <Suspense fallback={null}>
          <NodeReader
            verse={nodeReaderData.verse}
            chapter={nodeReaderData.chapter}
            onExit={() => setNodeReaderData(null)}
            onNextVerse={handleFocusModeNext}
            onPrevVerse={handleFocusModePrev}
            onNavigateToVerse={handleNavigateFromNote}
            getSurahName={getSurahName}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            autoPlayEnabled={settings.autoPlay}
            onToggleAutoPlay={() => setSettings((prev) => ({ ...prev, autoPlay: !prev.autoPlay }))}
            verseNote={notes[nodeReaderData.verse.verse_key]}
            onSaveVerseNote={saveVerseNote}
            surahNote={getNoteForSurah(nodeReaderData.chapter.id)}
            onSaveSurahNote={saveSurahNote}
            theme={settings.theme}
            fontSize={settings.fontSize}
          />
        </Suspense>
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
