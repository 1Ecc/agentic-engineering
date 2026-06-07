# Issues

> 记录真实验证中发现的产品 / 方法论 / 实现偏差。这里同时承载已收口 issue 的决策记录和后续阶段 3+ 的问题池。

## Issue 列表

| 编号 | 问题 | 状态 | 优先级 |
|------|------|------|--------|
| [001](001-platform-agnostic-cli-init.md) | 初始化依赖 Claude Code slash command,不符合跨平台预期 | v0.2 已发布并通过 npm/npx 验证 | P0 |
| [002](002-slash-command-template-pollution.md) | 模板文件被 Claude Code 递归识别为多余 slash command | v0.2 本地解决,待 Claude Code UI 抽检 | P0 |
| [003](003-rules-ingestion-semantics.md) | `/ae-ingest-mother` 语义与真实期望不一致 | v0.2 已发布并通过 npm/npx 验证 | P0 |
| [004](004-rules-injection-is-redundant.md) | `config/ae-rules.md` + AE:RULES 注入与模板渲染语义重叠,机制冗余 | v0.3 已发布并通过 npmtest 人工验证 | P1 |
| [005](005-claude-md-points-to-agents-md.md) | AGENTS.md / CLAUDE.md 内容重复长期 drift,CLAUDE.md 应改为指针 | v0.3 已发布并通过 npmtest 人工验证 | P1 |

## 处理原则

- 优先修正真实使用链路中的阻断问题,再考虑 npm 发布。
- CLI / slash command / skill 的职责边界必须重新对齐到"多平台可用"目标。
- 任何修复都要回到一个空项目中验证,不只跑仓库内单元测试。

## v0.2 收口结果

- 已完成:`ae setup` + `ae init` 两步 CLI 形态,移除 slash command 资产与 `ae ingest-mother`。
- 已发布:`@ecc-hgy/ae@0.2.0`。
- 已验证:`npm test` 通过;`npm pack` 清单不含 `commands/` / `config/` / `tests/` / `docs/` / `design/`;`/Users/huguiyuan/workspace/newtest` tarball 验证通过;`npm i @ecc-hgy/ae`、`npx @ecc-hgy/ae@0.2.0 --version`、发布包 `setup/init` 验证通过。
- 仍需人工动作:打开 Claude Code UI 抽检 slash command 列表无 ae-*;Codex UI/运行时抽检 `.codex/skills/` 自动发现。

## v0.3 收口结果

- 已完成:Issue 004 + 005 同版本落地,删除 rules 注入机制,`AGENTS.md` 成为单一信息源,`CLAUDE.md` 改为指针。
- 已发布:`@ecc-hgy/ae@0.3.0`。
- 已验证:本地 `npm test`、`npm pack`、tarball setup/init 链路通过;npm 远端 `latest: 0.3.0`;用户在 `/Users/huguiyuan/workspace/npmtest` 人工 check 通过。
- 当前 CLI:`ae setup` 只装 `.claude/skills/` + `.codex/skills/`;`ae init [goal]` 只建 skeleton + 渲染入口文件。
- 明确移除:`config/ae-rules.md`、`templates/ae-rules.md`、`--rules <path>`、`AE:RULES` marker 同步、`Rules:` 报告字段。
