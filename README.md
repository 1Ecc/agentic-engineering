# Agentic Engineering

Agentic Engineering is a lightweight personal software lifecycle method: SDD records what to build, TDD drives how to prove it works. It is delivered as Claude Code slash commands plus agent skills, with a future npm CLI planned as the distribution layer.

## Current Status

The npm CLI is not implemented yet. For now, install the assets manually into a project:

```bash
cp -r commands/ /your/project/.claude/commands/
cp -r skills/   /your/project/.claude/skills/
cp -r config/   /your/project/config/
```

After copying, run `/ae-init` inside the target project to create the standard skeleton.

## Method Overview

| Scenario | Purpose | Main output |
|----------|---------|-------------|
| S0 Bootstrap | Initialize project structure and entry files | `spec/`, `AGENTS.md`, `CLAUDE.md`, `handoff.md` |
| S1A Need | Turn an idea into spec, design, tasks, code, and verification | `prd.md`, `design.md`, `todo.md`, tested code |
| S1B Acceptance | Let user acceptance drive debug, fix, re-verification, and sedimentation | `issues/<topic>.md`, PRD/design/ADR updates |
| S2 Evolution | Promote repeated working habits into reusable method assets | rule or skill proposals |

The two hard gates are:

- No aligned requirement, no `prd.md`.
- No aligned expected behavior, no bug fix.

## Skills

| Skill | Role |
|-------|------|
| `brainstorming` | Coarse requirement alignment before writing PRD. |
| `grill-me` | Fine-grained questioning for interface, field, parameter, or expected-state ambiguity. |
| `to-prd` | Writes `spec/needs/<need-name>/prd.md`. |
| `writing-plans` | Writes `spec/needs/<need-name>/design.md`. |
| `to-issues` | Breaks design into `todo.md` vertical slices. |
| `tdd` | Drives A5 development and B5 bug fixes by red-green-refactor. |
| `verification-before-completion` | Requires fresh real-path evidence before completion claims. |
| `diagnose` | Builds a reproducible feedback loop and identifies root cause. |
| `review` | Reviews against standards and spec, then routes findings into PRD, design, ADR, or S2 candidates. |
| `handoff` | Writes the latest session snapshot to `handoff.md`. |
| `improve-codebase-architecture` | User-triggered architecture deepening review. |
| `zoom-out` | User-triggered higher-level codebase map. |

## Documentation

- [Framework](docs/framework.md)
- [Spec Framework](docs/spec-framework.md)
- [S0 Bootstrap](docs/scenarios/s0-bootstrap.md)
- [S1 Main Loop](docs/scenarios/s1-main-loop.md)
- [Skill Candidate Design Notes](design/skill-candidates/README.md)

## Repository Layout

```text
commands/  Claude Code slash-command contracts
skills/    Selected Agentic Engineering skills
config/    Rule examples
docs/      User-facing methodology docs
design/    Design records for this repository
方案/       Chinese working design drafts, kept for manual review
```

## Roadmap

1. Stage 2: implement the npm CLI with `init`, `ingest-mother`, and `index-rebuild`.
2. Stage 3: implement `commands/ae-index-rebuild.md` and the underlying `spec/INDEX.md` rebuild behavior.
3. Replace manual copy instructions with `npx @huguiyuan/ae init` after publishing.

## Limits

This repository currently ships method assets, not a working npm package. `ae-index-rebuild` is referenced by the method but not implemented yet.
