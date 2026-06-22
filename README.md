# Agentic Engineering

[![npm version](https://img.shields.io/npm/v/@ecc-hgy/ae.svg)](https://www.npmjs.com/package/@ecc-hgy/ae)
[![license](https://img.shields.io/npm/l/@ecc-hgy/ae.svg)](LICENSE)

Agentic Engineering is a lightweight personal software lifecycle method: SDD records what to build, TDD drives how to prove it works. It is delivered as a zero-dependency npm CLI plus agent skills for multiple AI coding platforms.

## How It Works

```text
   (one-time)  ─────▶  S0 Bootstrap · ae setup → ae init
                            │
   (each request) ──▶  Router · is this request a *need*?
                            │
                ┌──── no ────┴──── yes ────┐
                ▼                           ▼
           just do it                enter S1 Main Loop
       (Q&A / quick fix /                   │
        throwaway script)                   ├─ A. Need:   align → PRD → design → todo → TDD → verify
                                            └─ B. Accept: accept → debug → fix → reverify → sediment
                                                          │
                                                          ▼  (rules proven useful)
                                                     S2 Evolution

   Legend:  SDD = align→PRD→design→todo   ·   TDD = TDD→verify, fix→reverify
   State:   spec/ = what to build (persistent) · INDEX.md = need@node · handoff.md = session snapshot
```

A router (the `using-agentic-engineering` skill) gates each non-trivial request: a *need* enters the SDD+TDD loop, everything else is just done. Questions, quick fixes, and throwaway scripts never pay the ceremony.

## Quick Start

```bash
cd /your/project
npx @ecc-hgy/ae setup
npx @ecc-hgy/ae init "one-line project goal"
```

`ae setup` installs reusable method assets into the AI coding platforms you select. In interactive terminals it prompts for platforms and preselects detected local platform directories. In scripts or CI, pass platforms explicitly:

```bash
npx @ecc-hgy/ae setup --platform claude,codex
```

`ae init` creates the platform-neutral project skeleton and renders entry files. Project-specific rules live directly in `AGENTS.md`.

## CLI

```bash
ae setup
ae setup --platform claude,codex,cursor
ae init "one-line project goal"
ae --help
ae --version
```

Both commands are idempotent. They create missing files, skip existing files, and never overwrite existing entry files. There is no `--force` mode.

`ae init` requires `ae setup` to have run first. This keeps asset installation explicit before skeleton creation.

## Single Source Of Truth

- `AGENTS.md` is the canonical project instructions file.
- `CLAUDE.md` is a short pointer to `AGENTS.md`; do not maintain a separate copy there.
- `ae init` renders `AGENTS.md` nearly blank (title + goal); add your own rules and sections as the project grows — no imposed format.

## Platform Scope

Current target platforms:

| Platform | ID | Skills directory |
|----------|----|------------------|
| Claude Code | `claude` | `.claude/skills/` |
| Codex | `codex` | `.codex/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` |
| GitHub Copilot | `github-copilot` | `.github/skills/` |
| Kilo Code | `kilocode` | `.kilocode/skills/` |
| Kimi Code | `kimicode` | `.kimi-code/skills/` |
| CodeBuddy | `codebuddy` | `.codebuddy/skills/` |
| Qoder | `qoder` | `.qoder/skills/` |
| Trae | `trae` | `.trae/skills/` |
| Cursor | `cursor` | `.cursor/skills/` |
| OpenCode | `opencode` | `.opencode/skills/` |
| Antigravity | `antigravity` | `.agents/skills/` |
| Gemini CLI | `gemini` | `.gemini/skills/` |
| Qwen Code | `qwen` | `.qwen/skills/` |
| Kiro | `kiro` | `.kiro/skills/` |

The first implementation is project-scoped only. It does not generate platform-specific entry rule files such as `.cursorrules`, `GEMINI.md`, or Copilot instructions.

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
| `using-agentic-engineering` | Router: at the start of a non-trivial change, decides whether it enters the SDD+TDD loop and dispatches to the right node skill. |
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
| `karpathy-guidelines` | Always-on coding discipline during A5/B5: think before coding, simplicity first, surgical changes, goal-driven execution. |

## Documentation

- [Framework](docs/framework.md)
- [Spec Framework](docs/spec-framework.md)
- [S0 Bootstrap](docs/scenarios/s0-bootstrap.md)
- [S1 Main Loop](docs/scenarios/s1-main-loop.md)
- [Skill Candidate Design Notes](方案/skill-candidates/README.md)

## Repository Layout

```text
bin/        npm executable entry
src/        zero-dependency CLI implementation
skills/     Selected Agentic Engineering skills
templates/  Entry file templates
docs/       Methodology docs (framework, scenarios, spec framework)
方案/        Design & decision records (issues, roadmap, skill candidates, archive)
tests/      node:test coverage for CLI behavior
```

## Roadmap

Completed:

- v0.2: split CLI into `setup` + `init` and remove slash command assets.
- v0.3: remove rules injection; make `AGENTS.md` the single source of truth and `CLAUDE.md` a pointer.

Next:

1. Design `ae update` for skill/template upgrades.
2. Implement `ae index-rebuild`.
3. Add CI and Windows path validation before broader distribution.

## Limits

`ae index-rebuild` and `ae update` are referenced by the roadmap but not implemented yet. Publishing to npm still requires `npm login`, scope validation, and `npm publish --access public`.
