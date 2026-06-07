---
name: writing-plans
description: Use when you have a PRD (`spec/needs/<need-name>/prd.md`) approved at S1 node A2, before touching code. Produces ONLY `design.md` — the task list lives in `todo.md` (A4 to-issues).
---

# Writing Plans

## Hard Constraint (S1 node A3)

This skill produces ONLY `spec/needs/<need-name>/design.md`. It MUST NOT produce a `todo.md` or any task-level checklist — that is the job of A4 `to-issues`, which reads this `design.md` and breaks it into `todo.md`.

If the plan is not yet aligned with the user on key technical trade-offs (e.g. library choice, data model, integration seam), STOP and align before writing the design. A3 has a hard gate: undecided key trade-offs ⇒ do not advance to A4.

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Input:** `spec/needs/<need-name>/prd.md` (produced by A2 `to-prd`). Also read `spec/INDEX.md`, related `spec/needs/*/design.md` if `related-needs` is set, and any `spec/ADR/` decisions that constrain this design.

**Save design to:** `spec/needs/<need-name>/design.md` (overwriting if present and `status: draft`; if `status: active`, ask the user before overwriting).

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Design Document Header

Every `design.md` MUST start with this frontmatter block followed by the header:

```yaml
---
status: draft             # draft | active | archived
last-aligned: YYYY-MM-DD  # ISO date of the most recent alignment with the user
related-needs: []         # other need-names whose design constrains this one; omit if none
---
```

```markdown
# [Need Name] Design

**Goal:** [One sentence describing what this builds — should match `prd.md` Problem/Solution]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Out of scope:** [Things this design explicitly does not address — usually inherited from `prd.md` Out of Scope]

---
```

State transitions:

- `draft` → `active` when the user has explicitly approved key technical trade-offs (A3 gate cleared)
- `active` → `archived` when superseded or the need is dropped (do not delete the file)

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. PRD coverage:** Skim each section/requirement in `prd.md`. Can you point to a section of `design.md` that addresses it? List any gaps.

**2. Placeholder scan:** Search your design for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used across sections match? A function called `clearLayers()` in §3 but `clearFullLayers()` in §7 is a bug.

**4. ADR promotion check:** Does any decision in this design affect MORE THAN ONE need? If yes, it does not belong in `design.md` — promote it to `spec/ADR/NNNN-<title>.md` (frontmatter `status: proposed`) and reference the ADR from this design. Typical signals: "globally use X", "all needs share Y", "the project standard for Z is...".

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## After Saving

1. Update `spec/INDEX.md`:
   - Set the `design` column to `active` (or `draft` if key trade-offs still need user approval)
   - Recompute the `当前节点` column per the rules in `spec-framework.md` §INDEX 推导规则
   - If unsure, run `/ae-index-rebuild` for an idempotent rescan
2. If you promoted any decision to `spec/ADR/`, also add a row under `## ADR` in `INDEX.md`.
3. Hand off to the next S1 node: A4 `to-issues` will read this `design.md` and produce `spec/needs/<need-name>/todo.md`. Tell the user the design is ready and recommend invoking `to-issues` next.

## Boundaries

- This skill writes ONLY `spec/needs/<need-name>/design.md` (plus the INDEX row, and optionally a new ADR). It does NOT write `todo.md` or any task-level checklist — that is A4.
- The design captures HOW (technical decisions, modules, interfaces, data flow, key trade-offs). It does NOT re-capture WHAT — refer back to `prd.md` instead.
- Decisions affecting MORE THAN ONE need belong in `spec/ADR/`, not here (see Self-Review step 4).
