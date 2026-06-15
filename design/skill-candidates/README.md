# Skill 候选池

> 来源:`reference/mattpocock-skills/skills/` + `reference/superpowers/skills/`
> 用途:S1 各节点 skill 选型的素材池,人工 check 后裁剪

总计 **43 个** skill(mattpocock 29 + superpowers 14)。

---

## 一、全索引

### mattpocock(按原作者分类保留)

| 子类 | 名称 | 一句话 |
|------|------|--------|
| **engineering** | [diagnose](mattpocock/engineering/diagnose/SKILL.md) | 硬 bug / 性能回归的纪律化 debug 循环:复现 → 最小化 → 假设 → 仪器化 → 修复 → 回归测试 |
| engineering | [grill-with-docs](mattpocock/engineering/grill-with-docs/SKILL.md) | 用现有领域模型 + 文档 grill 你的计划,边对齐边更新 CONTEXT.md / ADR |
| engineering | [improve-codebase-architecture](mattpocock/engineering/improve-codebase-architecture/SKILL.md) | 找架构改进点,基于 CONTEXT.md 领域语言和 docs/adr/ 决策 |
| engineering | [prototype](mattpocock/engineering/prototype/SKILL.md) | 用一次性 prototype 验证设计;两种分支(终端 app 或多 UI 变体) |
| engineering | [setup-matt-pocock-skills](mattpocock/engineering/setup-matt-pocock-skills/SKILL.md) | 配置 AGENTS.md / CLAUDE.md / docs/agents/ 让 mattpocock 系 skill 知道仓库 issue tracker 等(本项目自己重写) |
| engineering | [**tdd**](mattpocock/engineering/tdd/SKILL.md) | TDD 红绿循环;附 interface-design / refactoring / mocking 等子文档 |
| engineering | [to-issues](mattpocock/engineering/to-issues/SKILL.md) | 把 plan/spec/PRD 拆成可独立执行的 tracer-bullet issue |
| engineering | [to-prd](mattpocock/engineering/to-prd/SKILL.md) | 把当前对话上下文转换为 PRD 并发布到 issue tracker |
| engineering | [triage](mattpocock/engineering/triage/SKILL.md) | issue 分诊状态机,按角色推进 |
| engineering | [zoom-out](mattpocock/engineering/zoom-out/SKILL.md) | 退一步,给更大上下文 / 更高视角 |
| **productivity** | [caveman](mattpocock/productivity/caveman/SKILL.md) | 超压缩对话,~75% token 节省 |
| productivity | [grill-me](mattpocock/productivity/grill-me/SKILL.md) | 不断追问 grill 直到达成共识,逐分支解决决策树 |
| productivity | [**handoff**](mattpocock/productivity/handoff/SKILL.md) | 把当前对话压缩为 handoff 文档供下个 agent 接手 |
| productivity | [write-a-skill](mattpocock/productivity/write-a-skill/SKILL.md) | 创建新 agent skill(结构 / 渐进披露 / 捆绑资源) |
| **in-progress** | [review](mattpocock/in-progress/review/SKILL.md) | 沿 Standards / Spec 双轴审查变更,并行 sub-agent 出报告 |
| in-progress | [teach](mattpocock/in-progress/teach/SKILL.md) | 教用户一个新概念 |
| in-progress | [writing-beats / writing-fragments / writing-shape](mattpocock/in-progress/) | 写作向 skill,与软件开发无关 |
| **misc** | [git-guardrails-claude-code](mattpocock/misc/git-guardrails-claude-code/SKILL.md) | Claude Code hooks 拦截危险 git 操作(push/reset/clean...) |
| misc | [migrate-to-shoehorn](mattpocock/misc/migrate-to-shoehorn/SKILL.md) | 把 `as` 断言迁到 @total-typescript/shoehorn(高度专项) |
| misc | [scaffold-exercises](mattpocock/misc/scaffold-exercises/SKILL.md) | 脚手架式练习题目录(教学场景专用) |
| misc | [setup-pre-commit](mattpocock/misc/setup-pre-commit/SKILL.md) | Husky + lint-staged + 类型检查 + 测试的 pre-commit hook |
| **personal** | [edit-article / obsidian-vault](mattpocock/personal/) | 个人写作 / Obsidian 用,与本项目无关 |
| **deprecated** | [design-an-interface](mattpocock/deprecated/design-an-interface/SKILL.md) | 并行 sub-agent 出多种 API 设计,"design it twice" |
| deprecated | [qa](mattpocock/deprecated/qa/SKILL.md) | 交互式 QA 会话,把 bug 报告自动写成 GitHub issue |
| deprecated | [request-refactor-plan](mattpocock/deprecated/request-refactor-plan/SKILL.md) | 通过用户访谈出详细 refactor plan + tiny commits |
| deprecated | [ubiquitous-language](mattpocock/deprecated/ubiquitous-language/SKILL.md) | DDD 风格领域术语表(UBIQUITOUS_LANGUAGE.md) |

### superpowers(平铺,无分类)

| 名称 | 一句话 |
|------|--------|
| [brainstorming](superpowers/brainstorming/SKILL.md) | 创意工作前必用:探索 intent / requirements / design |
| [dispatching-parallel-agents](superpowers/dispatching-parallel-agents/SKILL.md) | 2+ 独立任务无共享状态时,派发并行 agent |
| [executing-plans](superpowers/executing-plans/SKILL.md) | 有书面 plan 时,在独立会话里执行,带 review checkpoint |
| [finishing-a-development-branch](superpowers/finishing-a-development-branch/SKILL.md) | 实现完成 + 测试通过后,如何整合(merge / PR / cleanup) |
| [receiving-code-review](superpowers/receiving-code-review/SKILL.md) | 收到 review 反馈时:技术严谨 + 验证,不盲目同意 |
| [requesting-code-review](superpowers/requesting-code-review/SKILL.md) | 完成任务 / 实现重要功能 / 合并前发起 review |
| [subagent-driven-development](superpowers/subagent-driven-development/SKILL.md) | 当前会话里用独立任务的 subagent 执行 plan |
| [**systematic-debugging**](superpowers/systematic-debugging/SKILL.md) | 遇到任何 bug / 测试失败 / 异常行为时,先系统化 debug 再提方案 |
| [**test-driven-development**](superpowers/test-driven-development/SKILL.md) | 实现任何功能或 bug 修复前,先写测试 |
| [using-git-worktrees](superpowers/using-git-worktrees/SKILL.md) | 启动需要隔离的功能开发时,确保有 worktree |
| [using-superpowers](superpowers/using-superpowers/SKILL.md) | 任何对话开始时调用,确立"先 Skill 后回应"约定(本项目自己重写) |
| [**verification-before-completion**](superpowers/verification-before-completion/SKILL.md) | 声称"完成 / 修复 / 通过"之前,先跑验证命令并确认输出 |
| [writing-plans](superpowers/writing-plans/SKILL.md) | 有 spec / 需求时,触代码前先写 plan |
| [writing-skills](superpowers/writing-skills/SKILL.md) | 创建 / 编辑 / 验证 skill |

---

## 二、S1 节点 skill 预选(已与用户确认,定稿)

**节点数从 7 → 6**(A3 技术设计 + A4 落盘合并为一个节点)。

### 场景 A · 需求场景(6 节点)

| 节点 | 选定 skill | 来源 | 备注 |
|------|-----------|------|------|
| **A1 需求对齐** | **brainstorming** + **grill-me** | sp + mp | 双 skill 按粒度分流:粗对齐 → brainstorming;涉接口/字段/参数等细节 → grill-me |
| **A2 prd 落盘** | **to-prd** | mp | 改造:不发 GitHub issue,落盘到 `spec/needs/<需求名>/prd.md` + frontmatter |
| **A3 技术设计 + design 落盘**(合并节点) | **writing-plans** | sp | 实操中设计与落盘一气呵成;**只产 design.md,不产 todo**(与 A4 边界明确) |
| **A4 任务拆解** | **to-issues** | mp | 读 design.md 产 todo.md;改造:输出本地 `todo.md`,不发 issue tracker |
| **A5 执行 TDD** | **tdd** | mp | mattpocock 版,含 interface-design / refactoring / mocking 子文档,完整 |
| **A6 verify** | **verification-before-completion** | sp | "evidence before assertions" 硬约束,防自欺 |

### 场景 B · 验收场景

| 节点 | 选定 skill | 来源 | 备注 |
|------|-----------|------|------|
| B1 用户验收 | (被动,无 skill) | — | 用户口头/文字反馈即入产物 |
| **B2 期望态对齐** | **grill-me** | mp | 用户口头问题 → 与开发对齐"实际看到什么 / 期望什么";与 A1 细粒度对齐复用同一个 skill |
| **B3 根因定位** | **diagnose** | mp | 完整诊断纪律(reproduce → minimise → hypothesise → instrument → fix → regression-test);instrument 段覆盖断点/日志/二分等定位方法 |
| **B4 issue 落盘** | (无 skill) | — | 把 B2 + B3 成果按 7 段格式一次性写到 `spec/needs/<需求名>/issues/<主题>.md`;轻量整理动作,模板见 [spec-framework.md](../spec-framework.md) |
| **B5 修复** | **tdd** | mp | 按根因实施;新冒出的小 bug 追加到 issue 文件的 bug 段。与 A5 复用 |
| B6 用户复验 | (被动,无 skill) | — | 计数 +1 |
| **B6→B2 退出条件** | **grill-me** 介入 | mp | 复验失败 ≥ 2 次 ⇒ 回 B2 重新对齐期望态(答 Q-debug-loop-cap) |
| **B7 沉淀分流** | **review** | mp | 双轴审查;改造:增加分流落盘逻辑(规则→prd / 决策→ADR / 通用→S2) |

### 横切 / 主动触发 skill

| 用途 | 选定 skill | 触发方式 |
|------|-----------|---------|
| **会话结束 handoff** | **handoff**(mp) | 会话结束 / 跨 agent 交接时主动触发(由 foundation handoff skill 调用) |
| **架构反思 / 改进** | **improve-codebase-architecture**(mp) | 用户主动触发——不挂任何节点,任意时刻可调 |
| **大局视野** | **zoom-out**(mp) | 用户主动触发——A3 设计前 / B4 卡住时可手动调 |
| **全程编码纪律** | **karpathy-guidelines**(自写) | 编码时默认生效(always-on,非用户触发)——A5/B5 写/改代码贯穿;**自写,不在 43 候选池内** |
| **场景路由 / 编排** | **using-agentic-engineering**(自写) | 会话开始非平凡工作时,靠 skill 自身 description 自动触发(AGENTS.md 不预埋指针;触发不稳的 hook 升级见 roadmap R-02);判定"进不进 AE 流程"并分发到节点 skill(薄路由器,不承载方法论);**自写,不在 43 候选池内** |

### 不在本预选(明确不选)

| 类别 | skill | 理由 |
|------|-------|------|
| S2 元 skill | ~~write-a-skill~~ / ~~writing-skills~~ | 用户表态不引入"写 skill 的 skill",直接手写 |
| 安装脚手架 | setup-matt-pocock-skills / using-superpowers | 本项目自己写入口 |
| 写作向 | edit-article / obsidian-vault / writing-beats / writing-fragments / writing-shape / teach | 与软件开发无关 |
| 高度专项 | migrate-to-shoehorn / scaffold-exercises | TypeScript / 教学场景,本项目用不上 |
| deprecated | ubiquitous-language / request-refactor-plan / qa / design-an-interface | 原作者已弃用 |
| 备选未选 | prototype / executing-plans / finishing-a-development-branch / grill-with-docs / triage / using-git-worktrees / setup-pre-commit / git-guardrails-claude-code / caveman / dispatching-parallel-agents / receiving-code-review / requesting-code-review / subagent-driven-development / **systematic-debugging** | 候选阶段提过但未中选;留池备查。`systematic-debugging` 用户表态暂不用,后续可能加为 B4 门禁层 |

---

## 三、最终预选定稿表(快查)

| S1 节点 | 选定 skill |
|---------|-----------|
| A1 需求对齐 | brainstorming(sp) + grill-me(mp,涉细节时) |
| A2 prd 落盘 | to-prd(mp) |
| A3 设计+落盘 | writing-plans(sp) |
| A4 任务拆解 | to-issues(mp) |
| A5 执行 TDD | tdd(mp) |
| A6 verify | verification-before-completion(sp) |
| B2 期望态对齐 | grill-me(mp) |
| B3 根因定位 | diagnose(mp) |
| B4 issue 落盘 | (无 skill,按 7 段格式一次性写) |
| B5 修复 | tdd(mp) |
| B6 死循环退出 | grill-me(mp) 介入回 B2(失败 ≥ 2 次) |
| B7 沉淀分流 | review(mp) |
| 横切 handoff | handoff(mp) |
| 主动触发 / 架构反思 | improve-codebase-architecture(mp) |
| 主动触发 / 大局视野 | zoom-out(mp) |
| 全程编码纪律 | karpathy-guidelines(自写) |

> sp = superpowers / mp = mattpocock / 自写 = 本项目从零编写,不源自候选池
>
> 注:`karpathy-guidelines` 与 `using-agentic-engineering` 均为**自写** skill,不源自 mattpocock/superpowers 池,故本文顶部"总计 43 个"候选数不变。

---

## 四、各 skill 之间的边界规则(避免重复)

| 容易混淆的对 | 边界 |
|--------------|------|
| brainstorming vs grill-me | brainstorming 探**意图/场景/不做什么**(高层);grill-me 追**接口/字段/参数歧义**(底层) |
| writing-plans(A3) vs to-issues(A4) | writing-plans 出 **design.md 的"plan 步骤"**(设计粒度);to-issues 把 plan 步骤进一步切**可独立打勾的 todo 项**(执行粒度);**writing-plans 不写 todo.md** |
| ~~systematic-debugging vs diagnose~~ | 暂只用 diagnose;systematic-debugging 留池备查,用户后续视实战需要再决定是否加门禁层 |
| tdd(A5)vs tdd(B5) | 同一个 skill 复用——A5 是新需求开发,B5 是小型修复;TDD 节奏相同 |
| review vs handoff | review 双轴**审查变更**(close 前);handoff **压缩对话**(会话末);二者不混 |

---

## 五、改造方向预告(不在本次实现,留给下一轮)

每个被选中的 skill 后续改造方向预计:

1. **加 spec 落盘段**:动作末尾必须写 `spec/needs/<需求名>/<对应文件>.md`,带 frontmatter `status` / `last-aligned`
2. **加 INDEX 同步段**:落盘后调用 `index-rebuild` 或手动更新 INDEX 行
3. **本地化路径**:把指向 GitHub issue tracker 的步骤改为本地 `spec/needs/<需求名>/issues/` 主题文件
4. **删除非必要分支**:mattpocock 系常常分 GitHub mode / local mode,本项目固定 local mode
5. **嵌入 7 段格式模板**:diagnose skill 的 assets/ 下放 7 段格式模板
6. **加 B6 计数逻辑**:diagnose(或 review)内部维护"复验失败次数",≥ 2 时触发 grill-me 回 B2
7. **B7 review 加分流落盘**:把审查发现按"规则 / 决策 / 通用"分别落到 `prd.md` / `design.md` / `spec/ADR/` / S2 候选

具体改造留给"实现 S1 skills"阶段。
