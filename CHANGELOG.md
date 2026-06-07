# Changelog

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
