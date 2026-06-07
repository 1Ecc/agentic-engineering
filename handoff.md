# Handoff

> 当前态最新快照。每次覆盖更新,不承载历史。

## 项目目标

搭建**贴合个人习惯、轻量的软件全生命周期方法论**:SDD 管"做什么"、TDD 管"怎么做对"。
素材来源:`reference/{OpenSpec, superpowers, mattpocock-skills, comet}`。
母本(已验证实战):`CES-AI-topic-9-smart-workflow/`。

## 当前阶段

**S0 Bootstrap 已实现并验证;主线仍准备进入 skill 个性化改造。**

下一步候选:
- (a) **进入 skill 个性化改造** — 推荐从 A2 `to-prd` 开始,做 spec 落盘 / INDEX 同步 / 本地化路径样板
- (b) 写 `AGENTS.md` v0.2 + `CLAUDE.md`(R1 + 落盘规则)
- (c) 写 `index-rebuild` 命令规格
- (d) 如要先试用 S0,把 `output/.claude/commands/ae-init.md` 及其 templates 安装到目标项目/全局命令位置后跑 `/ae-init`

---

## 本次 S0 落地结果

已新增:
- `output/.claude/commands/ae-init.md`: `/ae-init` 行为契约,覆盖输入、输出、幂等、报告格式、规则块同步
- `output/.claude/commands/ae-init.templates/`: 入口文件模板
  - 顶层:`README.md` / `AGENTS.md` / `CLAUDE.md` / `handoff.md`
  - spec:`spec/README.md` / `spec/INDEX.md`
- `output/.claude/commands/ae-ingest-mother.md`: 同族母本抽取命令契约,要求 diff 提案 + 用户确认后落盘
- `output/config/ae-rules.md.example`: 全局规则库样例;未直接写真实 `~/.config`
- `output/.claude/commands/ae-init.test.sh`: T1–T5 验收脚本

验证:
- 已运行 `output/.claude/commands/ae-init.test.sh`
- 结果:`ae-init contract tests passed`

实现取舍:
- 无全局规则文件时,`AGENTS.md` / `CLAUDE.md` **不生成空 `AE:RULES` 块**
- 全局规则文件存在时,追加或重写 `AE:RULES` 块;块外字符不动
- 测试使用临时 `XDG_CONFIG_HOME`,避免污染真实个人配置

---

## 已固化的关键决策

### 三场景结构
- **S0 Bootstrap**:`/ae-init` slash command 建标准目录 + 入口文件 + spec/ 内部骨架(README/INDEX/needs/ADR),严格幂等;可选从 `~/.config/agentic-engineering/ae-rules.md` 注入规则块;同族命令 `/ae-ingest-mother` 做母本抽取
- **S1 主循环**:两场景串行+回流
- **S2 自演进**:M6 沉淀回路,需用户确认

### S1 两场景模型

**场景 A 需求**(6 节点,SDD→TDD 串行):

| 节点 | 动作 | skill |
|------|------|-------|
| A1 | 需求对齐 | brainstorming(sp,粗) + grill-me(mp,涉接口/字段/参数细节) |
| A2 | prd.md 落盘 | to-prd(mp) |
| A3 | 技术设计 + design.md 落盘 | writing-plans(sp) |
| A4 | 任务拆解 → todo.md | to-issues(mp) |
| A5 | 执行 TDD(red/green/refactor) | tdd(mp) |
| A6 | verify 端到端验证 | verification-before-completion(sp) |

**场景 B 验收 + debug 子路径**:

| 节点 | 动作 | skill |
|------|------|-------|
| B1 | 用户验收 | (被动) |
| B2 | 期望态对齐(硬门禁) | grill-me(mp) |
| B3 | 根因定位(reproduce → minimise → instrument) | diagnose(mp) |
| B4 | issue 落盘(7 段格式) | (无 skill,轻量整理) |
| B5 | 修复 | tdd(mp) |
| B6 | 用户复验 | (被动) |
| B7 | 沉淀分流(规则→prd / 决策→ADR / 通用→S2) | review(mp) |

两道硬门禁:
- A1 需求未对齐 ⇒ 不写 prd
- B2 期望态未对齐 ⇒ 不动手修

### spec/ 目录规范

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

关键约定:
- 切片单位 = **需求**
- 状态枚举固化;当前节点由 INDEX 从文件状态推导
- 跨需求决策上升 ADR;局部决策留 design.md
- `handoff.md ≠ INDEX`:INDEX 是项目结构态;handoff 是会话交接态

---

## 开放问题状态

已锁定:Q1–Q8 + Q-B-entry + Q-debug-loop-cap + Q-INDEX-rebuild + Q-cross-need-issues。

仍待定:
- **Q9**:`handoff` skill 行为契约,待 skills 阶段同步定

---

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `方案/immutable-booping-sutherland.md` | 框架索引;已同步 S0 为 `/ae-init` |
| `方案/scenarios/s0-bootstrap.md` | S0 规格 + 当前实现状态 |
| `output/.claude/commands/ae-init.md` | `/ae-init` 命令契约 |
| `output/.claude/commands/ae-init.templates/` | `/ae-init` 入口模板 |
| `output/.claude/commands/ae-init.test.sh` | S0 验收脚本 |
| `output/.claude/commands/ae-ingest-mother.md` | `/ae-ingest-mother` 命令契约 |
| `方案/scenarios/s1 deep-orbiting-fog.md` | S1 两场景节点路径 + skill 标注 |
| `方案/spec-framework.md` | spec/ 目录规范 + frontmatter + INDEX 推导规则 |
| `方案/skill-candidates/README.md` | 43 个候选 skill 全索引 + S1 节点预选定稿 |

---

## 输入信号(优先级递减)

| 类别 | 位置 | 角色 |
|------|------|------|
| 母本 | `CES-AI-topic-9-smart-workflow/` | 已验证实战;抽规则折进框架 |
| 外部素材 | `reference/{OpenSpec,superpowers,mattpocock-skills,comet}/` | 只读心态;取长补短 |
| 弃用 | `历史思路/` | 不读、不参考 |

---

## 下次起手建议

优先回到主线 (a) skill 个性化改造,从 **A2 to-prd** 开始:
1. 删除 GitHub mode 分支
2. 输出锁定 `spec/needs/<需求名>/prd.md`
3. 加 frontmatter(`status: draft → active`)
4. 末尾同步 `spec/INDEX.md`(或先接入未来 `index-rebuild`)

完成 A2 后再做 A3 writing-plans(输出 design.md)、A4 to-issues(输出 todo.md)。
