# Issue 001: 初始化依赖 Claude Code slash command,不符合跨平台预期

## 状态

- 状态:v0.2 本地实现完成,待 npm 发布
- 优先级:P0
- 发现时间:2026-06-07
- 发现方式:在空项目 `/Users/huguiyuan/workspace/newtest` 中用本地 tarball 验证 `ae init`

## 背景

当前阶段 2 固化的是"路线 a":

- 终端 CLI `ae init` 只安装资产:
  - `.claude/commands/`
  - `.claude/skills/`
  - `config/`
- 真正项目骨架初始化交给 Claude Code 内的 `/ae-init`:
  - `spec/`
  - `spec/INDEX.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `README.md`
  - `handoff.md`

真实验证后发现,这个分工与用户预期不一致。用户期望这套方法论后续能在多个 agent 平台中使用,例如:

- Claude Code
- Codex
- Cursor
- Trae
- 其他支持 agent rules / command / skill 的 IDE 或 CLI 环境

如果核心初始化动作必须依赖 Claude Code 的 slash command,则方法论第一步就被 Claude Code 绑定,无法作为平台无关的基础设施。

## 复现

在空项目中执行:

```bash
cd /Users/huguiyuan/workspace/newtest
npx --yes \
  --package /Users/huguiyuan/workspace/agentic-engineering/huguiyuan-ae-0.1.0.tgz \
  ae init
```

实际输出显示安装成功:

```text
AE init complete
- Created: 34 (...)
- Skipped: 0 (none)
- Target: /Users/huguiyuan/workspace/newtest

Next: open Claude Code in this project and run `/ae-init "<one-line goal>"`
to create the spec/ skeleton and entry files.
```

但此时项目还没有完成初始化。必须再进入 Claude Code 执行:

```text
/ae-init "测试 agentic-engineering 方法论初始化"
```

## 实际问题

`ae init` 这个名字会让用户自然预期"初始化已经完成",但当前它只完成了 Claude Code 资产安装。

这导致三个问题:

1. 平台绑定:没有 Claude Code 就无法完成标准骨架初始化。
2. 心智偏差:`ae init` 的实际效果小于命令名暗示。
3. 后续适配成本高:如果 Cursor / Codex / Trae 不兼容 Claude Code slash command,还要分别做适配。

## 期望

CLI 应该承载平台无关的基础初始化能力。至少应支持:

```bash
ae init "项目目标"
```

或:

```bash
ae init --goal "项目目标"
```

直接创建:

- `spec/`
- `spec/INDEX.md`
- `spec/README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `handoff.md`
- `reference/`
- `.codex/`
- `.claude/`
- `data/`
- `scripts/`

同时安装平台资产:

- Claude Code command / skill assets
- Codex rules / instructions assets
- 未来 Cursor / Trae 资产

## 备选方案

### 方案 A:CLI 成为事实源

把 `/ae-init` 的骨架创建逻辑下沉到 CLI。

- `ae init` 负责完整初始化。
- `/ae-init` 只作为 Claude Code 的薄入口,提示或调用同一套 CLI 逻辑。
- 模板渲染、幂等、规则同步统一由 CLI 实现。

优点:

- 跨平台。
- 用户体验最直接。
- 真实逻辑只有一份,更容易测试。

缺点:

- CLI 实现复杂度上升。
- 需要重新设计 assets 的安装目录和模板目录。

### 方案 B:保留 slash command 为主,CLI 只增加 scaffold 子命令

新增:

```bash
ae scaffold "项目目标"
```

或:

```bash
ae init --scaffold "项目目标"
```

优点:

- 对阶段 2 的破坏较小。
- 仍保留 Claude Code 内 `/ae-init` 的使用方式。

缺点:

- `init` 与 `scaffold` 的边界仍可能让用户困惑。
- 两套入口需要保持一致。

### 方案 C:维持当前路线

继续让 CLI 只安装资产,初始化仍依赖 `/ae-init`。

优点:

- 改动最小。

缺点:

- 明确不满足"多平台可用"预期。
- 不建议作为发布前路线。

## 建议方向

优先采用方案 A:CLI 成为平台无关初始化事实源。

建议重新定义:

```bash
ae init [goal]
```

职责:

1. 创建标准 skeleton。
2. 渲染入口文件。
3. 同步 `config/ae-rules.md` 或用户指定规则文件。
4. 安装平台资产。
5. 输出下一步建议。

Claude Code 的 `/ae-init` 可以保留,但降级为兼容入口,不再承载唯一逻辑。

## 详细方案

v0.2 锁定**两步 CLI**形态,平台覆盖 Claude Code + Codex(经用户验证均认 `*/skills/` 自动发现),Cursor / Trae 推迟。slash command 形态从仓库彻底移除,所有入口走 CLI。

### 用户使用流程

```
ae setup                      # 装资产:.claude/skills, .codex/skills, config/ae-rules.md(模板)
[$EDITOR config/ae-rules.md]  # 可选:按项目调整 rules
ae init "项目目标"            # 建 spec/ 骨架 + 渲染入口 + 注入 AE:RULES block
```

不想分步可直接 `ae setup && ae init "目标"` 连跑。但拆两步的本质价值:用户可以在 `setup` 之后、`init` 之前**编辑 `config/ae-rules.md`**,把项目特定规则注入 AGENTS.md / CLAUDE.md。

### 命令职责严格划分

| 命令 | 创建 / 管理 | 不动 |
|------|------------|------|
| `ae setup` | `.claude/skills/*`、`.codex/skills/*`、`config/ae-rules.md`(初始模板) | 任何 skeleton、入口文件 |
| `ae init` | 6 个 skeleton 目录、6 个入口文件、AGENTS.md / CLAUDE.md 的 AE:RULES block | skills、ae-rules.md 内容 |

### `ae init` 资产未装时的行为

严格报错,不自动 setup:

```
Error: AE assets not found in <target>.
Run `ae setup` first.
```

检测条件:`<target>/.claude/skills/` 或 `<target>/.codex/skills/` 至少一个存在。

理由:用户拆两步的初衷就是要在 `setup` 与 `init` 之间编辑 `ae-rules.md`,若 `init` 偷偷自动 setup,用户就没机会编辑,违背设计。

### `config/ae-rules.md` 格式

v0.2 用纯 markdown(无 frontmatter)。理由:它的唯一用途是被 `syncRulesBlock` 整体注入到 AGENTS.md / CLAUDE.md 的 AE:RULES block —— 目标格式就是 markdown,源用 markdown 最自然。

模板初始内容(`templates/ae-rules.md`,setup 时拷到用户项目):

```markdown
# Project-Specific Rules

<!-- 这个文件在 `ae init` 时会被读取,内容会注入到 AGENTS.md 与 CLAUDE.md 的
     AE:RULES block 中。可以在 `ae setup` 之后、`ae init` 之前编辑。 -->

## 通用约束
- 例如:所有代码注释使用中文
- 例如:提交信息遵循 Conventional Commits

## 项目栈
- 例如:Node.js 18+,TypeScript strict mode

## 协作偏好
- 例如:小步提交,每个 commit 必须包含测试
```

将来如需"控制 init 行为"的机器配置,加 yaml frontmatter 向后兼容,本期不做。

### 仓库 / 发布包目标布局(v0.2)

```
agentic-engineering/
├── bin/ae.js
├── src/
│   ├── cli.js                 # 路由:setup / init
│   ├── commands/
│   │   ├── setup.js           # NEW
│   │   └── init.js            # 重写
│   ├── skeleton.js            # NEW:createDirs / renderEntries / syncRules
│   └── utils/{paths,copy,report}.js
├── skills/                    # 12 个 skill 源,不变
├── templates/
│   ├── entries/               # 6 个入口文件模板(原 commands/ae-init.templates/)
│   └── ae-rules.md            # config/ae-rules.md 的初始示例
├── tests/
└── package.json
```

**v0.1.0 → v0.2.0 删除项**:
- `commands/` 整个目录(`ae-init.md`、`ae-ingest-mother.md`、`ae-init.templates/`、`ae-init.test.sh`)
- `src/commands/ingest-mother.js`
- `tests/ingest-mother.test.js`
- 根目录 `config/`(模板移到 `templates/ae-rules.md`)

### 用户项目最终布局(`ae setup && ae init "..."` 之后)

```
my-project/
├── .claude/skills/           # 12 个 skill(setup)
├── .codex/skills/            # 同上(setup)
├── config/
│   └── ae-rules.md           # setup 装,用户可编辑,init 读
├── spec/{INDEX.md,README.md,needs/,ADR/}    # init
├── reference/, data/, scripts/              # init
├── AGENTS.md                 # init,含 AE:RULES block
├── CLAUDE.md                 # init,含 AE:RULES block
├── README.md                 # init
└── handoff.md                # init
```

**关键**:用户项目**没有** `.claude/commands/`。整个 slash command 形态在 v0.2 不存在。

### 三个 issue 在 v0.2 的归宿

| Issue | 解决方式 |
|------|----------|
| 001 平台耦合 | `ae setup` + `ae init` 一起承担,Claude Code / Codex 均无需进入即可初始化 |
| 002 slash 污染 | `commands/` 整目录删除,污染根因消失(详见 002 重写后方案) |
| 003 ingest 语义 | `inspect-mother` 命令删除;规则同步并入 `ae init` 自动读 `config/ae-rules.md` + `--rules <path>` 显式覆盖(详见 003 重写后方案) |

### 版本:v0.2.0(breaking)

破坏性变更清单:
- `ae init` 行为完全变化(从"只装资产"变成"只建 skeleton + 入口 + rules")
- 新增 `ae setup` 子命令
- 移除 `ae ingest-mother` 子命令
- 不再装 `.claude/commands/`,Claude Code 没有 `/ae-init` slash command
- `config/ae-rules.md`(去 `.example` 后缀,作为可编辑配置)

### 推迟项(本期不做,加入待办)

- `ae update` 子命令:用于"已 setup 的项目升级 skills 到新版"。v0.2 不实现,未来通过单独命令解决。理由:升级语义不能糊在 `setup` 或 `init` 里,需独立子命令。

## 实施 Todo

> 9 阶段。A-D 是核心实现,E-F 是删除清理与 CLI 入口,G-I 是文档、验证、发布。

## v0.2 实施结果

- 已完成阶段 A-H:核心 skeleton、模板搬迁、`ae setup`、`ae init` 重写、CLI 帮助、测试、文档、打包、`newtest` 真实 tarball 验证。
- 代码事实源已切到 CLI:`src/skeleton.js` + `src/commands/setup.js` + `src/commands/init.js`。
- 发布包版本已升到 `0.2.0`;`npm pack` 生成 `ecc-hgy-ae-0.2.0.tgz`。
- Stage I 本地 git 收口完成后即可交给用户执行 npm 发布。
- 仍需人工抽检:Claude Code UI slash command 列表无 ae-*;Codex 对 `.codex/skills/` 的自动发现。

### 阶段 A:skeleton 核心(纯函数 + 单测)

- [ ] 新建 `src/skeleton.js`,3 个纯函数:
  - [ ] `createDirectories(target, { dryRun })`:创建 `spec/`、`spec/needs/`、`spec/ADR/`、`reference/`、`data/`、`scripts/` + 每个叶子的 `.gitkeep`(注:`.claude/` 与 `.codex/` 由 `ae setup` 隐式建立,这里不重复建)
  - [ ] `renderEntryFiles(target, templateRoot, { projectName, projectGoal, dryRun })`:从 templateRoot 读 6 个入口模板(`README.md`、`AGENTS.md`、`CLAUDE.md`、`handoff.md`、`spec/README.md`、`spec/INDEX.md`),替换 `{{PROJECT_NAME}}` / `{{PROJECT_GOAL}}`,目标存在 → skipped
  - [ ] `syncRulesBlock(targetFile, rulesContent, { dryRun })`:幂等同步 `<!-- AE:RULES:BEGIN -->...<!-- AE:RULES:END -->` block;marker 配对数 > 1 抛 `RulesMarkerError`;rulesContent 无尾换行补一个
  - [ ] 三个函数统一返回 `{ created, skipped, updated }` 结构
- [ ] 新建 `tests/skeleton.test.js`:
  - [ ] createDirectories 冷启动 + 幂等 + dry-run
  - [ ] renderEntryFiles 占位符替换 + 跳过已存在 + dry-run
  - [ ] syncRulesBlock 三种 marker 状态(0/1对/异常)+ dry-run + 替换已有 block 内容

### 阶段 B:资产搬迁与目录清理

- [ ] `mkdir -p templates`
- [ ] `git mv commands/ae-init.templates templates/entries`
- [ ] 新建 `templates/ae-rules.md`:写一份带示例段的初始模板(通用约束 / 项目栈 / 协作偏好三段,见上方设计)
- [ ] **删除整个 `commands/` 目录**(`ae-init.md`、`ae-ingest-mother.md`、`ae-init.test.sh` 全删)
- [ ] **删除** `src/commands/ingest-mother.js` 与 `tests/ingest-mother.test.js`
- [ ] **删除** 根目录 `config/`(若存在;模板已搬到 `templates/ae-rules.md`)
- [ ] `src/utils/paths.js` 加 `templatesPath(subdir = '')` 与 `skillsPath()`
- [ ] `package.json` `files` 更新:`["bin", "src", "skills", "templates", "README.md", "LICENSE"]`(去 `commands`、`config`,加 `templates`)

### 阶段 C:`ae setup` 实现

- [ ] 新建 `src/commands/setup.js`:
  - [ ] 解析参数:`--target <path>`(默认 cwd)、`--dry-run`、`--help`
  - [ ] 校验/创建 target 目录
  - [ ] 资产安装(都是幂等,目标已存在 skip):
    - [ ] `skillsPath()` → `<target>/.claude/skills/`(整目录递归拷贝)
    - [ ] `skillsPath()` → `<target>/.codex/skills/`(同上)
    - [ ] `templatesPath('ae-rules.md')` → `<target>/config/ae-rules.md`(单文件;已存在绝不覆盖,保留用户编辑)
  - [ ] 报告:
    ```
    AE setup complete
    - Installed: <count> (<paths>)
    - Skipped: <count> (<paths>)
    - Target: <abs path>
    - Next: edit config/ae-rules.md (optional), then run `ae init "<goal>"`.
    ```
- [ ] `src/cli.js` 路由 `setup` → `src/commands/setup.js`

### 阶段 D:`ae init` 重写

- [ ] 重写 `src/commands/init.js`(原 v0.1.0 资产安装逻辑废弃):
  - [ ] 解析参数:`[goal]`(位置参数)、`--rules <path>`、`--target <path>`、`--dry-run`、`--help`
  - [ ] **预检**:`<target>/.claude/skills/` 或 `<target>/.codex/skills/` 至少一个存在
    - [ ] 都不存在 → 输出错误后 exit 1:
      ```
      Error: AE assets not found in <target>.
      Run `ae setup` first.
      ```
  - [ ] 主流程:
    - [ ] 1. `createDirectories(target)`
    - [ ] 2. `renderEntryFiles(target, templatesPath('entries'), { projectName: basename(target), projectGoal: goal ?? 'TODO: 用一句话说明这个项目要解决什么问题。' })`
    - [ ] 3. 规则源选择:
      - [ ] `--rules <path>` 提供 → 校验是文件不是目录(传目录 → exit 1 + "expected a file, got directory"),直接用
      - [ ] 否则用 `<target>/config/ae-rules.md`(应由 setup 装好;若也不存在,rules step skip)
    - [ ] 4. `syncRulesBlock(<target>/AGENTS.md, rulesContent)` 与 `syncRulesBlock(<target>/CLAUDE.md, rulesContent)`;任一抛 `RulesMarkerError` → exit 1
    - [ ] 5. 汇总报告:
      ```
      AE init complete
      - Created: <count> (<paths>)
      - Skipped: <count> (<paths>)
      - Rules: synced | skipped (no rules file) | failed (<reason>)
      - Target: <abs path>
      ```
- [ ] `src/cli.js` 路由 `init` → 新实现

### 阶段 E:CLI 入口与帮助文本

- [ ] `src/cli.js` 移除 `ingest-mother` 路由
- [ ] 总帮助文本重写:
  ```
  Usage: ae <command> [options]

  Commands:
    setup                Install skills to .claude/.codex and drop a config/ae-rules.md template.
    init [goal]          Create spec/ skeleton, render entry files, sync AE:RULES block from
                         config/ae-rules.md. Requires `ae setup` to have run.

  Options:
    -h, --help     Show help
    -v, --version  Show version

  Typical workflow:
    ae setup
    [optional] edit config/ae-rules.md
    ae init "<one-line project goal>"
  ```
- [ ] `--version` 仍从 `package.json` 读

### 阶段 F:测试更新

- [ ] 新建 `tests/setup.test.js`:
  - [ ] case 「冷启动」:空目录跑,断言 `.claude/skills/diagnose/SKILL.md`、`.codex/skills/diagnose/SKILL.md`、`config/ae-rules.md` 存在
  - [ ] case 「skills 完整性」:抽 3 个 skill 验证 SKILL.md + assets/ + scripts/ + 附属 .md(如 improve-codebase-architecture 的 LANGUAGE.md)
  - [ ] case 「幂等」:二次运行无新增、无覆盖
  - [ ] case 「dry-run」
  - [ ] case 「用户已编辑 ae-rules.md」:预置一份用户内容,再跑 setup,断言 byte-equal 不变
- [ ] **重写** `tests/init.test.js` 全部 case:
  - [ ] case 「未 setup 直接 init」:exit 1 + 错误信息含 "Run `ae setup` first"
  - [ ] case 「正常路径」:先 setup 再 init,断言 6 入口 + 6 目录 + AE:RULES block 配对
  - [ ] case 「占位符替换」:断言 `{{PROJECT_GOAL}}` 已替换、`{{PROJECT_NAME}}` 是 basename
  - [ ] case 「幂等」
  - [ ] case 「dry-run」
  - [ ] case 「--rules 显式」:传入另一份 rules,断言 AGENTS / CLAUDE 含该内容,不读 config/ae-rules.md
  - [ ] case 「--rules 路径不存在」:exit 1 + 路径
  - [ ] case 「--rules 是目录」:exit 1 + "expected a file, got directory"
  - [ ] case 「config/ae-rules.md 缺失」:setup 后人为删 config/ae-rules.md,init 报告 Rules: skipped
  - [ ] case 「marker 异常」:预置 2 组 marker 的 AGENTS.md → exit 1,文件不变
- [ ] **删除** `tests/ingest-mother.test.js`
- [ ] `tests/cli.test.js`:`--help` 断言更新,移除 `ingest-mother` 相关

### 阶段 G:文档同步

- [ ] README 重写顶部:
  - [ ] Quick Start:
    ```
    npx @ecc-hgy/ae setup
    # 可选:编辑 config/ae-rules.md
    npx @ecc-hgy/ae init "我的项目目标"
    ```
  - [ ] 删除 "open Claude Code and run /ae-init" 段
  - [ ] 命令清单:仅 setup / init
  - [ ] 平台:Claude Code + Codex 双覆盖,Cursor / Trae 推迟
- [ ] `docs/framework.md` S0 段同步两步流程
- [ ] `docs/scenarios/s0-bootstrap.md` 重写,反映 setup + init
- [ ] `handoff.md` 同步 v0.2 进展
- [ ] 新建 `CHANGELOG.md`,写 v0.2.0:
  ```
  ## 0.2.0 (breaking)
  - New: `ae setup` installs skills to .claude/ and .codex/, drops config/ae-rules.md template.
  - Rewritten: `ae init` creates spec/ skeleton, renders entry files, syncs AE:RULES block.
    Requires `ae setup` to have been run.
  - Removed: `ae ingest-mother` and the /ae-init / /ae-ingest-mother slash commands.
    Rule sync moved into `ae init` (reads config/ae-rules.md or --rules <path>).
  - Removed: commands/ assets are no longer installed into user projects.
    Resolves slash command list pollution in Claude Code.
  - Platform: Claude Code + Codex (skills auto-discovered in .claude/skills and .codex/skills).
  ```
- [ ] 把 `ae update` 子命令加入项目待办(`方案/wrap-up-and-restructure.md` 阶段 3 清单)

### 阶段 H:本地验证

- [ ] `package.json` version → `0.2.0`
- [ ] `npm test` 全过
- [ ] `npm pack` → tarball 抽检:
  - [ ] 含 `templates/entries/`、`templates/ae-rules.md`、`skills/`
  - [ ] **不含** `commands/`、`tests/`、`docs/`、`design/`、`config/`
- [ ] 进 `/Users/huguiyuan/workspace/newtest`(清空旧产物):
  - [ ] `rm -rf .claude/ .codex/ spec/ config/ AGENTS.md CLAUDE.md handoff.md README.md`
  - [ ] `npx --package <new-tarball> ae setup`
  - [ ] 断言 `.claude/skills/diagnose/SKILL.md`、`.codex/skills/diagnose/SKILL.md`、`config/ae-rules.md` 全部到位
  - [ ] 打开 Claude Code,确认 slash command 列表为空 / 无 ae-* 残留
  - [ ] (可选)编辑 `config/ae-rules.md` 加几行
  - [ ] `npx --package <new-tarball> ae init "v0.2 验证"`
  - [ ] 断言 6 个入口文件齐 + AE:RULES block 配对且内容 = 编辑后的 ae-rules.md
- [ ] 进 Codex,确认能识别 `.codex/skills/` 下的 skills(用户人工 check)

### 阶段 I:发布

- [ ] 提交,信息:
  ```
  feat!: split CLI into setup + init, drop slash command assets (v0.2)

  - Add `ae setup` to install skills into .claude/.codex and drop ae-rules.md template.
  - Rewrite `ae init` to build spec/ skeleton, render entries, sync AE:RULES block.
  - Remove `ae ingest-mother` and all slash command assets.
  - Resolves issues 001, 002, 003.
  ```
- [ ] tag `v0.2.0`
- [ ] `npm publish --access public`(用户操作)
- [ ] 干净环境 `npx @ecc-hgy/ae@0.2.0 setup` 验证

## 验收标准

- 在空项目中只执行终端命令即可完成初始化。
- 不进入 Claude Code 也能得到完整 skeleton。
- 初始化结果可被 Claude Code / Codex / Cursor / Trae 后续消费。
- `ae init` 幂等:重复执行不覆盖用户已有文件。
- 规则同步行为可测试。
- README 不再要求"必须打开 Claude Code 执行 `/ae-init` 才算初始化完成"。
