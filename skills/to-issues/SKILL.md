---
name: to-issues
description: Break a design (and supporting spec context) into vertical-slice tasks and save them as `spec/needs/<need-name>/todo.md`. Use when user wants to convert a design into actionable tasks (S1 node A4).
---

# To Issues

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

## Process

### 1. Gather context

**Primary input:** `spec/needs/<need-name>/design.md` (produced by A3 `writing-plans`).

If the design is insufficient on its own (acceptance criteria not concrete enough, scope boundaries unclear, or a slice references behavior that's defined elsewhere), supplement with:

- The sibling `spec/needs/<need-name>/prd.md` — for user-facing acceptance criteria, out-of-scope notes
- The `related-needs` field in `design.md` frontmatter — read those needs' `design.md` for shared module decisions
- `spec/INDEX.md` and `spec/ADR/` — for vocabulary and accepted cross-need decisions

If a design gap is severe enough that you can't draft a slice, STOP and surface it as a finding — go back to A3 (`writing-plans`) to patch `design.md` first, rather than guessing.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Task titles and descriptions should use vocabulary from `spec/INDEX.md` and existing `spec/needs/*/`, and respect ADRs under `spec/ADR/`.

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Acceptance**: one-line acceptance criterion (the observable behavior that proves it's done)
- **Blocked by**: which other slices (if any) must complete first; reference by slice number (e.g. "T2")

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?

Iterate until the user approves the breakdown.

### 5. Save the task list to `todo.md`

Save the approved breakdown to `spec/needs/<need-name>/todo.md`, using [`todo-template.md`](todo-template.md) as the starting structure. The template encodes the format and the maintenance rules; copy it, fill in the slices, then save.

`todo.md` has NO frontmatter — it is a rolling working artifact, not a stateful spec document.

Format summary (full rules live in [`todo-template.md`](todo-template.md)):

- Two sections: `## 实施` (executable slices) and `## 阻塞 / 待澄清` (open blockers)
- Slice IDs: `T<n>` for tasks, `B<n>` for blockers; stable across the life of the need
- Each `## 实施` line: `- [ ] T<n> <title> — <one-line acceptance>[; blocked by T<m>]`
- Each slice MUST trace back to a section in `design.md`; if it can't, that's a signal to patch `design.md`, not to smuggle scope into `todo.md`

## After Saving

1. Update `spec/INDEX.md`:
   - Set the `todo` column to `0/N` (where N = total tasks in `## 实施`)
   - Recompute the `当前节点` column per the rules in `spec-framework.md` §INDEX 推导规则 (likely now `A5 执行`)
   - If unsure, run `/ae-index-rebuild` for an idempotent rescan
2. Hand off to the next S1 node: A5 `tdd` will read this `todo.md` (plus `design.md`) and drive the red-green-refactor loop. Tell the user the task list is ready and recommend invoking `tdd` next.

## Boundaries

- This skill writes ONLY `spec/needs/<need-name>/todo.md` (plus the INDEX row). It does NOT modify `prd.md` or `design.md`.
- A task in `todo.md` MUST trace back to a section in `design.md`. New scope discovered here is a signal to patch `design.md` first.
- This skill does NOT execute tasks — that is A5 `tdd`.
