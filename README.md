# Open Quran Reader

A feature-rich, AI-powered Quran study application built with React, TypeScript, and Vite.

## Features

- **Quran Reader** - Clean interface for reading in Uthmani and Simple scripts
- **Audio Player** - Verse-by-verse recitations from 20+ renowned reciters
- **Translations** - Multiple translations in various languages
- **AI Search** - Natural language search powered by Gemini API
- **AI Tafseer** - Easy-to-understand verse explanations
- **Word Analysis** - Root identification, Abjad calculation, and more
- **Note-Taking** - Personal notes saved locally

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js
- Gemini API key

### Installation

```bash
# Install dependencies
bun install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

### Development

```bash
# Start development server
bun run dev
```

The app will be available at `http://localhost:3000`

### Quality Gates

Before committing any changes, run the gates command to ensure quality:

```bash
bun run gates
```

This runs:

1. TypeScript type checking
2. ESLint linting
3. Prettier formatting check
4. Unit tests (80% coverage required)
5. E2E tests

### Available Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `bun run dev`       | Start development server     |
| `bun run build`     | Build for production         |
| `bun run preview`   | Preview production build     |
| `bun run gates`     | Run all quality checks       |
| `bun run test`      | Run all tests                |
| `bun run test:unit` | Run unit tests with coverage |
| `bun run test:e2e`  | Run E2E tests                |
| `bun run lint`      | Run ESLint                   |
| `bun run format`    | Format code with Prettier    |

## Development Workflow (TDD)

This project follows Test-Driven Development:

1. **Write tests first** - Create failing tests for new features
2. **Run gates** - Confirm tests fail as expected
3. **Implement** - Write code to make tests pass
4. **Run gates** - Ensure all tests pass
5. **Commit** - Pre-commit hooks will verify quality

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Tech Stack

- **React 19** - UI framework
- **TypeScript 5.8** - Type-safe development
- **Vite 6** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint + Prettier** - Code quality

## License

MIT
