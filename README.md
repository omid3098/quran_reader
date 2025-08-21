# OpenQuranReader — Quickstart

This project is now a fully static Next.js site. No backend or database is required.

## Prerequisites
- Node.js 20+
- pnpm (Corepack-enabled; run `corepack enable` once)

## Install
```bash
pnpm install
```

## Develop
```bash
pnpm --filter web dev
# => copies XML assets into apps/web/public/quran and starts Next.js at http://localhost:3000
```

## Build (static export)
```bash
pnpm --filter web build
# Static files output to apps/web/out
```

## Deploy to GitHub Pages
Push to `main`. The GitHub Actions workflow `.github/workflows/deploy.yml` builds with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes `apps/web/out` to Pages.

If you use a custom domain or serve at root, unset `NEXT_PUBLIC_BASE_PATH` in the workflow.

## Data sources
- Arabic: `assets/quran/quran-simple.xml`
- Translations: other `*.xml` files in `assets/quran/`

The app reads XML at runtime from `apps/web/public/quran/*.xml`. No JSON duplication is shipped.
