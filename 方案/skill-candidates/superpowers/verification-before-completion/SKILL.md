<!-- AE-CHANGE[REPLACE]:
description: Use at S1 node A6 — end-to-end verification on the real user path before claiming the need is complete, and before A → B (user acceptance). Requires running real-path verification (NOT mocked) and confirming output before any success claim. Evidence before assertions always. Failing this is the most common A-loop self-deception.
| 理由(中文):
  1. 标 S1 节点 A6
  2. 显式要求"real user path,非 mock"(S1 文档已锁)
  3. 强调"A → B 前的最后一道关卡"
-->
---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |
<!-- AE-CHANGE[ADD-AFTER]:在上面这个表里追加一行(英文,作为本项目的硬约束 row):
| **Need complete (A6)** | **End-to-end run of the real user path described in `prd.md` Solution / User Stories — observe expected outputs at every step** | Unit + integration tests green; lint clean; mocked end-to-end pass |
| 理由(中文):
  1. 加入本项目 A6 的硬约束:必须跑真实用户路径(prd.md 描述的用户故事),不是单元/集成测试绿+lint绿就算完
  2. 显式列 "mocked end-to-end" 为不充分项 — S1 文档已锁"禁止 mock 绕过根因"
-->


## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

<!-- AE-CHANGE[DELETE]:删除整段 ## Why This Matters(连同 5 个 bullet)
| 理由(中文):
  1. "From 24 failure memories" 是原作者个人化痕迹 — 我们项目没这个语境
  2. "your human partner said I don't believe you" 这种表述在通用 skill 里读着突兀
  3. 同章节传递的"为什么要严格"已经在 §The Iron Law 和 §Rationalization Prevention 体现,此段冗余
-->
## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

<!-- AE-CHANGE[ADD-AFTER]:在文件末尾追加(英文):

## After Verification (S1 node A6)

If verification passes:

1. Update `spec/INDEX.md`:
   - Recompute `当前节点` per `spec-framework.md` §INDEX 推导规则 — for a fresh need this becomes "B1 user acceptance" (the next node is user-driven, not skill-driven)
   - If unsure, run `/ae-index-rebuild`
2. Hand off to B1: tell the user the need is ready for their hands-on acceptance test. Do NOT mark anything `archived` — `archived` is reserved for needs that get superseded, not completed.

If verification fails:

1. Do NOT update INDEX.
2. Return to A5 `tdd` with the failing evidence; if the failure reveals a design gap, escalate to A3 `writing-plans` to patch `design.md`.

## Distinction from B-side verification

- **A6 (this skill)** = developer self-verification on the real user path; runs BEFORE handing the need to the user
- **B1** = user-driven hands-on verification; user uses the product per `prd.md`, reports back
- **B6** = user re-verification after a B5 fix; same nature as B1, just post-fix

A6 passing does NOT mean the need is done. Only B1 (or B6 in a B-loop) closes the need.

| 理由(中文):
  1. After Verification 段:对接 S1 节点路径(A6 → B1)
  2. INDEX 同步,与其他 skill 同款收尾
  3. Distinction 段:S1 文档明确"A6 是开发自验,B1 是用户验收,二者不能混" — 这是 v0.1 实战中容易踩的坑,必须明文
-->

