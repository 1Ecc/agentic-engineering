---
name: using-agentic-engineering
description: 软件开发生命周期路由 skill。涉及需求对齐 / PRD / 技术架构 / 技术方案 / 任务拆分 / 开发 / 测试 / debug 联调 。
---

# using-agentic-engineering

agent 涉及软件开发生命周期任意环节时调用，完成"定位当前在哪 → 选哪个 skill 推进 → 告知用户"。

## 阶段划分

- **规划期**（线性 · 5 节点 · 调 own orchestration skill）
- **实现期**（循环 · 不分节点 · 直接调 mp 方法论 skill）
- **验收**（外部触发 · archive 行为由项目决定）

## agent 接到任务时的判断流程

收到用户任务后，**一次性**走以下判断（不循环、不常驻、不假设有 CLI 可用）：

1. **定位**：看 `openspec/changes/` 下活跃 change 里哪些文件已存在（proposal / spec / design / tasks / issues），按文件存在性映射到下面"节点 ↔ artifact ↔ skill 映射"
2. **判断首轮 / 增量**：`openspec/specs/<domain>/spec.md` 是否已有上轮合入真理 → 有 → `incremental-update` 模式（节点 skill 读旧产物、标变更）；无 → `from-scratch` 模式
3. **选 skill**：
   - 规划期 → 下表对应的 own orchestration skill
   - 实现期 → 默认调 mp/`tdd` 推进开发+测试；出现 bug / 测试失败 / 异常行为时切到 own/`diagnose`；diagnose 完成后回到 tdd
   - 验收 → 不调 skill，按本项目规定的 archive 方式执行
4. **告知用户**：当前定位（哪个节点 / 阶段）+ 选了哪个 skill + 产物落点 + 关键不确定点 / 需要用户决策的地方 + 完成后下一步建议

## 节点 ↔ artifact ↔ skill 映射

### 规划期（5 节点 · own orchestration skill）

| 节点 | OpenSpec artifact | 产物路径 | skill |
|---|---|---|---|
| N1 需求对齐 | proposal | `openspec/changes/<name>/proposal.md` | own/`align-and-spec` |
| N2 PRD 撰写 | specs (delta) | `openspec/changes/<name>/specs/<domain>/spec.md` | own/`align-and-spec`（同 skill 覆盖 N1+N2） |
| N3 技术架构 | design (## Architecture) | `openspec/changes/<name>/design.md` | own/`technical-design` |
| N4 技术方案 | design (## Solution) | 同上文件，不同段 | own/`technical-design`（同 skill 覆盖 N3+N4） |
| N5 任务拆分 | tasks | `openspec/changes/<name>/tasks.md` | own/`to-task` |

### 实现期（循环 · mp 方法论 skill）

| 子活动 | 产物路径 | skill |
|---|---|---|
| 开发 + 测试 | 代码本体 + `tasks.md` 状态勾选 | mp/`tdd` |
| debug / 联调 | `openspec/changes/<name>/issues/<topic>.md`（无固定模板，落盘见 own/`diagnose` Phase 6） | own/`diagnose` |

### 验收

| 动作 | 产物路径 | 触发方 |
|---|---|---|
| archive | `openspec/archive/<yyyymmdd>-<name>/` | 项目决定（OpenSpec CLI / shell 脚本 / 人工搬运任选） |

## 实现期循环退出条件

1. `tasks.md` 全部勾完 + AC 比对通过 → 进验收
2. 同一个 issue 上 **3 次修复失败** → 强制停下，跳出循环回到 N3/N4 评估架构
3. 用户显式终止
