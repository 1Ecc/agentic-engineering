# Agentic Engineering Framework

Agentic Engineering is a lightweight software development lifecycle for solo or small-team work with coding agents. It uses SDD to make "what to build" explicit, then uses TDD to make "how to prove it works" executable.

The method is markdown-first. Durable state lives in `spec/`; session state lives in `handoff.md`; reusable working habits live in skills and rules.

## Core Ideas

| Idea | Meaning |
|------|---------|
| SDD owns scope | Product intent, acceptance, and boundaries are written before implementation. |
| TDD owns correctness | Work proceeds by small vertical slices and real verification evidence. |
| Requirement is the unit | Each need gets its own `spec/needs/<need-name>/` directory. |
| INDEX is structure state | `spec/INDEX.md` lets agents find current needs, status, and next node. |
| Handoff is session state | `handoff.md` is overwritten at session end and only stores the latest snapshot. |
| Rules evolve by use | Reusable rules are promoted only after repeated use and user confirmation. |

## The Three Scenarios

```text
S0 Bootstrap
  |
  v
S1 Main Loop
  |
  +--> A. Need scenario: align -> PRD -> design -> todo -> TDD -> verify
  |
  +--> B. Acceptance scenario: user acceptance -> debug -> fix -> re-verify -> sediment
  |
  v
S2 Evolution
```

### S0 Bootstrap

S0 is now a two-step CLI flow:

```bash
ae setup
ae init "one-line project goal"
```

`ae setup` installs method assets for the current project:

- `.claude/skills/`
- `.codex/skills/`

`ae init` creates the standard project skeleton:

- `README.md`, `AGENTS.md`, `CLAUDE.md`, `handoff.md`
- `reference/`, `data/`, `scripts/`
- `spec/README.md`, `spec/INDEX.md`, `spec/needs/`, `spec/ADR/`

Project-specific rules are written directly in `AGENTS.md` under `## Project-Specific Rules`. `CLAUDE.md` is a short pointer to `AGENTS.md`, so users maintain one canonical instructions file. The CLI is strict and idempotent: create missing files and skip existing files.

Details: [`docs/scenarios/s0-bootstrap.md`](scenarios/s0-bootstrap.md)

### S1 Main Loop

S1 is the normal development loop. It has two serial scenes.

Need scene A:

| Node | Purpose | Skill |
|------|---------|-------|
| A1 | Requirement alignment | `brainstorming`, with `grill-me` for fine detail |
| A2 | Write `prd.md` | `to-prd` |
| A3 | Write `design.md` | `writing-plans` |
| A4 | Write `todo.md` | `to-issues` |
| A5 | Implement by TDD | `tdd` |
| A6 | Real-path verification | `verification-before-completion` |

Acceptance scene B:

| Node | Purpose | Skill |
|------|---------|-------|
| B1 | User acceptance | user-driven |
| B2 | Expected-state alignment | `grill-me` |
| B3 | Root-cause diagnosis | `diagnose` |
| B4 | Write issue file | 7-section local format |
| B5 | Fix by TDD | `tdd` |
| B6 | User re-verification | user-driven |
| B7 | Review and sediment | `review` |

Two hard gates keep the loop disciplined:

- If A1 is not aligned, do not write `prd.md`.
- If B2 expected behavior is not aligned, do not fix.

Details: [`docs/scenarios/s1-main-loop.md`](scenarios/s1-main-loop.md)

### S2 Evolution

S2 is the method improvement loop. When project-specific rules prove useful repeatedly, they can be proposed as reusable method rules or future skills. Promotion is never automatic. The user must confirm it.

Typical S2 inputs:

- A workflow step is repeatedly awkward.
- The same handoff recommendation appears more than once.
- A project-specific rule survives several real uses without rollback.

## Spec Layout

Every initialized project uses this shape:

```text
spec/
├── README.md
├── INDEX.md
├── needs/
│   └── <need-name>/
│       ├── prd.md
│       ├── design.md
│       ├── todo.md
│       └── issues/
│           └── <topic>.md
└── ADR/
    └── NNNN-<title>.md
```

Detailed rules for frontmatter, status values, `INDEX.md`, `README.md`, ADRs, and debug issue files live in [`docs/spec-framework.md`](spec-framework.md).

## Asset Model

The npm package contains:

- `skills/` - selected and customized skills
- `templates/entries/` - entry file templates rendered by `ae init`
- `src/` and `bin/` - the zero-dependency CLI

User projects receive skills under both `.claude/skills/` and `.codex/skills/`. Slash command assets are no longer installed.

## Operating Rules

- Keep `AGENTS.md` concise because every agent session loads it.
- Treat `AGENTS.md` as the single source of truth; `CLAUDE.md` only points Claude Code back to it.
- Put durable project state in `spec/`, not in the conversation.
- Update `spec/INDEX.md` after changing anything under `spec/needs/<need-name>/`.
- If `INDEX.md` is uncertain, use the future `ae index-rebuild` command as the fallback.
- Keep `handoff.md` as the latest snapshot only. Overwrite it, do not append.
