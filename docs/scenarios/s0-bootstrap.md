# S0 · Bootstrap：项目冷启动 / 骨架管理

> 框架索引：[../framework.md](../framework.md) · 场景定义 / S0

## 场景四段式

- **触发**：新建项目；或既有项目方法论缺失/需重置
- **入产物**：用户脑中的目标 + 散落素材 + （可选）母本项目
- **出产物**：标准目录骨架 + 4 个顶层入口文件 + `spec/` 内部入口文件（详见 §骨架）
- **实现方式**：**一个 slash command**（`/ae-init`），不靠 skill 编排；模板只作为最小入口文件文本源
  - 命令职责三件：建空目录 + 写 4 个入口文件最小模板 + **(可选)从全局规则库注入到 AGENTS.md / CLAUDE.md**(见 §可选规则注入)
  - 不做素材入库；母本抽取走同族的补充命令（见 §同族 slash command），不另起 skill
- **退出条件**：标准目录 + 入口文件就位，能用一句话回答"项目要做什么 + 素材在哪 + 下一步进哪个场景"

---

## 标准目录骨架（`/ae-init` 的产出）

```
<any-project>/
├── README.md            # 给人看的项目介绍（背景、安装、用法）
├── AGENTS.md            # 给 agent 看的入口规则（项目目标 + R1 + 项目特定段）
├── CLAUDE.md            # AGENTS.md 的 Claude 命名空间镜像（内容相同，工具自动加载用）
├── handoff.md           # 跨会话进展交接（空文件起步,由 handoff skill 维护）
│
├── reference/           # 原始素材（外部仓库、文档、链接素材；只读心态）
│
├── spec/                # 规格文档（SDD/TDD 主产物）
│   ├── README.md        # 给人看：项目地图（ASCII）+ 大流程图（空模板）
│   ├── INDEX.md         # 给模型看：需求/ADR 索引（空模板，由 skill 助维护）
│   ├── needs/           # 需求（空目录，每次 A2 落盘时建子目录）
│   └── ADR/             # 全局/横切决策（空目录）
│
├── .codex/              # Codex CLI 的本地工作区（空目录，按需填）
├── .claude/             # Claude Code 的本地工作区（空目录，按需填）
├── data/                # 数据文件输出地（运行产物、导出、缓存）
└── scripts/             # 辅助脚本（init、构建、临时工具）；与主代码分开
```

**4 个入口文件的语义边界**：
- `README.md`：受众=**人**；项目介绍、安装、用法、贡献指南
- `AGENTS.md`：受众=**agent**；项目目标、R1 入口规则、项目特定段；必须**短**——每次会话都会被加载（参见 R1 渐进式规则加载）
- `CLAUDE.md`：`AGENTS.md` 的镜像；同样内容、不同文件名，让 Claude Code 也能自动加载（仿 CES 母本做法）
- `handoff.md`：跨会话/跨项目进展交接，空文件起步；不在 `/ae-init` 里写内容，由后续 `handoff` skill 在会话结束时人工触发更新

**目录语义边界**：
- `reference/`：外部原始素材 = 别人的东西；只读心态
- `spec/`：规格文档（SDD/TDD 主产物）；内部骨架（README/INDEX/needs/ADR）由 `/ae-init` 一次建出，详见 [../spec-framework.md](../spec-framework.md)
- `.codex/` / `.claude/`：两个 AI agent CLI 的本地工作区，**都建空目录**（Q8 已锁），按使用的工具填入
- `data/`：项目运行/生成的数据文件输出地（产物、导出、缓存等）
- `scripts/`：辅助脚本类工具（init、构建、临时数据处理）；**与主代码分开**

**关于"主代码"**：主代码（业务源码）**不在 `/ae-init` 标准骨架内**——不同语言/框架的组织方式差别太大（`src/`、`app/`、`packages/`、根目录直接放 `.py` 等），硬塞一个反而绑死。主代码结构由具体项目自己决定。

**命令命名**：统一加 `ae-` 前缀（agentic-engineering 缩写），避免与 IDE / Claude Code / Codex 自带的 `/init` 等命令重名。本场景的命令族：`/ae-init`（建骨架）+ `/ae-ingest-mother`（母本抽取，见 §Skill 槽位）。

---

## `/ae-init` slash command 规格（Q6/Q7 已锁）

### 形态（Q6 决定）
- **slash command**，跨工具中立：同一份逻辑同时支持 Claude Code（`/ae-init`）和 Codex CLI（`/ae-init`）
- 不做独立 npm CLI、不做 shell 脚本——保留单一入口，规则集中

### 幂等（Q7 决定）
- **严格幂等**:相同输入（目录状态 + 全局规则文件)多次运行收敛到同一终态
- **骨架部分:缺什么补什么,已存在的目录/文件不覆盖**
- **规则块部分(见 §可选规则注入):块内可重写,块外永不动**——属于"派生自配置"的确定性产物,重写不破坏幂等
- 不提供 `--force`、不提供 `--overwrite`——块外破坏性操作走用户手动删除

### 执行流程（建议实现，未锁）
1. 扫描当前目录下所有标准项的存在性（4 个顶层入口文件 + 顶层目录 + `spec/` 内部 README/INDEX/needs/ADR）
2. 缺失的目录：`mkdir -p` + 放 `.gitkeep`
3. 缺失的文件：写最小模板（见下）
4. 已存在的：跳过，记录到运行报告
5. **规则块同步**:若 `~/.config/agentic-engineering/ae-rules.md` 存在,把内容塞进 AGENTS.md / CLAUDE.md 的 `AE:RULES` 块(见 §可选规则注入);不存在则跳过
6. 输出报告：「新建 X、跳过 Y、规则块 同步/跳过、终态 OK」

### 边界
- `/ae-init` **只生成上面这些标准项**，不传播任何方法论本体目录（如 `.claude/skills/` 下的场景 skill）——避免新项目被 agentic-engineering 自己的内部结构污染
- 命令本体的实现住在哪个目录、用什么语言写——是 agentic-engineering 项目自己的事，不在 S0 设计范围里

### 可选规则注入(v0.2 新增)

**配置位置(单一权威源,工具中立)**:

```
~/.config/agentic-engineering/ae-rules.md
```

- **全局级**:跨项目共享,跨工具(Claude Code / Codex / 未来其他 IDE)共享
- **工具中立**:不放 `~/.claude/` 也不放 `~/.codex/`——它是方法论资产,不属于任何 IDE
- **命名空间深度**:`agentic-engineering/` 子目录,未来可扩 `skills/`、`templates/`、`ADR/` 等
- **遵循 XDG Base Directory** 规范,跟 git/nvim 等 CLI 工具同一套约定

**文件格式(无 schema,纯 markdown 片段)**:

```markdown
- 落盘前先 grill-me 对齐字段
- prd.md 必须含验收标准
- 复现路径最小化后再写 issue
```

无 YAML、无分桶、无 frontmatter——就是你想自动注入的 markdown 行。

**注入机制(块标记,确保块外手写区永不被动)**:

`/ae-init` 写 AGENTS.md / CLAUDE.md 时,如果配置文件存在,把内容嵌进固定块:

```markdown
# Project Goal
...(模板原有 + 用户手写,/ae-init 永不动)...

<!-- AE:RULES:BEGIN -->
<!-- 由 /ae-init 从 ~/.config/agentic-engineering/ae-rules.md 同步,勿手改 -->
- 落盘前先 grill-me 对齐字段
- prd.md 必须含验收标准
- 复现路径最小化后再写 issue
<!-- AE:RULES:END -->
```

行为规则(3 条):
1. 配置文件**不存在** → 完全跳过,不在 AGENTS.md / CLAUDE.md 写任何块(向后兼容空项目)
2. 配置文件**存在**且目标文件**没有** `AE:RULES` 块 → 在文件末尾追加块
3. 配置文件**存在**且目标文件**已有** `AE:RULES` 块 → 块内整体重写,**BEGIN/END 块外字符不动**

**沉淀流(B7 → 全局规则库)**:

S1 场景 B 的 B7 沉淀分流时,如果判断"这条规则值得跨项目复用",直接打开 `~/.config/agentic-engineering/ae-rules.md` 手动追加一行——下次任何项目跑 `/ae-init` 自动生效。不需要单独的 `/ae-add-rule` 命令,B7 你本来就在思考"留不留",顺手 append 一行是最自然的动作。

**大小护栏(轻量)**:

不做硬上限,但 AGENTS.md 是 R1 每会话加载的——规则块臃肿了自己会觉得慢。出现以下信号就升级:
- 规则块 > 30 行 ⇒ 考虑挪去对应节点 skill 的 prompt
- 影响多需求的强决策 ⇒ 升级 ADR
- 可复用的方法/模式 ⇒ 升级 skill 走 S2

复杂的分桶(按节点 / 按 artifact 注入到不同 skill prompt)**暂不做**,等真的痛了再分。

### 入口文件最小模板（草案，后续可调）
- `README.md`：项目名 + 一句话定位占位 + TODO 安装/用法
- `AGENTS.md`：项目目标占位 + R1 内联 + 项目特定段（空）；**必须保持短**——每次会话都会被加载
- `CLAUDE.md`：`AGENTS.md` 的镜像（同样内容，文件名不同）；不写 "指向 AGENTS.md" 那种二跳，直接含规则本体，让 Claude Code 一次加载完
- `handoff.md`：空文件 + 一行注释「跨会话/跨项目进展交接，由 handoff skill 在会话结束时人工触发更新」
- `spec/README.md`：空 ASCII 项目地图占位 + 大流程图占位
- `spec/INDEX.md`：空索引表头（"需求 / ADR / 跨需求引用"三段），由 SDD/TDD 各节点 skill 助维护

### Q8 已锁：`.codex/` 与 `.claude/` 都建
- 默认两个空目录都建出来（Q8 已锁），按你实际使用的 AI 工具填入；不做自动检测、不做 flag

---

## 同族 slash command（`/ae-init` 之后才用得到，不强制）

- **`/ae-ingest-mother`**：从母本项目（如 CES）抽取已验证规则，**直接补充/更新到 `AGENTS.md` 项目特定段**(以及必要时新建 `spec/ADR/`)——以 slash command 形态实现,**不另起 skill**
  - 与 `/ae-init` 同族:同一套命令前缀、同一种"建/补"心智、对 AGENTS.md 同样的"严格幂等 + 不覆盖"约束
  - 执行时必须考虑 AGENTS.md 大小预算（R1 渐进式加载下它会被反复加载）;过长内容应提案为通用 skill 走 S2 沉淀,而不是塞进 AGENTS.md
  - 母本路径作为参数传入(如 `/ae-ingest-mother ./CES-AI-topic-9-smart-workflow`),命令本体负责抽取 → diff 提案 → 用户确认 → 落盘

> 已废弃的槽位（v0.1/v0.2 移除）：
> - ~~`ingest-reference` skill~~ — 素材入库不需要 skill，手动放进 `reference/` 即可
> - ~~`bootstrap-handoff` skill~~ — handoff 不属于 S0；它是 **foundation 级跨场景 skill**，人工触发，用于会话结束/项目交接时总结进展（参见框架索引中 foundation 段）
> - ~~`ingest-mother` skill~~ — v0.2 改为 `/ae-ingest-mother` slash command,与 `/ae-init` 同族,避免 skill/command 双轨

---

## 实现状态（S0 本场景）

已落地:

1. `commands/ae-init.md`：`/ae-init` 行为契约（输入、输出、幂等约束、报告格式、规则块同步逻辑）
2. `commands/ae-init.templates/`：入口文件最小模板
   - 顶层：`README.md` / `AGENTS.md` / `CLAUDE.md` / `handoff.md`
   - spec 骨架：`spec/README.md` / `spec/INDEX.md`
   - 规则块不在模板中空置；仅当全局规则文件存在时由 `/ae-init` 追加或重写 `AE:RULES` 块
3. `config/ae-rules.md.example`：全局规则库样例；不直接写真实 `~/.config`，避免污染个人配置
4. `commands/ae-init.test.sh`：T1–T5 验收脚本
   - **T1 空项目首跑**：空 tmp 目录 + 无全局规则文件 → 标准项就位、AGENTS.md 无规则块
   - **T2 幂等重跑**：T1 之后再跑一次 → 无覆盖、无新增
   - **T3 规则注入**：写入临时 `ae-rules.md` 含 2 条规则 → AGENTS.md / CLAUDE.md 的 `AE:RULES` 块出现这 2 条
   - **T4 规则更新**：修改规则文件 → 块内同步更新、块外手写区字符级未动
   - **T5 块外手写保留**：AGENTS.md 块外手写文字保留
5. `commands/ae-ingest-mother.md`：母本抽取命令契约（输入:母本路径;输出:AGENTS.md 项目特定段 diff 提案 + 用户确认后落盘;同族幂等）

验证命令:

```bash
bash commands/ae-init.test.sh
```
