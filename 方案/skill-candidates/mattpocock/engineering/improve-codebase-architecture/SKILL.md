<!-- AE-CHANGE[REPLACE]:
description: "Find architectural deepening opportunities, informed by `spec/INDEX.md` vocabulary and `spec/ADR/` decisions. User-triggered ONLY — does NOT hook into any S1 node. Typical trigger points: after a B-loop where the bug revealed coupling, or any time the user wants a deep-dive review."
| 理由(中文):
  1. 路径切换:CONTEXT.md / docs/adr/ → spec/INDEX.md / spec/ADR/
  2. 显式声明"User-triggered ONLY,不挂任何 S1 节点"(已锁的横切约定)
  3. 给出典型触发时机,引导用户在对的时候用
-->
---
name: improve-codebase-architecture
description: Find deepening opportunities in a codebase, informed by the domain language in CONTEXT.md and the decisions in docs/adr/. Use when the user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a codebase more testable and AI-navigable.
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

<!-- AE-CHANGE[ADD-AFTER]:在上面这段标题后追加(英文):

## Trigger model

This skill is **user-triggered only**. It is NOT attached to any S1 node. Three legitimate trigger points:

1. **Post-B-loop** — a bug in B3 diagnose revealed structural coupling; B7 review noted "architectural change needed" but did NOT invoke this skill; the user now opts in.
2. **Pre-A3** — before writing `design.md` for a complex new need, the user wants a deep look at the area to be touched.
3. **Standalone** — periodic, user-driven architecture review.

Do NOT invoke this skill from inside another skill. Other skills MAY recommend it; only the user calls it.

| 理由(中文):
  1. 显式 user-triggered + 不挂节点(已锁)
  2. 给 3 个 legitimate trigger 例子 — 既限定也引导
  3. "Do NOT invoke from inside another skill" 是与 B3 diagnose Phase 6(已批注修正)的边界硬约束
-->


## Glossary

<!-- AE-CHANGE[REPLACE]:把下一句 "Use these terms exactly in every suggestion ... Full definitions in [LANGUAGE.md](LANGUAGE.md)." 改成(英文):

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions inline below (no separate `LANGUAGE.md` file in this project — the terms are deliberately few enough to live in this SKILL.md).

| 理由(中文):
  1. LANGUAGE.md 在本项目不存在(skill-candidates 复制时未带过来)
  2. 不再外引 LANGUAGE.md;术语少,留在本 SKILL.md 内
  3. 防止后续读者点 LANGUAGE.md 死链
-->
Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

<!-- AE-CHANGE[REPLACE]:把下一行 "Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):" 改成(英文):
   Key principles (the full list lives here — no separate LANGUAGE.md):
| 理由(中文):同上,去外链
-->
Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

<!-- AE-CHANGE[REPLACE]:把下一段 "This skill is _informed_ by the project's domain model. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate." 改成(英文):

This skill is _informed_ by the project's domain model. Read `spec/INDEX.md` for the vocabulary of needs and ADRs; read `spec/needs/*/design.md` for the names of seams that matter; read `spec/ADR/*.md` to find decisions the skill should not re-litigate (treat `status: accepted` as binding).

| 理由(中文):
  1. 路径切换 — 把 mp 默认的 CONTEXT.md / docs/adr/ 替换为本项目 spec/INDEX + spec/needs + spec/ADR
  2. 显式 "accepted as binding" — 对接 spec-framework.md §状态转换规则,防止本 skill 重提已 accepted 的方案
-->
This skill is _informed_ by the project's domain model. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate.

## Process

### 1. Explore

<!-- AE-CHANGE[REPLACE]:把下一段 "Read the project's domain glossary and any ADRs in the area you're touching first." 改成(英文):
   Read `spec/INDEX.md` (vocabulary + need landscape), the relevant `spec/needs/*/design.md` files (for the area being touched), and any `spec/ADR/*.md` with `status: accepted` that constrains the area.
| 理由(中文):统一本地化(与本 skill 顶部 §Glossary 同款替换)
-->
Read the project's domain glossary and any ADRs in the area you're touching first.

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the user — `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows — and tell them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams where a graph/flow/sequence reliably communicates the structure. Mix Mermaid with hand-crafted CSS/SVG visuals — use Mermaid when relationships are graph-shaped (call graphs, dependencies, sequences), and hand-built divs/SVG when you want something more editorial (mass diagrams, cross-sections, collapse animations). Each candidate gets a **before/after visualisation**. Be visual.

For each candidate, the same template as before, but rendered as a card:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve
- **Before / After diagram** — side-by-side, custom-drawn, illustrating the shallowness and the deepening
- **Recommendation strength** — one of `Strong`, `Worth exploring`, `Speculative`, rendered as a badge

End the report with a **Top recommendation** section: which candidate you'd tackle first and why.

<!-- AE-CHANGE[REPLACE]:把下一段 "**Use CONTEXT.md vocabulary ..." 改成(英文):

**Use `spec/INDEX.md` + need-level `prd.md`/`design.md` vocabulary for the domain, and the §Glossary above for the architecture.** If `spec/INDEX.md` defines "Order," talk about "the Order intake module" — not "the FooBarHandler," and not "the Order service."

| 理由(中文):
  1. 路径切换:CONTEXT.md → spec/INDEX + 需求级 prd/design
  2. LANGUAGE.md → §Glossary above(本文件内)
-->
**Use CONTEXT.md vocabulary for the domain, and [LANGUAGE.md](LANGUAGE.md) vocabulary for the architecture.** If `CONTEXT.md` defines "Order," talk about "the Order intake module" — not "the FooBarHandler," and not "the Order service."

<!-- AE-CHANGE[REPLACE]:把下一段 "**ADR conflicts**: ..." 中的 "ADR-0007" 改成 "ADR-0007 in `spec/ADR/`"
| 理由(中文):路径明示,避免歧义
-->
**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly in the card (e.g. a warning callout: _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

<!-- AE-CHANGE[DELETE]:删除下一行 "See [HTML-REPORT.md](HTML-REPORT.md) for the full HTML scaffold, diagram patterns, and styling guidance."
| 理由(中文):HTML-REPORT.md 不在本地仓库;HTML 报告骨架由 agent 现写即可,无需外引
-->
See [HTML-REPORT.md](HTML-REPORT.md) for the full HTML scaffold, diagram patterns, and styling guidance.

Do NOT propose interfaces yet. After the file is written, ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

<!-- AE-CHANGE[REPLACE]:把下面 "Side effects happen inline as decisions crystallize:" 的 4 个 bullet 整体替换为(英文):

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `spec/INDEX.md`?** Add the term to the relevant `spec/needs/<need-name>/design.md` (or, if it spans needs, propose a new ADR). Do NOT create or modify a `CONTEXT.md` file — this project does not use that path.
- **Sharpening a fuzzy term during the conversation?** Patch the relevant `design.md` (or ADR) right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as `spec/ADR/NNNN-<title>.md` (status: proposed) so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer — skip ephemeral reasons ("not worth it right now") and self-evident ones.
- **User accepts the candidate and asks you to apply it?** Stop here. Do NOT modify code from this skill — bounce back to S1: open a new need (A1) for the refactor, or patch an existing `design.md` (A3). This skill is REVIEW-only.

| 理由(中文):
  1. 把 mp 自有路径全替换:CONTEXT.md → spec/needs/<need-name>/design.md(局部)或 spec/ADR/(跨需求)
  2. 删除外引(CONTEXT-FORMAT.md / ADR-FORMAT.md / INTERFACE-DESIGN.md / grill-with-docs) — 都不在本地
  3. ADR 路径 + frontmatter `status: proposed`(对接 spec-framework.md §状态转换规则)
  4. **新增第 4 条**:本 skill 是 REVIEW-only,不直接动代码 — 重要边界,避免用户主动调它后 skill 越权改代码
-->
Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md` — same discipline as `/grill-with-docs` (see [CONTEXT-FORMAT.md](../grill-with-docs/CONTEXT-FORMAT.md)). Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [ADR-FORMAT.md](../grill-with-docs/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).
