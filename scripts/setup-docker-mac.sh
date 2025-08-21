#!/usr/bin/env bash
set -euo pipefail

# OpenQuranReader Docker setup (macOS)
# - Requires only Docker Desktop
# - Starts Postgres, migrates + seeds DB, runs API and Web

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_DIR"

cyan() { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
err() { printf "\033[31m%s\033[0m\n" "$*" 1>&2; }

prompt_yes_no() {
  local prompt="$1"; shift
  read -r -p "$prompt [y/N]: " ans || true
  case "$ans" in
    [yY][eE][sS]|[yY]) return 0;;
    *) return 1;;
  esac
}

cyan "➡ Checking Docker Desktop"
if ! docker info >/dev/null 2>&1; then
  yellow "Docker not running."
  if prompt_yes_no "Open Docker Desktop (if installed)?"; then
    open -a "Docker"
    yellow "Waiting for Docker to start..."
    SECS=0; until docker info >/dev/null 2>&1; do sleep 2; SECS=$((SECS+2)); [ $SECS -gt 120 ] && break; done
  fi
fi
if ! docker info >/dev/null 2>&1; then
  err "Docker is required. Please install and start Docker Desktop."
  exit 1
fi

cyan "➡ Starting Postgres (docker compose)"
docker compose up -d db

cyan "➡ Generating seed data (scripts/out) using Node container"
docker run --rm \
  -v "$PWD":/workspace -w /workspace \
  node:20-alpine node scripts/tanzil-import.js

cyan "➡ Running Prisma migrate + seed using Node container"
export DATABASE_URL="postgresql://oqr:oqr@host.docker.internal:5432/oqr?schema=public"
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  -v "$PWD":/workspace -w /workspace/apps/api \
  node:20-alpine sh -c "npm install -g prisma && npx prisma generate && npx prisma migrate dev --name init && node scripts/seed.js"

cyan "➡ Building API image"
docker build -t oqr-api ./apps/api

cyan "➡ Starting API (DB mode)"
docker rm -f oqr-api >/dev/null 2>&1 || true
docker run -d --name oqr-api \
  -p 4000:4000 \
  -e DATABASE_URL="$DATABASE_URL" \
  oqr-api

cyan "➡ Starting Web (Next.js) in container"
docker rm -f oqr-web >/dev/null 2>&1 || true
docker run -d --name oqr-web \
  -p 3000:3000 \
  -e OQR_API_URL=http://host.docker.internal:4000 \
  -v "$PWD/apps/web":/app -w /app \
  node:20-alpine sh -c "npm install && npx next build && npx next start -H 0.0.0.0 -p 3000"

green "✅ Docker setup complete"
echo "API:  http://localhost:4000/health"
echo "Web:  http://localhost:3000"
echo "Stop: docker rm -f oqr-web oqr-api"

if prompt_yes_no "Open web app in browser now?"; then
  open http://localhost:3000
fi

cyan "➡ Configuration"
echo "- Override DB URL: export DATABASE_URL=... before running this script"
echo "- Override API URL for web: edit OQR_API_URL in the docker run command above"


