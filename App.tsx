
import React, { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { SettingsSidebar } from './components/SettingsSidebar';
import { AudioPlayer } from './components/AudioPlayer';
import { AyahCard } from './components/AyahCard';
import { AISearchModal } from './components/AISearchModal';
import { TafseerModal } from './components/TafseerModal';
import { NoteModal } from './components/NoteModal';
import { SmartContextMenu } from './components/SmartContextMenu';
import { AnalysisSidebar } from './components/AnalysisSidebar';
import { IframeModal } from './components/IframeModal';
import { getChapters, getVerses, getAudioUrl } from './services/quranService';
import { explainAyah } from './services/geminiService';
import { getVerseWordData, findRootOfWord, findVersesByRoot, searchPhrase, normalizeArabic } from './services/analysisService';
import { Chapter, Verse, AppSettings, Note, BackupData, NoteExportTuple, SelectionContext, RootAnalysis } from './types';
import { Spinner } from './components/Spinner';

const App: React.FC = () => {
  // --- Data State ---
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  
  // --- UI State ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [pendingScrollAyah, setPendingScrollAyah] = useState<string | null>(null);
  
  // --- Analysis & Context Menu State ---
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [analysisSidebarOpen, setAnalysisSidebarOpen] = useState(false); // Hidden by default; opens when research is triggered
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'root' | 'phrase' | null>(null);
  const [rootData, setRootData] = useState<RootAnalysis | null>(null);
  const [phraseData, setPhraseData] = useState<{ count: number; verses: any[] } | null>(null);

  // --- Iframe State ---
  const [iframeData, setIframeData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  // --- Notes State ---
  const [notes, setNotes] = useState<Record<string, Note>>(() => {
    const savedNotes = localStorage.getItem('luminaNotes');
    if (savedNotes) {
      try {
        return JSON.parse(savedNotes);
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
    localStorage.setItem('luminaNotes', JSON.stringify(notes));
  }, [notes]);

  // --- Settings State (Persisted) ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('luminaSettings');
    const defaults: AppSettings = {
      fontSize: 32,
      translationIds: ['en.sahih'],
      reciterId: 'alafasy',
      scriptType: 'simple',
      showTranslation: true,
      autoPlay: true,
      theme: 'dark'
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaults, ...parsed };
        if (merged.translationIds && merged.translationIds.length > 0 && typeof merged.translationIds[0] === 'number') {
          merged.translationIds = ['en.sahih'];
        }
        return merged;
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('luminaSettings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // --- Audio State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Tafseer State ---
  const [tafseerModalOpen, setTafseerModalOpen] = useState(false);
  const [tafseerLoading, setTafseerLoading] = useState(false);
  const [tafseerContent, setTafseerContent] = useState('');
  const [tafseerVerse, setTafseerVerse] = useState<Verse | null>(null);

  // --- Global Selection Handler ---
  useEffect(() => {
    const handleSelection = (e: MouseEvent) => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
         return;
      }

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      
      if (!anchorNode || !focusNode) return;

      // Find the containing verse element
      const parentElement = (anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode) as HTMLElement;
      const container = parentElement.closest('[data-verse-key]');

      if (container && container instanceof HTMLElement) {
         const verseKey = container.dataset.verseKey || "";
         const text = selection.toString().trim();
         
         if (text) {
             const range = selection.getRangeAt(0);
             const rect = range.getBoundingClientRect();
             const isPhrase = text.includes(' ');

             // Try to find the word index from the data attribute
             let wordIndex: number | undefined;
             // If the user clicked a specific word span
             const wordSpan = parentElement.closest('[data-word-index]');
             if (wordSpan && !isPhrase) {
                const idxStr = wordSpan.getAttribute('data-word-index');
                if (idxStr) wordIndex = parseInt(idxStr, 10);
             }

             setSelectionContext({
               text,
               verseKey,
               rect,
               type: isPhrase ? 'phrase' : 'single',
               wordIndex
             });
         }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    
    const handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.fixed.z-50')) { 
           setSelectionContext(null);
        }
    };
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
        document.removeEventListener('mouseup', handleSelection);
        document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);


  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      const chaptersData = await getChapters();
      setChapters(chaptersData);
      setLoadingChapters(false);
      
      if (chaptersData.length > 0) {
        const savedSurahId = localStorage.getItem('lastSurahId');
        const initialId = savedSurahId ? parseInt(savedSurahId, 10) : 1;
        const validId = chaptersData.find(c => c.id === initialId) ? initialId : 1;
        handleChapterSelect(validId, chaptersData);
      }
    };
    init();
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
      
      const verseNum = parseInt(verse.verse_key.split(':')[1]);
      const url = getAudioUrl(settings.reciterId, currentChapter.id, verseNum);
      
      if (audioRef.current && audioRef.current.src !== url) {
        audioRef.current.src = url;
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    }
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
  const handleNextAyah = () => {
    const wasPlaying = isPlaying;
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex(prev => prev + 1);
    } else if (settings.autoPlay && currentChapter && currentChapter.id < 114) {
      handleChapterSelect(currentChapter.id + 1).then(() => {
        if (wasPlaying) {
          setPendingPlayFirst(true);
        }
      });
    } else {
      setIsPlaying(false);
    }
  };
  
  useEffect(() => {
      nextAyahRef.current = handleNextAyah;
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

  const handlePrevAyah = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  // --- Scrolling Logic ---
  useEffect(() => {
    if (!loadingVerses && pendingScrollAyah) {
      const element = document.getElementById(pendingScrollAyah);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-emerald-50/50', 'dark:bg-emerald-900/30');
          setTimeout(() => element.classList.remove('bg-emerald-50/50', 'dark:bg-emerald-900/30'), 2000);
        }, 100);
        setPendingScrollAyah(null);
      }
    }
  }, [verses, loadingVerses, pendingScrollAyah]);

  // --- Handlers ---
  const handleChapterSelect = async (id: number, chaptersList = chapters) => {
    const chapter = chaptersList.find(c => c.id === id);
    if (!chapter) return;

    localStorage.setItem('lastSurahId', id.toString());

    setCurrentChapter(chapter);
    setLoadingVerses(true);
    setIsPlaying(false);
    setCurrentVerseIndex(0);

    const versesData = await getVerses(id, settings.translationIds);
    setVerses(versesData);
    setLoadingVerses(false);
    
    if (!pendingScrollAyah) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (currentChapter) {
      setLoadingVerses(true);
      getVerses(currentChapter.id, settings.translationIds).then(data => {
        setVerses(data);
        setLoadingVerses(false);
      });
    }
  }, [settings.translationIds]);

  const handleVerseSelect = (index: number) => {
    setCurrentVerseIndex(index);
    setIsPlaying(false);
  };

  const handleNavigateFromSearch = (surahId: number, ayahNum: number) => {
    const targetId = `ayah-${surahId}-${ayahNum}`;
    setPendingScrollAyah(targetId);
    
    if (currentChapter?.id !== surahId) {
      handleChapterSelect(surahId);
    } else {
       const element = document.getElementById(targetId);
       if(element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  const handleNavigateByKey = (verseKey: string) => {
     const [surah, ayah] = verseKey.split(':').map(Number);
     handleNavigateFromSearch(surah, ayah);
  };

  const handleTafseer = async (verse: Verse, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentChapter) return;
    setTafseerVerse(verse);
    setTafseerModalOpen(true);
    setTafseerLoading(true);
    const translation = verse.translations?.[0]?.text || '';
    const explanation = await explainAyah(
      currentChapter.name_simple,
      currentChapter.id,
      parseInt(verse.verse_key.split(':')[1]),
      translation
    );
    setTafseerContent(explanation);
    setTafseerLoading(false);
  };

  // --- Analysis Handlers ---
  const handleAnalyzeRoot = async () => {
    if (!selectionContext) return;
    
    setSelectionContext(null);
    setAnalysisSidebarOpen(true);
    setAnalysisMode('root');
    setAnalysisLoading(true);
    setRootData(null);

    const normalized = normalizeArabic(selectionContext.text);
    const words = await getVerseWordData(selectionContext.verseKey);
    
    const verseWordsDebug = words.map(w => ({
      text: w.text_uthmani,
      normalized: normalizeArabic(w.text_uthmani),
      root: w.root || null
    }));

    // Pass the wordIndex if we have it (User clicked a specific word span)
    const root = findRootOfWord(selectionContext.text, words, selectionContext.wordIndex);
    
    const debugInfo = {
      selectedText: selectionContext.text,
      normalizedText: normalized,
      verseWords: verseWordsDebug
    };

    if (root) {
        const analysis = await findVersesByRoot(root);
        setRootData({
          ...analysis,
          debugInfo
        });
    } else {
        setRootData({ 
          root: "Not Found", 
          occurrences: 0, 
          verses: [],
          debugInfo
        });
    }
    
    setAnalysisLoading(false);
  };

  const handleSearchPhrase = async () => {
    if (!selectionContext) return;
    
    setSelectionContext(null);
    setAnalysisSidebarOpen(true);
    setAnalysisMode('phrase');
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

  // --- Single-Click Word Handler ---
  const handleWordClick = (word: string, wordIndex: number, verseKey: string, rect: DOMRect) => {
    setSelectionContext({
      text: word,
      verseKey,
      rect,
      type: 'single',
      wordIndex
    });
  };

  // --- Note Handlers ---
  const handleOpenNote = (verse: Verse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteVerse(verse);
    setNoteModalOpen(true);
  };

  const handleSaveNote = (text: string) => {
    if (!editingNoteVerse) return;
    setNotes(prev => ({
      ...prev,
      [editingNoteVerse.verse_key]: {
        text,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const handleDeleteNote = () => {
    if (!editingNoteVerse) return;
    setNotes(prev => {
      const copy = { ...prev };
      delete copy[editingNoteVerse.verse_key];
      return copy;
    });
  };

  // --- Import/Export Handlers ---
  const handleExportNotes = () => {
    const notesArray: NoteExportTuple[] = Object.entries(notes).map(([key, value]) => {
      const note = value as Note;
      return [key, note.text, note.updatedAt];
    });

    const exportData: BackupData = {
      v: 1,
      bookmarks: [],
      notes: notesArray,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quran_notes_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (data: BackupData) => {
    if (!data.notes || !Array.isArray(data.notes)) return;
    const newNotes: Record<string, Note> = {};
    data.notes.forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const [key, text, date] = item;
        newNotes[key] = {
          text,
          updatedAt: date || new Date().toISOString()
        };
      }
    });
    setNotes(prev => ({
      ...prev,
      ...newNotes
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
        onToggleTheme={() => setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }))}
      />

      <SettingsSidebar 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings({ ...settings, ...newSettings })}
        onExportNotes={handleExportNotes}
        onImportNotes={handleImportNotes}
      />
      
      {/* Main Layout Container */}
      <div className="flex flex-1 h-[calc(100vh-64px)]">
         
         {/* Main Content Area */}
         <main className={`
            flex-1 overflow-y-auto h-full relative transition-all duration-300
            ${analysisSidebarOpen ? 'md:mr-80 lg:mr-96' : ''}
         `}>
            <div className="max-w-5xl mx-auto px-4 py-8 pb-40">
                {currentChapter && currentChapter.bismillah_pre && (
                    <div className="mb-12 flex justify-center">
                       <h2 className="text-2xl md:text-3xl font-quran text-slate-800 dark:text-slate-200 opacity-90">
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
                        chapterName={currentChapter?.name_simple || ''}
                        chapterId={currentChapter?.id || 0}
                        onExplain={handleTafseer}
                        onNote={handleOpenNote}
                        onSelect={() => handleVerseSelect(index)}
                        onWordClick={handleWordClick}
                        isActive={currentVerseIndex === index}
                        fontSize={settings.fontSize}
                        showTranslation={settings.showTranslation}
                        note={notes[verse.verse_key]?.text}
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
          onToggleAutoPlay={() => setSettings(prev => ({ ...prev, autoPlay: !prev.autoPlay }))}
        />
      )}

      <AISearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)}
        onNavigate={handleNavigateFromSearch}
      />
      
      <TafseerModal
        isOpen={tafseerModalOpen}
        onClose={() => setTafseerModalOpen(false)}
        loading={tafseerLoading}
        content={tafseerContent}
        surahName={currentChapter?.name_simple || ''}
        verseKey={tafseerVerse?.verse_key || ''}
      />

      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        surahName={currentChapter?.name_simple || ''}
        verseKey={editingNoteVerse?.verse_key || ''}
        initialText={editingNoteVerse ? notes[editingNoteVerse.verse_key]?.text || '' : ''}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        fontSize={settings.fontSize}
      />

      {/* Smart Context Menu */}
      {selectionContext && (
         <SmartContextMenu 
             context={selectionContext}
             onClose={() => setSelectionContext(null)}
             onAnalyzeRoot={handleAnalyzeRoot}
             onSearchPhrase={handleSearchPhrase}
             onCopy={handleCopySelection}
         />
      )}

      <IframeModal
        isOpen={iframeData.isOpen}
        onClose={() => setIframeData({ ...iframeData, isOpen: false })}
        url={iframeData.url}
        title={iframeData.title}
      />

    </div>
  );
};

export default App;
