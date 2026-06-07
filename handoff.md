# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。

当前仓库已整理为未来 npm CLI 发布形态:根目录平铺 `commands/`、`skills/`、`config/` 作为可分发资产,`docs/` 面向使用者,`design/` 保留设计档案,`src/` + `bin/` 提供 npm CLI 分发壳。

## 当前阶段

阶段 2 npm CLI 本地实现已完成,正在做最终收口提交。

关键提交:

- `9380792 chore: checkpoint before stage 1 restructure`
- `72f79a0 chore: restructure repo for npm CLI distribution (stage 1)`
- `7382aa5 chore: checkpoint before stage 2 cli work`

## 已完成

### 阶段 1

- `commands/` 已从旧的 `agentic-engineering/.claude/commands/` 提升到仓库根
- `config/ae-rules.md.example` 已提升到仓库根
- 12 个已采纳 skill 已复制到根目录 `skills/`
- `docs/` 已建立:
  - `docs/framework.md`
  - `docs/spec-framework.md`
  - `docs/scenarios/s0-bootstrap.md`
  - `docs/scenarios/s1-main-loop.md`
- `design/skill-candidates/` 已建立:
  - `design/skill-candidates/README.md`
  - `design/skill-candidates/customization-plan.md`
- 顶层 `README.md`、`LICENSE` 已补齐
- `reference/` 与 `CES-AI-topic-9-smart-workflow/` 已从 git 索引移除,本地目录保留

### 阶段 2

- 新增 npm 包元数据:
  - `package.json`
  - package name:`@huguiyuan/ae`
  - version:`0.1.0`
  - bin:`ae -> ./bin/ae.js`
  - type:`module`
  - zero dependency
- 新增 CLI 入口:
  - `bin/ae.js`
  - `src/cli.js`
- 新增 CLI 子命令:
  - `src/commands/init.js`
  - `src/commands/ingest-mother.js`
- 新增工具层:
  - `src/utils/paths.js`
  - `src/utils/copy.js`
  - `src/utils/report.js`
- 新增 node:test 覆盖:
  - `tests/_helpers.js`
  - `tests/cli.test.js`
  - `tests/init.test.js`
  - `tests/ingest-mother.test.js`
- `README.md` 已切换到 `npx @huguiyuan/ae init` 安装说明,并明确 CLI 只做资产安装,真正骨架初始化由 Claude Code 内 `/ae-init` 执行
- `方案/wrap-up-and-restructure.md` 已更新阶段 2 本地完成项

## CLI 行为边界

阶段 2 已锁定并实现"路线 a":

- `ae init` 只安装资产:
  - `commands/` -> `.claude/commands/`
  - `skills/` -> `.claude/skills/`
  - `config/` -> `config/`
- `ae init` 不创建 `spec/`、`AGENTS.md`、`CLAUDE.md`、`handoff.md`、`spec/INDEX.md`
- `ae init` 幂等:目标文件已存在则跳过,不覆盖,无 `--force`
- `ae ingest-mother` 只做路径预检与指引,不读取母本内容,不修改目标项目
- 真正的初始化 / 母本抽取仍交给用户项目内的 slash command:
  - `/ae-init`
  - `/ae-ingest-mother`

## 验证

已验证:

- `npm test` 通过:12 tests all pass
- `node bin/ae.js --help` 输出顶层帮助
- `node bin/ae.js --version` 输出 `0.1.0`
- `npm pack --dry-run` 通过
- `npm pack` 生成 `huguiyuan-ae-0.1.0.tgz`
  - package size:45.7 kB
  - unpacked size:123.6 kB
  - total files:44
- tarball 解包抽检通过:
  - 包含 `bin/`、`src/`、`commands/`、`skills/`、`config/`、`README.md`、`LICENSE`、`package.json`
  - 不包含 `tests/`、`docs/`、`design/`、`方案/`、`handoff.md`
- `npm link` 本地冒烟通过:
  - 临时项目 `ae init` 安装 `.claude/commands`、`.claude/skills`、`config`
  - 临时项目 `ae ingest-mother <mother>` 输出 `/ae-ingest-mother` 指引
  - 已执行 `npm unlink -g @huguiyuan/ae`

## 当前工作区状态

预计未提交变更包括:

- `.gitignore`
- `README.md`
- `handoff.md`
- `package.json`
- `bin/`
- `src/`
- `tests/`
- `方案/wrap-up-and-restructure.md`

`huguiyuan-ae-0.1.0.tgz` 是 npm pack 产物,已由 `.gitignore` 忽略。

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `package.json` | npm 包元数据与 bin 配置 |
| `bin/ae.js` | CLI 可执行入口 |
| `src/cli.js` | 顶层参数路由 |
| `src/commands/init.js` | `ae init` 资产安装 |
| `src/commands/ingest-mother.js` | `ae ingest-mother` 预检与指引 |
| `src/utils/copy.js` | 幂等递归复制 |
| `tests/` | node:test 端到端覆盖 |
| `README.md` | 对外说明与安装方式 |
| `commands/ae-init.md` | `/ae-init` 命令契约 |
| `commands/ae-ingest-mother.md` | `/ae-ingest-mother` 命令契约 |
| `skills/` | 12 个已采纳 skill 的发布资产 |
| `方案/wrap-up-and-restructure.md` | 阶段 1/2 整理计划与进展 |

## 开放问题 / 待处理

- npm 发布仍未执行,需要用户操作:
  - `npm login`
  - `npm whoami`
  - 确认 `@huguiyuan` scope 可用
  - `npm publish --access public`
  - 发布后用 `npx @huguiyuan/ae@0.1.0 --version` 验证
- Claude Code 内真实交互验收仍需用户执行:
  - 在真实新项目运行 `npx @huguiyuan/ae init`
  - 打开 Claude Code 跑 `/ae-init "测试目标"`
  - 跑 `/ae-ingest-mother <mother-path>`
- `commands/ae-index-rebuild.md` 仍未实现,按计划留到阶段 3
- 可选:阶段 3 增加 GitHub Actions、CHANGELOG、Windows 路径验证

## 下次起手建议

1. 先提交阶段 2 实现:`feat(cli): implement npm CLI for asset distribution (stage 2)`
2. 打 tag:`v0.1.0`
3. 用户完成 npm 登录与发布
4. 进入阶段 3:`ae-index-rebuild` markdown contract 与 CLI 暴露策略
