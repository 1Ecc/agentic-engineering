# Changelog

## 0.6.0 (2026-09-09)

### Added

- `ae init` now creates `src/`, `tests/`, `docs/`, and `data/` as the small-project
  working skeleton. `data/` covers project data and run results without imposing an
  internal layout; build tools create `dist/` when needed.
- Generated `AGENTS.md` files now include one concise structure rule: organize
  maintained files by responsibility and disclose detail progressively.

### Changed

- The default skeleton no longer creates `scripts/` or `reference/`; code and scripts
  live in `src/`, while source documents and maintained knowledge live in `docs/`.
- `src/` is organized by durable responsibility rather than mirroring
  `spec/needs/`. Existing projects with common source or test roots keep their layout
  instead of receiving duplicate `src/` or `tests/` roots.
- Documentation now distinguishes maintained content from generated `dist/` output
  and applies the same progressive organization rule across `src/`, `tests/`,
  `docs/`, and `data/`.

## 0.5.0 (2026-06-22)

### Added

- `ae setup` now supports project-level skill installation for 15 AI coding
  platforms via a shared platform registry: Claude Code, Codex, Windsurf,
  GitHub Copilot, Kilo Code, Kimi Code, CodeBuddy, Qoder, Trae, Cursor,
  OpenCode, Antigravity, Gemini CLI, Qwen Code, and Kiro.
- Added `ae setup --platform <ids>` for non-interactive installs, including
  comma-separated platform IDs such as `claude,codex,cursor`.

### Changed

- In interactive terminals, `ae setup` now prompts for target platforms and
  preselects detected project-local platform directories.
- In non-interactive mode, `ae setup` now requires `--platform <ids>` instead
  of silently installing only Claude Code and Codex.
- `ae init` accepts AE assets installed for any supported platform, not only
  `.claude/skills/` or `.codex/skills/`.

## 0.4.0 (2026-06-15)

### Added

- New skill `karpathy-guidelines`: an always-on coding discipline (think before
  coding, simplicity first, surgical changes, goal-driven execution) installed by
  `ae setup` into `.claude/skills/` and `.codex/skills/`. Not yet published to npm.
- `ae init` now renders progressive-disclosure spec rule files: `spec/AGENTS.md`,
  `spec/CLAUDE.md`, `spec/ADR/AGENTS.md`, `spec/ADR/CLAUDE.md`. `spec/AGENTS.md`
  carries only the irreducible core (S1 node map, INDEX derivation table, post-write
  INDEX sync) — the part no skill ships; ADR naming/state-machine/frontmatter live in
  `spec/ADR/AGENTS.md`. Other rules (naming, frontmatter shape, state machine,
  boundaries) stay single-sourced in their owning skills to avoid duplication/drift.
  `spec/INDEX.md` carries an inline comment legend explaining how to fill each
  column (prd/design/todo/issues), kept next to the table it documents.
- New skill `using-agentic-engineering`: a thin **router** installed by `ae setup`.
  At the start of a feature, bug fix, or other non-trivial change it decides whether
  the request enters the SDD+TDD loop and dispatches to the right node skill; quick
  fixes, questions, and throwaway scripts skip it (unsure → proceed + a one-line
  nudge). User instructions always override AE defaults. The router is brought in by
  its own skill `description` (no `AGENTS.md` pointer, no session hook); the S1
  node→skill map lives single-sourced in this skill.
- `README.md` gained a `## How It Works` ASCII diagram of the core loop (router gate
  → S1 need/acceptance → S2) and lists the `using-agentic-engineering` router in the
  skills table.

### Changed

- `ae init` now renders a **blank** `AGENTS.md` (title + goal only): no pre-seeded
  `## Project-Specific Rules` / Stack / Structure / Operating Guidelines sections and
  no router pointer. Each project defines its own shape; the router self-triggers via
  its skill `description`. A reliable SessionStart-hook fallback is tracked for later.
- The `using-agentic-engineering` router reads `handoff.md` / `spec/INDEX.md` only
  when it lacks context (fresh session or unclear state), not on every routing turn.

- Skills no longer reference the unshipped `docs/spec-framework.md`; they now point
  to the project-local `spec/AGENTS.md`. Stale `/ae-index-rebuild` slash references
  are corrected to the `ae index-rebuild` CLI form.
- `ae init` root `README.md` template is now an inline-comment-guided skeleton
  (what it is + value / why + for whom / Quick Start / examples / project map + doc
  entries) instead of fixed sections, so authors keep only what they need.

## 0.3.0 (breaking)

### Removed

- `config/ae-rules.md` and the `AE:RULES` sync mechanism. Project-specific rules now live directly in `AGENTS.md` under `## Project-Specific Rules`.
- `--rules <path>` CLI flag.
- `templates/ae-rules.md`.
- `Rules: synced | skipped | failed` line from `ae init` report.

### Changed

- `ae setup` no longer creates `config/` in user projects.
- `AGENTS.md` template now includes a `## Project-Specific Rules` section.
- `CLAUDE.md` template is now a short pointer to `AGENTS.md`; `AGENTS.md` is the single source of truth.

### Upgrade Notes

- `ae init` is idempotent: existing `AGENTS.md` / `CLAUDE.md` files are not touched.
- To benefit from the v0.3 single-source-of-truth pattern, manually copy existing `config/ae-rules.md` content into `AGENTS.md` under `## Project-Specific Rules`, then optionally delete `config/ae-rules.md`.
- Existing `<!-- AE:RULES:BEGIN/END -->` markers in user projects are no longer managed. You can keep or remove them; the CLI ignores them.

## 0.2.0 (breaking)

- New: `ae setup` installs skills to `.claude/skills/` and `.codex/skills/`, and drops `config/ae-rules.md` from the starter template.
- Rewritten: `ae init` now creates the `spec/` skeleton, renders entry files, and syncs the `AE:RULES` block. It requires `ae setup` to have been run first.
- Removed: `ae ingest-mother` and the `/ae-init` / `/ae-ingest-mother` slash command assets.
- Changed: rule sync moved into `ae init`; it reads `config/ae-rules.md` or an explicit `--rules <path>`.
- Removed: `commands/` assets are no longer installed into user projects. This resolves slash command list pollution in Claude Code.
- Platform: Claude Code + Codex are the current targets, using `.claude/skills/` and `.codex/skills/`.
