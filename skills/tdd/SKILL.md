---
name: tdd
description: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
---

# Test-Driven Development

## Inputs (S1 nodes A5 / B5)

This skill operates on a single need. Read the following before starting any cycle:

- `spec/needs/<need-name>/design.md` - the HOW (modules, interfaces, key trade-offs); test names and the public interfaces under test SHOULD match its vocabulary
- `spec/needs/<need-name>/todo.md` - the rolling task list produced by A4 `to-issues`; pick the next unchecked `## 实施` item, top-down
- `spec/INDEX.md` - domain vocabulary; cross-need ADRs at `spec/ADR/`

## Hard Constraints

- **No scope smuggling.** Do NOT implement anything not present in `design.md`. If the current `todo.md` item requires behavior the design did not anticipate, STOP, go back to A3 (`writing-plans`) to patch `design.md`, then resume here.
- **One slice at a time.** Pick a single `- [ ]` item from `## 实施`, complete the full red -> green -> refactor cycle for it, mark it `- [x]`, then move to the next. Do not batch.
- **End-to-end verification is A6's job, not A5's.** This skill's exit criterion is "all `## 实施` items checked + tests green at the slice seam". Real-user-path verification happens in A6 `verification-before-completion`.

## Two Modes

| Mode | When | Output |
|------|------|--------|
| **A5 (development)** | Driven by `todo.md` after a fresh need passes A4 | Roll `todo.md` forward; mark items `- [x]` as each cycle completes |
| **B5 (fix)** | Driven by an existing `spec/needs/<need-name>/issues/<topic>.md` after B3 diagnose | Apply the fix per the root cause; `todo.md` is NOT touched (it was already fully checked when the bug surfaced). Append progress notes to the issue file's `## bug` section instead. |

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

**Correct approach**: Vertical slices via tracer bullets. One test -> one implementation -> repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behavior matters and how to verify it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED->GREEN: test1->impl1
  RED->GREEN: test2->impl2
  RED->GREEN: test3->impl3
  ...
```

## Workflow

### 1. Planning

When exploring the codebase, use vocabulary from `spec/INDEX.md` and the current need's `design.md` so that test names and interface vocabulary match the project's language. Respect ADRs under `spec/ADR/`.

Before writing any code for the current slice:

- [ ] Read the `## 实施` item being implemented; confirm it traces to a section in `design.md`
- [ ] Confirm with user (or re-read `design.md`) what interface changes the slice requires
- [ ] Confirm which behaviors to test (prioritize per slice acceptance criteria)
- [ ] Identify opportunities for [deep modules](deep-modules.md) (small interface, deep implementation)
- [ ] Design interfaces for [testability](interface-design.md)
- [ ] List the behaviors to test (not implementation steps)
- [ ] If `design.md` needs amendment (new behavior surfaced), STOP and go back to A3

Ask: "What should the public interface look like? Which behaviors are most important to test?"

**You can't test everything.** Confirm with the user exactly which behaviors matter most. Focus testing effort on critical paths and complex logic, not every possible edge case.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior -> test fails
GREEN: Write minimal code to pass -> test passes
```

This is your tracer bullet - proves the path works end-to-end.

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test -> fails
GREEN: Minimal code to pass -> passes
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

## After Each Slice (A5)

1. Tick the corresponding `- [ ]` -> `- [x]` in `spec/needs/<need-name>/todo.md`
2. Update `spec/INDEX.md`:
   - Bump the `todo` column counter (e.g. `2/8` -> `3/8`)
   - If all `## 实施` items are now checked, set `当前节点` to `A6 verify` (per `spec/AGENTS.md` INDEX rules)
   - If unsure, run `ae index-rebuild`
3. Commit. Suggested message: `feat(<need-name>): T<n> <title>`.

## After All Slices Checked (A5 only)

Hand off to A6 `verification-before-completion` for end-to-end verification on the real user path. This skill's job ends when `todo.md` is fully checked AND slice-level tests are green.

## After Fix Lands (B5 only)

1. Do NOT modify `todo.md` (it was fully checked before the bug surfaced).
2. Append a short progress note under the issue file's `## bug` section (the 7-section format produced at B4). Quote the failing test name and the root-cause one-liner.
3. Commit. Suggested message: `fix(<need-name>): <root cause summary>`.
4. Hand off to B6 user re-verification.

## Boundaries

- This skill writes code and tests, plus updates `todo.md` (A5) or the issue file's `## bug` section (B5).
- It does NOT write `prd.md`, `design.md`, or new ADRs. Scope changes go back through A3.
- It does NOT perform end-to-end / user-path verification - that is A6.
