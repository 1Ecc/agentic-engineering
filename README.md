# Agentic Engineering

[![npm version](https://img.shields.io/npm/v/@huguiyuan/ae.svg)](https://www.npmjs.com/package/@huguiyuan/ae)
[![license](https://img.shields.io/npm/l/@huguiyuan/ae.svg)](LICENSE)

Agentic Engineering is a lightweight personal software lifecycle method: SDD records what to build, TDD drives how to prove it works. It is delivered as an npm-installed bundle of Claude Code slash commands plus agent skills.

## Install

```bash
cd /your/project
npx @huguiyuan/ae init
```

Then open Claude Code in the same project and run:

```text
/ae-init "one-line project goal"
```

The npm CLI only installs the method assets into your project:

- `commands/` -> `.claude/commands/`
- `skills/` -> `.claude/skills/`
- `config/` -> `config/`

The real project skeleton creation is intentionally handled by the installed `/ae-init` slash command inside Claude Code. That keeps the markdown command contract as the source of truth and avoids duplicating bootstrap logic in JavaScript.

## CLI

```bash
ae init
ae ingest-mother /path/to/mother-project
ae --help
ae --version
```

`ae init` is idempotent. It creates missing asset files and skips existing files; it never overwrites project edits and has no `--force` mode.

`ae ingest-mother` is a pre-check and instruction helper. It does not read or modify the mother project. After it validates paths, open Claude Code and run `/ae-ingest-mother <path>` to let the slash command propose changes.

## Manual Install

If you are working from a local checkout instead of npm:

```bash
cp -r commands/ /your/project/.claude/commands/
cp -r skills/   /your/project/.claude/skills/
cp -r config/   /your/project/config/
```

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
bin/       npm executable entry
src/       zero-dependency CLI implementation
tests/     node:test coverage for CLI behavior
```

## Roadmap

1. Stage 2: npm CLI asset distribution with `init` and `ingest-mother`. Done.
2. Stage 3: implement `commands/ae-index-rebuild.md` and the underlying `spec/INDEX.md` rebuild behavior.
3. Add CI, changelog, and Windows path validation before broader distribution.

## Limits

`ae-index-rebuild` is referenced by the method but not implemented yet. Publishing to npm still requires `npm login`, scope validation, and `npm publish --access public`.
