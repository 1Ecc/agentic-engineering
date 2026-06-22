# S0 引导初始化

> 框架索引:[../framework.md](../framework.md)

S0 把一个空项目或已有项目变成 Agentic Engineering 项目。它刻意保持平台中立:由终端 CLI 完成初始化,之后 Claude Code、Codex 或其他 agent 都能消费产出的文件。

## 工作流

```bash
ae setup
ae init "one-line project goal"
```

`ae setup` 只做资产安装:

- 交互终端中提示选择 AI 编码平台
- 自动识别当前项目已有的平台目录并预选
- 非交互场景用 `--platform <ids>` 显式指定,如 `ae setup --platform claude,codex,cursor`
- 第一版只写项目级平台目录

`ae init` 只做骨架创建与入口渲染:

- 创建标准目录
- 从 `templates/entries/` 渲染入口文件

若任何受支持平台的 `skills/` 目录都不存在,`ae init` 会失败。先跑 `ae setup`,让 agent 资产在骨架创建前就位。

## 标准骨架

```text
<any-project>/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── handoff.md
│
├── reference/
│   └── .gitkeep
├── spec/
│   ├── README.md
│   ├── INDEX.md
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── needs/
│   │   └── .gitkeep
│   └── ADR/
│       ├── AGENTS.md
│       ├── CLAUDE.md
│       └── .gitkeep
├── data/
│   └── .gitkeep
└── scripts/
    └── .gitkeep
```

`ae setup` 还会创建:

```text
.<platform>/skills/
```

首批平台目录:

| 平台 | ID | skills 目录 |
|------|----|-------------|
| Claude Code | `claude` | `.claude/skills/` |
| Codex | `codex` | `.codex/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` |
| GitHub Copilot | `github-copilot` | `.github/skills/` |
| Kilo Code | `kilocode` | `.kilocode/skills/` |
| Kimi Code | `kimicode` | `.kimi-code/skills/` |
| CodeBuddy | `codebuddy` | `.codebuddy/skills/` |
| Qoder | `qoder` | `.qoder/skills/` |
| Trae | `trae` | `.trae/skills/` |
| Cursor | `cursor` | `.cursor/skills/` |
| OpenCode | `opencode` | `.opencode/skills/` |
| Antigravity | `antigravity` | `.agents/skills/` |
| Gemini CLI | `gemini` | `.gemini/skills/` |
| Qwen Code | `qwen` | `.qwen/skills/` |
| Kiro | `kiro` | `.kiro/skills/` |

v0.3 之后没有 `config/` 目录,也没有 `.claude/commands/` 目录。旧的 slash command 模式已移除,使初始化能在 Claude Code 之外运行。本轮多平台适配只安装 skill,暂不生成 `.cursorrules`、`GEMINI.md`、Copilot instructions 等平台入口规则文件。

## 入口文件

- `README.md`:面向人的项目总览、安装、用法与目录地图。
- `AGENTS.md`:权威项目指令文件,`ae init` 只渲染标题 + 目标、刻意留空——不预设小节、不预埋路由器指针;项目规则按需自行追加(每个项目/agent 不一样,不规范其格式)。
- `CLAUDE.md`:短指针,告诉 Claude Code 去读 `AGENTS.md`。
- `handoff.md`:只存最新交接快照;之后由 handoff skill 覆盖写入。
- `spec/README.md`:项目地图与关系说明。
- `spec/INDEX.md`:需求与 ADR 索引。
- `spec/AGENTS.md`:spec 目录工作规则核心(S1 节点总领 / INDEX 推导表 / R1 落盘后同步);渐进式披露,工作在 `spec/` 下时自动加载。命名 / frontmatter / 状态机 / 边界等细则由对应 skill 单点承载,不在此重复。
- `spec/CLAUDE.md`:指针,指向 `spec/AGENTS.md`。
- `spec/ADR/AGENTS.md`:ADR 命名 / 状态机 / frontmatter 规则。
- `spec/ADR/CLAUDE.md`:指针,指向 `spec/ADR/AGENTS.md`。

已存在的入口文件绝不覆盖。若想重新生成某个文件,手动删除它再跑一次 `ae init`。

## 项目规则

项目专属规则直接写在:

```text
AGENTS.md
```

把持久的项目习惯、约束和协作偏好写进 `AGENTS.md`(小节名自取)。`CLAUDE.md` 刻意保持简短,不应变成第二份规则文件。

旧的 `config/ae-rules.md`、`--rules <path>` 以及 `AE:RULES` 标记同步机制已在 v0.3 移除。

## 幂等性

两个 S0 命令都是幂等的:

- `ae setup` 跳过已存在的 skill。
- `ae init` 跳过已存在的骨架文件和入口文件。
- 两个命令都不删除、重命名或移动用户文件。

## 验证

setup 和 init 之后可用的检查:

```bash
test -f .claude/skills/diagnose/SKILL.md  # 若选择 claude
test -f .codex/skills/diagnose/SKILL.md   # 若选择 codex
test -f .cursor/skills/diagnose/SKILL.md  # 若选择 cursor
test ! -d config
test -f AGENTS.md
test -f CLAUDE.md
test -f spec/INDEX.md
test ! -d .claude/commands
```
