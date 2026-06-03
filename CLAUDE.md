# Agentic Engineering Skills 项目说明

## 1. 目标

- 输出物：`output/.claude/skills/<name>/SKILL.md`（+ 必要的 `reference/` 模板）
- 编排目标：跑通"规划期 5 节点（own orchestration skill）+ 实现期循环（复用 mp 方法论 skill）+ 验收（项目 CLAUDE.md 规定 archive）"全链路，能在真实项目里端到端走完一轮 OpenSpec change。
- **三层心智模型**：
  - **artifact 层** = OpenSpec（目录骨架 + delta/archive 机制 + 命令）
  - **方法论层** = mattpocock/skills + obra/superpowers（TDD / debug 等通用工程方法）
  - **orchestration 层** = 我们写的 skill（`align-and-spec` / `technical-design` / `to-task`），把上面两层在生命周期节点上拼接

---

## 2. 三份事实源（v1，持续可改）

| 层 | 文件 | 管什么 |
| --- | --- | --- |
| 生命周期 | [design/lifecycle-v1.md](design/lifecycle-v1.md) | 规划期 5 节点 + 实现期循环 + 验收三段式定义、节点 ↔ skills 映射、双模式（from-scratch / incremental） |
| 文档落盘 | [design/doc-persistence-v1.md](design/doc-persistence-v1.md) | OpenSpec 目录骨架 + ADR + issues 模板，阶段/节点 ↔ 文件落点 ↔ 驱动 skill 映射 |
| 规则层 | [design/rules-layer-v1.md](design/rules-layer-v1.md)（已迁出但可改） | agent 接到任务时的判断流程、实现期循环退出条件、节点 ↔ artifact ↔ skill 映射 |

---

## 3. 当前 skills 落地进度

| 阶段 / 节点 | Skill 名 | 路径 | 状态 |
| --- | --- | --- | --- |
| 规划期 N1 + N2 | `align-and-spec`（own） | [output/.claude/skills/align-and-spec/SKILL.md](output/.claude/skills/align-and-spec/SKILL.md) | ✅ 已落地（含 proposal/spec 模板） |
| 规划期 N3 + N4 | `technical-design`（own） | [output/.claude/skills/technical-design/SKILL.md](output/.claude/skills/technical-design/SKILL.md) | ✅ 已落地（含 design 模板） |
| 规划期 N5 | `to-task`（own） | [output/.claude/skills/to-task/SKILL.md](output/.claude/skills/to-task/SKILL.md) | ✅ 已落地 |
| 实现期 · 开发+测试 | `tdd`（mp） | 外部源，本项目不重复造 | 🔄 直接复用 |
| 实现期 · debug/联调 | `diagnose`（mp） | 外部源，本项目不重复造 | 🔄 直接复用；落点 `openspec/changes/<name>/issues/<topic>.md`（7 步格式） |
| 验收 · archive | — | — | 🔄 不写专属 skill，由项目 CLAUDE.md 规定具体怎么执行 |
| 横切 | `using-agentic-engineering`（own，元 skill / 部署器） | [output/.claude/skills/using-agentic-engineering/SKILL.md](output/.claude/skills/using-agentic-engineering/SKILL.md) | ✅ 已落地 |


