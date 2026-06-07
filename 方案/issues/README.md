# Issues

> 记录真实验证中发现的产品 / 方法论 / 实现偏差。这里不是历史流水账,而是后续阶段 3+ 的待决策问题池。

## 当前问题

| 编号 | 问题 | 状态 | 优先级 |
|------|------|------|--------|
| [001](001-platform-agnostic-cli-init.md) | 初始化依赖 Claude Code slash command,不符合跨平台预期 | v0.2 本地实现完成,待 npm 发布 | P0 |
| [002](002-slash-command-template-pollution.md) | 模板文件被 Claude Code 递归识别为多余 slash command | v0.2 本地解决,待 Claude Code UI 抽检 | P0 |
| [003](003-rules-ingestion-semantics.md) | `/ae-ingest-mother` 语义与真实期望不一致 | v0.2 本地解决,待 npm 发布 | P0 |

## 处理原则

- 优先修正真实使用链路中的阻断问题,再考虑 npm 发布。
- CLI / slash command / skill 的职责边界必须重新对齐到"多平台可用"目标。
- 任何修复都要回到一个空项目中验证,不只跑仓库内单元测试。

## v0.2 收口结果

- 已完成:`ae setup` + `ae init` 两步 CLI 形态,移除 slash command 资产与 `ae ingest-mother`。
- 已验证:`npm test` 通过;`npm pack` 清单不含 `commands/` / `config/` / `tests/` / `docs/` / `design/`;`/Users/huguiyuan/workspace/newtest` 真实 tarball 验证通过。
- 仍需人工/外部动作:npm 发布;打开 Claude Code UI 抽检 slash command 列表无 ae-*;Codex UI/运行时抽检 `.codex/skills/` 自动发现。
