# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。

当前仓库进入 v0.3 可发布态:CLI 仍是初始化事实源,`ae setup` 只安装平台 skills,`ae init` 只创建 skeleton 与入口文件。项目规则直接沉淀在 `AGENTS.md`;`CLAUDE.md` 是指向 `AGENTS.md` 的极简指针。

## 当前阶段

v0.3 已完成 Issue 004 + 005 的合并实施,本地测试、dry-run 打包、真实 tarball 验证均通过。`package.json` 已升级到 `0.3.0`。

`npm publish --access public` 尚未执行,按 issue 决策留给用户操作。发布后还需做 Claude Code / Codex UI 人工抽检。

## v0.3 已落地形态

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
- `CLAUDE.md` 是 5 行极简指针:
  - 标题 `# {{PROJECT_NAME}}`
  - 强指令 `Always read [AGENTS.md](./AGENTS.md) ...`
  - 一句说明所有规则都在 `AGENTS.md`
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

自动测试:

- `npm test`:21 tests all pass
- 覆盖点:
  - setup 不创建 `config/`
  - init 不创建 `config/`
  - init 不输出 `Rules:`
  - `--rules` 返回 unknown option
  - AGENTS.md 含 `## Project-Specific Rules` 且不含 `AE:RULES`
  - CLAUDE.md 是短指针,≤ 6 行,不含 AGENTS 专属段标题
  - AGENTS.md 与 CLAUDE.md 字节不同
  - 二次 init 不覆盖用户文件

CLI 验证:

- `node bin/ae.js --help`:不含 `ae-rules` / `--rules`
- `node bin/ae.js init --help`:不含 `ae-rules` / `--rules`
- `node bin/ae.js --version`:输出 `0.3.0`
- `rg "ae-rules|--rules|syncRulesBlock|RulesMarkerError" src templates package.json`:无命中

打包验证:

- `npm pack --dry-run` 通过
- `npm pack` 生成 `ecc-hgy-ae-0.3.0.tgz`
- package size 42.4 kB,unpacked size 113.5 kB,total files 41
- tarball 含 `templates/entries/` 6 个入口模板
- tarball 不含 `templates/ae-rules.md`

真实 tarball 验证目录:

- `/tmp/ae-v03-verify-2zWwvs`

验证结果:

- `npx --package <0.3.0.tgz> ae setup` 成功
- setup 输出 Installed 48,不含 `ae-rules`
- `.claude/skills/diagnose/SKILL.md` 存在
- `.codex/skills/diagnose/SKILL.md` 存在
- `config/` 不存在
- `.claude/commands/` 不存在
- `npx --package <0.3.0.tgz> ae init "v0.3 验证"` 成功
- init 输出 Created 17,不含 `Rules:`
- 6 个入口文件齐
- `AGENTS.md` 含 `## Project-Specific Rules`,不含 `AE:RULES`
- `CLAUDE.md` 含 `Always read [AGENTS.md](./AGENTS.md)`,共 5 行
- `CLAUDE.md` 不含 `## Project-Specific Rules` / `## Stack` / `## Structure`
- `AGENTS.md` 与 `CLAUDE.md` 不同
- 编辑 `AGENTS.md` 后二次 init,AGENTS/CLAUDE hash 不变

## 文档状态

已同步:

- `README.md`:Quick Start 两步化,新增 Single Source Of Truth,删除 rules sync / `--rules`
- `docs/framework.md`:S0 改为 setup → init → 编辑 AGENTS.md,CLAUDE.md 作为指针
- `docs/scenarios/s0-bootstrap.md`:完整改为 v0.3 行为
- `docs/spec-framework.md`:AGENTS.md 规则段与 CLAUDE.md 指针说明
- `CHANGELOG.md`:新增 `0.3.0 (breaking)` 与升级说明
- `方案/issues/README.md`:004/005 状态改为 v0.3 已实施,待 npm 发布
- `方案/issues/004*.md` / `005*.md`:状态改为 v0.3 已实施,待 npm 发布

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
| `README.md` | 对外说明与安装方式 |
| `CHANGELOG.md` | v0.3 breaking change 记录 |
| `方案/issues/004-rules-injection-is-redundant.md` | v0.3 主线:删除规则注入机制 |
| `方案/issues/005-claude-md-points-to-agents-md.md` | v0.3 配套:CLAUDE.md 极简指针 |

## 待处理

按优先级:

1. **发布 v0.3.0**:
   - `npm publish --access public`(用户操作)
   - 发布后 `npx --yes @ecc-hgy/ae@0.3.0 --version`
   - 发布后干净目录再跑 `ae setup` + `ae init`
2. **人工 UI 抽检**:
   - Claude Code 项目级 slash command 列表无 ae-* 残留
   - Claude Code 新 session 是否遵循 `CLAUDE.md` 指针读取 `AGENTS.md`
   - Codex UI / 运行时是否自动发现 `.codex/skills/`
3. **阶段 3 长尾**:
   - `ae update`:升级路径
   - `ae index-rebuild`:`spec/INDEX.md` 重建
   - 12 个 skill 最后一轮 cross-check
   - GitHub Actions(CI 跑 npm test)
   - Windows 路径与权限验证

## 下次起手建议

1. 如果要发布:先确认 git commit/tag,再执行 `npm publish --access public`
2. 发布后立即做 npm 远端验证与一个干净目录真实链路验证
3. 发布验证完成后,启动阶段 3,优先设计 `ae update`
