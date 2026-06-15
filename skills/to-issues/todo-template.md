# Todo - <need-name>

> Derived from: prd.md + design.md

## 实施

- [ ] T1 <title> — <one-line acceptance>
- [ ] T2 <title> — <one-line acceptance>; blocked by T1
- [ ] T3 <title> — <one-line acceptance>

## 阻塞 / 待澄清

- B1 <blocker description, link back to the design section that needs sharpening>

<!--
Rules for maintaining this file:

- NO frontmatter — this is a rolling working artifact, not a stateful spec document.
- Use `- [ ]` for unfinished, `- [x]` for finished. Never delete completed items — they are visible history.
- Sort by dependency order (blockers first); within the same level, sort by suggested execution order.
- If a slice depends on a design decision that is still open, put it in `## 阻塞 / 待澄清` instead of `## 实施`.
- Each slice MUST be traceable to a section in `design.md`. If a new slice has no traceable design section, that itself is a finding — go back and patch `design.md` rather than smuggling new scope into `todo.md`.
- Slice identifiers: `T<n>` for execution tasks, `B<n>` for blockers. Stable across the life of the need; do not renumber.
- Acceptance criteria: a single observable behavior that proves the slice is done. If it needs multiple lines, the slice is probably too coarse — split it.
-->
