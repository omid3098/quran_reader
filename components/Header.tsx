import React, { useState, useRef, useEffect } from "react";
import { Chapter } from "../types";
import { Search, ChevronDown, Menu, Moon, Sun, Maximize2, Network } from "lucide-react";

interface HeaderProps {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onSelectChapter: (id: number) => void;
  onOpenSearch: () => void;
  onToggleSettings: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenFocusMode: () => void;
  onOpenNodeReader: () => void;
  isHidden?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  chapters,
  currentChapter,
  onSelectChapter,
  onOpenSearch,
  onToggleSettings,
  theme,
  onToggleTheme,
  onOpenFocusMode,
  onOpenNodeReader,
  isHidden = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to selected surah when dropdown opens
  useEffect(() => {
    if (dropdownOpen && selectedItemRef.current && listRef.current) {
      // Small delay to ensure the dropdown is rendered
      requestAnimationFrame(() => {
        selectedItemRef.current?.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      });
    }
  }, [dropdownOpen]);

  const filteredChapters = chapters.filter(
    (c) =>
      c.name_simple.toLowerCase().includes(filter.toLowerCase()) ||
      c.translated_name.name.toLowerCase().includes(filter.toLowerCase()) ||
      String(c.id).includes(filter)
  );

  return (
    <header
      className={`bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 h-16 fixed top-0 inset-x-0 z-30 shadow-sm transition-colors duration-300 transform-gpu transition-transform ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="max-w-6xl mx-auto h-full px-4 relative flex items-center justify-between">
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={onToggleSettings}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full transition-colors"
            title="Menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-emerald-800 dark:text-emerald-500 hidden md:block">
            Open Quran Reader
          </h1>
        </div>

        {/* Center: Surah Dropdown */}
        <div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
          ref={dropdownRef}
        >
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl transition-colors border border-slate-200 dark:border-slate-800"
            >
              <span className="font-semibold">
                {currentChapter
                  ? `${currentChapter.id}. ${currentChapter.name_simple}`
                  : "Select Surah"}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 md:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <input
                    type="text"
                    placeholder="Search Surah..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
                <div ref={listRef} className="overflow-y-auto p-2 flex-1">
                  {filteredChapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      ref={currentChapter?.id === chapter.id ? selectedItemRef : null}
                      onClick={() => {
                        onSelectChapter(chapter.id);
                        setDropdownOpen(false);
                        setFilter("");
                      }}
                      className={`
                            w-full flex items-center justify-between p-2 rounded-lg text-left mb-1 transition-colors
                            ${
                              currentChapter?.id === chapter.id
                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }
                          `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-500 dark:text-slate-400">
                          {chapter.id}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{chapter.name_simple}</span>
                          <span className="text-[10px] text-slate-400">
                            {chapter.translated_name.name}
                          </span>
                        </div>
                      </div>
                      <span dir="rtl" className="font-vazir text-slate-400 dark:text-slate-600">
                        {chapter.name_arabic}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={onToggleTheme}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full transition-colors"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button
            onClick={onOpenNodeReader}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full transition-colors hidden md:block"
            title="Node Reader"
          >
            <Network size={22} />
          </button>
          <button
            onClick={onOpenFocusMode}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full transition-colors hidden md:block"
            title="Enter Focus Mode"
          >
            <Maximize2 size={22} />
          </button>
          <button
            onClick={onOpenSearch}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full transition-colors"
            title="AI Search"
          >
            <Search size={22} />
          </button>
        </div>
      </div>
    </header>
  );
};
