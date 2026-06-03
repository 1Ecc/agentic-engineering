---
name: technical-design-architecture-solution-draft
description: "Use when proposal/spec 已对齐，需要在实施计划前产出以 Architecture 和 Solution 为核心的 OpenSpec design.md，或回填 Implementation Decisions。"
---

# technical-design-architecture-solution-draft
把已经对齐的 `proposal.md` / `specs/spec.md` 转成可被下游实施计划消费的 `design.md`。技术设计的逻辑是：**原则 -> Architecture -> Solution**。

用户只在缺失硬约束、业务优先级冲突、重大承诺、最终评审时介入。架构判断由 agent 主导；

## 输入与产物

**输入**

- `openspec/changes/<topic>/proposal.md`
- `openspec/changes/<topic>/specs/spec.md`

**产物**

- 写入 `openspec/changes/<topic>/design.md`
- 回填 `openspec/changes/<topic>/specs/spec.md` 的 `Implementation Decisions`

**不产出**

- 不写 `tasks.md`
- 不写代码
- 不展开到具体文件级实施步骤、测试用例编号、提交顺序


## 适用模式

- **incremental**: 已有代码库中加入或修改能力。先探查现有架构、命名、测试边界和项目内已经明确的约束。
- **from-scratch**: 全新项目或没有可继承架构。先保持核心路径简单、边界清楚、契约稳定，再讨论扩展点。

## Checklist
1. **读输入**: 读 `proposal.md` 和 `specs/spec.md`，提取硬约束、Out of Scope、User Stories、验收口径。
2. **判断模式**: 确认是 incremental 还是 from-scratch；若范围跨多个独立子系统，先拆分为多份 design。
3. **探查架构**: incremental mode 下自驱阅读相关代码、既有设计产物、测试和部署入口，形成现有系统地图。
4. **写 Architecture + Solution + 回填 spec**: 按 [`reference/design-template.md`](reference/design-template.md) 将 `design.md` 主体写成 Architecture 和 Solution；Architecture 说明系统如何组织，Solution 说明需求如何被解决；再仅将与 User Stories 或硬约束直接相关的关键决策回填到 `Implementation Decisions`。
5. **自审 + 用户评审**: 跑自审清单；通过后请用户审阅 `design.md` 和回填后的 `spec.md`，批准后才进入下一阶段实施计划。



## 关键原则

- **Agent 主导架构**: 用户只在硬约束缺失、业务优先级冲突、重大承诺、最终评审时介入。
- **约束先于偏好**: 先满足 spec 的硬约束，再谈框架、语言、库和抽象。
- **尊重现状，克制扩展**: incremental 跟随现有结构并只做相关整理；from-scratch 保持核心路径简单，不为假想未来提前抽象。
- **边界清楚，可改可测**: 模块职责、接口、依赖、测试面要清楚；变化应集中在明确位置。
- **决策可追溯**: 关键决策要关联 User Story、硬约束或现有架构冲突，并说明备选与 trade-off。
- **不越界**: design 阶段不写任务粒度、文件路径级步骤、测试用例编号或代码。

## Architecture

Architecture 回答：**系统如何组织**。

必须覆盖：

- **与现有架构的关系**: incremental 写清涉及模块、沿用接口、兼容性影响；from-scratch 写「无既有架构」。
- **模块与边界**: 核心模块职责、依赖、边界、变化归宿。
- **接口 / 契约**: 调用方必须知道的类型、数据格式、不变量、错误语义、顺序或配置。
- **关键数据流**: 输入从哪里来，经过哪些模块，产生什么状态变化或输出。
- **架构质量说明**: 如何体现清晰、可改、可测；保留哪些扩展点，明确不保留哪些假想扩展。

## Solution

Solution 回答：**需求如何被解决**。

必须覆盖：

- **核心解决策略**: 用什么机制满足主要 User Stories。
- **关键流程**: 从触发到处理再到输出的主路径。
- **数据处理策略**: 关键数据如何生成、校验、转换、存储、同步或回写。
- **异常与兼容策略**: 失败、重复、边界情况、兼容影响如何处理。
- **技术选型与取舍**: 只写对架构、数据契约、部署、测试、性能、合规或长期维护有影响的选型。
- **风险与验证**: 风险、假设、验证方式、决议时点。
- **约束满足方式**: 性能、规模、合规、deadline、人员能力等硬约束如何被满足。

## 回填规则

`Implementation Decisions` 只回填与 User Stories 或硬约束直接相关的决策。不要复制整篇 design，也不要把执行计划写进 spec。

## 自审清单

1. **覆盖**: 每条 User Story 或硬约束是否能找到对应 Architecture 位置和 Solution 策略？
2. **Architecture**: 模块、边界、接口、契约、数据流是否清楚？
3. **Solution**: 核心策略、关键流程、数据处理、异常兼容、约束满足是否完整？
4. **质量线**: 是否体现尊重现状、克制扩展、可改可测、决策可追溯？
5. **回填**: `Implementation Decisions` 是否只保留与 spec 直接相关的决策？



## User Review Gate

self-review 通过后，告诉用户：

> `design.md` 已写到 `openspec/changes/<topic>/design.md`，`spec.md` 的 `Implementation Decisions` 也已回填。请审阅这两个文件；批准后再进入下一阶段实施计划。

用户要求调整时，修改后重新跑自审清单。

## 接力

用户批准 design 后，本 skill 结束。下一步：

```
invoke skill: plan-tasks  (进入 N5 实施计划)
```

若 `plan-tasks` skill 在当前项目不存在，输出以下提示并停止：

> "design 已就位。下一步是 N5 实施计划，本项目目前没有对应 skill，请由用户在对话中人工推进。下游产物应继续写到 `openspec/changes/<topic>/tasks.md`。"
