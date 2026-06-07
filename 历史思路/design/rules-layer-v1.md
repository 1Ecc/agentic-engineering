# rules-layer-v1
> **已迁出（2026-05-23）** · 内容已产品化为 [output/.claude/skills/using-agentic-engineering/](../output/.claude/skills/using-agentic-engineering/) 的 `references/root.md` 和 `references/deep.md`。
> 本文件**保留并可改**——作为设计期 SoT 持续优化；当 skill 内 references/ 和本文件出现分歧时，以本文件为新版意图、再回滚到 skill。
> 本文是**方法论模板**，不是任何具体项目的 CLAUDE.md / AGENTS.md。

---

## 0. 定位

规则层 = agent 在跑 `OpenSpec 骨架 + lifecycle-v1 节点 + 已选 skills` 时的**路由判断逻辑**。

回答的问题：
- agent 怎么知道当前在生命周期的哪个节点/阶段？
- 节点切换时该调哪些 skill？
- 实现期循环里怎么决定下一步走开发还是 debug？

**与已有事实源的边界**：

| 文件 | 管什么 | 不管什么 |
|---|---|---|
| [lifecycle-v1.md](lifecycle-v1.md) | 阶段划分、节点定义、节点 ↔ skills 映射 | agent 怎么在节点间路由 |
| [doc-persistence-v1.md](doc-persistence-v1.md) | 产物文件落到 `openspec/` 哪里 | agent 何时生成产物 |
| **本文件** | agent 路由判断逻辑 | 节点本身、产物结构、OpenSpec 命令具体调用方式（由项目 CLAUDE.md 规定） |

---

## 1. 设计期共识

**AI 工作纪律 + 联调 debug 行为指南** 不独立成层。理由：

- 工作纪律（渐进加载 / 根因优先 / 临时方案标注 / 优先级）→ 溶在本文件的「§3 判断流程」里
- debug 行为指南（复现 → 最小化 → 假设 → 插桩 → 修复 → 回归）→ 由实现期循环里的 own/`diagnose` skill 承接

这两块的真正落点：**项目实例化时**抄到具体项目的 `CLAUDE.md` / `AGENTS.md`——本文件不替项目实例做这层 instantiate。

---

## 2. agent 接到任务时的判断流程

agent 收到用户任务后，**一次性**走以下判断（不循环、不常驻、不"gate keeper"）：

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1. 定位                                                  │
│   - 看 openspec/changes/ 下有没有活跃 change                  │
│   - 看活跃 change 里哪些文件已存在（proposal / spec / design  │
│     / tasks / issues）                                        │
│   - 按文件存在性映射到 lifecycle-v1 §1.4 的节点/阶段          │
│                                                               │
│ Step 2. 判断首轮 / 增量                                       │
│   - openspec/specs/<domain>/spec.md 是否已有上轮合入真理      │
│   - 有 → incremental-update 模式（节点 skill 读旧产物、标变更）│
│   - 无 → from-scratch 模式                                    │
│                                                               │
│ Step 3. 选 skill                                              │
│   - 规划期（N1–N5）→ 选 lifecycle-v1 §1.4 对应的 orchestration│
│     skill（align-and-spec / technical-design / to-task）      │
│   - 实现期 → 默认调 mp/tdd 推进开发+测试；                    │
│     当出现 bug/测试失败/异常行为时切到 own/diagnose；         │
│     diagnose 完成后回到 tdd 继续                              │
│   - 验收 → 不调 skill，按项目 CLAUDE.md 规定的方式执行 archive│
│                                                               │
│ Step 4. 告知用户                                              │
│   - 当前定位（哪个节点 / 阶段）+ 选了哪个 skill + 产物落点    │
│   - 关键不确定点 / 需要用户决策的地方主动列出                 │
│   - 完成后告知下一步建议（"产物已落，下一步建议进 N3"）       │
└──────────────────────────────────────────────────────────────┘
```

**关键性质**：
- 不是常驻循环——一次任务走一次流程
- 不假设有 CLI 可用——纯靠读 `openspec/` 目录文件存在性定位
- 不替项目决定命令怎么调——OpenSpec 命令/archive 行为全部 defer 到项目 CLAUDE.md

---

## 4. 实现期循环的退出条件

实现期 `开发 ⇄ 测试 ⇄ debug` 循环不是无限的。退出条件按优先级：

1. `tasks.md` 全部勾完 + AC 比对通过 → 进验收
2. 同一个 issue 上 **3 次修复失败** → 强制停下，跳出循环回到 N3/N4 评估架构（来自 sp/systematic-debugging 的一条值钱规则，单独抄出来）
3. 用户显式终止

---

## 5. 节点 / 阶段 

> 与 [lifecycle-v1.md §1.4](lifecycle-v1.md) 和 [doc-persistence-v1.md §6.3](doc-persistence-v1.md) 对齐。

### 规划期

| 节点 | OpenSpec artifact | 产物路径 | orchestration skill |
|---|---|---|---|
| N1 需求对齐 | proposal | `openspec/changes/<name>/proposal.md` | own/`align-and-spec` |
| N2 PRD 撰写 | specs (delta) | `openspec/changes/<name>/specs/<domain>/spec.md` | own/`align-and-spec` |
| N3 技术架构 | design (## Architecture) | `openspec/changes/<name>/design.md` | own/`technical-design` |
| N4 技术方案 | design (## Solution) | 同上文件，不同段 | own/`technical-design` |
| N5 任务拆分 | tasks | `openspec/changes/<name>/tasks.md` | own/`to-task` |

### 实现期

| 子活动 | 产物路径 | 方法论 skill |
|---|---|---|
| 开发 + 测试 | 代码 + `tasks.md` 状态 | mp/`tdd` |
| debug / 联调 | `openspec/changes/<name>/issues/<topic>.md` | own/`diagnose` |

### 验收

| 动作 | 产物路径 | 触发方 |
|---|---|---|
| archive | `openspec/archive/<yyyymmdd>-<name>/` | 项目 CLAUDE.md 规定 |
