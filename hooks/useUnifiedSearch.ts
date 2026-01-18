import { useState, useCallback, useMemo } from "react";
import { Verse } from "../types";

export interface SearchResult {
  verseKey: string;
  surahId: number;
  ayahNum: number;
  excerpt: string; // Text with <mark> highlights
  matchType: "arabic" | "translation" | "note";
  surahName?: string;
}

export type SearchTab = "current" | "quran" | "notes";

interface UseUnifiedSearchOptions {
  currentVerses: Verse[];
  currentChapterId: number | null;
  getSurahName?: (surahId: number) => string | undefined;
}

/**
 * Hook for unified search across different contexts.
 *
 * Provides search functionality for:
 * - Current Surah (Arabic + translations)
 * - Whole Quran (fetches via API if needed)
 * - User Notes (searches note content)
 *
 * Features debouncing and result highlighting.
 */
export function useUnifiedSearch({
  currentVerses,
  currentChapterId: _currentChapterId,
  getSurahName: _getSurahName,
}: UseUnifiedSearchOptions) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("current");
  const [isSearching, setIsSearching] = useState(false);

  /**
   * Highlights query matches in text with <mark> tags.
   */
  const highlightMatches = useCallback((text: string, searchQuery: string): string => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }, []);

  /**
   * Searches in current surah verses (Arabic + translations).
   */
  const searchCurrentSurah = useCallback(
    (searchQuery: string): SearchResult[] => {
      if (!searchQuery.trim() || !currentVerses.length) return [];

      const lowerQuery = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      // Check for verse number match
      const searchVerseNum = parseInt(searchQuery, 10);
      const isNumberSearch =
        !isNaN(searchVerseNum) && searchVerseNum.toString() === searchQuery.trim();

      if (isNumberSearch) {
        const targetVerse = currentVerses.find((v) => {
          const [, ayahNum] = v.verse_key.split(":").map(Number);
          return ayahNum === searchVerseNum;
        });

        if (targetVerse) {
          const [surahId, ayahNum] = targetVerse.verse_key.split(":").map(Number);
          results.push({
            verseKey: targetVerse.verse_key,
            surahId,
            ayahNum,
            excerpt: targetVerse.text_uthmani || targetVerse.text_simple || "",
            matchType: "arabic",
          });
        }
      }

      for (const verse of currentVerses) {
        const [surahId, ayahNum] = verse.verse_key.split(":").map(Number);

        // Skip if we already added this verse via number search
        if (isNumberSearch && ayahNum === searchVerseNum) continue;

        // Search in Arabic text
        const arabicText = verse.text_uthmani || verse.text_simple;
        if (arabicText && arabicText.toLowerCase().includes(lowerQuery)) {
          const excerpt = highlightMatches(arabicText.substring(0, 200), searchQuery);
          results.push({
            verseKey: verse.verse_key,
            surahId,
            ayahNum,
            excerpt,
            matchType: "arabic",
          });
          continue; // Don't add duplicate results for the same verse
        }

        // Search in translations
        if (verse.translations) {
          for (const translation of verse.translations) {
            const translationText = translation.text.replace(/<[^>]*>/g, ""); // Remove HTML tags
            if (translationText.toLowerCase().includes(lowerQuery)) {
              const excerpt = highlightMatches(translationText.substring(0, 200), searchQuery);
              results.push({
                verseKey: verse.verse_key,
                surahId,
                ayahNum,
                excerpt,
                matchType: "translation",
              });
              break; // Only add once per verse even if multiple translations match
            }
          }
        }
      }

      return results;
    },
    [currentVerses, highlightMatches]
  );

  /**
   * Searches across the entire Quran.
   * For now, this returns an empty array. Full Quran search would require
   * either pre-indexing or server-side search.
   */
  const searchWholeQuran = useCallback((_searchQuery: string): SearchResult[] => {
    // TODO: Implement full Quran search
    // This would require either:
    // 1. Pre-loading and indexing all verses (heavy on client)
    // 2. Server-side search API
    // 3. Progressive search across surahs

    // For now, return empty array with a placeholder
    // In a real implementation, this would fetch from an API or search pre-loaded data
    return [];
  }, []);

  /**
   * Memoized search results based on current query and active tab.
   */
  const results = useMemo(() => {
    if (!query.trim()) return [];

    switch (activeTab) {
      case "current":
        return searchCurrentSurah(query);
      case "quran":
        return searchWholeQuran(query);
      case "notes":
        // Note search results are passed externally from useNotes
        return [];
      default:
        return [];
    }
  }, [query, activeTab, searchCurrentSurah, searchWholeQuran]);

  /**
   * Debounced query setter.
   */
  const setDebouncedQuery = useCallback((newQuery: string) => {
    setIsSearching(true);
    setQuery(newQuery);
    // In a real implementation, you'd use a debounce utility here
    // For now, we'll keep it simple
    setTimeout(() => setIsSearching(false), 100);
  }, []);

  return {
    query,
    setQuery: setDebouncedQuery,
    activeTab,
    setActiveTab,
    results,
    isSearching,
    highlightMatches,
  };
}
