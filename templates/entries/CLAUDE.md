# Project Goal

{{PROJECT_GOAL}}

## R1 Progressive Loading

Keep this file short because every agent session loads it. Do trivial work directly. For non-trivial product, architecture, implementation, or debug work, first load the relevant local guidance or skill, then proceed.

## Spec Landing Rules

- SDD owns what to build; TDD owns how to prove it works.
- After writing or changing anything under `spec/needs/<need-name>/`, update `spec/INDEX.md`.
- If `spec/INDEX.md` cannot be updated confidently, run the future `index-rebuild` command or leave an explicit handoff note.
- Do not write `prd.md` before requirement alignment.
- Do not fix a bug before expected behavior is aligned.

## Project Specific Rules

<!-- AE:PROJECT:BEGIN -->
<!-- Add project-specific rules here. `ae init` manages AE:RULES separately. -->
<!-- AE:PROJECT:END -->
