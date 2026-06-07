---
description: Initialize an Agentic Engineering project skeleton with spec/, entry files, and optional global rules.
argument-hint: "[project goal]"
---

# /ae-init

Run S0 Bootstrap in the current working directory.

## Inputs

- Target root: the current working directory.
- Project goal: `$ARGUMENTS` if provided; otherwise write a short TODO placeholder.
- Global rules file: `${XDG_CONFIG_HOME:-$HOME/.config}/agentic-engineering/ae-rules.md`.

Do not ask for clarification when the project goal is missing. Bootstrap must still finish.

## Contract

Create the standard Agentic Engineering skeleton and report what changed.

Strict idempotence rules:

- Create missing directories and files only.
- Never overwrite existing non-rule files.
- Never delete, rename, or move user files.
- If the global rules file does not exist, do not write an `AE:RULES` block.
- If the global rules file exists and a target entry file has no `AE:RULES` block, append one at the end.
- If the global rules file exists and a target entry file already has an `AE:RULES` block, replace only the bytes from `<!-- AE:RULES:BEGIN -->` through `<!-- AE:RULES:END -->`.
- If marker counts are mismatched or more than one `AE:RULES` block exists, stop and report the malformed file. Do not edit it.

## Standard Skeleton

Directories:

- `reference/`
- `spec/`
- `spec/needs/`
- `spec/ADR/`
- `.codex/`
- `.claude/`
- `data/`
- `scripts/`

Put `.gitkeep` in each leaf or usually-empty directory when missing:

- `reference/.gitkeep`
- `spec/needs/.gitkeep`
- `spec/ADR/.gitkeep`
- `.codex/.gitkeep`
- `.claude/.gitkeep`
- `data/.gitkeep`
- `scripts/.gitkeep`

Entry files:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `handoff.md`
- `spec/README.md`
- `spec/INDEX.md`

Use templates from `ae-init.templates/`. Replace:

- `{{PROJECT_NAME}}` with the target directory basename.
- `{{PROJECT_GOAL}}` with `$ARGUMENTS`, or `TODO: 用一句话说明这个项目要解决什么问题。`

`AGENTS.md` and `CLAUDE.md` must start with identical rendered content. Later user edits may diverge; `/ae-init` must preserve those edits.

## Rule Block Format

When the global rules file exists, sync this exact block into both `AGENTS.md` and `CLAUDE.md`:

```markdown
<!-- AE:RULES:BEGIN -->
<!-- 由 /ae-init 从 ~/.config/agentic-engineering/ae-rules.md 同步,勿手改 -->
<verbatim contents of ae-rules.md>
<!-- AE:RULES:END -->
```

Preserve the rule file contents verbatim, except normalize the block so it has exactly one blank-free marker sequence:

- begin marker
- sync comment
- rules content
- end marker

If the rules content does not end in a newline, add one before the end marker.

## Suggested Procedure

1. Inspect the target root for all standard paths.
2. Create missing directories with `mkdir -p`.
3. Create missing `.gitkeep` files with empty content.
4. Render and write only missing entry files from templates.
5. If the global rules file exists, sync the `AE:RULES` block in `AGENTS.md` and `CLAUDE.md`.
6. Verify the terminal state by checking every standard directory and entry file exists.
7. Report the result.

## Report Format

Reply with:

```text
AE init complete
- Created: <count> (<paths or "none">)
- Skipped: <count> (<paths or "none">)
- Rules: synced | skipped (no global rules file) | failed (<reason>)
- Target: <absolute path>
```

Keep the report short. Do not paste generated file contents unless the user asks.
