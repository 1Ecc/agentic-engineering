<!-- AE-CHANGE[REPLACE]:
description: "Compact the current conversation into the project's `handoff.md` so a fresh agent — across sessions, agents, or projects — can pick up. Foundation-level skill, user-triggered at session end or hand-off boundary. Does NOT replace `spec/INDEX.md` (structural state — auto-maintained per node); handoff.md is conversation-handoff state only."
| 理由(中文):
  1. 显式说明输出落项目根 handoff.md(不是 OS temp,与原 skill 关键反转)
  2. 显式说明用户触发 + 三种 hand-off 场景(跨会话/跨 agent/跨项目)
  3. 显式 handoff.md ≠ INDEX 的职责分离(S1 + spec-framework 已锁)
-->
---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

<!-- AE-CHANGE[REPLACE]:把下一段 "Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace." 整段替换为(英文):

Write a handoff document summarising the current conversation so a fresh agent — in a new session, a different agent runtime, or even a different project — can pick up.

**Save to: `handoff.md` at the project root** (the working directory, NOT the OS temp directory). Overwrite the existing `handoff.md` if present — handoff is a single rolling snapshot of the latest conversation-handoff state, not a history log.

| 理由(中文):
  1. **关键反转**:原 skill 写"save to OS temp dir, NOT current workspace" — 与我们 S0 已锁的 handoff.md 落在项目根的设计直接冲突,必须反过来
  2. 显式"overwrite",因为 handoff.md 是"当前态最新快照,每次覆盖更新,不承载历史"(母本 handoff.md 顶部已写)
-->
Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

<!-- AE-CHANGE[ADD-AFTER]:在上面被替换的那段(新版"Save to: handoff.md at the project root")之后追加(英文):

## Required structure (use as-is for this project)

The output `handoff.md` MUST use these top-level sections, in order. Skip a section if it is genuinely empty for this hand-off, but do not invent new sections.

```markdown
# Handoff

> 当前态最新快照。每次覆盖更新,不承载历史。

## 项目目标

A short paragraph: what the project is about and which mother-template / reference materials it draws from.

## 当前阶段

One sentence on the current stage (e.g. "v0.2 框架收敛完毕,Skill 预选定稿,进入个性化改造前夜") plus a bulleted list of next-step candidates with one-line each.

## 已固化的关键决策

Subsections by topic — e.g. 三场景结构 / S1 两场景模型 / spec/ 目录规范 / 横切规则. Keep each subsection concise; link to the canonical document rather than restating it.

## 开放问题状态

Locked questions one line each (mark with ~~strikethrough~~ if resolved); pending questions with current direction.

## 关键文件入口

A table: file path | one-line content description. Include the 方案/ index files and any active spec needs.

## 输入信号(优先级递减)

A table: category | location | role. Mother-template > reference materials > deprecated.

## 下次起手建议

The single most useful next action, with 2-4 sub-bullets if it is a structured task.
```

## What NOT to put in `handoff.md`

- **Per-need state** (PRD content, design decisions, todo progress, issue status) — those live in `spec/needs/<need-name>/*` and `spec/INDEX.md`. Reference by path; do not duplicate.
- **ADR content** — lives in `spec/ADR/`. Reference the ADR number; do not restate it.
- **Code or diffs** — reference commit SHAs or file paths.
- **Conversation transcript** — handoff is a synthesis, not a log. If a prior decision matters, name it and link the artifact that records it.

This is the load-bearing distinction from `spec/INDEX.md`:

- `INDEX.md` = project STRUCTURAL state (which needs exist, what node each is at, what ADRs exist). Auto-maintained at each S1 node.
- `handoff.md` = SESSION-handoff state (focus, pending decisions, next-action recommendation). Updated only by this skill at user-triggered hand-off boundaries.

| 理由(中文):
  1. handoff.md 模板段直接来自本项目母本 handoff.md(经过实战验证) — 让所有项目的 handoff 风格统一
  2. "What NOT to put" 段:S1 + spec-framework 已锁的职责分离边界(handoff ≠ INDEX);显式说明 INDEX 是结构态、handoff 是会话交接态
  3. 表格说明二者职责分离 — 这是用户最容易混的地方
-->

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

<!-- AE-CHANGE[REPLACE]:把上面 "Include a suggested skills section..." 改成(英文):

Include a "下次起手建议" section (per the structure above) which recommends the next S1 node and the skill that owns it. Map to our S1 vocabulary, not generic skill names:

- New requirement aligning → A1 `brainstorming` / `grill-me`
- PRD writing → A2 `to-prd`
- Design → A3 `writing-plans`
- Task breakdown → A4 `to-issues`
- Coding loop → A5 / B5 `tdd`
- End-to-end verify → A6 `verification-before-completion`
- Bug expectation align → B2 `grill-me`
- Diagnose → B3 `diagnose`
- Issue file writing → B4 (no skill — write the 7-section file directly)
- Closing review → B7 `review`

If the next step is user-triggered (architectural review, zoom-out), say so and name the skill but do not pre-invoke it.

| 理由(中文):
  1. "suggested skills" section → "下次起手建议"(与上面 §Required structure 表一致)
  2. 显式列出 S1 节点 ↔ skill 的映射,让生成的 handoff 用本项目术语而不是泛指
  3. 用户触发的 skill(improve-codebase-architecture / zoom-out)只命名不预调
-->
Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
