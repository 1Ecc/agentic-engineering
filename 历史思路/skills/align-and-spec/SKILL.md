---
name: align-and-spec
description: "把模糊的想法/需求,通过对话压力测试对齐成可执行的 proposal + 行为规范(spec)。在开始写代码/技术方案/任务拆解之前使用。产物落到 openspec/changes/<topic>/。"
---

# align-and-spec · 需求对齐与行为规范
通过自然的协作对话，帮助将想法转化为完整的设计和规格。

首先了解当前的项目背景，然后一次提出一个问题来完善想法。一旦您了解了您正在构建的内容，就可以展示设计并获得用户批准。

在您提出设计并获得用户批准之前，请勿调用任何实施技能、编写任何代码、构建任何项目或采取任何实施操作。这适用于每个项目，无论其简单性如何。


## 反模式:「这事太简单了不用写 spec」

每一个项目都走这套流程。一行 todo、一个工具函数、一处 config 改动都算。"简单"项目恰恰是隐含假设最多、最容易返工的地方。spec 可以非常短(几句话也行),但**必须落盘并拿到用户批准**。

## Checklist

按顺序完成,每一项都用 TaskCreate 落到当前会话:

1. **探查项目上下文** — 检查项目文件、已有 docs、近期 commits、`openspec/changes/` 里是否已有同主题的 change(增量更新模式)
2. **判断范围是否过大** — 若用户描述跨多个独立子系统(例如"做一个含登录/支付/分析的平台"),先帮用户拆分;每个子系统走独立的 align-and-spec 循环。不要在过大的范围上继续问细节
3. **Grill me** — 见下方"Grill me"
4. **方案呈现** — 见下方“方案节奏”
5. **派生 `<topic>` slug** — 从对话主题派生 kebab-case slug,告诉用户"我准备落到 `openspec/changes/<slug>/`,如果要改名请告诉我";落盘目录默认 `openspec/changes/`,若项目已有自定义路径约定(`.openspec.yaml` 或用户口头指定)则尊重之
6. **写 proposal.md** — 按 [`reference/proposal-template.md`](reference/proposal-template.md) 模板与撰写要点写
7. **写 specs/spec.md** — 按 [`reference/spec-template.md`](reference/spec-template.md) 模板与撰写要点写。注意:本 skill (N1+N2) 阶段**只填前 5 段 + 留后 2 段骨架**,不要越界填 Implementation/Testing Decisions
8. **建空文件占位** — 创建空的 `openspec/changes/<topic>/design.md` 和 `tasks.md`(只放一行注释「待 technical-design / writing-plans skill 产出」),便于下游接力
9. **Spec self-review** — 4 项 inline 检查,见"自审清单"
10. **User review gate** — 请用户读 proposal + spec 文件,等明确反馈;有改动重跑 self-review
11. **接力提示** — 见"接力"

### grill me
Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

### 方案节奏

**探索方案 (Exploring approaches):**

- 提出 2-3 个不同方向,各自标注 trade-off。
- 用对话化的方式呈现选项,带上你的推荐和理由。
- 先讲推荐方案,再解释为什么推荐。

**呈现设计 (Presenting the design):**

- 当你确信已经理解了要做什么,呈现设计。
- 按每段的复杂度调整篇幅:简单的几句话,有细微差别的展开到 200-300 字。
- 随时准备回头澄清 — 如果某段讲不通,就回去确认。

## 产物模板与撰写要点

把经过验证的需求沉淀为两件可被下游 skill 直接消费的产物:

- proposal.md → [`reference/proposal-template.md`](reference/proposal-template.md) 
- specs/spec.md → [`reference/spec-template.md`](reference/spec-template.md)

`design.md` 和 `tasks.md` 是下一段(N3/N4/N5)的产物,本 skill 不写,但会在 `openspec/changes/<topic>/` 下留好空文件占位,便于下游 skill 直接接力。

## 自审清单 (Self-Review,inline 跑)

写完 proposal 和 spec 后,用挑剔的眼睛扫一遍:

1. **占位符扫描** — 有没有 TBD / TODO / 未填章节 / 模糊需求?有就补齐(Implementation/Testing Decisions 段的占位注释**不算 TBD**,那是有意保留给 N3/N4 的)
2. **内部一致性** — proposal 的"用户故事"与 spec 的"User Stories"是否对得上?proposal 的范围与 spec 的 Out of Scope 是否一致?有没有相互矛盾的句子?
3. **范围检查** — 是不是一个可执行的单一 plan 范围?还是又冒出了多个独立子系统?后者就要回头拆分
4. **歧义检查** — 任何 User Story 有没有可能被两种方式理解?Problem/Solution 有没有从工程视角而非用户视角写的句子?有就改

发现问题直接 inline 改,不用单独再过一遍。

## User Review Gate

self-review 通过后,告诉用户:

> "proposal 和 spec 已经写到 `openspec/changes/<topic>/proposal.md` 与 `openspec/changes/<topic>/specs/spec.md`。请你打开看一眼,确认没问题再进入下一段(N3 技术架构)。需要改动随时说。"

等用户的明确回复。改动后回到 self-review 重跑。

## 接力

用户批准 spec 之后,**本 skill 任务终止**。下一步:

```
invoke skill: technical-design  (进入 N3 技术架构)
```

若 `technical-design` skill 在当前项目不存在,输出以下提示并停止:

> "spec 已就位。下一步是 N3 技术架构,本项目目前没有对应 skill,请由用户在对话中人工推进。下游产物应继续写到 `openspec/changes/<topic>/design.md`。"

**绝对不要**在没有 design.md 和 tasks.md 的情况下直接开始写代码。

## 核心原则
- 一次提出一个问题：不要因多个问题而不知所措
- 多选优先：给候选 + 推荐 + 理由,比开放题更省时
- YAGNI：从所有设计中删除不必要的功能
- 探索方案：在解决之前总是提出 2-3 种方法，并解释权衡