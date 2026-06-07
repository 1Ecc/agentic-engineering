<!-- AE-CHANGE[REPLACE]:
description: Two-axis review (Standards / Spec) of the changes for a need that is about to close, followed by sedimentation routing — review findings flow into prd.md / design.md / spec/ADR/ / S2 candidates per `spec-framework.md`. Used at S1 node B7.
| 理由(中文):
  1. 标 S1 节点 B7
  2. 显式说明本 skill 在本项目的核心改造 = "审查 + 分流落盘"(skill-candidates README §五-7)
-->
---
name: review
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/PRD asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
---

# Review

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue / PRD / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

<!-- AE-CHANGE[DELETE]:删除下一行 "The issue tracker should have been provided to you — run `/setup-matt-pocock-skills` if `docs/agents/issue-tracker.md` is missing."
| 理由(中文):本项目无 issue tracker;/setup-matt-pocock-skills 不在预选;docs/agents/issue-tracker.md 路径不存在
-->
The issue tracker should have been provided to you — run `/setup-matt-pocock-skills` if `docs/agents/issue-tracker.md` is missing.

<!-- AE-CHANGE[ADD-AFTER]:在上面那一行(待删除的 issue tracker 提示)之后追加(英文):

## Entry (S1 node B7)

Invoke this skill when a need is about to close — typically after B6 user re-verification passes. Inputs:

- The owning need: `spec/needs/<need-name>/` (must contain `prd.md`, `design.md`, `todo.md`, and at least one `issues/*.md` if this close was preceded by a B-loop)
- The fixed point: the git commit at which work on this need started (merge-base with `main`, or the user's specified SHA)
- `spec/INDEX.md` (to confirm the need-name and to update afterward)

| 理由(中文):
  1. 入口契约对接 B7(B6 通过后触发)
  2. 输入硬绑当前 need 的全部产物 + git 比较点
-->


## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. Don't be opinionated; pass it through. If they didn't specify one, ask: "Review against what — a branch, a commit, or `main`?" Don't proceed until you have it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

<!-- AE-CHANGE[REPLACE]:把整段 "### 2. Identify the spec source" 改成(英文):

### 2. Identify the spec source

The spec is fixed by the need-name (resolved from the user's input, the active branch, or `spec/INDEX.md`'s `当前节点` column). Read these files in order:

1. `spec/needs/<need-name>/prd.md` — WHAT and WHY (acceptance criteria)
2. `spec/needs/<need-name>/design.md` — HOW (decisions and trade-offs)
3. `spec/needs/<need-name>/todo.md` — execution checklist (rolling)
4. `spec/needs/<need-name>/issues/*.md` — any B-loop issue files for this close

Do NOT search `docs/`, `specs/`, `.scratch/`, or commit-message issue references — the contract is: this project always uses `spec/needs/<need-name>/`. If `<need-name>` cannot be determined, STOP and ask the user.

| 理由(中文):
  1. 删除 mattpocock 的多源策略(commit message #123 / docs / specs / .scratch),与本项目唯一源 spec/needs/<need-name>/ 冲突
  2. 显式列出 4 类输入(prd + design + todo + issues),供 Spec sub-agent 比对
  3. 删除 GitLab !67 / GitHub #123 引用 — 不走 issue tracker
-->
### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A PRD/spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

<!-- AE-CHANGE[REPLACE]:把整段 "### 3. Identify the standards sources"(连同 bullet 列表)改成(英文):

### 3. Identify the standards sources

Anything in the repo that documents how code should be written. For this project's spec layout, the canonical sources are:

- `AGENTS.md`, `CLAUDE.md` (entry rules + R1 — mirrored content)
- `spec/README.md` (project map; rarely contains rules but read for context)
- `spec/INDEX.md` (need + ADR index; the `当前节点` and `related-needs` columns reveal cross-need coupling)
- `spec/ADR/*.md` (architectural decisions are standards; treat `status: accepted` as binding)
- `CONTRIBUTING.md` (if present at repo root)
- `.editorconfig`, `eslint.config.*`, `biome.json`, `prettier.config.*`, `tsconfig.json`, `ruff.toml`, etc. (machine-enforced — note them but don't re-check what tooling already checks)
- Any `STYLE.md`, `STANDARDS.md`, `STYLEGUIDE.md` at the repo root or under `spec/`

Do NOT look under `docs/adr/`, `CONTEXT.md`, or `CONTEXT-MAP.md` — this project uses `spec/ADR/` and the INDEX/README split instead.

Collect the list of files. The **Standards** sub-agent will read them.

| 理由(中文):
  1. 删除 mattpocock 自有路径(docs/adr / CONTEXT.md / CONTEXT-MAP.md)
  2. 显式列本项目对应路径(spec/ADR / spec/INDEX / spec/README) — 对接 spec-framework.md
  3. 保留语言无关的机器约束文件(editorconfig / eslint / ...) — 通用
-->
### 3. Identify the standards sources

Anything in the repo that documents how code should be written. Common locations:

- `CLAUDE.md`, `AGENTS.md`
- `CONTRIBUTING.md`
- `CONTEXT.md`, `CONTEXT-MAP.md`, per-context `CONTEXT.md` files
- `docs/adr/` (architectural decisions are standards)
- `.editorconfig`, `eslint.config.*`, `biome.json`, `prettier.config.*`, `tsconfig.json` (machine-enforced standards — note them but don't re-check what tooling already checks)
- Any `STYLE.md`, `STANDARDS.md`, `STYLEGUIDE.md`, or similar at the repo root or under `docs/`

Collect the list of files. The **Standards** sub-agent will read them.

### 4. Spawn both sub-agents in parallel

Send a single message with two `Agent` tool calls. Use the `general-purpose` subagent for both.

**Standards sub-agent prompt** — include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3.
- The brief: "Read the standards docs. Then read the diff. Report — per file/hunk where relevant — every place the diff violates a documented standard. Cite the standard (file + the rule). Distinguish hard violations from judgement calls. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** — include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Read the spec. Then read the diff. Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings — the two axes are deliberately separate so the user can see them independently.

End with a one-line summary: total findings per axis, and the worst single issue (if any) flagged.

<!-- AE-CHANGE[ADD-AFTER]:在 ### 5. Aggregate 段之后、## Why two axes 段之前,插入新章节 ### 6. Sediment(英文,本 skill 核心改造):

### 6. Sediment (sedimentation routing)

This step is what makes review a B7 skill and not a generic PR review. After Aggregate, walk through every finding from BOTH axes and route each one of four ways. Show the user a routing plan; only execute after approval.

| Finding type | Routing target | What to write |
|---|---|---|
| **Business rule** (spec said WHAT was wrong, or B-loop surfaced an unstated rule) | `spec/needs/<need-name>/prd.md` | Patch the relevant section; bump `last-aligned: <today>`; keep `status: active` |
| **Local technical decision** (affects ONLY this need) | `spec/needs/<need-name>/design.md` | Patch the relevant section; bump `last-aligned`; keep `status: active` |
| **Cross-need decision** (affects 2+ needs, or a project-wide invariant) | New `spec/ADR/NNNN-<title>.md` | New ADR with `status: proposed` (NOT accepted — user decides in a separate pass). In affected `design.md` files, add a reference and prune the local version of the decision. |
| **Reusable method / pattern** (not project-specific knowledge) | Handoff proposal (NOT this skill) | Add a single line under "S2 candidates" in `handoff.md` (or surface it for the next `handoff` skill run). Do NOT create a skill file here — promotion is user-confirmed at S2. |

After routing:

1. Update `spec/INDEX.md`:
   - Set every `issues/*.md` referenced in this close to "已验收"
   - If any `prd.md` / `design.md` was patched, leave `status: active` and refresh `last-aligned`
   - If a new ADR was created, add a row under `## ADR` with `status: proposed`
   - If unsure, run `/ae-index-rebuild`
2. Print a one-block summary to the user:
   - Findings routed to prd / design / ADR / S2-candidates with counts
   - Files modified (path list)
   - Suggested next action: close the need (mark all relevant files appropriately) or open a fresh A1 alignment for the new ADR proposals

## Boundaries

- This skill READS the diff and need files, WRITES patches to `prd.md` / `design.md`, NEW files in `spec/ADR/`, and ONE INDEX update.
- It does NOT close or archive `prd.md` / `design.md` — `archived` is reserved for need-level lifecycle, not B7.
- It does NOT promote rules into reusable skills — S2 promotion is user-confirmed in a separate pass.
- It does NOT invoke `improve-codebase-architecture` directly — that skill is user-triggered; B7 findings can list it as a suggested follow-up but do not call it.

| 理由(中文):
  1. 这是本 skill 的核心改造 — skill-candidates README §五-7 已预告:"加分流落盘"
  2. 4 路分流表完全对接 S1 文档 B7 节点的"业务规则 / 技术决策 / 复用规则"三分流 + ADR(影响多需求)细分
  3. ADR 强制 status: proposed(不直接 accepted) — 对接 spec-framework.md §状态转换规则,并避免 B7 自动通过 ADR
  4. 复用方法走 handoff 提案 — 对接 skill-candidates README "S2 升级需用户确认" 的约定;严禁本 skill 直接创建 skill 文件
  5. INDEX 同步段(issues 标"已验收")— 对接 spec-framework.md §INDEX 推导规则
  6. Boundaries 段:与 archive / S2 promotion / improve-codebase-architecture 三条边界全部明文化(防止 B7 越界)
-->

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
