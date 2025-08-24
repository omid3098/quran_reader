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

### Test Google sign-in on a phone

1. Ensure your laptop and phone are on the same network.
2. In the [Firebase Console](https://console.firebase.google.com) add your laptop's local IP
   (e.g. `192.168.1.10`) to **Authentication → Settings → Authorized domains**.
3. Run the dev server so it listens on the network:
   ```bash
   pnpm --filter web dev -- -H 0.0.0.0
   ```
4. Find your laptop's IP address and open `http://<laptop_ip>:3000` on the phone.
5. Tap **Sign in with Google**. After choosing an account you should return to the app signed in.

## Build (static export)
```bash
pnpm --filter web build
# Static files output to apps/web/out
```

## Deploy to GitHub Pages
Push to `main`. The GitHub Actions workflow `.github/workflows/deploy.yml` builds with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes `apps/web/out` to Pages.

Add your Firebase configuration values and `NEXT_PUBLIC_ENCRYPTION_KEY` as **repository secrets** in **Settings → Secrets and variables → Actions** so the workflow can access them at build time.

If you use a custom domain or serve at root, unset `NEXT_PUBLIC_BASE_PATH` in the workflow.

## Firebase setup

The web app can sync bookmarks, notes and preferences via Firebase when a user signs in with Google or email.

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Add a Web app and copy its configuration values.
3. Enable **Authentication → Google** and **Authentication → Email/Password**. Create a **Firestore** database.
4. In **Firestore → Rules**, allow each signed-in user to read and write only their own data:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/data/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

5. Define the following environment variables locally in `.env` **and** as GitHub repository secrets so the deploy workflow can access them:

```
NEXT_PUBLIC_FIREBASE_API_KEY=yourKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourProjectId
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourBucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=yourSenderId
NEXT_PUBLIC_FIREBASE_APP_ID=yourAppId
NEXT_PUBLIC_ENCRYPTION_KEY=base64Secret16bytes
```

In GitHub, add each of these as a repository secret under **Settings → Secrets and variables → Actions** using the same names; the deploy workflow reads them from `${{ secrets.NAME }}`.

`NEXT_PUBLIC_ENCRYPTION_KEY` must decode to a 16‑byte secret used to encrypt synced data. If it is missing or invalid the app generates a random key for the session. Generate a valid value with:

```
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

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


## Use local Ollama in the browser (CORS)

If you want the site to use your local Ollama models from a browser, allow your page’s origin in Ollama via the `OLLAMA_ORIGINS` environment variable and restart Ollama.

Add both origins:

```
https://www.omid-saadat.com
https://omid3098.github.io
```

### macOS
```bash
launchctl setenv OLLAMA_ORIGINS "https://www.omid-saadat.com,https://omid3098.github.io"
# optional: only if you truly want LAN access
# launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
# restart the Ollama app/service
```

### Linux (systemd)
```bash
sudo systemctl edit ollama.service
# add under [Service]:
# Environment="OLLAMA_ORIGINS=https://www.omid-saadat.com,https://omid3098.github.io"
# (optional) Environment="OLLAMA_HOST=0.0.0.0:11434"
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### Windows
Add a User environment variable `OLLAMA_ORIGINS` with value:

```
https://www.omid-saadat.com,https://omid3098.github.io
```

Then restart Ollama.

These env-vars are the officially supported way to allow cross-origin browser access to a local Ollama API.

