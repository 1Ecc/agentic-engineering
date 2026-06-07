---
description: Extract proven project-specific rules from a mother project into AGENTS.md with user confirmation.
argument-hint: "<mother-project-path>"
---

# /ae-ingest-mother

Run the optional S0 companion command after `/ae-init`.

## Inputs

- Mother project path: `$ARGUMENTS`.
- Target root: the current working directory.

If `$ARGUMENTS` is empty or the path does not exist, stop with a short error. Do not guess.

## Contract

Extract only stable, project-specific operating rules from the mother project and propose a patch to the target project's `AGENTS.md`.

Strict idempotence rules:

- Do not copy the mother project's full structure.
- Do not import historical notes, one-off implementation details, credentials, generated output, or code.
- Do not edit `AGENTS.md` until the user confirms the proposed diff.
- Preserve `AGENTS.md` content outside the project-specific section.
- Keep `AGENTS.md` short. If the proposed section would become long, recommend moving general behavior into a future S2 skill instead.

## Target Section

Use this section when present:

```markdown
## Project Specific Rules

<!-- AE:PROJECT:BEGIN -->
...
<!-- AE:PROJECT:END -->
```

If the section is missing, propose adding it near the end of `AGENTS.md`.

## Extraction Scope

Read only high-signal entry files from the mother project first:

- `AGENTS.md`
- `CLAUDE.md`
- `handoff.md`
- obvious top-level methodology docs if referenced by the entry files

Do not recursively read the whole mother project by default.

## Procedure

1. Confirm `/ae-init` has run by checking `AGENTS.md`, `CLAUDE.md`, `handoff.md`, and `spec/INDEX.md`.
2. Read the mother project's high-signal entry files.
3. Extract candidate rules as concise bullets.
4. Classify each candidate:
   - project-specific rule -> propose for `AGENTS.md`
   - cross-project reusable rule -> propose manual append to `${XDG_CONFIG_HOME:-$HOME/.config}/agentic-engineering/ae-rules.md`
   - architectural decision -> propose `spec/ADR/NNNN-<title>.md`
   - too broad or repeated pattern -> propose S2 skill candidate
5. Show a minimal diff proposal.
6. Ask for explicit confirmation before writing.
7. After writing, report changed paths and any rejected candidates.

## Report Format

```text
AE ingest mother complete
- Mother: <path>
- Updated: <paths or "none">
- Proposed but not written: <count>
- Next: <recommended follow-up or "none">
```
