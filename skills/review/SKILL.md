---
name: review
description: Two-axis review (Standards / Spec) of the changes for a need that is about to close, followed by sedimentation routing - review findings flow into prd.md / design.md / spec/ADR/ / S2 candidates per `spec/AGENTS.md`. Used at S1 node B7.
---

# Review

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** - does the code conform to this repo's documented coding standards?
- **Spec** - does the code faithfully implement the originating need?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

## Entry (S1 node B7)

Invoke this skill when a need is about to close - typically after B6 user re-verification passes. Inputs:

- The owning need: `spec/needs/<need-name>/` (must contain `prd.md`, `design.md`, `todo.md`, and at least one `issues/*.md` if this close was preceded by a B-loop)
- The fixed point: the git commit at which work on this need started (merge-base with `main`, or the user's specified SHA)
- `spec/INDEX.md` (to confirm the need-name and to update afterward)

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point - a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. Don't be opinionated; pass it through. If they didn't specify one, ask: "Review against what - a branch, a commit, or `main`?" Don't proceed until you have it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

### 2. Identify the spec source

The spec is fixed by the need-name (resolved from the user's input, the active branch, or `spec/INDEX.md`'s `当前节点` column). Read these files in order:

1. `spec/needs/<need-name>/prd.md` - WHAT and WHY (acceptance criteria)
2. `spec/needs/<need-name>/design.md` - HOW (decisions and trade-offs)
3. `spec/needs/<need-name>/todo.md` - execution checklist (rolling)
4. `spec/needs/<need-name>/issues/*.md` - any B-loop issue files for this close

Do NOT search `docs/`, `specs/`, `.scratch/`, or commit-message issue references - the contract is: this project always uses `spec/needs/<need-name>/`. If `<need-name>` cannot be determined, STOP and ask the user.

### 3. Identify the standards sources

Anything in the repo that documents how code should be written. For this project's spec layout, the canonical sources are:

- `AGENTS.md`, `CLAUDE.md` (entry rules + R1 - mirrored content)
- `spec/README.md` (project map; rarely contains rules but read for context)
- `spec/INDEX.md` (need + ADR index; the `当前节点` and `related-needs` columns reveal cross-need coupling)
- `spec/ADR/*.md` (architectural decisions are standards; treat `status: accepted` as binding)
- `CONTRIBUTING.md` (if present at repo root)
- `.editorconfig`, `eslint.config.*`, `biome.json`, `prettier.config.*`, `tsconfig.json`, `ruff.toml`, etc. (machine-enforced - note them but don't re-check what tooling already checks)
- Any `STYLE.md`, `STANDARDS.md`, `STYLEGUIDE.md` at the repo root or under `spec/`

Do NOT look under `docs/adr/`, `CONTEXT.md`, or `CONTEXT-MAP.md` - this project uses `spec/ADR/` and the INDEX/README split instead.

Collect the list of files. The **Standards** sub-agent will read them.

### 4. Spawn both sub-agents in parallel

Send a single message with two `Agent` tool calls. Use the `general-purpose` subagent for both.

**Standards sub-agent prompt** - include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3.
- The brief: "Read the standards docs. Then read the diff. Report - per file/hunk where relevant - every place the diff violates a documented standard. Cite the standard (file + the rule). Distinguish hard violations from judgement calls. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** - include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Read the spec. Then read the diff. Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings - the two axes are deliberately separate so the user can see them independently.

End with a one-line summary: total findings per axis, and the worst single issue (if any) flagged.

### 6. Sediment (sedimentation routing)

This step is what makes review a B7 skill and not a generic PR review. After Aggregate, walk through every finding from BOTH axes and route each one of four ways. Show the user a routing plan; only execute after approval.

| Finding type | Routing target | What to write |
|---|---|---|
| **Business rule** (spec said WHAT was wrong, or B-loop surfaced an unstated rule) | `spec/needs/<need-name>/prd.md` | Patch the relevant section; bump `last-aligned: <today>`; keep `status: active` |
| **Local technical decision** (affects ONLY this need) | `spec/needs/<need-name>/design.md` | Patch the relevant section; bump `last-aligned`; keep `status: active` |
| **Cross-need decision** (affects 2+ needs, or a project-wide invariant) | New `spec/ADR/NNNN-<title>.md` | New ADR with `status: proposed` (NOT accepted - user decides in a separate pass). In affected `design.md` files, add a reference and prune the local version of the decision. |
| **Reusable method / pattern** (not project-specific knowledge) | Handoff proposal (NOT this skill) | Add a single line under "S2 candidates" in `handoff.md` (or surface it for the next `handoff` skill run). Do NOT create a skill file here - promotion is user-confirmed at S2. |

After routing:

1. Update `spec/INDEX.md`:
   - Set every `issues/*.md` referenced in this close to "已验收"
   - If any `prd.md` / `design.md` was patched, leave `status: active` and refresh `last-aligned`
   - If a new ADR was created, add a row under `## ADR` with `status: proposed`
   - If unsure, run `ae index-rebuild`
2. Print a one-block summary to the user:
   - Findings routed to prd / design / ADR / S2-candidates with counts
   - Files modified (path list)
   - Suggested next action: close the need (mark all relevant files appropriately) or open a fresh A1 alignment for the new ADR proposals

## Boundaries

- This skill READS the diff and need files, WRITES patches to `prd.md` / `design.md`, NEW files in `spec/ADR/`, and ONE INDEX update.
- It does NOT close or archive `prd.md` / `design.md` - `archived` is reserved for need-level lifecycle, not B7.
- It does NOT promote rules into reusable skills - S2 promotion is user-confirmed in a separate pass.
- It does NOT invoke `improve-codebase-architecture` directly - that skill is user-triggered; B7 findings can list it as a suggested follow-up but do not call it.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing -> **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions -> **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
