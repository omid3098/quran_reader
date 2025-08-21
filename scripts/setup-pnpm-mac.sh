#!/usr/bin/env bash
set -euo pipefail

# OpenQuranReader pnpm setup (macOS, no Docker)
# - Installs Homebrew (if missing), Node 20, pnpm
# - Assumes local Postgres is installed or installs via Homebrew
# - Creates DB/user, generates data, installs deps, migrates + seeds
# - Starts API and Web (pnpm -w dev)

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

cyan "➡ Checking Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  yellow "Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || true)"
fi

cyan "➡ Ensuring Node.js 20 and pnpm"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE '^v2[0-9]\.'; then
  brew install node@20 || true
  PATH="/opt/homebrew/opt/node@20/bin:$PATH"
fi
if ! command -v pnpm >/dev/null 2>&1; then
  brew install pnpm || pnpm add -g pnpm || true
fi

cyan "➡ Ensuring Postgres 16"
if ! command -v psql >/dev/null 2>&1; then
  brew install postgresql@16
  brew services start postgresql@16
fi

cyan "➡ Creating oqr database and user"
set +e
psql postgres -c "CREATE USER oqr WITH PASSWORD 'oqr';" 2>/dev/null
psql postgres -c "ALTER USER oqr WITH SUPERUSER;" 2>/dev/null
psql postgres -c "CREATE DATABASE oqr OWNER oqr;" 2>/dev/null
set -e

cyan "➡ Writing apps/api/.env"
API_ENV="$REPO_DIR/apps/api/.env"
cat > "$API_ENV" <<EOF
DATABASE_URL=postgresql://oqr:oqr@localhost:5432/oqr?schema=public
EOF

cyan "➡ Generating seed data (scripts/out)"
node scripts/tanzil-import.js

cyan "➡ Installing dependencies"
pnpm install

cyan "➡ Running Prisma migrate + seed"
pushd apps/api >/dev/null
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm db:seed
popd >/dev/null

cyan "➡ Starting API + Web (pnpm -w dev)"
pnpm -w dev &
DEV_PID=$!

green "✅ Setup complete"
echo "API: http://localhost:4000/health (db mode)"
echo "Web: http://localhost:3000"
echo "To stop dev servers: kill $DEV_PID"

if prompt_yes_no "Open web app in browser now?"; then
  open http://localhost:3000
fi

cyan "➡ Configuration"
echo "- Edit $API_ENV to change DATABASE_URL if needed."

