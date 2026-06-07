# OpenSpec 地图

这份地图用于建立 OpenSpec 的整体心智模型。读完后，你应该能看懂这些东西之间的关系：CLI、slash command、skills、schema、artifact、change、spec、archive，以及它们如何共同组成一个“文件驱动的状态机”。

## 1. 一句话理解

OpenSpec 是一套面向 AI 编程的规格驱动开发框架。

它不接管你的前端框架，不启动服务，不替代 Vite/React/Vue，也不直接决定代码怎么写。它做的事情更靠前：

```text
把“我要做什么”从聊天记录里拿出来，
落成项目内可追踪、可验证、可归档的规格文件。
```

所以它的核心不是运行时，而是：

```text
Markdown / YAML 文件 + CLI 规则 + Agent 操作说明
```

## 2. 总体结构图

```text
用户意图
  │
  ├─ 直接敲 CLI
  │    npx openspec new change github-trending-app
  │
  └─ 通过 Agent 触发
       /opsx-propose ...
       或自然语言：“用 OpenSpec 帮我创建 proposal”
             │
             ▼
        Agent 读取 skill / prompt
             │
             ▼
        Agent 调用 OpenSpec CLI
             │
             ▼
        CLI 读写 openspec/ 文件
             │
             ▼
        文件状态变化：proposal/specs/design/tasks/archive
```

最重要的分层：

```text
┌────────────────────────────────────────────┐
│ Slash Command / Prompt                     │
│ 例如 /opsx-propose、/opsx-explore          │
│ 作用：给 Agent 一个快捷入口                 │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│ Skill                                      │
│ 例如 .codex/skills/openspec-propose        │
│ 作用：告诉 Agent 应该怎么执行这个流程        │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│ CLI                                        │
│ 例如 npx openspec status --change xxx      │
│ 作用：真正读取、生成、校验 OpenSpec 文件      │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│ 文件状态机                                 │
│ openspec/changes、openspec/specs、archive  │
│ 作用：保存当前项目的规格状态                │
└────────────────────────────────────────────┘
```

## 3. 你当前项目里已经有什么

当前项目路径：

```text
/Users/huguiyuan/workspace/agentic-engineering/learning/openspec
```

项目内关键文件：

```text
openspec/
  config.yaml
  changes/
    archive/
  specs/

.codex/
  skills/
    openspec-propose/
    openspec-explore/
    openspec-apply-change/
    openspec-sync-specs/
    openspec-archive-change/

package.json
package-lock.json
node_modules/
```

Codex 的 slash prompts 是全局文件，不在项目目录里：

```text
/Users/huguiyuan/.codex/prompts/opsx-propose.md
/Users/huguiyuan/.codex/prompts/opsx-explore.md
/Users/huguiyuan/.codex/prompts/opsx-apply.md
/Users/huguiyuan/.codex/prompts/opsx-sync.md
/Users/huguiyuan/.codex/prompts/opsx-archive.md
```

这解释了一个容易混淆的点：

```text
项目内 .codex/skills/         = Agent skills，随项目走
全局 ~/.codex/prompts/        = Codex slash prompts，随你的机器/用户走
```

## 4. CLI、slash command、skills 分别是什么

### CLI

CLI 是 OpenSpec 的底层操作入口。

你当前是项目内安装：

```json
{
  "devDependencies": {
    "@fission-ai/openspec": "^1.4.1"
  }
}
```

所以推荐使用：

```bash
npx openspec ...
```

CLI 负责：

- 初始化 `openspec/`
- 创建 change
- 判断 artifact 是否完成
- 输出 artifact 写作说明
- 校验 change/spec
- 展示 dashboard
- archive 已完成 change
- 生成或更新 Agent 集成文件

典型命令：

```bash
npx openspec list
npx openspec list --specs
npx openspec new change github-trending-app
npx openspec status --change github-trending-app
npx openspec instructions proposal --change github-trending-app
npx openspec validate github-trending-app
npx openspec archive github-trending-app
```

### Slash command

Slash command 是 Agent 客户端提供的快捷入口。

它不是 OpenSpec 的核心状态，也不是 Node 命令。它只是把一段 prompt 包装成 `/xxx`，方便你对 Agent 说：“按这个流程做”。

在 README 里你会看到：

```text
/opsx:propose
/opsx:explore
/opsx:apply
/opsx:archive
```

但在 Codex 里，当前生成的是：

```text
/opsx-propose
/opsx-explore
/opsx-apply
/opsx-sync
/opsx-archive
```

原因是不同 Agent 对 slash command 命名规范不同：

```text
Claude Code:
  .claude/commands/opsx/explore.md
  可能使用 /opsx:explore

Codex:
  ~/.codex/prompts/opsx-explore.md
  通常使用 /opsx-explore
```

如果 Codex 里看不到这些命令，通常需要重启 Codex App 或开启新会话，因为 prompts 可能只在启动/新会话时加载。

### Skills

Skills 是给 Agent 读的流程说明。

例如：

```text
.codex/skills/openspec-propose/SKILL.md
```

它会告诉 Agent：

```text
1. 如果用户没有给 change 名字，先理解用户要做什么
2. 运行 openspec new change "<name>"
3. 运行 openspec status --change "<name>" --json
4. 按 artifact 顺序创建 proposal/specs/design/tasks
5. 每写完一个 artifact，重新 status
6. 到 apply-ready 后停止
```

所以 skills 的定位是：

```text
不是给人直接执行的命令
不是给浏览器运行的代码
而是 Agent 使用 OpenSpec 的操作手册
```

## 5. OpenSpec 的核心文件模型

OpenSpec 默认把“当前稳定规格”和“正在做的变更”分开。

```text
openspec/
  config.yaml
  specs/
    <capability>/
      spec.md
  changes/
    <change-name>/
      proposal.md
      design.md
      tasks.md
      specs/
        <capability>/
          spec.md
    archive/
      YYYY-MM-DD-<change-name>/
```

### `openspec/specs/`

这里放的是主规格，也就是项目当前已经确认下来的能力。

可以理解为：

```text
系统现在应该具备什么能力？
```

例如你的练习项目最终可能有：

```text
openspec/specs/trending-project-list/spec.md
openspec/specs/project-filtering/spec.md
openspec/specs/project-details/spec.md
```

### `openspec/changes/`

这里放的是正在规划或实现的变更。

可以理解为：

```text
这一次我要引入、修改或移除什么能力？
```

例如：

```text
openspec/changes/github-trending-app/
  proposal.md
  design.md
  tasks.md
  specs/
    trending-project-list/
      spec.md
```

### `openspec/changes/archive/`

当一个 change 完成后，会被移动到 archive。

archive 的意义是：

```text
这次变更历史已经完成，不再是 active change。
相关规格已经合并/同步到 openspec/specs/。
```

## 6. Change 是什么

Change 是 OpenSpec 的基本工作单元。

它类似“需求分支”，但不是 Git 分支。它是一个目录：

```text
openspec/changes/<change-name>/
```

一个 change 回答四类问题：

```text
proposal.md     为什么做？做什么？
specs/**/*.md   系统应该表现成什么样？
design.md       技术上怎么实现？
tasks.md        实现步骤怎么拆？
```

例如你的练习目标“GitHub 每日 Top 纯前端项目”，可以建成：

```bash
npx openspec new change github-trending-app
```

这不是在写业务代码，而是在创建这次需求/规格的承载空间。

## 7. Artifact 是什么

Artifact 是 change 里的组成文件。

在当前默认 schema `spec-driven` 里，artifact 有四种：

```text
proposal → specs → design → tasks
```

更准确地说：

| Artifact | 文件 | 解决的问题 |
| --- | --- | --- |
| proposal | `proposal.md` | 为什么做、做什么、影响哪些能力 |
| specs | `specs/<capability>/spec.md` | 系统必须满足什么行为 |
| design | `design.md` | 技术方案、取舍、风险 |
| tasks | `tasks.md` | 实现清单，可被 apply 阶段追踪 |

`spec-driven` schema 中的依赖关系：

```text
proposal
  ├─ specs
  └─ design
       │
       ▼
     tasks
```

实际规则是：

```text
proposal 无依赖
specs 依赖 proposal
design 依赖 proposal
tasks 依赖 specs + design
apply 阶段依赖 tasks
```

这就是“文件状态机”的基础。

## 8. Schema 是什么

Schema 定义一个 OpenSpec 工作流里有哪些 artifact、它们的顺序、模板、依赖和 apply 规则。

你当前配置：

```yaml
schema: spec-driven
```

当前包里可用 schema：

```text
spec-driven
workspace-planning
```

默认 `spec-driven` 的描述是：

```text
proposal → specs → design → tasks
```

schema 不是业务规格，而是“规格流程的规格”。

你可以这样理解：

```text
业务 spec:
  GitHub 项目列表应该如何展示？

OpenSpec schema:
  一个 change 应该先写 proposal，还是先写 tasks？
  tasks 依赖哪些文件？
  apply 阶段追踪哪个文件？
```

## 9. 文件状态机怎么工作

OpenSpec 不需要数据库。状态来自文件是否存在、是否符合 schema、任务 checkbox 是否完成。

核心状态流：

```text
没有 change
  │
  ▼
new change
  │
  ▼
openspec/changes/<name>/ 存在
  │
  ▼
proposal.md done
  │
  ├───────────────┐
  ▼               ▼
specs done      design.md done
  │               │
  └───────┬───────┘
          ▼
tasks.md done
          │
          ▼
apply-ready
          │
          ▼
实现代码 + 勾选 tasks
          │
          ▼
validate
          │
          ▼
sync specs
          │
          ▼
archive
```

CLI 判断状态的关键命令：

```bash
npx openspec status --change <name>
npx openspec status --change <name> --json
```

Agent 使用 `--json` 很多，因为它可以精确知道：

```text
schemaName
planningHome
changeRoot
artifactPaths
actionContext
artifacts
applyRequires
```

这比硬猜路径更可靠。

## 10. Proposal 怎么理解

`proposal.md` 是“为什么值得做”和“本次变更影响哪些能力”的声明。

它通常包含：

```text
Why
What Changes
Capabilities
Impact
```

最关键的是 `Capabilities`，因为它决定后面要写哪些 spec 文件。

例如 GitHub Trending App：

```text
New Capabilities
- trending-project-list: 展示每日热门 GitHub 项目
- repository-filtering: 按语言、日期范围等筛选
- repository-detail-view: 查看项目详情
```

OpenSpec 的重要思路：

```text
proposal 不是 PRD 长文。
它是变更边界和能力边界。
```

## 11. Specs 怎么理解

`specs/**/*.md` 是行为规格。

它回答：

```text
系统必须表现成什么样？
```

OpenSpec specs 通常用这种结构：

```markdown
## ADDED Requirements

### Requirement: User can view daily trending repositories
The system SHALL display a list of trending GitHub repositories for the selected day.

#### Scenario: Default daily list
- **WHEN** the user opens the app
- **THEN** the system displays trending repositories for today
```

重点：

- Requirement 写系统要求
- Scenario 写可验证场景
- `SHALL` / `MUST` 表示强约束
- 每个 requirement 至少有一个 scenario
- scenario 用 `#### Scenario:`，不是普通 bullet

Specs 不是技术实现文档。它不应该写：

```text
用 React Query 调 GitHub API
```

它应该写：

```text
当用户选择 TypeScript 时，列表只展示 TypeScript 项目
```

## 12. Delta spec 是什么

change 里的 spec 不是直接覆盖主规格，而是“增量规格”。

常见操作：

```text
ADDED Requirements      新增要求
MODIFIED Requirements   修改已有要求
REMOVED Requirements    移除要求
RENAMED Requirements    重命名要求
```

新项目第一次写能力，大多用：

```text
## ADDED Requirements
```

已有项目修改能力时，可能用：

```text
## MODIFIED Requirements
```

重要规则：

```text
MODIFIED 不能只写局部 diff。
要复制完整 requirement block，再改成新版本。
```

原因是 archive/sync 时需要把 delta spec 合并到主规格。

## 13. Design 怎么理解

`design.md` 是技术方案，不是需求说明。

它回答：

```text
怎么实现？
为什么这样实现？
有什么风险？
哪些方案被排除了？
```

常见内容：

```text
Context
Goals / Non-Goals
Decisions
Risks / Trade-offs
Migration Plan
Open Questions
```

对于你的纯前端 GitHub Trending App，design 可能描述：

```text
- 采用 Vite + React + TypeScript
- 数据来源使用 GitHub Search API 或第三方 trending endpoint
- 前端缓存策略
- API rate limit 风险
- 空状态、错误状态、加载状态
- 是否需要收藏功能持久化到 localStorage
```

Design 的判断标准：

```text
它解释技术选择，不重复 specs 的行为要求。
```

## 14. Tasks 怎么理解

`tasks.md` 是实现清单。

它不是随便写 TODO，而是 apply 阶段会追踪的 checkbox。

格式必须类似：

```markdown
## 1. Setup

- [ ] 1.1 Create Vite React app structure
- [ ] 1.2 Add styling and linting baseline

## 2. Repository List

- [ ] 2.1 Implement trending repository data model
- [ ] 2.2 Render repository list cards
```

OpenSpec apply 会看这些：

```text
- [ ] 未完成
- [x] 已完成
```

所以 checkbox 格式很重要。

## 15. Apply 是什么

Apply 不是一个文件，而是“按 tasks 实现代码”的阶段。

在默认 schema 里：

```yaml
apply:
  requires: [tasks]
  tracks: tasks.md
```

意思是：

```text
只要 tasks artifact 完成，change 就可以进入实现阶段。
实现进度追踪 tasks.md。
```

Agent 执行 apply 时通常会：

```text
1. 选定 change
2. status 查看 schema、路径、任务状态
3. instructions apply 获取上下文文件和任务列表
4. 读取 proposal/specs/design/tasks
5. 一项项实现
6. 每完成一项，把 - [ ] 改成 - [x]
```

## 16. Sync 和 Archive 是什么

### Sync specs

Sync 是把 change 里的 delta specs 合并回主 specs。

```text
openspec/changes/<name>/specs/...
  │
  ▼
openspec/specs/...
```

如果是新能力：

```text
changes/<name>/specs/trending-project-list/spec.md
  → specs/trending-project-list/spec.md
```

如果是修改能力：

```text
把 MODIFIED/REMOVED/RENAMED 规则应用到主 spec
```

### Archive

Archive 是把 active change 移入历史目录：

```text
openspec/changes/<name>/
  → openspec/changes/archive/YYYY-MM-DD-<name>/
```

archive 之后：

```text
这个 change 不再是活跃工作
主 specs 代表系统最新确认状态
archive 保留历史上下文
```

## 17. 初始化到底生成了什么

`npx openspec init --tools codex` 或 `openspec init` 会做几类事情：

```text
1. 创建 openspec/ 目录
2. 创建 openspec/config.yaml
3. 创建对应工具的 skills
4. 创建对应工具的 slash prompts / commands
5. 根据全局 profile 和 delivery 决定生成哪些工作流
```

你当前全局配置是：

```text
profile: core
delivery: both
workflows: propose, explore, apply, sync, archive
```

含义：

```text
profile: core
  使用核心工作流，不启用扩展工作流

delivery: both
  同时生成 skills 和 slash commands/prompts
```

如果要刷新：

```bash
npx openspec update --force
```

如果要重新为 Codex 生成：

```bash
npx openspec init --tools codex --force
```

如果还要为 Claude Code 生成：

```bash
npx openspec init --tools codex,claude --force
```

## 18. 常用触发方式

### 方式 A：你手动用 CLI

适合学习底层机制。

```bash
npx openspec new change github-trending-app
npx openspec status --change github-trending-app
npx openspec instructions proposal --change github-trending-app
```

优点：

```text
最透明，最容易理解 OpenSpec 到底读写了什么。
```

缺点：

```text
artifact 内容要自己写。
```

### 方式 B：你用 slash command 让 Agent 做

适合日常使用。

在 Codex 里尝试：

```text
/opsx-propose github-trending-app
/opsx-explore github-trending-app
/opsx-apply github-trending-app
/opsx-archive github-trending-app
```

优点：

```text
Agent 会按 OpenSpec 流程自动调用 CLI、写文件、检查状态。
```

缺点：

```text
依赖当前 Agent 客户端是否正确加载 slash prompt。
```

### 方式 C：你用自然语言让 Agent 做

例如：

```text
用 OpenSpec 为 GitHub 每日 Top 纯前端项目创建 change、proposal、specs、design 和 tasks。
```

这时 Agent 应该读取 `.codex/skills/openspec-propose/SKILL.md`，按里面的流程执行。

优点：

```text
不依赖 slash command 是否可见。
```

缺点：

```text
你需要说清楚“用 OpenSpec”。
```

## 19. 一个完整例子：GitHub 每日 Top 前端项目

目标：

```text
纯前端应用，展示 GitHub 每日 Top 项目。
```

建议 change 名称：

```text
github-trending-app
```

工作流：

```text
1. Explore
   想清楚数据来源、筛选条件、页面结构、是否需要收藏。

2. Propose
   创建 openspec/changes/github-trending-app/
   写 proposal/specs/design/tasks。

3. Validate
   检查 artifact 是否符合 schema。

4. Apply
   根据 tasks 实现前端项目。

5. Verify
   跑 lint、typecheck、build、浏览器检查。

6. Sync
   把 delta specs 合并到 openspec/specs/。

7. Archive
   把 change 移到 archive。
```

对应命令：

```bash
npx openspec new change github-trending-app
npx openspec status --change github-trending-app --json
npx openspec instructions proposal --change github-trending-app --json
npx openspec validate github-trending-app
npx openspec archive github-trending-app
```

对应 Codex slash prompt：

```text
/opsx-explore github-trending-app
/opsx-propose github-trending-app
/opsx-apply github-trending-app
/opsx-sync github-trending-app
/opsx-archive github-trending-app
```

## 20. OpenSpec 和 Git 的关系

OpenSpec change 不是 Git branch。

它们可以配合，但不是同一个东西：

```text
Git branch:
  管代码版本变化

OpenSpec change:
  管需求/规格/设计/任务变化
```

推荐组合：

```text
Git branch: codex/github-trending-app
OpenSpec change: github-trending-app
```

实现完成后：

```text
Git commit 保存代码变更
OpenSpec archive 保存规格变更历史
```

## 21. OpenSpec 和项目代码的关系

OpenSpec 不要求你使用某个前端技术栈。

例如你可以用：

```text
Vite + React + TypeScript
Vue + Vite
Svelte
纯 HTML/CSS/JS
```

OpenSpec 只关心：

```text
你要构建的能力有没有被说清楚
规格能不能验证
任务能不能追踪
实现后规格能不能归档
```

对于纯前端项目，OpenSpec 依然有价值，因为它能提前固定：

```text
页面状态
数据状态
错误状态
筛选行为
空列表行为
收藏行为
响应式行为
API rate limit 应对
```

这些如果只放在聊天里，很容易丢。

## 22. 常见误区

### 误区 1：OpenSpec 是代码框架

不是。它是规格框架。

```text
React/Vue/Vite 负责运行应用
OpenSpec 负责管理要构建什么
```

### 误区 2：slash command 是 OpenSpec 的底层能力

不是。slash command 是入口。

底层仍然是：

```text
CLI + openspec/ 文件
```

### 误区 3：skills 会自动运行

不会。

Skills 是 Agent 的说明书。需要 Agent 被触发后读取它。

触发方式可以是：

```text
/opsx-propose ...
自然语言要求 Agent 使用 OpenSpec
```

### 误区 4：`openspec new change` 会写业务代码

不会。

它只是创建 change 规格空间。

### 误区 5：proposal/spec/design/tasks 可以随便写

不建议。

这些文件受 schema 约束。尤其是：

```text
spec scenario 格式
tasks checkbox 格式
artifact 依赖顺序
```

### 误区 6：archive 只是移动文件

不完全是。

好的 archive 流程还包括：

```text
检查 artifact 完成度
检查 tasks 完成度
评估 delta specs 是否同步
把 change 移入 archive
```

## 23. 你应该记住的最小模型

如果只记一张图，记这个：

```text
OpenSpec
  │
  ├─ config.yaml
  │    选择 schema
  │
  ├─ specs/
  │    当前稳定规格
  │
  └─ changes/
       某次变更
       │
       ├─ proposal.md     为什么、做什么、影响哪些能力
       ├─ specs/          行为要求和场景
       ├─ design.md       技术方案和取舍
       └─ tasks.md        可执行任务清单
```

状态推进：

```text
explore → propose → apply → sync → archive
```

底层执行：

```text
slash command / natural language
  → Agent skill / prompt
  → OpenSpec CLI
  → openspec/ 文件状态变化
```

## 24. 练习时的推荐路线

为了真正理解 OpenSpec，建议你不要一开始完全依赖 slash command。

第一遍手动走：

```bash
npx openspec new change github-trending-app
npx openspec status --change github-trending-app
npx openspec instructions proposal --change github-trending-app
```

然后手动观察：

```text
openspec/changes/github-trending-app/
```

第二遍让 Agent 做：

```text
用 OpenSpec 为 github-trending-app 生成 proposal、specs、design、tasks。
```

第三遍用 slash prompt：

```text
/opsx-propose github-trending-app
```

这样你能分别理解：

```text
CLI 层
Agent skills 层
slash command 层
文件状态机层
```

## 25. 自检清单

如果你能回答这些问题，说明已经掌握 OpenSpec 的核心：

- `openspec/specs/` 和 `openspec/changes/` 有什么区别？
- change 为什么不是 Git branch？
- proposal、specs、design、tasks 分别回答什么问题？
- schema 控制了什么？
- `status --json` 为什么对 Agent 很重要？
- Codex 为什么是 `/opsx-explore`，而不是 `/opsx:explore`？
- skills 和 slash prompts 有什么区别？
- apply 阶段为什么追踪 `tasks.md`？
- delta spec 为什么要区分 ADDED/MODIFIED/REMOVED/RENAMED？
- archive 前为什么最好 sync specs？

## 26. 当前项目下一步

对于你的练习项目，推荐下一步是创建第一个真实 change：

```bash
npx openspec new change github-trending-app
```

然后查看状态：

```bash
npx openspec status --change github-trending-app
```

再让 Agent 帮你补全 artifacts：

```text
用 OpenSpec 为 github-trending-app 创建 proposal、specs、design 和 tasks。项目目标是纯前端展示 GitHub 每日 Top 项目。
```

你也可以直接尝试 Codex slash prompt：

```text
/opsx-propose github-trending-app
```

如果 slash prompt 不生效，就用自然语言触发；OpenSpec 的真正底层仍然可用。
