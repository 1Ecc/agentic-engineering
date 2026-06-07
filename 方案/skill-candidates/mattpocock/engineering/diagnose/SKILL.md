<!-- AE-CHANGE[REPLACE]:
description: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Enters at S1 node B3 after B2 expectation alignment has passed. Output is consumed at B4 to write the 7-section issue file.
| 理由(中文):
  1. 标 S1 节点编号 B3
  2. 显式输入门禁(B2 通过后才进 B3,S1 文档已锁的两道硬门禁之一)
  3. 显式下游契约(B4 一次性按 7 段格式落盘)
-->
---
name: diagnose
description: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", reports a bug, says something is broken/throwing/failing, or describes a performance regression.
---

# Diagnose

A discipline for hard bugs. Skip phases only when explicitly justified.

<!-- AE-CHANGE[ADD-BEFORE]:在 "When exploring the codebase..." 之前插入新段(英文):

## Entry Gate (S1 node B3)

This skill activates AFTER B2 expectation alignment has passed. Inputs:

- A reproduction lead from B2 (what the user did, what they saw, what they expected)
- The owning need: `spec/needs/<need-name>/{prd.md, design.md, todo.md}` (locate `<need-name>` by reading `spec/INDEX.md` or asking the user)

If B2 has NOT been completed (the expected behavior is still ambiguous), STOP and run `grill-me` to re-align. Do NOT proceed to Phase 1 — diagnosing the wrong symptom is the most common B-loop failure (S1 has a hard gate here).

## Exit Contract (hand-off to B4)

After Phase 6, do NOT write the issue file inline — that is B4's job. Instead, hand off a structured summary so B4 can write `spec/needs/<need-name>/issues/<topic>.md` in one pass, per the 7-section format defined in `spec-framework.md` (and templated at `spec/_templates/issue.md`).

Sections this skill is expected to populate:

1. **问题描述** — from B2 + the loop's repro one-liner
2. **当前态** — observed symptom (Phase 2)
3. **期望态** — from B2
4. **分析与解决** — ranked hypotheses (Phase 3), instrumentation findings (Phase 4), root cause confirmed (Phase 5)

Sections B5/B6 will roll forward later:
5. **to-issues** — follow-up tasks discovered during fix (added by B5 if any)
6. **bug** — fix progress notes (B5)
7. **验收** — user re-verification result (B6)

| 理由(中文):
  1. 显式入口门禁(B2 → B3,S1 已锁的两道硬门禁之一)
  2. 输出契约挂上 B4 的 7 段格式(skill-candidates README §五-5 已预告:7 段模板放 assets/issue-7-sections.md;此处指向 spec/_templates/issue.md 与 §跨 skill 协同新增 一致)
  3. 明示哪些段由本 skill 填、哪些段 B5/B6 后续追加 — 避免下游误判 diagnose 越界
-->

<!-- AE-CHANGE[REPLACE]:把下一段 "When exploring the codebase, use the project's domain glossary ... ADRs in the area you're touching." 改成(英文):
   When exploring the codebase, use vocabulary from `spec/INDEX.md` and the owning need's `prd.md` + `design.md` to get a clear mental model of the relevant modules. Check ADRs under `spec/ADR/` before forming hypotheses.
| 理由(中文):统一本地化(与 A2/A3/A4/A5 同款替换)
-->
When exploring the codebase, use the project's domain glossary to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with `scripts/hitl-loop.template.sh` so the loop is still structured. Captured output feeds back to you.

Build the right feedback loop, and the bug is 90% fixed.

### Iterate on the loop itself

Treat the loop as a product. Once you have _a_ loop, ask:

- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

A 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

Do not proceed to Phase 2 until you have a loop you believe in.

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.

Do not proceed until you reproduce the bug.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for the next phase.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location)
- [ ] The hypothesis that turned out correct is stated in the commit / PR message — so the next debugger learns
<!-- AE-CHANGE[ADD-AFTER]:在上面这个 checklist 末尾追加一项(英文):
- [ ] Hand off to B4: emit the structured summary (sections 1-4 from the Exit Contract above) so B4 can write the issue file at `spec/needs/<need-name>/issues/<topic>.md`
| 理由(中文):
  1. 把出口契约落到 Phase 6 的 checklist 里,而不仅是文档头部的声明
  2. 显式提示进 B4(无 skill,但是流程上的关键产物)
-->

<!-- AE-CHANGE[REPLACE]:把最后一段 "Then ask: what would have prevented this bug?..." 改成(英文):

**Then ask: what would have prevented this bug?** If the answer involves an architectural change (no good test seam, tangled callers, hidden coupling), record the observation for B7 沉淀分流 to triage — it may become an ADR (`spec/ADR/`), a `design.md` amendment for the affected need(s), or a candidate for the user-triggered `improve-codebase-architecture` skill. Make this recommendation **after** the fix is in, not before — you have more information now than when you started.

Do NOT invoke `improve-codebase-architecture` directly from B3; that skill is user-triggered and unscheduled. B7 is the legitimate funnel for sedimentation.

| 理由(中文):
  1. 原文末让 B3 直接 hand off 到 improve-codebase-architecture — 与我们的"主动触发 skill,不挂节点"约定冲突(已锁)
  2. 改成把发现交给 B7 review 做沉淀分流(对接 S1 文档的 B7 节点)
  3. 显式禁止从 B3 直接调主动触发 skill,避免下游误用
-->

**Then ask: what would have prevented this bug?** If the answer involves architectural change (no good test seam, tangled callers, hidden coupling) hand off to the `/improve-codebase-architecture` skill with the specifics. Make the recommendation **after** the fix is in, not before — you have more information now than when you started.
