# Changelog

## 0.2.0 (breaking)

- New: `ae setup` installs skills to `.claude/skills/` and `.codex/skills/`, and drops `config/ae-rules.md` from the starter template.
- Rewritten: `ae init` now creates the `spec/` skeleton, renders entry files, and syncs the `AE:RULES` block. It requires `ae setup` to have been run first.
- Removed: `ae ingest-mother` and the `/ae-init` / `/ae-ingest-mother` slash command assets.
- Changed: rule sync moved into `ae init`; it reads `config/ae-rules.md` or an explicit `--rules <path>`.
- Removed: `commands/` assets are no longer installed into user projects. This resolves slash command list pollution in Claude Code.
- Platform: Claude Code + Codex are the current targets, using `.claude/skills/` and `.codex/skills/`.
