# Agent Guidelines

Welcome! This repository mirrors the guard-rail driven workflow we use on other projects.

## Workflow expectations

- Always install dependencies with `pnpm install`. Do not use npm or yarn.
- Run the Bun gatekeeper (`bun run gates`) before you consider the work complete. It executes linting, type-checking, and all unit tests. Fix every failure before committing.
- Keep pull requests focused and accompanied by tests that demonstrate the intended behaviour. Every bug fix should have a regression test.

## Testing standards

- Unit tests live beside their packages under `packages/*/test`. Use Vitest (`describe`, `it`) for new tests.
- Prefer deterministic, offline-friendly tests. Mock network access (`fetch`) or other side effects.
- For Next.js components, exercise logic with React Testing Library if UI rendering must be verified. Avoid browser-only APIs in tests.

## UI localisation rule

- Never use hardcoded strings in the UI. Use an existing key from the localization files (`apps/web/src/i18n/*.ts`) or add a new key to those files and reference it with the `t` function.

## Code style

- Stick to existing file conventions (TypeScript + ES modules). Avoid introducing new tooling unless explicitly discussed.
- Prefer small, well-named helpers over inline anonymous functions when logic grows complex.
- Document non-obvious behaviour with comments and tests instead of relying solely on commit messages.
