# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。
素材来源:`reference/{OpenSpec,superpowers,mattpocock-skills,comet}`。
母本项目:`CES-AI-topic-9-smart-workflow/` 只在必要时参考,不要通读历史细节。

## 当前阶段

核心任务是基于 `方案/skill-candidates/customization-plan.md` 完成 skills 改造。

已完成:
- S0 bootstrap 实现与验收
- A1 `brainstorming`
- A1/B2/B6 `grill-me` 保持原样
- A2 `to-prd`
- A3 `writing-plans`
- A4 `to-issues`
- A5/B5 `tdd`
- A6 `verification-before-completion`
- B3 `diagnose`
- B7 `review`
- 横切 `handoff`
- 横切 `improve-codebase-architecture`
- 横切 `zoom-out` 保持原样

下一步建议处理 `ae-index-rebuild`。`spec/_templates/*` 已裁掉,不再作为待做项。

## 本次 handoff 落地结果

已修改:
- `方案/skill-candidates/mattpocock/productivity/handoff/SKILL.md`
  - 原始 frontmatter 与 description 保持不动
  - 原始 OS temp 落盘逻辑保留
  - 新增默认同时保存到项目根 `handoff.md`
  - 新增项目根 `handoff.md` 必须覆盖、不得追加、不承载历史
- `方案/skill-candidates/customization-plan.md`
  - handoff 标记为 ✅ 已完成
  - 总览表同步 A5/B5、A6、B3、B7、handoff 为 ✅

验证:
- `handoff/SKILL.md` 无 `AE-CHANGE`
- handoff 修改范围符合人工 check 的关键反转:内容保留原文,只新增两个要点

## 本次 improve-codebase-architecture 落地结果

已修改:
- `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/SKILL.md`
  - 更正原批注误判:`LANGUAGE.md` 存在且保留
  - 保留 `LANGUAGE.md` / `HTML-REPORT.md` / `INTERFACE-DESIGN.md` / `DEEPENING.md` 辅助文档引用
  - 删除 `CONTEXT.md` / `docs/adr/` / `grill-with-docs` / `CONTEXT-FORMAT.md` / `ADR-FORMAT.md` 路径耦合
  - 明确 user-triggered only,不挂任何 S1 节点
  - 明确 REVIEW-only:不直接改应用代码,用户接受候选后回 S1(A1/A3)
  - 影响多需求的架构问题提案到 `spec/ADR/NNNN-architecture-<topic>.md` 且 `status: proposed`
- `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/INTERFACE-DESIGN.md`
  - `CONTEXT.md vocabulary` 改为 `spec/INDEX.md` + 需求级 `prd/design` 词汇
- `方案/skill-candidates/customization-plan.md`
  - `improve-codebase-architecture` 标记为 ✅ 已完成

验证:
- `improve-codebase-architecture/` 下无 `AE-CHANGE`
- 无 `grill-with-docs` / `CONTEXT-FORMAT.md` / `ADR-FORMAT.md` 残留引用;`CONTEXT.md` / `docs/adr/` 仅保留在"不要创建旧路径"的边界说明中

## 本次 zoom-out 落地结果

已修改:
- `方案/skill-candidates/mattpocock/engineering/zoom-out/SKILL.md`
  - 移除未采纳的 `AE-CHANGE` 批注
  - 保留原始 description 与正文,不做项目个性化
- `方案/skill-candidates/customization-plan.md`
  - `zoom-out` 标记为 ✅ 已完成(保持原样)

验证:
- `zoom-out/SKILL.md` 无 `AE-CHANGE`

## 本次模板 / index-rebuild 决策

已更新:
- `spec/_templates/*` 不再作为待做项
- 7 段 issue 模板由 `diagnose/assets/issue-7-sections.md` 承载
- todo 模板由 `to-issues/todo-template.md` 承载
- PRD / design 模板内嵌在 `to-prd` / `writing-plans` skill 中,不提供独立模板
- ADR 不提供独立模板,只保留 `spec-framework.md` 的 frontmatter 与状态规范
- `ae-index-rebuild` 保留为后续单独 slash command,当前 pending

已同步文档:
- `方案/skill-candidates/customization-plan.md`
- `方案/scenarios/s1 deep-orbiting-fog.md`
- `方案/spec-framework.md`
- `方案/immutable-booping-sutherland.md`

## 已固化的关键决策

### 三场景结构

- **S0 Bootstrap**:`/ae-init` 建标准目录、入口文件和 `spec/` 骨架;严格幂等;可选从全局规则库注入规则块;`/ae-ingest-mother` 做同族母本抽取
- **S1 主循环**:需求场景 A + 验收/debug 场景 B 串行回流
- **S2 自演进**:M6 沉淀回路,必须用户确认

### S1 场景 A

| 节点 | 动作 | skill |
|------|------|-------|
| A1 | 需求对齐 | brainstorming(sp,粗) + grill-me(mp,细) |
| A2 | prd.md 落盘 | to-prd(mp) |
| A3 | 技术设计 + design.md 落盘 | writing-plans(sp) |
| A4 | 任务拆解 + todo.md 落盘 | to-issues(mp) |
| A5 | TDD 执行 | tdd(mp) |
| A6 | 开发自验 | verification-before-completion(sp) |

### S1 场景 B

| 节点 | 动作 | skill |
|------|------|-------|
| B1 | 用户验收 | 被动 |
| B2 | 期望态对齐 | grill-me(mp) |
| B3 | 根因定位 | diagnose(mp) |
| B4 | issue 7 段格式落盘 | 无独立 skill |
| B5 | 修复 | tdd(mp) |
| B6 | 用户复验 | 被动 |
| B7 | 沉淀分流 | review(mp) |

两道硬门禁:
- A1 需求未对齐,不写 prd
- B2 期望态未对齐,不动手修

### spec 目录规范

```text
spec/
├── README.md
├── INDEX.md
├── needs/<需求名>/
│   ├── prd.md
│   ├── design.md
│   ├── todo.md
│   └── issues/<主题>.md
└── ADR/NNNN-<标题>.md
```

关键边界:
- 切片单位 = 需求
- `INDEX.md` 是结构态,`handoff.md` 是会话交接态
- 跨需求决策上升 ADR,局部技术决策留在 `design.md`
- `todo.md` 是滚动执行清单,不承载需求或设计正文

## 开放问题

已锁定:Q1-Q9、Q-B-entry、Q-debug-loop-cap、Q-INDEX-rebuild、Q-cross-need-issues。

仍待处理:
- `ae-index-rebuild` 单独命令

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `方案/immutable-booping-sutherland.md` | 框架索引 |
| `方案/scenarios/s0-bootstrap.md` | S0 规格 |
| `output/.claude/commands/ae-init.md` | `/ae-init` 命令契约 |
| `output/.claude/commands/ae-init.templates/` | `/ae-init` 入口模板 |
| `output/.claude/commands/ae-init.test.sh` | S0 验收脚本 |
| `output/.claude/commands/ae-ingest-mother.md` | `/ae-ingest-mother` 命令契约 |
| `方案/scenarios/s1 deep-orbiting-fog.md` | S1 两场景节点路径 |
| `方案/spec-framework.md` | `spec/` 目录规范 |
| `方案/skill-candidates/README.md` | 43 个候选 skill 索引 |
| `方案/skill-candidates/customization-plan.md` | skill 改造进展板 |
| `方案/skill-candidates/mattpocock/engineering/tdd/SKILL.md` | A5/B5 TDD skill |
| `方案/skill-candidates/superpowers/verification-before-completion/SKILL.md` | A6 开发自验 skill |
| `方案/skill-candidates/mattpocock/engineering/diagnose/SKILL.md` | B3 根因定位 skill |
| `方案/skill-candidates/mattpocock/engineering/diagnose/assets/issue-7-sections.md` | B4 issue 7 段模板 |
| `方案/skill-candidates/mattpocock/in-progress/review/SKILL.md` | B7 review + 沉淀分流 skill |
| `方案/skill-candidates/mattpocock/productivity/handoff/SKILL.md` | handoff skill |
| `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/SKILL.md` | 用户主动触发的架构 deepening review skill |
| `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/LANGUAGE.md` | 架构 review 术语表 |
| `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/HTML-REPORT.md` | 架构 review HTML 报告格式 |
| `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/INTERFACE-DESIGN.md` | 候选 deepening 的接口探索流程 |
| `方案/skill-candidates/mattpocock/engineering/improve-codebase-architecture/DEEPENING.md` | deepening 依赖分类与测试策略 |
| `方案/skill-candidates/mattpocock/engineering/zoom-out/SKILL.md` | 保持原样的认知视角切换 skill |

## 输入信号

| 类别 | 位置 | 角色 |
|------|------|------|
| 外部素材 | `reference/{OpenSpec,superpowers,mattpocock-skills,comet}/` | 只读取长补短 |
| 母本 | `CES-AI-topic-9-smart-workflow/` | 必要时抽取已验证习惯 |
| 弃用 | `历史思路/` | 不读、不参考 |

## 下次起手建议

skills 个性化准备工作已基本完成。下一步可做:

1. `ae-index-rebuild` slash command
2. 如暂不做命令,可以先整理一次当前改造结果并提交

处理时继续遵循当前节奏:先尊重人工 check 说明,再清理 `AE-CHANGE`,最后同步 `customization-plan.md` 和本文件。
