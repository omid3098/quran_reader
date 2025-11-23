# Research Features Plan

## Overview

This document outlines new statistical and algorithmic research features for Open Quran Reader. All features are **data-driven and deterministic** — no reliance on AI for core functionality.

### Principles

- **Reproducible**: Same input always produces same output
- **Data-based**: Use existing `quran-roots.json` corpus data
- **No interpretation**: Focus on statistics, patterns, and linguistic analysis
- **AI as "Plan Z"**: Only use AI for well-structured tasks with predictable outputs

### Data Source

The `public/quran-roots.json` file contains:

```typescript
{
  "_meta": {
    "source": "Quranic Arabic Corpus (University of Leeds)",
    "stats": { "totalVerses": 6214, "uniqueRoots": 1651 }
  },
  "data": {
    "1:1": [
      { "r": "سمو", "l": "اسْم", "t": "سْمِ" },  // r=root, l=lemma, t=text
      { "r": "أله", "l": "اللَّه", "t": "ٱللَّهِ" },
      ...
    ],
    ...
  }
}
```

---

## Phase 1: Core Infrastructure

### 1.1 Letter Analysis Utilities

**File**: `services/letterAnalysisService.ts`

```typescript
interface LetterStats {
  letter: string;
  count: number;
  percentage: number;
}

interface LetterAnalysisResult {
  totalLetters: number;
  uniqueLetters: number;
  distribution: LetterStats[];
  // Filtered to only Arabic letters (no diacritics)
}

// Functions to implement:
function countLetters(text: string): Map<string, number>;
function analyzeVerse(verseKey: string): LetterAnalysisResult;
function analyzeSurah(surahNumber: number): LetterAnalysisResult;
function analyzeRange(startVerse: string, endVerse: string): LetterAnalysisResult;
```

### 1.2 Multi-Root Search Engine

**File**: `services/multiRootSearchService.ts`

```typescript
type BooleanOperator = "AND" | "OR" | "NOT";

interface SearchQuery {
  roots: string[];
  operator: BooleanOperator;
  proximity?: number; // words apart (optional)
}

interface SearchResult {
  verseKey: string;
  verseText: string;
  matchedRoots: string[];
  positions: number[]; // word indices
}

// Functions to implement:
function searchByRoots(query: SearchQuery): SearchResult[];
function searchWithProximity(root1: string, root2: string, maxDistance: number): SearchResult[];
```

### 1.3 Verse Similarity Calculator

**File**: `services/similarityService.ts`

```typescript
interface SimilarityResult {
  verseKey: string;
  score: number; // 0-1
  sharedRoots: string[];
  sharedRootCount: number;
}

// Jaccard Similarity: |A ∩ B| / |A ∪ B|
function calculateJaccardSimilarity(verse1Roots: string[], verse2Roots: string[]): number;
function findSimilarVerses(verseKey: string, topN: number): SimilarityResult[];
function compareVerses(verse1: string, verse2: string): SimilarityResult;
```

---

## Phase 2: Letter Analysis Features

### 2.1 Letter Frequency Analyzer

**Description**: Analyze letter distribution in any scope (verse, surah, juz, entire Quran).

**UI Location**: New "Research Lab" panel or modal

**Input**:

- Scope selector: Verse / Surah / Juz / Custom Range / Entire Quran
- Surah/verse picker when applicable

**Output**:

- Bar chart showing letter frequencies
- Table with: Letter, Count, Percentage
- Option to export as CSV/JSON

**Algorithm**:

1. Fetch verse text(s) for selected scope
2. Normalize Arabic (remove diacritics, tatweel)
3. Count each unique letter
4. Calculate percentages
5. Sort by frequency (descending)

---

### 2.2 Muqatta'at (حروف مقطعة) Explorer

**Description**: Analyze the mysterious disconnected letters at the beginning of 29 surahs.

**Surahs with Muqatta'at**:
| Letters | Surahs |
|---------|--------|
| الم | 2, 3, 29, 30, 31, 32 |
| المص | 7 |
| الر | 10, 11, 12, 14, 15 |
| المر | 13 |
| كهيعص | 19 |
| طه | 20 |
| طسم | 26, 28 |
| طس | 27 |
| يس | 36 |
| ص | 38 |
| حم | 40, 41, 42, 43, 44, 45, 46 |
| حم عسق | 42 |
| ق | 50 |
| ن | 68 |

**Features**:

#### A. Letter Count in Surah

- For each Muqatta'at surah, count occurrences of its opening letters
- Example: In Surah Al-Baqarah (الم), count ا، ل، م separately

**Output**:

```
Surah 2 (Al-Baqarah) - Opening: الم
├── ا (Alif): 4,502 occurrences
├── ل (Lam): 3,202 occurrences
├── م (Mim): 2,195 occurrences
└── Total: 9,899
```

#### B. Cross-Surah Comparison

- Compare letter ratios across all surahs with same opening
- Example: Compare all الم surahs

**Output Table**:
| Surah | ا Count | ل Count | م Count | ا:ل:م Ratio |
|-------|---------|---------|---------|-------------|
| 2 | 4502 | 3202 | 2195 | 2.05:1.46:1 |
| 3 | 2521 | 1892 | 1251 | 2.02:1.51:1 |
| ... | ... | ... | ... | ... |

#### C. Pattern Discovery

- Identify statistical patterns (if any)
- Compare Muqatta'at surahs vs non-Muqatta'at surahs

**Data Structure**:

```typescript
interface MuqattaatSurah {
  surahNumber: number;
  surahName: string;
  letters: string[]; // e.g., ['ا', 'ل', 'م']
  letterCounts: Map<string, number>;
  totalVerses: number;
  totalWords: number;
}

const MUQATTAAT_SURAHS: MuqattaatSurah[] = [
  { surahNumber: 2, letters: ['ا', 'ل', 'م'], ... },
  // ... all 29 surahs
];
```

---

### 2.3 Hapax Legomena Finder

**Description**: Find words or roots that appear only once (or N times) in the Quran.

**What is Hapax Legomena?**: Greek term for "said only once" — words appearing exactly once in a corpus.

**Features**:

#### A. Unique Roots

- Find roots appearing in only 1 verse
- Find roots appearing only in 1 surah

#### B. Unique Word Forms

- Find exact word forms (with diacritics) appearing only once

#### C. Rare Vocabulary Browser

- Slider: Show words/roots appearing 1-N times
- Filter by surah or entire Quran

**Algorithm**:

1. Build frequency map of all roots/words from `quran-roots.json`
2. Filter by occurrence count threshold
3. For each result, show the verse(s) where it appears

**Output**:

```typescript
interface HapaxResult {
  text: string; // the word or root
  type: "root" | "word" | "lemma";
  count: number;
  occurrences: {
    verseKey: string;
    wordIndex: number;
  }[];
}
```

---

## Phase 3: Advanced Search Features

### 3.1 Multi-Root Boolean Search

**Description**: Find verses containing specific combinations of roots.

**Input Examples**:

- `صبر AND صلاة` → Verses with both patience and prayer
- `موت OR حياة` → Verses with death or life
- `أمن NOT كفر` → Verses with belief but not disbelief

**UI**:

- Text input with syntax hints
- Root autocomplete from known roots
- Operator buttons: AND, OR, NOT

**Algorithm**:

```typescript
function searchBooleanRoots(query: string): SearchResult[] {
  const parsed = parseQuery(query); // Extract roots and operators
  const rootVerseMap = buildRootToVersesMap(); // Precomputed index

  let resultSet: Set<string>;

  for (const { root, operator } of parsed.terms) {
    const versesWithRoot = rootVerseMap.get(root);

    switch (operator) {
      case "AND":
        resultSet = intersection(resultSet, versesWithRoot);
        break;
      case "OR":
        resultSet = union(resultSet, versesWithRoot);
        break;
      case "NOT":
        resultSet = difference(resultSet, versesWithRoot);
        break;
    }
  }

  return Array.from(resultSet).map(fetchVerseDetails);
}
```

---

### 3.2 Proximity Search

**Description**: Find verses where two roots appear within N words of each other.

**Input**:

- Root 1: `قلب`
- Root 2: `ذكر`
- Max distance: 5 words

**Output**: Verses where "heart" and "remember" appear within 5 words

**Algorithm**:

```typescript
function proximitySearch(root1: string, root2: string, maxDistance: number): SearchResult[] {
  const results: SearchResult[] = [];

  for (const [verseKey, words] of rootData.entries()) {
    const positions1 = findRootPositions(words, root1);
    const positions2 = findRootPositions(words, root2);

    for (const p1 of positions1) {
      for (const p2 of positions2) {
        if (Math.abs(p1 - p2) <= maxDistance) {
          results.push({
            verseKey,
            positions: [p1, p2],
            distance: Math.abs(p1 - p2),
          });
          break;
        }
      }
    }
  }

  return results;
}
```

---

### 3.3 Verse Similarity Search

**Description**: Find verses most similar to a given verse based on shared vocabulary.

**Algorithm**: Jaccard Similarity

```
Similarity(A, B) = |Roots(A) ∩ Roots(B)| / |Roots(A) ∪ Roots(B)|
```

**Input**: Any verse key (e.g., "2:255")

**Output**: Top N most similar verses, ranked by similarity score

**Enhancements**:

- Weight important roots higher (lower frequency = higher weight)
- TF-IDF weighting for better relevance
- Exclude common roots (الله، قال، كان) optionally

---

## Phase 4: Pattern & Statistics Features

### 4.1 Repetition Statistics

**Description**: Analyze word/phrase repetition patterns across the Quran.

**Features**:

#### A. Word Frequency Counter

- Count occurrences of any word/root
- Show distribution across surahs

#### B. Symmetry Finder

- Find pairs of words with equal occurrence counts
- Example: "life" and "death" both appear X times

#### C. Phrase Repetition

- Find repeated phrases (2+ words)
- Show all locations

---

### 4.2 Structural Pattern Analysis

**Description**: Analyze structural patterns in the Quran.

**Features**:

#### A. First Word Analysis

- First word of each surah
- First word of each verse in a surah
- Pattern identification

#### B. فواصل (Verse Endings) Analysis

- Last word/root of each verse
- Rhyme pattern detection
- Common endings per surah

#### C. Verse Length Statistics

- Word count per verse
- Character count per verse
- Distribution charts
- Longest/shortest verses

---

### 4.3 Comparative Statistics

**Description**: Compare different sections of the Quran.

**Features**:

#### A. Meccan vs Medinan

Requires surah metadata indicating revelation period.

- Letter frequency comparison
- Average verse length
- Vocabulary overlap
- Root usage patterns

#### B. Surah Comparison

- Compare any two surahs
- Side-by-side statistics
- Shared vs unique vocabulary

---

## UI Design: Research Lab

### Main Interface

```
┌─────────────────────────────────────────────────────────┐
│  Research Lab                                     [×]   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐   │
│  │ Letters │ Roots   │ Search  │ Pattern │ Compare │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘   │
│                                                         │
│  [Content area based on selected tab]                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │              Results / Visualization            │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Export: JSON | CSV | Copy]                            │
└─────────────────────────────────────────────────────────┘
```

### Tab Contents

1. **Letters Tab**
   - Letter Frequency Analyzer
   - Muqatta'at Explorer

2. **Roots Tab**
   - Hapax Legomena Finder
   - Root frequency browser

3. **Search Tab**
   - Multi-Root Boolean Search
   - Proximity Search
   - Verse Similarity Search

4. **Pattern Tab**
   - Repetition Statistics
   - Structural Patterns
   - Verse Length Analysis

5. **Compare Tab**
   - Surah Comparison
   - Meccan vs Medinan (if metadata available)

---

## Implementation Order

### Priority 1 (Foundation)

1. Letter Analysis Utilities (`letterAnalysisService.ts`)
2. Letter Frequency Analyzer UI
3. Muqatta'at Explorer

### Priority 2 (Search)

4. Multi-Root Search Engine (`multiRootSearchService.ts`)
5. Multi-Root Boolean Search UI
6. Proximity Search

### Priority 3 (Analysis)

7. Hapax Legomena Finder
8. Verse Similarity Calculator (`similarityService.ts`)
9. Verse Similarity Search UI

### Priority 4 (Patterns)

10. Repetition Statistics
11. Structural Pattern Analysis
12. Comparative Statistics

---

## Data Requirements

### Already Available

- `quran-roots.json`: Root, lemma, word text for every word
- Verse texts via API or cache

### May Need to Add

- `surah-metadata.json`: Meccan/Medinan classification, verse counts
- Pre-computed indexes for performance:
  - `root-to-verses-index.json`: Map each root to all verses containing it
  - `letter-frequency-cache.json`: Pre-computed letter counts per surah

---

## Performance Considerations

1. **Lazy Loading**: Don't load full corpus until needed
2. **Indexing**: Build inverted indexes on first use, cache in localStorage
3. **Web Workers**: Run heavy computations off main thread
4. **Pagination**: Limit results to prevent UI freeze
5. **Memoization**: Cache frequently accessed computations

---

## Export Formats

All research results should be exportable:

- **JSON**: Full data structure
- **CSV**: Tabular data for spreadsheets
- **Clipboard**: Quick copy for sharing
- **PDF** (future): Formatted research report
