# Skill 个性化改造方案 + 进展板

> 主索引:[../scenarios/s1 deep-orbiting-fog.md](../scenarios/s1%20deep-orbiting-fog.md) · [../spec-framework.md](../spec-framework.md) · [README.md](README.md)
>
> 本文档:**改造点清单 + 人工 check 进展板**。具体批注落在各 skill 的 `SKILL.md` 内,用 `<!-- AE-CHANGE[...] -->` HTML 注释包裹,grep `AE-CHANGE` 一次性扫到全部。

## 工作流约定

1. **批注语法**:HTML 注释 + 标签前缀
   - `<!-- AE-CHANGE[DELETE]:理由... -->` — 标记需删除的下一段
   - `<!-- AE-CHANGE[REPLACE]:替换内容(英文) | 理由(中文) -->` — 标记需替换
   - `<!-- AE-CHANGE[ADD-BEFORE]:新增内容(英文) | 理由(中文) -->` — 在标注后**紧邻位置之前**插入
   - `<!-- AE-CHANGE[ADD-AFTER]:新增内容(英文) | 理由(中文) -->` — 在标注后**紧邻位置之后**插入
2. **批注全部中文**,实际要写进 skill 的内容(frontmatter、模板段、新路径等)**用英文,与原 skill 语言对齐**
3. **批注不真正改原文**,仅作 review 用;人工 check 通过后再实施
4. 进展信号:`🟡 待 check` / `🟢 批注就位,待人工 check` / `✅ 已完成`

## 改造顺序(依赖 → 复杂度)

1. A2 to-prd —— **改造模式样板**
2. A3 writing-plans
3. A4 to-issues
4. A5/B5 tdd
5. B3 diagnose
6. B7 review —— **改造最重**
7. A1 brainstorming + grill-me
8. A6 verification-before-completion
9. handoff
10. improve-codebase-architecture / zoom-out

---

## 一、全局共性改造(每个被选 skill 都要做)

这些不必在每个 skill 批注里重复,只在涉及的 skill 局部出现时标记。

| 类别 | 删除 / 替换的源 | 替换为 |
|------|-----------------|--------|
| GitHub 集成 | `publish to issue tracker` / `triage label` / `Closes #45` / parent issue | 本地 `spec/needs/<need-name>/*.md` |
| mp 安装脚手架 | `/setup-matt-pocock-skills` / `docs/agents/issue-tracker.md` | 删除(本项目自写入口) |
| mp 领域词路径 | `CONTEXT.md` / `CONTEXT-MAP.md` / `docs/adr/` | `spec/INDEX.md` + `spec/needs/*/prd.md` + `spec/ADR/` |
| sp 落盘路径 | `docs/superpowers/specs/YYYY-MM-DD-<topic>.md` / `docs/superpowers/plans/...` | `spec/needs/<need-name>/{prd,design,todo}.md` |
| sp skill 钩子 | `Invoke writing-plans` / `subagent-driven-development` / `executing-plans` | 改成 S1 节点的下一步(`brainstorming → A2 to-prd` / `writing-plans → A4 to-issues`) |
| frontmatter | 源 skill 不写 | 凡落盘 `prd/design.md` 加 `status` / `last-aligned` / `related-needs` |
| INDEX 同步 | 源 skill 无 | 落盘后更新 `spec/INDEX.md` 对应行(或调用 `index-rebuild`) |

---

## 二、场景 A · 需求场景

### A1 · brainstorming(sp) ✅

> 文件:[superpowers/brainstorming/SKILL.md](superpowers/brainstorming/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] Visual Companion 整段 — 我们不做 browser companion
- [x] `Invoke writing-plans` 硬钩 — 下一步是 A2 to-prd
- [x] `docs/superpowers/specs/...` 落盘段(A1 不落盘,prd 落盘在 A2)
- [x] `elements-of-style:writing-clearly-and-concisely` 引用(不在预选)
- [x] **辅助文件**:`scripts/`(Visual Companion 浏览器服务)、`visual-companion.md`、`spec-document-reviewer-prompt.md` — 全部删除(人工 check 反馈追加)

#### ✏️ 修改
- [x] description 改造:**保留原始吊起词 + 追加项目专属短句**(人工 check 反馈调整,避免吊起概率下降)
- [x] "Explore project context" 改读 `spec/INDEX.md` + `spec/README.md` + `spec/needs/*/prd.md`
- [x] Process Flow 图重画:删 Visual Companion 节点 + Write design doc / Spec self-review / User reviews spec 节点;末态从 `Invoke writing-plans` 改为 `Hand off to A2 (to-prd)`
- [x] Checklist 从 9 步精简为 7 步(A1 不落盘,自检从 4 条精简为 3 条)
- [x] After the Design → After Alignment(全段改造,改成对话产物 + 用户审批 + 接力 A2)

#### ➕ 新增
- [x] HARD-GATE 改造:硬门禁明文指向 A2 / prd.md,显式标"S1 第一道硬门禁"
- [x] Checklist step 4:涉接口/字段/参数细节 → 切到 grill-me 分支(skill-candidates README §四 已锁)
- [x] After Alignment 段末:完整 A1→A6 链 hand-off 路径

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### A1 · grill-me(mp) + 复用于 B2 / B6 ✅

> 文件:[mattpocock/productivity/grill-me/SKILL.md](mattpocock/productivity/grill-me/SKILL.md)
> 进展:✅ 已完成(2026-06-07,**保持原样**)

#### 决策(人工 check 反馈)

grill-me 是通用对齐工具,任何场景都能用,**无需项目个性化**。原作者 10 行已经精炼到位,加 Boundary / Triggers / Exit Contract 反而引入不必要的项目耦合(且本节点不输出任何文件,没有落盘 / INDEX 同步契约要写)。

**回滚原批注,SKILL.md 保持原始 10 行内容不动。**

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过(决定回滚)
- [x] 实际改造完成(回滚到原样)

---

### A2 · to-prd(mp) —— **改造模式样板** ✅

> 文件:[mattpocock/engineering/to-prd/SKILL.md](mattpocock/engineering/to-prd/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] L8 `/setup-matt-pocock-skills` 引用 — 本项目自写入口
- [x] L18 `publish it to the project issue tracker. Apply the ready-for-agent triage label` — GitHub 集成

#### ✏️ 修改
- [x] L3 description 补一句"PRD 落盘到 `spec/needs/<need-name>/prd.md`"
- [x] L12 `project's domain glossary vocabulary` → `vocabulary from spec/INDEX.md and existing spec/needs/*/prd.md`
- [x] L12 `respect any ADRs in the area` → `respect ADRs under spec/ADR/`
- [x] L18 整句替换为本地落盘:写到 `spec/needs/<need-name>/prd.md`

#### ➕ 新增
- [x] L18 之前补 step 2.5:与用户对齐 need-name(kebab-case)
- [x] L18 之后补 frontmatter 模板段(`status: draft → active` / `last-aligned` / `related-needs`)
- [x] 文末补 INDEX 同步段 + 下一步提示(A3 writing-plans)
- [x] 文末补 `## Boundaries` 段(only `prd.md` / WHAT vs HOW / 多需求决策升 ADR)

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### A3 · writing-plans(sp) ✅

> 文件:[superpowers/writing-plans/SKILL.md](superpowers/writing-plans/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] `isolated worktree` 提及 — 不强制 worktree
- [x] `Bite-Sized Task Granularity` 整段 — task 级,下放 A4
- [x] `REQUIRED SUB-SKILL: subagent-driven-development` 行
- [x] `Task Structure` 代码模板 — 下放 A4
- [x] `Execution Handoff` 整段(两种执行方式选择) — A5 固定 tdd
- [x] **辅助文件**:`plan-document-reviewer-prompt.md`(自检明文写"not a subagent dispatch",此文件孤立无用)

#### ✏️ 修改
- [x] 落盘路径 `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` → `spec/needs/<need-name>/design.md`
- [x] Plan Document Header → Design Document Header(加 frontmatter / `Goal` / `Architecture` / `Tech Stack` / `Out of scope`,删 REQUIRED SUB-SKILL 行)

#### ➕ 新增
- [x] 顶部 `## Hard Constraint (S1 node A3)`:只产 design.md,不产 todo.md;A3 硬门禁
- [x] frontmatter 模板段(对接 spec-framework.md §frontmatter 规范)
- [x] Self-Review 改造:PRD coverage(原 Spec coverage)+ ADR promotion check(新增第 4 条,对接 §边界规则)
- [x] `## After Saving` 段:INDEX 同步 + ADR 行同步 + A4 接力
- [x] `## Boundaries` 段:与 prd.md / todo.md / ADR 三方边界明文化

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### A4 · to-issues(mp) ✅

> 文件:[mattpocock/engineering/to-issues/SKILL.md](mattpocock/engineering/to-issues/SKILL.md) + [todo-template.md](mattpocock/engineering/to-issues/todo-template.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] `/setup-matt-pocock-skills` 引用
- [x] HITL / AFK 区分 — solo dev 简化
- [x] `Publish the issues to the issue tracker` 整段
- [x] `## Parent` 模板段
- [x] `Do NOT close or modify any parent issue`
- [x] `<issue-template>` 重模板(Parent / What to build / Acceptance criteria / Blocked by 多段)

#### ✏️ 修改
- [x] **输入契约软化(人工 check 反馈)**:design.md 为 Primary input;不足时补 prd.md / related-needs / INDEX / ADR;严重 gap 回 A3 patch design.md(不再"SOLE input")
- [x] 出口落盘:`spec/needs/<need-name>/todo.md`(无 frontmatter,滚动维护)
- [x] step 5 改成引用外部模板文件(人工 check 反馈)

#### ➕ 新增
- [x] **新增模板文件 `todo-template.md`**(人工 check 反馈):严格按 spec-framework.md 的 `## 实施` + `## 阻塞 / 待澄清` 结构,完整维护规则放进模板尾部 HTML 注释(slice ID 命名规则、可追溯约束、不删已完成项等);SKILL.md step 5 直接引用此模板
- [x] `## After Saving` 段:INDEX 同步(改 todo 列 `0/N`)+ A5 tdd 接力
- [x] `## Boundaries` 段:与 prd / design / tdd 三方边界明文化

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### A5 / B5 · tdd(mp,共用一份) ✅

> 文件:[mattpocock/engineering/tdd/SKILL.md](mattpocock/engineering/tdd/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] 无需删除;已确认 sub-doc 引用(`interface-design.md` / `tests.md` / `mocking.md` / `refactoring.md` / `deep-modules.md`)均可本地保留

#### ✏️ 修改
- [x] description 保持原始内容不动(人工 check 反馈)
- [x] L47 `project's domain glossary` → `spec/INDEX.md + design.md vocabulary`
- [x] L47 `respect ADRs in the area` → `spec/ADR/`

#### ➕ 新增
- [x] 输入契约:读 `spec/needs/<need-name>/design.md` + `todo.md`
- [x] 输出契约:每完成一项打勾 todo.md
- [x] 硬约束:**禁止做 design.md 没提的事**(对接 spec-framework §边界)
- [x] 端到端验证由 A6 verification-before-completion 承接
- [x] B5 场景下额外说明:不动 todo(已勾完),改 issue 文件 bug 段
- [x] 文末补 `After Each Slice` / `After All Slices` / `After Fix Lands` / `Boundaries`

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### A6 · verification-before-completion(sp) ✅

> 文件:[superpowers/verification-before-completion/SKILL.md](superpowers/verification-before-completion/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] L110–115 `From 24 failure memories` 段 — 原作者个人化痕迹

#### ✏️ 修改
- [x] description 按批注改为 S1 A6 真实用户路径验证
- [x] L42–50 Common Failures 表加一行:**端到端通过(用户真实路径跑通) / 不足:单元测试 + lint 通过**

#### ➕ 新增
- [x] 本项目硬约束:`端到端真实路径验证,禁止 mock 绕过根因`(S1 已锁)
- [x] 验证通过后 INDEX 同步:节点切到"待 B1 用户验收"
- [x] 与 B5 复验的差异:A6 是开发自验,**不能替代**用户验收(B1)
- [x] 文末补 `After Verification` / `Distinction from B-side verification`

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

## 三、场景 B · 验收场景

### B3 · diagnose(mp) ✅

> 文件:[mattpocock/engineering/diagnose/SKILL.md](mattpocock/engineering/diagnose/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] 几乎无;保留 `scripts/hitl-loop.template.sh`

#### ✏️ 修改
- [x] description 保持原始内容不动(人工 check 反馈)
- [x] L10 `project's domain glossary` → `spec/INDEX.md + spec/needs/*/prd.md`
- [x] L10 `ADRs in the area` → `spec/ADR/`
- [x] Phase 6 原始 `Then ask: what would have prevented this bug?` 逻辑保留;额外追加 B7 沉淀分流说明

#### ➕ 新增
- [x] 输出契约:Phase 1–5 产物在 B4 一次性按 7 段格式落盘
- [x] 触发:由 B2 期望态对齐通过后进入
- [x] 7 段格式模板放 `assets/issue-7-sections.md`(skill-candidates README §五-5 已预告)
- [x] Phase 6 cleanup checklist 末尾加:"提示进 B4 issue 落盘"
- [x] Phase 6 追加:先交给 B7 `review` 做沉淀分流,再判断是否形成 architectural change / 主动触发 `improve-codebase-architecture`

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### B7 · review(mp) —— **改造最重** ✅

> 文件:[mattpocock/in-progress/review/SKILL.md](mattpocock/in-progress/review/SKILL.md)(已从 reference/ 复制)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] L15 `docs/agents/issue-tracker.md` 引用 + `/setup-matt-pocock-skills`
- [x] L29 整段 `Issue references in commit messages (#123, Closes #45, GitLab !67)` 段 — solo dev 不一定走这套
- [x] 标准来源列表(L37–44)里 mattpocock 特有路径 `docs/adr/` / `CONTEXT.md` / `CONTEXT-MAP.md`

#### ✏️ 修改
- [x] description 改为 B7 review + sedimentation routing
- [x] 标准来源列表 → `AGENTS.md` / `CLAUDE.md` / `spec/README.md` / `spec/INDEX.md` / `spec/ADR/`
- [x] spec 源 → `spec/needs/<need-name>/{prd,design,todo}.md`
- [x] `fixed point` 概念保留(= 该需求开始时的 git commit)
- [x] 双轴 sub-agent 保留(Standards / Spec 并行)

#### ➕ 新增 —— 本 skill 核心改造
- [x] **新增 Step 6:分流落盘**
  - 业务规则 → 反哺 `prd.md`(更新 `last-aligned`)
  - 技术决策(局部) → 反哺 `design.md`
  - 技术决策(影响多需求) → 新建 `spec/ADR/NNNN-<title>.md`
  - 复用规则 → 提案为 S2 候选(写到 handoff,**不直接升**)
- [x] 输入契约:本次 close 的需求 + 该需求所有 `issues/*.md`
- [x] INDEX 同步:issues 切"已验收";反哺的 prd/design 维持 active
- [x] Boundaries 明确:不 archive、不直接升 skill、不直接调用 `improve-codebase-architecture`

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

## 四、横切 / 主动触发

### handoff(mp) —— **关键反转** ✅

> 文件:[mattpocock/productivity/handoff/SKILL.md](mattpocock/productivity/handoff/SKILL.md)
> 进展:✅ 已完成(2026-06-07,**保留原文 + 两条新增约束**)

#### 决策(人工 check 反馈)

`handoff` skill 内容直接保留原文,不删除 OS temp 落盘逻辑,不修改 description,不强行替换为项目专属模板。仅新增两个本项目关键约束:

#### 🗑️ 删除
- [x] 无需删除;原始 OS temp 落盘逻辑保留

#### ✏️ 修改
- [x] description 保持原始内容不动

#### ➕ 新增
- [x] 假设无特殊要求,同时落盘到项目根目录 `handoff.md`
- [x] 项目根 `handoff.md` 落盘时必须覆盖,不追加;它只承载当前态最新快照,不承载历史

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### improve-codebase-architecture(mp) ✅

> 文件:[mattpocock/engineering/improve-codebase-architecture/SKILL.md](mattpocock/engineering/improve-codebase-architecture/SKILL.md)
> 进展:✅ 已完成(2026-06-07)

#### 🗑️ 删除
- [x] L78 `grill-with-docs` 引用 — 我们不引入该 skill
- [x] `CONTEXT.md` / `CONTEXT-FORMAT.md` / `ADR-FORMAT.md` / `docs/adr/` 等外部路径引用
- [x] **更正批注误判**:`LANGUAGE.md` / `HTML-REPORT.md` / `INTERFACE-DESIGN.md` / `DEEPENING.md` 均已存在且有用,保留引用

#### ✏️ 修改
- [x] `CONTEXT.md vocabulary` → `spec/INDEX.md + spec/needs/*/{prd,design}.md`
- [x] `docs/adr/` → `spec/ADR/`
- [x] description 改为 `spec/INDEX.md` / `spec/ADR/` 语境,并声明 user-triggered only
- [x] `INTERFACE-DESIGN.md` 中的 `CONTEXT.md vocabulary` 同步改为 `spec/INDEX.md` + 需求级 `prd/design`

#### ➕ 新增
- [x] 触发方式:用户主动调用,**不挂任何 S1 节点**
- [x] 与 spec-framework 接口:发现影响多需求的架构问题 → 提案进 `spec/ADR/NNNN-architecture-<topic>.md`(frontmatter `status: proposed`)
- [x] HTML 报告 + Mermaid + Tailwind CDN 整套保留(临时报告)
- [x] REVIEW-only 边界:本 skill 不直接修改应用代码;用户接受候选后回 S1(A1/A3)
- [x] Boundaries 明确辅助文档职责:`LANGUAGE` 术语 / `HTML-REPORT` 报告 / `DEEPENING` 依赖分类 / `INTERFACE-DESIGN` 候选接口探索

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过
- [x] 实际改造完成

---

### zoom-out(mp) ✅

> 文件:[mattpocock/engineering/zoom-out/SKILL.md](mattpocock/engineering/zoom-out/SKILL.md)
> 进展:✅ 已完成(2026-06-07,**保持原样**)

#### 决策(人工 check 反馈)

`zoom-out` 依旧沿用历史内容,无需项目个性化。该 skill 足够短,本质是用户主动发出的认知视角切换指令;强行加 `spec/INDEX.md` / `spec/README.md` / 触发边界会让它变重。

#### 🗑️ 删除
- [x] 无;仅移除未采纳批注

#### ✏️ 修改
- [x] 无;保留原始 description 与正文

#### ➕ 新增
- [x] 无

#### 🚧 状态
- [x] 批注已写入
- [x] 人工 check 通过(决定保持原样)
- [x] 实际改造完成(移除批注,保留原文)

---

## 五、跨 skill 协同决策(不属于任一 skill)

模板不再统一落到 `spec/_templates/*`;能内聚到具体 skill 的模板留在对应 skill 目录,避免 `/ae-init` 生成一套后续容易漂移的静态模板。`ae-index-rebuild` 仍作为后续独立命令 pending。

| 产物 / 决策 | 落点 | 用途 | 进展 |
|------|------|------|------|
| 7 段格式模板 | `mattpocock/engineering/diagnose/assets/issue-7-sections.md` | B4 一次性写 `issues/<主题>.md` | ✅ 已完成 |
| todo 模板 | `mattpocock/engineering/to-issues/todo-template.md` | A4 落盘 `todo.md` | ✅ 已完成 |
| PRD / design 模板 | 内嵌在 `to-prd` / `writing-plans` skill | A2 / A3 落盘结构由对应 skill 直接约束 | ✅ 不做独立模板 |
| ADR 模板 | 不提供独立模板;仅保留 `spec-framework.md` frontmatter + 状态规范 | B7 / improve-codebase-architecture 创建 ADR 时按规范写 | ✅ 不做独立模板 |
| `ae-index-rebuild` slash command | `output/.claude/commands/ae-index-rebuild.md`(待建) | INDEX 兜底(spec-framework §INDEX 兜底已锁) | 🟡 pending |

---

## 六、不改造但保留池(明示)

| skill | 状态 | 决策 |
|-------|------|------|
| `systematic-debugging`(sp) | 留池备查 | 暂不用;视实战决定是否加 B3 门禁层 |
| `caveman` / `prototype` / `triage` / `executing-plans` / `finishing-a-development-branch` 等 | 候选未选 | 留池 |
| `write-a-skill` / `writing-skills` | 永不选 | 用户已表态"直接手写" |
| `teach` / `writing-beats` / `writing-fragments` / `writing-shape` | 不选 | 与软件开发无关 |
| `setup-matt-pocock-skills` / `using-superpowers` | 不选 | 本项目自写入口 |

---

## 七、整体进展总览

| skill / 产物 | 批注 | 人工 check | 实际改造 |
|---|---|---|---|
| A1 brainstorming | ✅ | ✅ | ✅ |
| A1/B2/B6 grill-me | ✅ | ✅ | ✅(保持原样) |
| **A2 to-prd(样板)** | ✅ | ✅ | ✅ |
| A3 writing-plans | ✅ | ✅ | ✅ |
| A4 to-issues | ✅ | ✅ | ✅ |
| A5/B5 tdd | ✅ | ✅ | ✅ |
| A6 verification-before-completion | ✅ | ✅ | ✅ |
| B3 diagnose | ✅ | ✅ | ✅ |
| B7 review | ✅ | ✅ | ✅ |
| handoff | ✅ | ✅ | ✅ |
| improve-codebase-architecture | ✅ | ✅ | ✅ |
| zoom-out | ✅ | ✅ | ✅(保持原样) |
| spec/_templates/* | — | ✅(删除待做) | ✅(不需要) |
| ae-index-rebuild | — | 🟡 | 🟡 pending |

进展信号:🟡 待 check / ✅ 已完成(`—` = 不适用,跨 skill 协同产物无单独批注阶段)
