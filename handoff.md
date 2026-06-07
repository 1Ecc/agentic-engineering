# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。

当前仓库已整理为未来 npm CLI 发布形态:根目录平铺 `commands/`、`skills/`、`config/` 作为可分发资产,`docs/` 面向使用者,`design/` 保留设计档案。

## 当前阶段

阶段 1 仓库结构整理已经完成并提交。现在处在阶段 1 后的人工 check / 归档清理收口阶段。

关键提交:

- `9380792 chore: checkpoint before stage 1 restructure`
- `72f79a0 chore: restructure repo for npm CLI distribution (stage 1)`

## 已完成

- `commands/` 已从旧的 `agentic-engineering/.claude/commands/` 提升到仓库根
  - `commands/ae-init.md`
  - `commands/ae-init.templates/`
  - `commands/ae-init.test.sh`
  - `commands/ae-ingest-mother.md`
- `config/ae-rules.md.example` 已提升到仓库根
- 旧的 `agentic-engineering/` 空壳已删除
- 12 个已采纳 skill 已复制到根目录 `skills/`
- `docs/` 已建立
  - `docs/framework.md`
  - `docs/spec-framework.md`
  - `docs/scenarios/s0-bootstrap.md`
  - `docs/scenarios/s1-main-loop.md`
- `design/skill-candidates/` 已建立
  - `design/skill-candidates/README.md`
  - `design/skill-candidates/customization-plan.md`
- 顶层 `README.md` 已补充对外说明
- 顶层 `LICENSE` 已按 MIT 补充,署名 `huguiyuan`
- `.gitignore` 已排除 `reference/`、`CES-AI-topic-9-smart-workflow/`、`历史思路/`
- `reference/` 与 `CES-AI-topic-9-smart-workflow/` 已从 git 索引移除,本地目录保留
- `方案/wrap-up-and-restructure.md` 已更新阶段 1 进展:
  - 阶段 1 todo 已勾选
  - 已补充阶段 1 提交号与验证结果
  - 已补充 §5 待拍板问题的实际处理结果
  - 人工通读 `docs/framework.md` / `README.md` 与删除 `方案/` 仍保留为待完成

## 验证

已验证:

- `bash commands/ae-init.test.sh` 通过
- `git diff --cached --check` 通过(阶段 1 提交前)
- `commands/ae-init.md` 与 `commands/ae-init.test.sh` 仍使用同层 `ae-init.templates/` 相对路径
- `skills/` 下无 `AE-CHANGE` 残留
- 12 个 `skills/*/SKILL.md` 均包含 `name:` 与 `description:`
- `skills/` 与 `方案/skill-candidates/` 下 12 个源 skill 目录一致(阶段 1 提交前)
- `reference/` / `CES-AI-topic-9-smart-workflow/` tracked 数量为 0,本地目录保留

## 当前工作区状态

当前存在未提交变更:

- `方案/wrap-up-and-restructure.md` 已修改,用于记录阶段 1 进展
- `方案/` 下大量旧设计/候选文件处于删除态,当前仅剩:
  - `方案/immutable-booping-sutherland.md`
  - `方案/wrap-up-and-restructure.md`
  - `方案/.DS_Store`

这些删除看起来对应 `wrap-up-and-restructure.md` 中的人工 check 后清理步骤。不要自动恢复;下一步应由用户确认是否按计划提交删除 `方案/`。

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
| `方案/wrap-up-and-restructure.md` | 阶段 1 整理计划与进展 |

## 开放问题 / 待处理

- 是否提交当前 `方案/` 删除态:
  - 若确认人工 check 已通过,按原计划提交:`chore: drop 方案/ after manual review`
  - 若还要保留部分中文方案档,需先决定哪些文件恢复或迁移
- `commands/ae-index-rebuild.md` 仍未实现,按计划留到阶段 3
- npm CLI 代码仍未实现,按计划留到阶段 2

## 下次起手建议

优先收口当前未提交变更:

1. 确认是否删除剩余 `方案/` 或仅提交当前删除态
2. 如确认删除,移除 `方案/immutable-booping-sutherland.md` 与 `方案/wrap-up-and-restructure.md` 后提交
3. 进入阶段 2:实现 npm CLI 包结构 `package.json`、`bin/ae.js`、`src/`
