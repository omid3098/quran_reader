# OpenQuranReader — Quickstart

A simple Quran reader I developed for my personal use.

## Live at:
https://www.omid-saadat.com/quran_reader

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


## Licenses and attribution

This project includes Quran text and translations sourced from the Tanzil Project.

- Arabic text: "Tanzil Quran Text (Simple, Version 1.1)" — Copyright © 2007–2025 Tanzil Project. Licensed under Creative Commons Attribution 3.0 (CC BY 3.0). Per Tanzil’s terms, please indicate Tanzil as the source and link to `tanzil.net` for updates.
- Translations: XML files: Tanzil.net.

If you distribute this project or a derivative that includes these texts, you must preserve attribution to the Tanzil Project and include a link to `https://tanzil.net` as required by CC BY 3.0 and Tanzil usage terms. See the `NOTICE` file in this repository for a concise attribution statement.


### Audio streaming

The app streams recitation audio from third-party services:

- EveryAyah: per-ayah MP3 streams (e.g., Husary Tartil). Source: `https://everyayah.com`. Used for streaming only; no redistribution.
- Islamic Network (Quran.com CDN) for Alafasy global-indexed MP3: `https://cdn.islamic.network`. Used for streaming only.

Please credit these services if you distribute or deploy derivatives that rely on their streaming endpoints and respect their terms of use.


