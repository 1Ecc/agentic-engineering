---
name: to-prd
description: Turn the current conversation context into a PRD and save it to `spec/needs/<need-name>/prd.md` with frontmatter. Use when user wants to create a PRD from the current context (S1 node A2).
---

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use vocabulary from `spec/INDEX.md` and existing `spec/needs/*/prd.md` throughout the PRD, and respect ADRs under `spec/ADR/`.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can.

Check with the user that these seams match their expectations.

2.5. Align the `need-name` (kebab-case) with the user. This is the slug used to create `spec/needs/<need-name>/`. Surface a concrete suggestion derived from the PRD topic and confirm before writing.

3. Write the PRD using the template below. Save it to `spec/needs/<need-name>/prd.md` with the frontmatter block shown below the template. After saving, update `spec/INDEX.md` (add or update the row for this need) — or run `ae index-rebuild` to recompute.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

## Frontmatter (prepend to `prd.md`)

Every `prd.md` MUST start with this frontmatter block:

```yaml
---
status: draft             # draft | active | archived
last-aligned: YYYY-MM-DD  # ISO date of the most recent alignment with the user
related-needs: []         # other need-names that share scope; omit if none
---
```

State transitions:

- `draft` → `active` when the user has explicitly approved the PRD content (A1 alignment confirmed)
- `active` → `archived` when superseded or the need is dropped (do not delete the file)

`last-aligned` MUST be updated every time the PRD is edited after user re-alignment.

## After Saving

1. Update `spec/INDEX.md`:
   - If the need is new: add a row under `## 需求`
   - If updating: set the `prd` column to `active`
   - Recompute the `当前节点` column per the rules in `spec/AGENTS.md` §INDEX 推导规则
   - If unsure, run `ae index-rebuild` for an idempotent rescan
2. Hand off to the next S1 node: A3 `writing-plans` will read this `prd.md` and produce `spec/needs/<need-name>/design.md`. Tell the user the PRD is ready and recommend invoking `writing-plans` next.

## Boundaries

- This skill writes ONLY `spec/needs/<need-name>/prd.md` (plus the INDEX row). It does NOT write `design.md` or `todo.md`.
- The PRD captures WHAT and WHY (business / product language). It does NOT capture HOW (technical decisions, file paths, code) — those belong in `design.md` (A3).
- If the alignment surfaces a decision that affects MULTIPLE needs (e.g. "globally use Postgres"), flag it for promotion to `spec/ADR/` rather than embedding it in this PRD.
