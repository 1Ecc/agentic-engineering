# Agentic Engineering Framework

Agentic Engineering is a lightweight software development lifecycle for solo or small-team work with coding agents. It uses SDD to make "what to build" explicit, then uses TDD to make "how to prove it works" executable.

The method is intentionally markdown-first. It avoids a heavy state machine, YAML workflow engine, or mandatory CLI runtime. The durable state lives in `spec/`; session state lives in `handoff.md`.

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

S0 creates the standard project skeleton:

- `README.md`, `AGENTS.md`, `CLAUDE.md`, `handoff.md`
- `reference/`, `data/`, `scripts/`
- `spec/README.md`, `spec/INDEX.md`, `spec/needs/`, `spec/ADR/`
- `.codex/`, `.claude/`

The current asset is the `/ae-init` slash-command contract at [`commands/ae-init.md`](../commands/ae-init.md). It is designed to be strict and idempotent: create missing files, never overwrite user files, and only rewrite the managed `AE:RULES` block.

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

This repository is arranged as a future npm CLI package, but the core method is plain files:

- `commands/` - slash-command contracts that should be copied to `.claude/commands/`
- `skills/` - the selected and customized skills
- `config/` - global rule examples
- `docs/` - user-facing method documentation
- `design/` - design records for this repository itself

The future CLI should be a distribution shell: copy these assets into a target project and keep the behavior idempotent.

## Operating Rules

- Keep `AGENTS.md` short because every agent session loads it.
- Put durable project state in `spec/`, not in the conversation.
- Update `spec/INDEX.md` after changing anything under `spec/needs/<need-name>/`.
- If `INDEX.md` is uncertain, use the future `ae index-rebuild` command as the fallback.
- Keep `handoff.md` as the latest snapshot only. Overwrite it, do not append.
