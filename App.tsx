import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { Header } from "./components/Header";
import { AudioPlayer } from "./components/AudioPlayer";
import { AyahCard } from "./components/AyahCard";
import { BreadcrumbPanel } from "./components/BreadcrumbPanel";
import { SmartContextMenu } from "./components/SmartContextMenu";
import { IframeModal } from "./components/IframeModal";
import { LanguageSelectionModal } from "./components/LanguageSelectionModal";

// Lazy load heavy components to reduce initial bundle size
const SettingsSidebar = React.lazy(() =>
  import("./components/SettingsSidebar").then((m) => ({ default: m.SettingsSidebar }))
);
const AISearchModal = React.lazy(() =>
  import("./components/AISearchModal").then((m) => ({ default: m.AISearchModal }))
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
  VerseRef,
  BreadcrumbEntry,
} from "./types";
import { parseBackupData, mergeParsedBackupData } from "./services/backupService";
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

  // --- Sync State ---
  const [syncingOmidNotes, setSyncingOmidNotes] = useState(false);
  const [lastOmidSyncAt, setLastOmidSyncAt] = useState<string | null>(() => {
    return localStorage.getItem("luminaOmidSyncAt");
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
        const savedBookmark = localStorage.getItem("luminaBookmark");

        let targetVerseKey: string | null = null;
        let initialId = 1;

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

  const handleVerseSelect = (index: number) => {
    // Add current position to breadcrumbs before navigating
    const currentRef = getSelectedVerseRef();
    if (currentRef) {
      const targetVerse = verses[index];
      // Only add breadcrumb if navigating to a different verse
      if (targetVerse && targetVerse.verse_key !== currentRef.verseKey) {
        addBreadcrumb(currentRef);
      }
    }

    setCurrentVerseIndex(index);
    setIsPlaying(false);
  };

  const handleNavigateFromSearch = (surahId: number, ayahNum: number) => {
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

  // --- Bookmark & Breadcrumb Handlers ---
  const handleBookmarkVerse = useCallback((verseRef: VerseRef) => {
    setBookmarkedVerse(verseRef);
    setBreadcrumbs([]); // Clear breadcrumbs when bookmark moves
  }, []);

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
    const parsed = parseBackupData(data);
    const merged = mergeParsedBackupData({ notes, surahNotes, bookmark: bookmarkedVerse }, parsed);

    setNotes(merged.notes);
    setSurahNotes(merged.surahNotes);
    if (merged.bookmark) {
      setBookmarkedVerse(merged.bookmark);
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
      const merged = mergeParsedBackupData(
        { notes, surahNotes, bookmark: bookmarkedVerse },
        parsed
      );

      setNotes(merged.notes);
      setSurahNotes(merged.surahNotes);
      if (merged.bookmark) {
        setBookmarkedVerse(merged.bookmark);
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
                    isBookmarked={bookmarkedVerse?.verseKey === verse.verse_key}
                    onBookmark={() =>
                      handleBookmarkVerse({
                        surahId: currentChapter?.id || 0,
                        verseNumber: parseInt(verse.verse_key.split(":")[1]),
                        verseKey: verse.verse_key,
                      })
                    }
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
          hasSurahNotes={currentChapter ? !!surahNotes[currentChapter.id] : false}
          onOpenSurahNotes={() => setSurahNoteModalOpen(true)}
        />
      )}

      <Suspense fallback={null}>
        <AISearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onNavigate={handleNavigateFromSearch}
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
            initialNote={surahNotes[currentChapter.id]}
            onSave={handleSaveSurahNote}
            onDelete={handleDeleteSurahNote}
            theme={settings.theme}
            onNavigateToVerse={handleNavigateFromNote}
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
