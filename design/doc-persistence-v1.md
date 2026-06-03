# doc-persistence-v1

> **范围**：本节只规定**文档结构与内容模板**。
> **不含**：AI 工作纪律（渐进加载 / 优先级 / 根因优先 / 临时方案标注）—— 那是使用方法论的"项目实例"的 AGENTS.md / CLAUDE.md 范畴，已剥离。

## 6.1 主框架 = OpenSpec + 2 个 CES 借鉴

主框架沿用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 的 spec-driven 结构：
- `openspec/specs/` 是当前系统真理（稳定信源，按 domain 切）
- `openspec/changes/<name>/` 是活跃 delta（一 change 一目录）
- `openspec/archive/` 归档完成的 change
- delta 机制：archive 时把 `changes/<name>/specs/` 合入顶层 `specs/`

> **OpenSpec 提供的是目录骨架 + delta/archive 机制 + 一组命令**，文件内的**模板内容**由我们的 orchestration skill（`align-and-spec` / `technical-design` / `to-task`）的 reference/ 提供，不是 OpenSpec 原生给的。

在此之上，我们引入 **2 个扩展**（借自 CES AGENTS.md），填补 OpenSpec 的两个空白：

| 扩展 | 位置 | 解决的 OpenSpec 空白 |
|---|---|---|
| **ADR** | `openspec/adr/` | OpenSpec 无显式 ADR；跨周期决策的"为什么"散在历史 proposal.md，归档后翻历史才能找到 |
| **联调闭环** | `openspec/changes/<name>/issues/` | OpenSpec 的 `tasks.md` 是 checklist，承载不了"问题/当前态/期望态/分析/bug 记录/验收"的协作 |

## 6.2 完整目录布局

```
<项目根>/
└── openspec/
    ├── specs/                              ← 当前系统真理（每 domain 一份，跨周期稳定）
    │   └── <domain>/spec.md
    ├── changes/                            ← 活跃变更（一个 change 一个目录）
    │   └── <change-name>/
    │       ├── proposal.md                 ← N1 需求探查
    │       ├── design.md                   ← N3 架构 + N4 方案
    │       │   ├── ## Architecture         ← N3 内容（系统骨架）
    │       │   └── ## Solution             ← N4 内容（技术选型）
    │       ├── tasks.md                    ← N5 实施计划
    │       ├── specs/                      ← N2 PRD 的 delta（按 domain 切）
    │       │   └── <domain>/spec.md
    │       └── issues/                     ← 实现期 debug/联调闭环（每主题一份，可选）
    │           └── <topic>.md
    ├── adr/                                ← 跨周期决策记录（任何节点都可产出）
    │   └── <NNNN>-<short-title>.md
    ├── archive/                            ← 归档（验收通过后整个 change 目录搬入，触发方式由项目 CLAUDE.md 规定）
    │   └── <yyyymmdd>-<change-name>/
    └── config.yaml                         ← OpenSpec 配置
```

**单一根原则**：所有方法论产出都在 `openspec/` 下，不引入 `docs/` 顶层外挂。

## 6.3 节点 ↔ 文件落点映射

> **读法**：
> - 「目录骨架来源」= 路径形态由谁定（OpenSpec / 本方法论 / 项目自定）
> - 「模板/驱动 skill」= 文件内容由哪个 skill 写出来
> - OpenSpec 命令（archive 等）的具体调用方式由项目 CLAUDE.md 规定，本表不约定

### 规划期（线性 5 节点）

| 节点 | 文件 | 目录骨架来源 | 模板/驱动 skill |
|---|---|---|---|
| **N1** 需求对齐 | `changes/<name>/proposal.md` | OpenSpec | own/`align-and-spec`（reference/proposal-template.md） |
| **N2** PRD 撰写 (delta) | `changes/<name>/specs/<domain>/spec.md` | OpenSpec | own/`align-and-spec`（reference/spec-template.md，参考 mp/to-prd） |
| **N3** 技术架构 | `changes/<name>/design.md` 的 `## Architecture` 段 | OpenSpec + 本方法论规定的二级标题 | own/`technical-design` |
| **N4** 技术方案 | `changes/<name>/design.md` 的 `## Solution` 段 | OpenSpec + 本方法论规定的二级标题 | own/`technical-design`（同文件、不同段） |
| **N5** 任务拆分 | `changes/<name>/tasks.md` | OpenSpec | own/`to-task` |

### 实现期（循环 · 不分节点）

| 子活动 | 文件 | 目录骨架来源 | 模板/驱动 skill |
|---|---|---|---|
| 开发 + 测试 | 代码本体（仓库主体）+ `changes/<name>/tasks.md` 状态勾选 | — / OpenSpec | mp/`tdd`（代码本体由 tdd 流程驱动；tasks.md 状态由 agent 按 plan 同步勾选，无独立模板） |
| debug / 联调 | `changes/<name>/issues/<topic>.md` | 本方法论扩展（OpenSpec 没有此目录） | own/`diagnose` 驱动诊断和落盘（Phase 6 清理 checklist 含落盘项；无固定模板） |

### 验收（终点）

| 动作 | 文件变动 | 触发方 |
|---|---|---|
| 验收签字 | 不强制落盘（可以在 `proposal.md` 末尾追加签字段，或外部沟通记录） | 用户 |
| archive | `changes/<name>/` 搬到 `archive/<yyyymmdd>-<name>/`；delta `specs/` 合入顶层 `specs/<domain>/spec.md` | **由项目 CLAUDE.md 规定**（可以是 OpenSpec CLI 命令、shell 脚本、或人工搬运，本方法论不约定） |

### 跨节点

| 触发 | 文件 | 模板 |
|---|---|---|
| 任何节点产生跨周期关键决策 | `adr/<NNNN>-<short-title>.md` | 本方法论自定义（见 §6.4） |


## 6.4 与多轮迭代的协同（双模式天然落实）

| 模式 | 行为 |
|---|---|
| **第 1 轮**（from-scratch） | `specs/<domain>/spec.md` 空 → 创建。`changes/<name>/specs/` 全新增 delta。archive 后 delta 合入顶层。 |
| **第 n 轮**（incremental-update） | `specs/<domain>/spec.md` 已有上轮合入真理。`changes/<name>/specs/` 是增量 delta（add / modify / remove 标记）。archive 后增量合入顶层。 |

→ **OpenSpec 的 delta 机制天然实现双模式**，方法论无需另写"双模式"逻辑。

