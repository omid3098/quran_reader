import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Type,
  Languages,
  Mic,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Search,
  Database,
  Download,
  Upload,
  PenTool,
  NotebookPen,
  Globe,
} from "lucide-react";
import {
  AppSettings,
  TranslationResource,
  BackupData,
  VerseNote,
  UserLanguage,
  SurahNote,
} from "../types";
import { RECITERS, getAvailableTranslations } from "../services/quranService";
import { Spinner } from "./Spinner";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onExportNotes: () => void;
  onImportNotes: (data: BackupData) => void;
  notes: Record<string, VerseNote>;
  surahNotes?: Record<number, SurahNote>;
  onJumpToNote: (verseKey: string) => void;
}

type Section =
  | "language"
  | "font"
  | "script"
  | "translations"
  | "reciters"
  | "notes"
  | "annotations"
  | "data"
  | null;

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportNotes,
  onImportNotes,
  notes,
  surahNotes,
  onJumpToNote,
}) => {
  const [expandedSection, setExpandedSection] = useState<Section>("font");
  const [availableTranslations, setAvailableTranslations] = useState<TranslationResource[]>([]);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const [translationSearch, setTranslationSearch] = useState("");
  const [reciterSearch, setReciterSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const noteSummary = useMemo(() => {
    const noteEntries = Object.entries(notes || {}) as [string, VerseNote][];
    const list = noteEntries.map(([verseKey, note]) => ({
      verseKey,
      updatedAt: note?.updatedAt || "",
    }));

    list.sort((a, b) => {
      const [aSurah, aVerse] = a.verseKey.split(":").map(Number);
      const [bSurah, bVerse] = b.verseKey.split(":").map(Number);
      if (aSurah !== bSurah) return aSurah - bSurah;
      return aVerse - bVerse;
    });

    return {
      total: list.length,
      list,
    };
  }, [notes]);

  const handleNoteJump = (verseKey: string) => {
    onJumpToNote(verseKey);
    onClose();
  };

  // Load translations on mount
  useEffect(() => {
    const loadTranslations = async () => {
      setLoadingTranslations(true);
      const data = await getAvailableTranslations();
      setAvailableTranslations(data);
      setLoadingTranslations(false);
    };
    loadTranslations();
  }, []);

  const toggleTranslation = (id: string) => {
    const currentIds = settings.translationIds || [];
    let newIds;
    if (currentIds.includes(id)) {
      newIds = currentIds.filter((tid) => tid !== id);
    } else {
      newIds = [...currentIds, id];
    }
    onUpdateSettings({ translationIds: newIds });
  };

  const toggleSection = (section: Section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        // Basic validation
        if (data && Array.isArray(data.notes)) {
          onImportNotes(data as BackupData);
          alert("Notes imported successfully!");
        } else {
          alert("Invalid file format.");
        }
      } catch (error) {
        console.error(error);
        alert("Error parsing import file.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const { total: totalNotes, list: noteList } = noteSummary;

  // Filter and Group Translations
  const filteredTranslations = availableTranslations.filter(
    (t) =>
      t.name.toLowerCase().includes(translationSearch.toLowerCase()) ||
      t.language_name.toLowerCase().includes(translationSearch.toLowerCase()) ||
      t.author_name.toLowerCase().includes(translationSearch.toLowerCase())
  );

  // Group by Language
  const groupedTranslations = filteredTranslations.reduce(
    (groups, trans) => {
      const lang = trans.language_name;
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push(trans);
      return groups;
    },
    {} as Record<string, TranslationResource[]>
  );

  const sortedLanguages = Object.keys(groupedTranslations).sort();

  const translationMap = useMemo(() => {
    const map: Record<string, TranslationResource> = {};
    availableTranslations.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [availableTranslations]);

  const activeTranslations = useMemo(
    () =>
      (settings.translationIds || []).map(
        (id) =>
          translationMap[id] || {
            id,
            name: id,
            author_name: "",
            slug: id,
            language_name: "Unknown",
          }
      ),
    [settings.translationIds, translationMap]
  );

  // Filter Reciters
  const filteredReciters = RECITERS.filter((r) =>
    r.name.toLowerCase().includes(reciterSearch.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Left Aligned */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-200 dark:border-slate-800
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="font-bold text-lg text-emerald-600 dark:text-emerald-400 tracking-wider">
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Language Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("language")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Globe size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Language</h3>
              </div>
              {expandedSection === "language" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === "language" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => onUpdateSettings({ userLanguage: "en" as UserLanguage })}
                    className={`w-full py-3 px-4 rounded-xl text-left font-medium transition-colors border ${
                      settings.userLanguage === "en"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ userLanguage: "fa" as UserLanguage })}
                    className={`w-full py-3 px-4 rounded-xl text-right font-medium transition-colors border font-vazir ${
                      settings.userLanguage === "fa"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                    dir="rtl"
                  >
                    فارسی
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Font Size Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("font")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Type size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Font Size</h3>
              </div>
              {expandedSection === "font" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === "font" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <input
                    type="range"
                    min="20"
                    max="60"
                    step="2"
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                    className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div
                    className="mt-4 text-center font-quran text-slate-800 dark:text-white"
                    style={{ fontSize: `${settings.fontSize}px` }}
                  >
                    بِسْمِ ٱللَّهِ
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Script Style Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("script")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <PenTool size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Script Style</h3>
              </div>
              {expandedSection === "script" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === "script" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <button
                    onClick={() => onUpdateSettings({ scriptType: "simple" })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-right font-quran text-2xl mb-2 ${settings.scriptType === "simple" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100" : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"}`}
                  >
                    الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
                    <span className="block text-xs font-sans text-left mt-2 text-slate-500 font-normal">
                      Standard (Simple)
                    </span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ scriptType: "uthmani" })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-right font-quran text-2xl ${settings.scriptType === "uthmani" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100" : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"}`}
                  >
                    ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ
                    <span className="block text-xs font-sans text-left mt-2 text-slate-500 font-normal">
                      Uthmani (Original)
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Translation Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("translations")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Languages size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Translations</h3>
              </div>
              {expandedSection === "translations" ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>

            {expandedSection === "translations" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Show Text
                  </span>
                  <button
                    onClick={() => onUpdateSettings({ showTranslation: !settings.showTranslation })}
                    className="text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    {settings.showTranslation ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </div>

                {settings.showTranslation && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Active translations
                      </div>
                      {activeTranslations.length === 0 ? (
                        <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                          No translations selected
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activeTranslations.map((trans) => (
                            <button
                              key={trans.id}
                              onClick={() => toggleTranslation(trans.id)}
                              className="group inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-200 text-xs font-medium border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            >
                              <span className="max-w-[140px] truncate text-left">{trans.name}</span>
                              <X
                                size={12}
                                className="text-emerald-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-100"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search language or author..."
                        value={translationSearch}
                        onChange={(e) => setTranslationSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </div>

                    {loadingTranslations ? (
                      <div className="flex justify-center py-4">
                        <Spinner className="text-emerald-500" />
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredTranslations.length === 0 && (
                          <div className="text-center py-4 text-slate-400 text-sm">
                            No translations found
                          </div>
                        )}

                        {sortedLanguages.map((lang) => (
                          <div key={lang} className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 sticky top-0 bg-white dark:bg-slate-900 py-1 z-10">
                              {lang}
                            </h4>
                            {groupedTranslations[lang].map((trans) => {
                              const isSelected = settings.translationIds.includes(trans.id);
                              const isRtlLang = ["Persian", "Urdu", "Arabic"].includes(lang);
                              return (
                                <button
                                  key={trans.id}
                                  onClick={() => toggleTranslation(trans.id)}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  <div
                                    className={`shrink-0 mt-0.5 ${isSelected ? "text-emerald-600 dark:text-emerald-500" : "text-slate-400 dark:text-slate-600"}`}
                                  >
                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                  </div>
                                  <span
                                    className={`text-sm leading-snug ${isSelected ? "text-slate-800 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"} ${isRtlLang ? "font-vazir" : "font-sans"}`}
                                  >
                                    {trans.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reciter Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("reciters")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Mic size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Reciters</h3>
              </div>
              {expandedSection === "reciters" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === "reciters" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200">
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search reciter..."
                    value={reciterSearch}
                    onChange={(e) => setReciterSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredReciters.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">No reciters found</div>
                  )}

                  {filteredReciters.map((reciter) => (
                    <button
                      key={reciter.id}
                      onClick={() => onUpdateSettings({ reciterId: reciter.id })}
                      className={`
                          w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-center justify-between
                          ${
                            settings.reciterId === reciter.id
                              ? "bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-slate-700"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                          }
                        `}
                    >
                      {reciter.name}
                      {settings.reciterId === reciter.id && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("notes")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <NotebookPen size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Notes</h3>
              </div>
              {expandedSection === "notes" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === "notes" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200 space-y-4">
                {/* Verse Notes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Verse Notes</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {totalNotes}
                    </span>
                  </div>

                  {totalNotes === 0 ? (
                    <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                      No verse notes yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {noteList.map((note) => (
                        <button
                          key={note.verseKey}
                          onClick={() => handleNoteJump(note.verseKey)}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 text-center shadow-sm transition-all"
                        >
                          {note.verseKey}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Surah Notes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Surah Notes</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {Object.keys(surahNotes || {}).length}
                    </span>
                  </div>

                  {Object.keys(surahNotes || {}).length === 0 ? (
                    <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                      No surah notes yet. Use the floating button while reading to add surah-level
                      notes.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {Object.keys(surahNotes || {}).map((surahId) => (
                        <div
                          key={surahId}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs font-mono font-semibold text-blue-700 dark:text-blue-300 text-center"
                        >
                          Surah {surahId}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Annotation Tools Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("annotations")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <PenTool size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Annotation Tools</h3>
              </div>
              {expandedSection === "annotations" ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>

            {expandedSection === "annotations" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Drawing tools for streaming and study sessions. Draw on verses with pen, line,
                  arrow, and rectangle tools.
                </p>

                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Enable Annotation Tools
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateSettings({ showAnnotationTools: !settings.showAnnotationTools })
                    }
                    className="focus:outline-none"
                    aria-label="Toggle annotation tools"
                  >
                    {settings.showAnnotationTools ? (
                      <ToggleRight size={28} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </div>

                {settings.showAnnotationTools && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3">
                    <div className="font-semibold mb-1">Keyboard Shortcuts:</div>
                    <div className="space-y-0.5 font-mono">
                      <div>Ctrl/Cmd + P: Pen tool</div>
                      <div>Ctrl/Cmd + E: Eraser tool</div>
                      <div>Ctrl/Cmd + L: Line tool</div>
                      <div>Ctrl/Cmd + Shift + A: Arrow tool</div>
                      <div>Ctrl/Cmd + R: Rectangle tool</div>
                      <div>Ctrl/Cmd + C: Clear all</div>
                      <div>Ctrl/Cmd + D: Toggle tools on/off</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data Management Section */}
          <div className="border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toggleSection("data")}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Database size={20} className="text-emerald-500" />
                <h3 className="font-semibold">Data Management</h3>
              </div>
              {expandedSection === "data" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === "data" && (
              <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-200 space-y-3">
                <button
                  onClick={onExportNotes}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl font-medium transition-colors"
                >
                  <Upload size={18} />
                  Export Notes
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium transition-colors"
                >
                  <Download size={18} />
                  Import Notes
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleFileImport}
                />

                <p className="text-xs text-slate-400 text-center mt-2">
                  Backup your personal notes to a JSON file or restore them from a previous backup.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 text-center border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-600">Open Quran Reader v1.2</p>
        </div>
      </div>
    </>
  );
};
