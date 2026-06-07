# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。

当前仓库处于 v0.3 已发布态:CLI 是初始化事实源,`ae setup` 只安装平台 skills,`ae init` 只创建 skeleton 与入口文件。项目规则直接沉淀在 `AGENTS.md`;`CLAUDE.md` 是指向 `AGENTS.md` 的极简指针。

## 当前阶段

Issue 004 + 005 已完成同版本收口并发布到 npm:

- 包:`@ecc-hgy/ae@0.3.0`
- 本地 tag:`v0.3.0`
- 本地提交:`aec5d14 feat!: drop rules injection; single source of truth in AGENTS.md (v0.3)`
- 用户已在 `/Users/huguiyuan/workspace/npmtest` 完成人工验证,结果 OK

本轮文档清理已完成:

- `方案/issues` 状态已更新为"v0.3 已发布并通过 npmtest 人工验证"
- 新增 `方案/README.md`,明确 `issues/` 与 `docs/` 是当前入口
- 旧方案 `方案/immutable-booping-sutherland.md`、`方案/wrap-up-and-restructure.md` 已移入 `方案/archive/` 并标记历史归档
- 根目录 `CLAUDE.md` 已补成指向 `AGENTS.md` 的指针
- README Roadmap 已去掉早期 `ingest-mother` 主线表达

## v0.3 当前行为

CLI 命令树:

```text
ae setup
ae init [goal]
```

`ae setup`:

- 安装 `skills/` 到 `.claude/skills/`
- 安装 `skills/` 到 `.codex/skills/`
- 不创建 `config/`
- 不安装 `config/ae-rules.md`
- 不创建 skeleton 或入口文件

`ae init`:

- 要求 `.claude/skills/` 或 `.codex/skills/` 至少一个存在,否则报错要求先跑 `ae setup`
- `[goal]` 替换入口模板 `{{PROJECT_GOAL}}`,写入 `README.md` / `AGENTS.md` / `CLAUDE.md`;不传则用 TODO 占位
- 创建 `spec/`、`spec/needs/`、`spec/ADR/`、`reference/`、`data/`、`scripts/`
- 渲染 `README.md`、`AGENTS.md`、`CLAUDE.md`、`handoff.md`、`spec/README.md`、`spec/INDEX.md`
- 幂等,已有入口文件不覆盖
- 不读取 rules 文件,不支持 `--rules`,不输出 `Rules:` 报告字段

模板规则:

- `AGENTS.md` 是单一信息源,含 `## Project-Specific Rules` 占位段
- `CLAUDE.md` 是短指针,要求 Claude Code session 开始时读取 `[AGENTS.md](./AGENTS.md)`
- `CLAUDE.md` 不含 `## ` 二级标题,避免扩展段回归

## v0.3 删除内容

- `templates/ae-rules.md`
- 用户项目中的 `config/ae-rules.md` starter
- `src/skeleton.js` 中的 `syncRulesBlock`
- `RulesMarkerError`
- `ae init --rules <path>`
- `ae init` 报告中的 `Rules:` 行
- AGENTS/CLAUDE 中由工具管理的 `<!-- AE:RULES:BEGIN/END -->` 同步机制

## 验证记录

已完成:

- `npm test`:21 tests all pass
- `node bin/ae.js --help`:不含 `ae-rules` / `--rules`
- `node bin/ae.js init --help`:不含 `ae-rules` / `--rules`
- `node bin/ae.js --version`:输出 `0.3.0`
- `npm pack --dry-run` 通过
- `npm pack` 生成 `ecc-hgy-ae-0.3.0.tgz`
- 本地 tarball 在干净目录 setup/init 链路通过
- `npm view @ecc-hgy/ae version`:输出 `0.3.0`
- `npm dist-tag ls @ecc-hgy/ae`:输出 `latest: 0.3.0`
- 发布后用户在 `/Users/huguiyuan/workspace/npmtest` 人工 check 通过

关键验证点:

- setup 安装 `.claude/skills/` 与 `.codex/skills/`
- setup 不创建 `config/`
- init 创建 6 个入口文件与标准 skeleton
- init 不输出 `Rules:`
- `AGENTS.md` 含 `## Project-Specific Rules`,不含 `AE:RULES`
- `CLAUDE.md` 含 `Always read [AGENTS.md](./AGENTS.md)`,不含 AGENTS 专属段标题
- 二次 init 不覆盖用户编辑

## 文档状态

当前入口:

- `README.md`:对外使用说明
- `docs/framework.md`:方法论总览
- `docs/scenarios/s0-bootstrap.md`:当前 setup/init 初始化流程
- `docs/scenarios/s1-main-loop.md`:S1 开发循环
- `docs/spec-framework.md`:spec 目录规范
- `方案/issues/README.md`:issue 池总览
- `方案/README.md`:方案目录说明
- `handoff.md`:当前态最新快照

历史归档:

- `方案/archive/immutable-booping-sutherland.md`
- `方案/archive/wrap-up-and-restructure.md`

这些归档文件保留追溯价值,但不作为当前实现依据。

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `package.json` | npm 包元数据,version `0.3.0`,files 清单 |
| `bin/ae.js` | CLI 可执行入口 |
| `src/cli.js` | 顶层参数路由 |
| `src/commands/setup.js` | `ae setup` skills 安装 |
| `src/commands/init.js` | `ae init` skeleton + entry rendering |
| `src/skeleton.js` | createDirectories / renderEntryFiles |
| `src/utils/copy.js` | 幂等复制 |
| `templates/entries/` | 6 个入口文件模板 |
| `skills/` | 12 个已采纳 skill 的发布资产 |
| `tests/` | node:test 覆盖,21 cases |
| `CHANGELOG.md` | v0.3 breaking change 记录 |
| `方案/issues/004-rules-injection-is-redundant.md` | v0.3 主线:删除规则注入机制 |
| `方案/issues/005-claude-md-points-to-agents-md.md` | v0.3 配套:CLAUDE.md 极简指针 |

## 待处理

按优先级:

1. **人工 UI 抽检**:
   - Claude Code 项目级 slash command 列表无 ae-* 残留
   - Claude Code 新 session 是否遵循 `CLAUDE.md` 指针读取 `AGENTS.md`
   - Codex UI / 运行时是否自动发现 `.codex/skills/`
2. **阶段 3 长尾**:
   - `ae update`:升级路径
   - `ae index-rebuild`:`spec/INDEX.md` 重建
   - 12 个 skill 最后一轮 cross-check
   - GitHub Actions(CI 跑 npm test)
   - Windows 路径与权限验证

## 下次起手建议

1. 先做 Claude Code / Codex UI 抽检
2. 抽检完成后启动阶段 3,优先设计 `ae update`
