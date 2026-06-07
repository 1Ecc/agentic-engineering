# 方法论框架 v0.1：场景路线（plan 框架 + 索引）

> 本文件**只承载框架**：路线总览、入口层规则、三场景一句话索引、横切取舍、验证清单、开放问题。
> 场景细节、目录骨架、skill 槽位、TODO 等已**下沉到 `scenarios/` 子目录**——见末尾索引。

## 本次更新（v0.2：S1 重塑 + spec 规范落定 + Q 集中锁定）

- S1 改为**两场景串行+回流**（A 需求 / B 验收含 debug 子路径），Q1 自然消解
- spec 规范单独落定 → [spec-framework.md](spec-framework.md)：目录骨架 / frontmatter / INDEX/README 形态
- 横切规则只保留 **R1**；R2/R3 下放到 skill 内嵌或 `AGENTS.md` 项目特定段
- 大批 Q 锁定：Q1–Q5、Q8 + 场景级 Q-B-entry / Q-debug-loop-cap / Q-cross-need-issues
- 术语统一："联调" → "debug"

---

## Context

项目 `agentic-engineering/` 的目标：沉淀一套**贴合你个人习惯的、轻量的软件全生命周期方法论**（SDD 管"做什么"、TDD 管"怎么做对"）。

输入信号三类，**优先级递减**：

| 类别 | 位置 | 角色 | 处置 |
|------|------|------|------|
| **母本** | `CES-AI-topic-9-smart-workflow/` | 你已验证的真实实践 | 抽规则，折进框架；可直接复用模式 |
| **外部素材** | `reference/` | 4 个开源仓库 | 只读心态，取长补短 |
| **弃用** | `历史思路/` | 旧探索 | 不读、不参考 |

约束：
1. 先定路线/场景框架，再补 skill
2. 目录管理先行
3. 反对 OpenSpec 冗余、Comet 状态机重；倾向 Superpowers + MP 的轻量结构
4. **Markdown-only**：不引入 yaml 状态机、不引入 guard 脚本

---

## 从 CES 母本折叠的 6 大模式

| 模式 | 含义 | 落点 |
|------|------|------|
| **M1 渐进式规则加载** | 琐碎任务直做；非琐碎才加载完整编码指南 | 入口层（`AGENTS.md`，即 R1） |
| **M2 规则优先级链** | 用户指令 > 项目特定 > 通用 skill > 默认编码要求 | 下放：skill 内嵌或 `AGENTS.md` 项目特定段 |
| **M3 文档信源四层** | product / architecture / decisions / integration | 已重构：spec/ 改按"需求 + ADR" 切分，详见 [spec-framework.md](spec-framework.md) |
| **M4 debug 7 段格式** | 问题描述 / 当前态 / 期望态 / 分析 / to-issues / bug / 验收 | S1 场景 B 的 debug 子路径；模板约定见 [spec-framework.md](spec-framework.md)，B4 落盘时复制即可 |
| **M5 根因优先** | 不绕过、不兜底、不硬编码；先复现+验证再修 | 下放：skill 内嵌（`diagnose` 等）或 `AGENTS.md` 项目特定段 |
| **M6 沉淀回路** | 项目特定规则多次验证后，抽象到通用 skill；不自动、需用户确认 | S2 元场景核心机制 |

---

## 路线总览

```
┌─────────────────────┐      ┌────────────────────────────────────────────────┐
│  S0  Bootstrap 场景  │ ───► │  S1  软件全生命周期场景（循环）                  │
│  (一次性 / 偶发)     │      │  ┌──────────────────┐  ┌──────────────────┐    │
│                     │      │  │ 场景 A 需求       │─►│ 场景 B 验收       │    │
│                     │      │  │ A1–A6  SDD→TDD   │  │ B1 验收;❌→B2-B7 │    │
│                     │      │  └──────────────────┘  └────────┬─────────┘    │
│                     │      │           ▲                     │              │
│                     │      │           └──── 沉淀回流 ◄──────┘              │
└─────────────────────┘      └────────────────────────────────────────────────┘
        ▲                                       │
        └───────── S2  方法论自演进（M6 沉淀回路）──┘
```

---

## 入口层横切规则（R1）

写进 `AGENTS.md` / `CLAUDE.md`，**不是 skill**——所有场景默认遵守。

- **R1 渐进式规则加载**：琐碎任务直做；非琐碎任务必须先加载完整指南（路径未来固定为 `output/.claude/skills/foundation/guidelines/SKILL.md`）
- R1 在 debug 场景下的具体分流策略，留待 `AGENTS.md` / `CLAUDE.md` 落地时用一两句话说明（待 skills 阶段决）

> 旧版 R2（规则优先级链）/ R3（根因优先）已下放：相关约束并入 skill 内嵌规则或 `AGENTS.md` 项目特定段，不再作为框架级显式规则。

---

## 三场景一句话索引

| 场景 | 一句话 | 细节文件 |
|------|--------|---------|
| **S0** Bootstrap | `/ae-init` slash command 建标准目录 + 入口文件 + spec/ 内部骨架，严格幂等 | [scenarios/s0-bootstrap.md](scenarios/s0-bootstrap.md) |
| **S1** 主循环 | 两场景串行+回流：需求场景（6 节点 SDD→TDD）+ 验收场景（含 debug 子路径） | [scenarios/s1 deep-orbiting-fog.md](scenarios/s1%20deep-orbiting-fog.md) · 配套规范 [spec-framework.md](spec-framework.md) |
| **S2** 自演进 | 边做边学；M6 沉淀回路把项目特定规则升格为通用 skill | [scenarios/s2-evolve.md](scenarios/s2-evolve.md) |

> 场景四段式（触发 / 入产物 / 出产物 / 退出条件）、目录骨架、skill 槽位、TODO 全部在细节文件内。

---

## 关键设计取舍（横跨场景）

| 主题 | 取舍 |
|------|------|
| 场景结构 | **两场景串行+回流**：A 需求（A1–A6 SDD→TDD）→ B 验收（含 debug 子路径 B2–B7）；2 道硬门禁：A1 需求对齐、B2 期望态对齐 |
| skill 组织 | 按**场景前缀**分（foundation / s0 / s1-need / s1-debug / s2）；每个 skill 可溯源 |
| 横切规则 vs skill | R1 是**规则**写进 `AGENTS.md`；R2/R3 已下放至 skill 内嵌或项目特定段 |
| 状态管理 | **全 Markdown**；项目结构态在 `spec/INDEX.md`（节点自动维护），会话交接态在 `handoff.md`（会话结束触发） |
| 素材分层 | 母本（CES，独立顶层）> 外部素材（`reference/`）> 弃用（`历史思路/`，不读） |
| 母本融入路径 | 初始化时手动 ingest；沉淀规则待后续按需走 S2，不做独立 `sync-mother` skill |
| debug 场景 | 7 段格式硬约束；期望态对齐前不执行；模板内容约定在 [spec-framework.md](spec-framework.md)，B4 落盘时复制即可（不挂 skill） |
| 方案/ vs spec/ | **独立职责**：`方案/` = 方法论本身的设计稿（本项目独有）；`spec/` = 用方法论产出的实际需求规格（未来项目通用） |
| 元场景 | S2 必须存在；沉淀回路（M6）需用户确认，不自动 |
| `/ae-init` 形态 | **Slash command**（跨 Claude/Codex），不做独立 CLI、不做 shell 脚本 |
| `/ae-init` 幂等 | **严格幂等**，缺什么补什么；不覆盖、不提供 force |
| `/ae-init` 双 agent 目录 | `.codex/` 和 `.claude/` **都建**（空目录），跨工具中立 |

---

## 全局落地 TODO（v0.2 视角）

> 旧 v0.1 落地清单已过期（提及的 `R1/R2/R3`、`docs/`、s1-sdd/s1-tdd/s1-integration 切分均已重构）。v0.2 重写如下：

1. 写 `AGENTS.md` v0.2：项目目标 + R1 内联 + R1 在 debug 下的分流策略（一两句话）+ 项目特定段（空）+ 「落盘 spec 后必须同步 INDEX，否则跑 `index-rebuild` 兜底」
2. 写 `CLAUDE.md`：`AGENTS.md` 镜像
3. 方法论本体目录（agentic-engineering 自己专属）：`output/.claude/skills/{foundation/guidelines, s0-bootstrap, s1-need, s1-debug, s2-evolve}/`
4. ~~落地 S0：`/ae-init` slash command + 入口模板（含 spec/ 内部骨架 + `.codex/` + `.claude/`）~~ → 已落地到 `output/.claude/commands/`
5. 落地 S1 各节点 skill：A1–A6 / B1–B7（含 `diagnose` skill 携带 7 段格式模板）
6. 落地 foundation `handoff` skill：定 Q9 行为契约
7. 落地 `index-rebuild` 命令（spec/ 兜底）

---

## 框架自身的验证（v0.1 是否可用）

不跑测试，用框架自身回答 7 个问题：

1. `mattpocock-skills/` 是新素材，进哪？→ `reference/`（已就位）
2. CES 项目进哪？为什么不进 `reference/`？→ 顶层独立；母本不是素材，优先级更高
3. "给 reference 新素材写一句话摘要"是哪个 skill、放哪？→ 不需要 skill，素材手动放进 `reference/` 即可（v0.1 已弃用 `ingest-reference` 槽位）
4. 想加"自动跑 lint"挂哪？→ S1-TDD `verify`
5. 用户说"页面加载慢，加个 loading 兜过去先"——该怎么回？→ 拒绝兜底，先复现+定位根因（根因优先原则，落 skill 内嵌）
6. 翻 `handoff.md` 能否一句话答出"现在该进哪个场景"？
7. CES debug 中反复用到的"未对齐期望态不执行"，如何变成本项目通用规则？→ S2 `precipitate-rule`，用户确认后写进 `foundation/guidelines/SKILL.md`

---

## 待裁决的开放问题

### 已锁
- ~~Q1：联调闭环并列还是子相位？~~ → **场景拆分自然消解**（S1 改为两场景模型，debug 是 B 的子路径）
- ~~Q2：foundation/guidelines/SKILL.md 体量？~~ → **精简版起步**；只装 R1 横切规则。R2/R3 已下放；R1 在 debug 下的具体分流策略落地到 `AGENTS.md` / `CLAUDE.md`（待 skills 阶段决具体文案）
- ~~Q3：debug 7 段格式承载形式？~~ → **不挂 skill,作为 spec/ 约定**：模板内容在 [spec-framework.md](spec-framework.md) 落定；B4 是轻量"按 7 段格式一次性落盘"动作，无需 skill 承载
- ~~Q4：方案/ 和 spec/ 是否合并？~~ → **保持独立**（职责天然不同：方案/ = 元方法论；spec/ = 项目产物）
- ~~Q5：是否做 sync-mother skill？~~ → **不做独立 skill**；初始化时手动 ingest 母本；后续沉淀哪些规则待按需定
- ~~Q6：/ae-init 形态？~~ → **slash command**
- ~~Q7：/ae-init 是否严格幂等？~~ → **严格幂等，不提供 force**
- ~~Q8：/ae-init 是否检测 .codex/ vs .claude/？~~ → **都建**（默认两个空目录）

### 待答（待 skills 阶段一并定）
- **Q9**：`handoff` skill 行为契约（输入 / 输出 / 与 `spec/INDEX.md` 的关系 / 与未关闭 issue 的关系）——本框架仅占位，等开始写 skills 时同步定

### 场景级开放问题（不影响框架）
- **Q-INDEX-rebuild**（spec-framework）：INDEX 兜底机制 → **已锁：B + C**（`index-rebuild` 命令 + AGENTS.md 规则约定）
- ~~Q-B-entry~~（S1）：验收清单 → **已锁：无清单**，用户口头/文字反馈即入产物
- ~~Q-debug-loop-cap~~（S1）：debug 死循环退出 → **已锁：由 skills 阶段管控**
- ~~Q-cross-need-issues~~（spec-framework）：跨需求 debug → **已消解**：术语统一为 debug 后，场景天然针对单需求

---

## 索引区

- 框架：本文件
- 场景细节：
  - [scenarios/s0-bootstrap.md](scenarios/s0-bootstrap.md) — 项目冷启动 / `/ae-init` 命令规格
  - [scenarios/s1 deep-orbiting-fog.md](scenarios/s1%20deep-orbiting-fog.md) — 主循环 / 需求 + 验收（含 debug 子路径）两场景
  - [scenarios/s2-evolve.md](scenarios/s2-evolve.md) — 方法论自演进 / M6 沉淀回路
- 配套规范：
  - [spec-framework.md](spec-framework.md) — spec/ 目录结构 / frontmatter / INDEX/README 形态
- 输入信号：
  - 母本：`../CES-AI-topic-9-smart-workflow/`
  - 外部素材：`../reference/{OpenSpec,comet,superpowers,mattpocock-skills}/`
  - 弃用：`../历史思路/`（不读）
