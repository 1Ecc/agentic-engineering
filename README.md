# Agentic Engineering

[![npm version](https://img.shields.io/npm/v/@ecc-hgy/ae.svg)](https://www.npmjs.com/package/@ecc-hgy/ae)
[![license](https://img.shields.io/npm/l/@ecc-hgy/ae.svg)](LICENSE)

Agentic Engineering is a lightweight personal software lifecycle method: SDD records what to build, TDD drives how to prove it works. It is delivered as a zero-dependency npm CLI plus agent skills for Claude Code and Codex.

## Quick Start

```bash
cd /your/project
npx @ecc-hgy/ae setup
# Optional: edit config/ae-rules.md
npx @ecc-hgy/ae init "one-line project goal"
```

`ae setup` installs reusable method assets:

- `skills/` -> `.claude/skills/`
- `skills/` -> `.codex/skills/`
- `templates/ae-rules.md` -> `config/ae-rules.md`

`ae init` creates the platform-neutral project skeleton, renders entry files, and syncs the contents of `config/ae-rules.md` into the managed `AE:RULES` block in `AGENTS.md` and `CLAUDE.md`.

## CLI

```bash
ae setup
ae init "one-line project goal"
ae init "goal" --rules /path/to/rules.md
ae --help
ae --version
```

Both commands are idempotent. They create missing files, skip existing files, and never overwrite user edits outside the managed `AE:RULES` block. There is no `--force` mode.

`ae init` requires `ae setup` to have run first. This keeps the two-step workflow explicit so you can edit `config/ae-rules.md` before it is injected.

## Platform Scope

Current target platforms:

- Claude Code: skills installed to `.claude/skills/`
- Codex: skills installed to `.codex/skills/`

Cursor and Trae support is intentionally deferred until their stable local skill/rule loading conventions are confirmed.

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
bin/        npm executable entry
src/        zero-dependency CLI implementation
skills/     Selected Agentic Engineering skills
templates/  Entry file templates and the ae-rules.md starter
docs/       User-facing methodology docs
design/     Design records for this repository
tests/      node:test coverage for CLI behavior
```

## Roadmap

1. Stage 2: npm CLI asset distribution with `init` and `ingest-mother`. Superseded by v0.2.
2. v0.2: split CLI into `setup` + `init`, remove slash command assets, and move rule sync into `ae init`.
3. Stage 3: design `ae update` for skill/template upgrades and implement `ae index-rebuild`.
4. Add CI and Windows path validation before broader distribution.

## Limits

`ae index-rebuild` and `ae update` are referenced by the roadmap but not implemented yet. Publishing to npm still requires `npm login`, scope validation, and `npm publish --access public`.
