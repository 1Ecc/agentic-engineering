<!-- AE-CHANGE[REPLACE]:
description: "Tell the agent to zoom out — give broader context or a higher-level perspective using `spec/INDEX.md` and `spec/README.md` (ASCII project map) vocabulary. User-triggered ONLY; does NOT hook into any S1 node. Typical use: before A3 design, or when B3 diagnose feels stuck."
| 理由(中文):
  1. 路径切换:domain glossary → spec/INDEX.md + spec/README.md
  2. 显式 user-triggered + 不挂节点(已锁)
  3. 给出典型触发时机(A3 设计前 / B4 卡住时,与 customization-plan.md §横切批注一致)
-->
---
name: zoom-out
description: Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.
disable-model-invocation: true
---

<!-- AE-CHANGE[REPLACE]:把主体那一行 "I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using the project's domain glossary vocabulary." 改成(英文):

I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using vocabulary from `spec/INDEX.md` and the ASCII project map in `spec/README.md`. Reference relevant `spec/needs/*/design.md` and `spec/ADR/` decisions so I know which constraints already shape this area.

| 理由(中文):
  1. 路径切换(与 description 同款本地化)
  2. 显式让 zoom-out 也读 design 和 ADR — 否则用户经常用它做"为什么这里这么写"的回顾,需要约束级背景
-->
I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using the project's domain glossary vocabulary.
