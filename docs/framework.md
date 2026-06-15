# Agentic Engineering 框架

Agentic Engineering 是一套面向个人或小团队、配合编码 agent 使用的轻量软件开发生命周期方法。它用 SDD 把"做什么"写清楚,再用 TDD 把"怎么证明它能用"变成可执行的验证。

方法以 markdown 为先。持久状态落在 `spec/`;会话状态落在 `handoff.md`;可复用的工作习惯沉淀为 skill 与规则。

## 核心理念

| 理念 | 含义 |
|------|------|
| SDD 管范围 | 产品意图、验收标准、边界,在动手实现前先写下来。 |
| TDD 管正确性 | 以小的纵向切片推进,凭真实验证证据收口。 |
| 需求是基本单元 | 每个需求有自己的 `spec/needs/<need-name>/` 目录。 |
| INDEX 是结构态 | `spec/INDEX.md` 让 agent 找到当前需求、状态和下一个节点。 |
| Handoff 是会话态 | `handoff.md` 在会话结束时覆盖写入,只保存最新快照。 |
| 规则在使用中演进 | 可复用规则只有经反复使用并经用户确认后才升级。 |

## 三个场景

```text
   (一次性)  ─────▶  S0 Bootstrap · ae setup → ae init
                          │
   (每个请求) ──▶  Router · 这个请求是一个 need 吗?
                          │
              ┌──── 否 ────┴──── 是 ────┐
              ▼                          ▼
          直接做                   进入 S1 主循环
      (问答 / 快修 /                     │
       一次性脚本)                       ├─ A. 需求:对齐 → PRD → design → todo → TDD → verify
                                         └─ B. 验收:验收 → debug → 修复 → 复验 → 沉淀
                                                     │
                                                     ▼  (沉淀规则反复有用)
                                                S2 Evolution

   图例:SDD = 对齐→PRD→design→todo   ·   TDD = TDD→verify、修复→复验
   状态:spec/ = 做什么(持久) · INDEX.md = need@节点 · handoff.md = 会话快照
```

入口的 Router(`using-agentic-engineering` skill)给每个非平凡请求把门:构成**需求**才进 SDD+TDD 循环,其余直接做。问答 / 快修 / 一次性脚本不付流程成本。

### S0 引导初始化

S0 现在是两步 CLI 流程:

```bash
ae setup
ae init "one-line project goal"
```

`ae setup` 为当前项目安装方法资产:

- `.claude/skills/`
- `.codex/skills/`

`ae init` 创建标准项目骨架:

- `README.md`、`AGENTS.md`、`CLAUDE.md`、`handoff.md`
- `reference/`、`data/`、`scripts/`
- `spec/README.md`、`spec/INDEX.md`、`spec/needs/`、`spec/ADR/`
- `spec/AGENTS.md`、`spec/CLAUDE.md`、`spec/ADR/AGENTS.md`、`spec/ADR/CLAUDE.md`(渐进式披露的 spec 规则,工作在 `spec/` 下时自动加载)

项目专属规则直接写进 `AGENTS.md`(`ae init` 只渲染标题 + 目标、刻意留空,不预设小节——规则按需自行追加)。`CLAUDE.md` 只是指向 `AGENTS.md` 的短指针,这样用户只维护一份权威指令文件。CLI 严格且幂等:缺失的文件才创建,已存在的文件跳过。

详见:[`docs/scenarios/s0-bootstrap.md`](scenarios/s0-bootstrap.md)

### S1 主循环

S1 是常规开发循环,由两个串行场景组成。

**入口路由**:不是每个请求都进 S1。`using-agentic-engineering` skill 充当路由器——先判断请求是否构成一个**需求**(留下产品级行为、值得落 spec):是 → 进 S1 对应节点;问答 / 快修 / 一次性脚本 → 直接做,不加流程;拿不准 → 默认放行 + 一句轻提示,把决定权交回用户。用户显式"直接做"永远优先。它靠 skill 自身的 `description` 在会话中自动触发(`AGENTS.md` 不预埋指针,保持空白);真实 session 触发不稳时可上 SessionStart hook 升级,见 `方案/roadmap.md` R-02。

需求场景 A:

| 节点 | 目的 | Skill |
|------|------|-------|
| A1 | 需求对齐 | `brainstorming`,涉细节时配 `grill-me` |
| A2 | 写 `prd.md` | `to-prd` |
| A3 | 写 `design.md` | `writing-plans` |
| A4 | 写 `todo.md` | `to-issues` |
| A5 | 以 TDD 实现 | `tdd` |
| A6 | 真实路径验证 | `verification-before-completion` |

验收场景 B:

| 节点 | 目的 | Skill |
|------|------|-------|
| B1 | 用户验收 | 用户驱动 |
| B2 | 期望态对齐 | `grill-me` |
| B3 | 根因定位 | `diagnose` |
| B4 | 写 issue 文件 | 本地 7 段格式 |
| B5 | 以 TDD 修复 | `tdd` |
| B6 | 用户复验 | 用户驱动 |
| B7 | 审查并沉淀 | `review` |

两道硬门禁保持循环的纪律:

- A1 未对齐,不写 `prd.md`。
- B2 期望行为未对齐,不修复。

详见:[`docs/scenarios/s1-main-loop.md`](scenarios/s1-main-loop.md)

### 横切编码纪律

`karpathy-guidelines` 不挂在任何节点上。它是一条全程生效的编码纪律——编码前思考、简洁优先、精准修改、目标驱动执行——在任何写或改代码时都适用,在 A5/B5 最为明显。它不需要手动触发:写代码或重构代码本身就会让它生效。

### S2 演进

S2 是方法改进循环。当项目专属规则反复证明有用时,可以把它提案为可复用的方法规则或未来的 skill。升级从不自动发生,必须由用户确认。

典型的 S2 触发信号:

- 某个工作流步骤反复别扭。
- 同一条 handoff 建议出现不止一次。
- 某条项目专属规则经多次真实使用而未被回滚。

## Spec 布局

每个初始化后的项目都用这个形态:

```text
spec/
├── README.md
├── INDEX.md
├── AGENTS.md
├── CLAUDE.md
├── needs/
│   └── <need-name>/
│       ├── prd.md
│       ├── design.md
│       ├── todo.md
│       └── issues/
│           └── <topic>.md
└── ADR/
    ├── AGENTS.md
    ├── CLAUDE.md
    └── NNNN-<title>.md
```

关于 frontmatter、状态取值、`INDEX.md`、`README.md`、ADR 以及 debug issue 文件的详细规则,见 [`docs/spec-framework.md`](spec-framework.md)。

## 资产模型

npm 包包含:

- `skills/` —— 选用、个性化改造和自写的 skill
- `templates/entries/` —— 由 `ae init` 渲染的入口文件模板
- `src/` 与 `bin/` —— 零依赖 CLI

用户项目会在 `.claude/skills/` 与 `.codex/skills/` 两处收到 skill。不再安装 slash command 资产。

## 操作规范

- 保持 `AGENTS.md` 精简,因为每个 agent session 都会加载它。
- 把 `AGENTS.md` 当作单一信息源;`CLAUDE.md` 只把 Claude Code 指回它。
- 把持久的项目状态放进 `spec/`,不要留在对话里。
- 改动 `spec/needs/<need-name>/` 下任何内容后,更新 `spec/INDEX.md`。
- 若 `INDEX.md` 不确定,用未来的 `ae index-rebuild` 命令兜底。
- 让 `handoff.md` 只保留最新快照。覆盖它,不要追加。
