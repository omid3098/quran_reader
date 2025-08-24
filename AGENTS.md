# AGENTS

These instructions apply to the entire repository.

## Development workflow
- Use `pnpm` for all package management and scripts.
- Create feature branches for changes; do not commit directly to `main`.
- Before committing, run:
  - `pnpm -r lint`
  - `pnpm -r typecheck`
  - `pnpm -r test --if-present`
  - `NEXT_PUBLIC_BASE_PATH=/quran_reader pnpm --filter web build`
- Ensure commits include relevant tests and documentation updates.

## Deployment
- Pushes to `main` trigger a production deploy to GitHub Pages at `/quran_reader`.
- Pushes to `beta` trigger a beta deploy at `/quran_reader/beta`.
- Set `NEXT_PUBLIC_BASE_PATH` appropriately when building locally.

## Testing guidelines
- Add tests for new functionality using Vitest (packages) or your framework of choice.
- The web app must successfully perform a static export with the correct base path.

## Review requirements
- All pull requests require at least one review and must pass CI checks.
- Keep commit history linear; avoid force pushes to shared branches.

