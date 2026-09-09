# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

快照更新:2026-09-09。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。本仓既是方法论本体,也是交付它的 npm CLI(`@ecc-hgy/ae`)。

**仓库处于 v0.6.0 已发布态**:2026-09-09 发布,npm `latest: 0.6.0`;本地测试、tarball 与 npm 远端安装验证通过。Git 实现提交 `360c539`,Git 发布以 `v0.6.0` 标签为准。
>
> `v0.6.0` 包含 Issue 008 多平台 setup 与 Issue 009 小项目骨架。npm 远端曾已有 `v0.5.0`(2026-06-22),本仓此前未同步版本记录;本轮已在 CHANGELOG 补齐。`v0.6.0` 已发布并核验。

## v0.4.0 发布了什么(详见 `CHANGELOG.md`)

相对 0.3.0:2 个新 skill(`using-agentic-engineering` 路由器 + `karpathy-guidelines` 编码纪律)、`ae init` 渲染渐进式披露 spec 规则文件(`spec/AGENTS.md` / `spec/CLAUDE.md` / `spec/ADR/*`)、`AGENTS.md` 模板改**空白**(只标题+目标、无预设段、无路由器指针)、路由器 Orient 改按需读、README 加 `How It Works` 框架图、docs 中文化。skill 计数 14。

## ⚠️ 显式待办(下次必做)

- **Issue 009 已实现并发布**。`ae init` 默认创建 src/tests/docs/data,不再创建 scripts/reference/outputs/build;dist 由构建生成。src/spec 多对多,data 不预设内部层级;根 AGENTS.md 及发布模板带一条“目录按职责聚合、信息渐进披露”规则。已有 app/apps/lib/packages 或 test/__tests__ 时不补职责重复的 src/tests。29 tests 全绿,0.6.0 tarball 49 文件,tarball setup/init 与 npm 远端安装均通过。详见 [Issue 009](方案/issues/009-project-skeleton-and-structure-governance.md)。
- **🔴 头号风险待验:路由器无指针后能否被自动调起**。v0.4.0 撤掉了根 `AGENTS.md` 的路由器指针,路由器现**只靠 skill `description` 自动触发**。这条没法靠测试覆盖,只能真实 session 抽检:新项目 `ae setup && ae init` 后抛一个真需求,看路由器会不会自己起来。兜不住 → 启动 roadmap R-02(SessionStart hook,已是唯一规划升级)。
- **【核心】继续打磨路由器 `skills/using-agentic-engineering/SKILL.md`**:IN/OUT 场景表边界、判定措辞、灰区轻提示话术、分发到各节点的衔接。配真实 session 抽检——4 条试金石(随手脚本 / 解释代码 / 更严 PR 规则 / 小改别走流程)+ 1 条真需求各跑一遍。(Orient 按需 + AGENTS 空白已在 v0.4.0 落地。)
- **新建 issue 007:实现 `ae index-rebuild`**。Issue 006 的 R1 兜底依赖,当前**不存在**(`src/cli.js` 只路由 `setup`/`init`)。skills + `spec/AGENTS.md` §R1 引用它作"未来兜底",落地前用"按推导表手动重算"兜底。范围见 Issue 006「ae index-rebuild 现状」段。
- **Issue 008 已实现:多平台 skill 安装适配**。`ae setup` 已走平台 registry + 交互选择 / 自动识别 + `--platform <ids>`;首批 15 平台,项目级安装,不做 `--all` / global / 入口规则文件适配。`npm test` 27 全绿,CLI smoke 通过;仍需平台侧真实加载抽检与发布。

## v0.4 当前行为

```text
ae setup            # 交互选择平台;非交互需 --platform <ids>
ae setup --platform claude,codex,cursor
ae init [goal]      # 建 skeleton + 渲染入口文件(幂等,不覆盖已存在文件)
```

`ae init` 渲染的入口文件:`README.md`、`AGENTS.md`(空白:仅标题+目标)、`CLAUDE.md`、`handoff.md`、`spec/README.md`、`spec/INDEX.md`、`spec/AGENTS.md`、`spec/CLAUDE.md`、`spec/ADR/AGENTS.md`、`spec/ADR/CLAUDE.md`。

当前开发态 `ae init` 创建 `src/`、`tests/`、`docs/`、`data/` 与 spec 核心;不预建 `dist/`。最近验证:2026-09-09 `npm test` **29/29 通过**,0.6.0 tarball 安装后的 setup/init smoke 通过。平台侧真实规则/skill 加载仍未抽检。

## 发布记录(2026-06-15)

- `npm test`:**22 全绿**
- `npm pack` 核对:47 文件,新 skills(karpathy / 路由器)+ 新 spec 模板组都在 tarball;`files` 白名单只含 `bin/src/skills/templates/README/LICENSE`,docs/方案/tests 不随包
- 发布前补正:README Skills 表补 `using-agentic-engineering` 行;CHANGELOG 改正过时的"AGENTS 带路由器指针"描述 + 补本次改动 + 标 `0.4.0 (2026-06-15)`
- `npm publish` 成功(2FA OTP 由用户在终端完成);`npm view` 确认远端 `0.4.0`
- ⚠️ **未验**:无指针后路由器靠 description 自动触发的真实可靠性(见显式待办头号风险)

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `package.json` | 版本 `0.6.0`(npm latest 0.6.0) |
| `src/cli.js` | 顶层路由:仅 `setup` / `init`(`index-rebuild` 待加) |
| `src/platforms.js` | 首批 15 平台 registry + skills 目录 / 检测 / ID 校验 |
| `src/commands/{setup,init}.js` | 两步 CLI;`setup` 多平台安装,`init` 接受任意受支持平台资产 |
| `src/skeleton.js` | `createDirectories` / `renderEntryFiles`;`ENTRY_FILES` 含 4 个 spec 文件 |
| `templates/entries/` | 入口模板:根 4 文件(`AGENTS.md` 含一条通用结构规则)+ `spec/{README,INDEX,AGENTS,CLAUDE}.md` + `spec/ADR/{AGENTS,CLAUDE}.md` |
| `skills/` | 14 个 skill;`using-agentic-engineering` 路由器(顶层编排,靠 description 自触发);节点 skill 引用 `spec/AGENTS.md` |
| `docs/` | 方法论文档(framework / scenarios / spec-framework),全中文,不随包 |
| `方案/` | `issues/` 池 001–006 + 008–009(007 预留 `ae index-rebuild`;009 已收敛小项目骨架建议并补本仓根规则,CLI/模板待落地)+ `skill-candidates/`(skill 选型,原 `design/`)+ `roadmap.md`(R-01 大型结构升级 / R-02 SessionStart hook / R-03 多平台适配)+ `archive/` |
| `tests/` | `node:test`,29 cases |

## 待处理(按优先级)

1. **🔴 真实 session 抽检路由器触发**——v0.4.0 无指针后能否自触发(头号风险);顺带验 `spec/` 下自动加载 `spec/AGENTS.md`、写代码吊起 `karpathy-guidelines`(渐进式披露是否成立)
2. **【核心】打磨路由器 `using-agentic-engineering/SKILL.md`**——据抽检结果把场景表 / 措辞调到真实可用
3. **新建 issue 007 实现 `ae index-rebuild`**——Issue 006 唯一功能性缺口
4. **Issue 008 真实平台抽检**——本地测试已过;至少抽检 Claude Code + Codex + Cursor / Trae 之一,确认 skill 能被平台侧识别
5. **阶段 3 长尾**:`ae update` 升级路径、GitHub Actions CI、Windows 验证
6. **后续迭代项**:`方案/roadmap.md`(R-01 大型项目结构升级、R-02 SessionStart hook、R-03 多平台适配,择期启动)
7. **Issue 009 已收口**——实现、测试、tarball smoke、npm 0.6.0 发布与远端安装核验完成;Git 发布以 v0.6.0 标签为准。

## 下次起手建议

1. Issue 009 已完成。后续维护不要恢复固定 data 子目录或默认 scripts/reference;骨架变更从 v0.6.0 起生效。
2. **真实 session 抽检**仍是发布风险重点:验证路由器触发、目标子树规则查阅及 `karpathy-guidelines` 吊起。官方 Codex 文档描述启动时按根到工作目录构建指令链,AE 不能据此承诺所有后代目录规则均自动加载;见 Issue 009 来源与边界说明。
3. 据抽检结果打磨 `using-agentic-engineering/SKILL.md`;若触发不稳,再评估 R-02 hook。
4. Issue 007 与 Issue 008 的其他待办仍保留。Issue 009 本轮发布安排以用户检查无误为前提,不在检查前执行发布。
