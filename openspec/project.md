# Project Context

## Purpose
Open Quran Reader is a feature-rich, AI-powered Quran study application. It allows users to read the Quran, listen to recitations, view translations, and engage in deep analysis of the text using AI-powered features like natural language search, verse explanations (Tafseer), and word/root analysis.

## Tech Stack
- **React 19** - UI framework
- **TypeScript 5.8** - Type-safe development
- **Vite 6** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling (inline classes)
- **@google/genai** - Gemini API for AI features
- **lucide-react** - Icon library
- **Playwright** - E2E testing

## Project Conventions

### Code Style
- TypeScript with strict typing via `types.ts` for shared interfaces
- Functional React components with hooks (`useState`, `useEffect`, `useRef`)
- Path alias `@/*` maps to project root
- Target ES2022 with ESNext modules

### Architecture Patterns
- **Flat structure**: No `src/` directory; files at root level
- **Components**: UI components in `/components` directory
- **Services**: Data/API logic encapsulated in `/services` directory
  - `quranService.ts` - Quran data fetching (chapters, verses, translations, audio)
  - `geminiService.ts` - AI features (search, explanations)
  - `analysisService.ts` - Word/root analysis
  - `letterAnalysisService.ts` - Arabic letter analysis
  - `textSanitizer.ts` - Text normalization
- **State management**: React hooks, no external state library
- **Persistence**: Browser localStorage for settings, notes, and bookmarks
- **Single entry point**: `App.tsx` orchestrates all state and child components

### Testing Strategy
- Playwright available for E2E testing
- No unit test framework currently configured

### Git Workflow
- Main branch: `main`
- Conventional commits preferred (e.g., "Add feature", "Fix bug", "Refactor component")

## Domain Context
- **Quran terminology**: Surah (chapter), Ayah (verse), Tafseer (explanation/exegesis)
- **Arabic text handling**: Uthmani script (traditional) and Simple script options
- **Root analysis**: Arabic words share trilateral roots (e.g., "كتب" = k-t-b)
- **Verse keys**: Format is "surah:ayah" (e.g., "1:1" = Al-Fatiha verse 1)
- **Abjad calculation**: Numerical values assigned to Arabic letters
- **Reciters**: Different Qaris (reciters) have distinct audio styles

## Important Constraints
- **API Key required**: Gemini API key must be set in `.env.local` as `GEMINI_API_KEY`
- **RTL support**: Arabic text requires right-to-left rendering
- **Client-side only**: No backend server; all data fetched from external APIs
- **Browser storage limits**: Notes and settings stored in localStorage

## External Dependencies
- **Gemini API** (`@google/genai`) - AI-powered search and explanations
- **api.alquran.cloud** - Quran chapters, verses, and translations
- **everyayah.com** - Verse-by-verse audio recitations
- **Quran.com API** - Word-level data and root analysis
- **quran-roots.json** - Local data source for Arabic root lookups
