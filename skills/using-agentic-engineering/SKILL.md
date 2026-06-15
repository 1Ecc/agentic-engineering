---
name: using-agentic-engineering
description: Router for projects that use Agentic Engineering. Use at the start of a feature, bug fix, or other non-trivial change to decide whether it should enter the SDD+TDD loop and which node/skill to start from. Skip for quick fixes, questions, and throwaway scripts.
---

# Using Agentic Engineering

This project follows the **Agentic Engineering** method: SDD records *what to build* (in `spec/`), TDD proves *it works*. This skill is a **router** — it decides whether the current request enters that loop and, if so, hands off to the right node skill. It does not carry the method itself; each node has its own skill.

## Instruction priority

1. **The user's explicit request this turn** — highest. If they say "just do X" / "skip the process," do exactly that.
2. **`AGENTS.md`** — the project's own rules (whatever the project declares there).
3. **Agentic Engineering defaults (below)** — lowest.

AE never blocks something you were explicitly asked to do. These are defaults, not laws.

## Step 0 — Orient (only when needed)

Read `handoff.md` (latest session snapshot) and `spec/INDEX.md` (needs + current node) **only when you lack context** — at the start of a fresh session, or when you can't tell whether this request continues existing work or starts something new. If you already have that context from the conversation, skip straight to routing. Don't re-read them every turn.

## Step 1 — Route: is this a *need*?

The one question: **does this request create or change a *need* — durable, product-facing behavior worth recording in `spec/`?**

**Does NOT enter the loop — just do it, no ceremony:**
- Questions / explanations ("what does this do?", "why is it slow?")
- Quick fixes, one-line changes, typos
- Throwaway / one-off scripts, spikes, experiments
- Chores: rename, format, dependency bump, run tests, git
- Anything the user explicitly asked to do directly

**Enters the loop:**
- A new feature or non-trivial capability → go to **A1**
- A bug / wrong behavior on an existing need → go to **B2**
- Continuing an existing need → resume at its **current node** (from `spec/INDEX.md`)

**Unsure?** Default to *not* entering: do what was asked, then add one line — "This looks like it might be a need; want me to capture it in `spec/` / align first?" — and hand the decision back to the user. Don't gate.

## Step 2 — Dispatch (only when it enters the loop)

Hand off to the node skill below. Two hard gates are rigid:
- **A1 not aligned → do not write `prd.md`.**
- **B2 expected behavior not aligned → do not start fixing.**

| Node | Purpose | Skill |
|------|---------|-------|
| A1 | Align the requirement | `brainstorming` (+ `grill-me` for detail) |
| A2 | Write `prd.md` | `to-prd` |
| A3 | Write `design.md` | `writing-plans` |
| A4 | Write `todo.md` | `to-issues` |
| A5 | Implement (TDD) | `tdd` |
| A6 | Verify on the real path | `verification-before-completion` |
| B2 | Align expected behavior | `grill-me` |
| B3 | Find root cause | `diagnose` |
| B4 | Write the issue file | (7-section format) |
| B5 | Fix (TDD) | `tdd` |
| B7 | Review & sediment findings | `review` |

`karpathy-guidelines` is always-on whenever you write or change code (no node).

Spec file mechanics — INDEX derivation, frontmatter, state machine, R1 — live in `spec/AGENTS.md`.
