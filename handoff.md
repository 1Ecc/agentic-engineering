# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。

当前仓库正在整理为未来 npm CLI 发布形态:根目录平铺 `commands/`、`skills/`、`config/` 作为可分发资产,`docs/` 面向使用者,`design/` 保留设计档案。

## 当前阶段

正在执行 `方案/wrap-up-and-restructure.md` 的阶段 1 仓库结构整理。

本次开始前已先做本地基线提交:

- `9380792 chore: checkpoint before stage 1 restructure`

## 已完成

- `commands/` 已从旧的 `agentic-engineering/.claude/commands/` 提升到仓库根
  - `commands/ae-init.md`
  - `commands/ae-init.templates/`
  - `commands/ae-init.test.sh`
  - `commands/ae-ingest-mother.md`
- `config/ae-rules.md.example` 已提升到仓库根
- 旧的 `agentic-engineering/` 空壳已删除
- 12 个已采纳 skill 已复制到根目录 `skills/`
  - `brainstorming`
  - `grill-me`
  - `to-prd`
  - `writing-plans`
  - `to-issues`
  - `tdd`
  - `verification-before-completion`
  - `diagnose`
  - `review`
  - `handoff`
  - `improve-codebase-architecture`
  - `zoom-out`
- `docs/` 已建立
  - `docs/framework.md`
  - `docs/spec-framework.md`
  - `docs/scenarios/s0-bootstrap.md`
  - `docs/scenarios/s1-main-loop.md`
- `design/skill-candidates/` 已建立
  - `design/skill-candidates/README.md`
  - `design/skill-candidates/customization-plan.md`
- 顶层 `README.md` 已补充对外说明
- 顶层 `LICENSE` 已按 MIT 补充
- `.gitignore` 已排除 `reference/`、`CES-AI-topic-9-smart-workflow/`、`历史思路/`
- `reference/` 与 `CES-AI-topic-9-smart-workflow/` 已从 git 索引移除,本地目录保留

## 验证

已验证:

- `commands/ae-init.md` 与 `commands/ae-init.test.sh` 仍使用同层 `ae-init.templates/` 相对路径
- `skills/` 下无 `AE-CHANGE` 残留
- 12 个 `skills/*/SKILL.md` 均包含 `name:` 与 `description:`
- 关键附属文件已随 skill 复制:
  - `skills/diagnose/assets/issue-7-sections.md`
  - `skills/diagnose/scripts/hitl-loop.template.sh`
  - `skills/to-issues/todo-template.md`
  - `skills/tdd/interface-design.md`
  - `skills/improve-codebase-architecture/LANGUAGE.md`

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `README.md` | 对外说明:它是什么、怎么手动安装、路线图 |
| `commands/ae-init.md` | `/ae-init` 命令契约 |
| `commands/ae-init.templates/` | `/ae-init` 入口模板 |
| `commands/ae-init.test.sh` | S0 验收脚本 |
| `commands/ae-ingest-mother.md` | `/ae-ingest-mother` 命令契约 |
| `config/ae-rules.md.example` | 全局规则库样例 |
| `skills/` | 12 个已采纳 skill 的发布资产 |
| `docs/framework.md` | 对外方法论框架说明 |
| `docs/spec-framework.md` | `spec/` 目录规范 |
| `docs/scenarios/s0-bootstrap.md` | S0 bootstrap 规格 |
| `docs/scenarios/s1-main-loop.md` | S1 主循环规格 |
| `design/skill-candidates/README.md` | skill 候选池归档 |
| `design/skill-candidates/customization-plan.md` | skill 改造进展归档 |
| `方案/wrap-up-and-restructure.md` | 阶段 1 整理计划原文,阶段 1 保持只读 |

## 开放问题 / 待处理

- `commands/ae-index-rebuild.md` 仍未实现,按计划留到阶段 3
- npm CLI 代码仍未实现,按计划留到阶段 2
- `方案/` 保留供人工 check,阶段 1 不删除

## 下次起手建议

阶段 1 完成并提交后,下一步进入阶段 2:

1. 实现 npm CLI 包结构:`package.json`、`bin/ae.js`、`src/`
2. 实现 `ae init` 的资产复制与幂等行为
3. 再实现 `ae ingest-mother` 与 `ae index-rebuild`
