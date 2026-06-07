# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。

当前仓库已转向 v0.2 多平台 CLI 形态:CLI 是初始化事实源,不再依赖 Claude Code slash command。`ae setup` 安装方法论资产,`ae init` 创建 skeleton 并同步规则。

## 当前阶段

v0.2 本地实现、测试、打包、真实空项目验证已完成。当前等待用户执行 npm 发布与人工平台抽检。

关键历史提交 / tag:

- `9380792 chore: checkpoint before stage 1 restructure`
- `72f79a0 chore: restructure repo for npm CLI distribution (stage 1)`
- `7382aa5 chore: checkpoint before stage 2 cli work`
- `5dc03de feat(cli): implement npm CLI for asset distribution (stage 2)`
- `v0.1.0 Initial npm release`
- `v0.2.0 split CLI into setup + init, drop slash command assets`

## v0.2 已完成

- package version 升到 `0.2.0`
- 新增 `CHANGELOG.md`
- 删除旧 slash command 资产:
  - `commands/`
  - `src/commands/ingest-mother.js`
  - `tests/ingest-mother.test.js`
  - 根目录 `config/`
- 模板迁移:
  - `commands/ae-init.templates/` -> `templates/entries/`
  - 新增 `templates/ae-rules.md`
- CLI 命令树改为:
  - `ae setup`
  - `ae init [goal] [--rules <path>]`
- 新增核心逻辑:
  - `src/skeleton.js`
  - `src/commands/setup.js`
- 重写:
  - `src/commands/init.js`
  - `src/cli.js`
  - `src/utils/report.js`
  - `src/utils/paths.js`
  - `src/utils/copy.js`
- 测试重构:
  - 新增 `tests/skeleton.test.js`
  - 新增 `tests/setup.test.js`
  - 重写 `tests/init.test.js`
  - 更新 `tests/cli.test.js`
- 文档同步:
  - `README.md`
  - `docs/framework.md`
  - `docs/scenarios/s0-bootstrap.md`
  - `docs/scenarios/s1-main-loop.md`
  - `方案/issues/`
  - `方案/wrap-up-and-restructure.md`

## v0.2 CLI 行为边界

`ae setup`:

- 安装 `skills/` 到 `.claude/skills/`
- 安装 `skills/` 到 `.codex/skills/`
- 安装 `templates/ae-rules.md` 到 `config/ae-rules.md`
- 幂等,不覆盖已编辑的 `config/ae-rules.md`
- 不创建 skeleton 或入口文件

`ae init`:

- 要求 `.claude/skills/` 或 `.codex/skills/` 至少一个存在,否则报错要求先跑 `ae setup`
- 创建:
  - `spec/`
  - `spec/needs/`
  - `spec/ADR/`
  - `reference/`
  - `data/`
  - `scripts/`
- 渲染:
  - `README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `handoff.md`
  - `spec/README.md`
  - `spec/INDEX.md`
- 默认读取 `config/ae-rules.md`,同步到 `AGENTS.md` / `CLAUDE.md` 的 `AE:RULES` block
- 支持 `--rules <path>` 显式覆盖规则源
- 幂等,不覆盖入口文件;只替换 managed `AE:RULES` block

已移除:

- `ae ingest-mother`
- `/ae-init`
- `/ae-ingest-mother`
- 用户项目 `.claude/commands/`

## 验证

已验证:

- `npm test` 通过:22 tests all pass
- `node bin/ae.js --help` 输出 `setup` / `init` 两个命令
- `node bin/ae.js --version` 输出 `0.2.0`
- `node bin/ae.js ingest-mother /tmp/whatever` 返回 unknown command
- `git diff --check` 通过
- `npm pack --dry-run` 通过
- `npm pack` 生成 `ecc-hgy-ae-0.2.0.tgz`
  - package size:43.7 kB
  - unpacked size:119.9 kB
  - total files:42
- tarball 抽检通过:
  - 包含 `bin/`、`src/`、`skills/`、`templates/`、`README.md`、`LICENSE`、`package.json`
  - 不包含 `commands/`、`config/`、`tests/`、`docs/`、`design/`、`方案/`、`handoff.md`
- `/Users/huguiyuan/workspace/newtest` 真实 tarball 验证通过:
  - 清空旧产物后跑 `npx --package <0.2.0.tgz> ae setup`
  - `.claude/skills/diagnose/SKILL.md` 存在
  - `.codex/skills/diagnose/SKILL.md` 存在
  - `config/ae-rules.md` 存在且可编辑
  - `.claude/commands/` 不存在
  - `find .claude -name "ae-init.templates*"` 为空
  - 编辑 rules 后跑 `ae init "v0.2 验证"` 成功
  - 6 个入口文件与 skeleton 到位
  - `AGENTS.md` / `CLAUDE.md` 含编辑后的 `AE:RULES` block
  - 二次 `ae init` 幂等
  - `--rules /tmp/ae-explicit-rules.md` 覆盖默认 rules 成功
  - `--rules /tmp/ae-rules-dir` 报 `expected a file, got directory`

未自动验证:

- Claude Code UI 中 slash command 列表无 ae-* 残留。文件系统已确认 `.claude/commands/` 不存在,但 UI 抽检需用户打开 Claude Code。
- Codex UI/运行时是否自动发现 `.codex/skills/`。文件系统已安装,最终体验需用户人工抽检。

## 当前工作区状态

v0.2 收口变更包括:

- 删除旧 `commands/`、根 `config/`、`ingest-mother` 代码与测试
- 新增 `templates/`、`src/skeleton.js`、`src/commands/setup.js`
- 重写 CLI / tests / README / docs / issues / handoff
- 新增 `ecc-hgy-ae-0.2.0.tgz` pack 产物,已由 `.gitignore` 忽略

忽略文件仍存在:

- `.DS_Store`
- `方案/.DS_Store`
- `reference/`
- `CES-AI-topic-9-smart-workflow/`
- `huguiyuan-ae-0.1.0.tgz`
- `huguiyuan-ae-0.2.0.tgz`
- `ecc-hgy-ae-0.2.0.tgz`

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `package.json` | npm 包元数据,version `0.2.0`,files 清单 |
| `bin/ae.js` | CLI 可执行入口 |
| `src/cli.js` | 顶层参数路由 |
| `src/commands/setup.js` | `ae setup` 资产安装 |
| `src/commands/init.js` | `ae init` skeleton + rules sync |
| `src/skeleton.js` | 目录创建、入口模板渲染、规则块同步 |
| `src/utils/copy.js` | 幂等复制 |
| `templates/entries/` | 6 个入口文件模板 |
| `templates/ae-rules.md` | `config/ae-rules.md` starter |
| `skills/` | 12 个已采纳 skill 的发布资产 |
| `tests/` | node:test 覆盖 |
| `README.md` | 对外说明与安装方式 |
| `CHANGELOG.md` | v0.2 breaking change 记录 |
| `方案/issues/` | 001/002/003 问题与 v0.2 收口记录 |

## 开放问题 / 待处理

- npm 发布仍需用户操作:
  - `npm login`
  - `npm whoami`
  - `npm publish --access public`
  - 发布后用 `npx @ecc-hgy/ae@0.2.0 --version` 验证
- 人工平台抽检:
  - 在真实项目跑 `npx @ecc-hgy/ae@0.2.0 setup`
  - 打开 Claude Code,确认项目 slash command 列表无 ae-* 残留
  - 打开 Codex,确认 `.codex/skills/` 可被发现
- 阶段 3:
  - `ae update`
  - `ae index-rebuild`
  - 12 个 skill 最后一轮 cross-check
  - GitHub Actions / Windows 路径验证

## 下次起手建议

1. 用户完成 npm 发布。
2. 用新包在真实项目重复 `ae setup` + `ae init` 验证。
3. 打开 Claude Code / Codex 做人工平台抽检。
4. 进入阶段 3:先设计 `ae update`,再做 `ae index-rebuild`。
