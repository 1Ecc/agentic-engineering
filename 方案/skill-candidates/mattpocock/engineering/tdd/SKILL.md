<!-- AE-CHANGE[REPLACE]:
description: Test-driven development with red-green-refactor loop. Drives a need to working code by reading `spec/needs/<need-name>/{design.md, todo.md}` and rolling `todo.md` forward one slice at a time. Used at both S1 node A5 (new development) and S1 node B5 (fixing after root-cause diagnosis).
| 理由(中文):
  1. 标 S1 节点编号(A5 和 B5 复用同一个 skill,skill-candidates README §四 已锁)
  2. 显式输入契约(design.md + todo.md),与 A4 to-issues 输出对齐
  3. 显式输出契约(滚动推进 todo.md)
-->
---
name: tdd
description: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
---

# Test-Driven Development

<!-- AE-CHANGE[ADD-BEFORE]:在 ## Philosophy 之前插入新段(英文):

## Inputs (S1 nodes A5 / B5)

This skill operates on a single need. Read the following before starting any cycle:

- `spec/needs/<need-name>/design.md` — the HOW (modules, interfaces, key trade-offs); test names and the public interfaces under test SHOULD match its vocabulary
- `spec/needs/<need-name>/todo.md` — the rolling task list produced by A4 `to-issues`; pick the next unchecked `## 实施` item, top-down
- `spec/INDEX.md` — domain vocabulary; cross-need ADRs at `spec/ADR/`

## Hard Constraints

- **No scope smuggling.** Do NOT implement anything not present in `design.md`. If the current `todo.md` item requires behavior the design did not anticipate, STOP, go back to A3 (`writing-plans`) to patch `design.md`, then resume here. (Matches `spec-framework.md` §边界规则.)
- **One slice at a time.** Pick a single `- [ ]` item from `## 实施`, complete the full red → green → refactor cycle for it, mark it `- [x]`, then move to the next. Do not batch.
- **End-to-end verification is A6's job, not A5's.** This skill's exit criterion is "all `## 实施` items checked + tests green at the slice seam". Real-user-path verification happens in A6 `verification-before-completion`.

## Two Modes

| Mode | When | Output |
|------|------|--------|
| **A5 (development)** | Driven by `todo.md` after a fresh need passes A4 | Roll `todo.md` forward; mark items `- [x]` as each cycle completes |
| **B5 (fix)** | Driven by an existing `spec/needs/<need-name>/issues/<topic>.md` after B3 diagnose | Apply the fix per the root cause; `todo.md` is NOT touched (it was already fully checked when the bug surfaced). Append progress notes to the issue file's `## bug` section instead. |

| 理由(中文):
  1. 输入契约:design.md + todo.md + INDEX/ADR(对接 spec-framework.md)
  2. 三条硬约束:no scope smuggling(对接 spec-framework.md §边界 "todo 不应出现 design 里没提的事")、one slice at a time、端到端验证由 A6 承接(避免本 skill 越界)
  3. 双 mode 表(A5 vs B5):skill-candidates README §四 已锁"同一个 skill 两处复用,节奏相同,输出端不同";B5 不动 todo.md,改 issue 文件 bug 段
-->


## Philosophy

**Core principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe _what_ the system does, not _how_ it does it. A good test reads like a specification - "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed. If you rename an internal function and tests fail, those tests were testing implementation, not behavior.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" - treating RED as "write all tests" and GREEN as "write all code."

This produces **crap tests**:

- Tests written in bulk test _imagined_ behavior, not _actual_ behavior
- You end up testing the _shape_ of things (data structures, function signatures) rather than user-facing behavior
- Tests become insensitive to real changes - they pass when behavior breaks, fail when behavior is fine
- You outrun your headlights, committing to test structure before understanding the implementation

**Correct approach**: Vertical slices via tracer bullets. One test → one implementation → repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behavior matters and how to verify it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

## Workflow

### 1. Planning

<!-- AE-CHANGE[REPLACE]:把下一段 "When exploring the codebase, use the project's domain glossary ... ADRs in the area you're touching." 改成(英文):
   When exploring the codebase, use vocabulary from `spec/INDEX.md` and the current need's `design.md` so that test names and interface vocabulary match the project's language. Respect ADRs under `spec/ADR/`.
| 理由(中文):统一本地化(与 A2/A3/A4 同款替换)
-->
When exploring the codebase, use the project's domain glossary so that test names and interface vocabulary match the project's language, and respect ADRs in the area you're touching.

<!-- AE-CHANGE[REPLACE]:把下面 "Before writing any code:" 的 checklist 替换为(英文,把 design.md 和 todo.md 嵌入 planning checkpoint):

Before writing any code for the current slice:

- [ ] Read the `## 实施` item being implemented; confirm it traces to a section in `design.md`
- [ ] Confirm with user (or re-read `design.md`) what interface changes the slice requires
- [ ] Confirm which behaviors to test (prioritize per slice acceptance criteria)
- [ ] Identify opportunities for [deep modules](deep-modules.md) (small interface, deep implementation)
- [ ] Design interfaces for [testability](interface-design.md)
- [ ] List the behaviors to test (not implementation steps)
- [ ] If design.md needs amendment (new behavior surfaced), STOP and go back to A3

| 理由(中文):
  1. 让 planning checklist 显式挂上 design.md / todo.md(本项目的输入契约)
  2. 加最后一条 "STOP and go back to A3" — 强化 no-scope-smuggling 约束
  3. 删 "Get user approval on the plan" — A3 已门禁过,本步无需重复用户审批;改成"Confirm with user (or re-read design.md)" 二选一,避免 A5 每个 slice 都打扰用户
-->
Before writing any code:

- [ ] Confirm with user what interface changes are needed
- [ ] Confirm with user which behaviors to test (prioritize)
- [ ] Identify opportunities for [deep modules](deep-modules.md) (small interface, deep implementation)
- [ ] Design interfaces for [testability](interface-design.md)
- [ ] List the behaviors to test (not implementation steps)
- [ ] Get user approval on the plan

Ask: "What should the public interface look like? Which behaviors are most important to test?"

**You can't test everything.** Confirm with the user exactly which behaviors matter most. Focus testing effort on critical paths and complex logic, not every possible edge case.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This is your tracer bullet - proves the path works end-to-end.

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:

- One test at a time
- Only enough code to pass current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### 4. Refactor

After all tests pass, look for [refactor candidates](refactoring.md):

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID principles where natural
- [ ] Consider what new code reveals about existing code
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

<!-- AE-CHANGE[ADD-AFTER]:在文件末尾追加(英文):

## After Each Slice (A5)

1. Tick the corresponding `- [ ]` → `- [x]` in `spec/needs/<need-name>/todo.md`
2. Update `spec/INDEX.md`:
   - Bump the `todo` column counter (e.g. `2/8` → `3/8`)
   - If all `## 实施` items are now checked, set `当前节点` to `A6 verify` (per `spec-framework.md` §INDEX 推导规则)
   - If unsure, run `/ae-index-rebuild`
3. Commit. Suggested message: `feat(<need-name>): T<n> <title>` for A5; `fix(<need-name>): <root cause summary>` for B5.

## After All Slices Checked (A5 only)

Hand off to A6 `verification-before-completion` for end-to-end verification on the real user path. This skill's job ends when `todo.md` is fully checked AND slice-level tests are green.

## After Fix Lands (B5 only)

1. Do NOT modify `todo.md` (it was fully checked before the bug surfaced).
2. Append a short progress note under the issue file's `## bug` section (the 7-section format produced at B4). Quote the failing test name and the root-cause one-liner.
3. Hand off to B6 user re-verification.

## Boundaries

- This skill writes code and tests, plus updates `todo.md` (A5) or the issue file's `## bug` section (B5).
- It does NOT write `prd.md`, `design.md`, or new ADRs. Scope changes go back through A3.
- It does NOT perform end-to-end / user-path verification — that is A6.

| 理由(中文):
  1. After Each Slice 段:每完成一个 slice 同步 todo.md + INDEX(spec-framework.md §INDEX 推导规则)
  2. After All Slices(A5 only):明确 A5 出口 = 接力 A6
  3. After Fix Lands(B5 only):不动 todo.md;改 issue 文件 bug 段;接力 B6 用户复验 — 全部对接 S1 节点路径
  4. Boundaries 段:与 design.md / ADR / A6 三方边界明文化(与 A2/A3/A4 风格对称)
-->

