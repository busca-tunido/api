# Task: 004 - Migrate API Linter and Formatter to Biome

## Objective
Migrate the API toolchain from oxlint and prettier to Biome, consolidating code formatting, linting, and imports sorting into a unified Rust-based tool.

## Checklist
- [x] Install `@biomejs/biome` and remove `oxlint` and `prettier`
- [x] Configure `biome.json` with project-specific lint rules
- [x] Update `package.json` scripts (`lint`, `format`, `check`)
- [x] Format and lint all source and test files with Biome
- [x] Verify build and tests (`pnpm build && pnpm test`)

## Target Files
- `biome.json`
- `package.json`

## Verification
- Command: `pnpm run check && pnpm build && pnpm test`
