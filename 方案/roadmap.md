# 后续迭代计划(roadmap)

> 记录**有意 deferred** 的迭代项:当前不做,但重要、后续需迭代。
> 与 `issues/` 区分——issues 是真实验证中发现的偏差/bug;这里是设计上预留、刻意推后的能力口子。

## R-01 大型项目结构升级机制(spec 拆分)

- **来源**:[docs/spec-framework.md](../docs/spec-framework.md) §大型项目升级口子(当前不实现)
- **现状 / 问题**:设计稿用**行数/文件数阈值**作拆分触发(`prd.md > 200 行` / `design.md > 300 行` / `需求目录 > 10 文件`)。这套阈值**粗糙且不合理**——行数不等于复杂度,按字数判断该不该拆显然站不住。
- **当前决策(本期不迭代)**:不实现任何自动拆分机制。需要拆分 / 重构 spec 结构时,**暂交给 [`skills/brainstorming`](../skills/brainstorming/SKILL.md) 的判断能力**(靠场景与复杂度判断,而非固定阈值)。
- **未来方向**:
  - 设计更合理的触发信号(关注点分离 / 复杂度,而非纯行数)
  - 单文件 → 子目录:`prd/overview.md + prd/<子主题>.md`、`design/` 同理、需求拆子需求各自独立目录
  - INDEX 显示子文件;节点 skill 写入时按子目录分发
  - 落点可并入未来的 `ae update` 或专门迁移工具
- **优先级**:P3(出现真实大型项目压力时再启动)

## R-02 SessionStart hook 引导(路由器可靠触发升级)

- **来源**:本会话设计 `using-agentic-engineering` 路由器 skill 时的可靠性缺口。
- **现状 / 问题**:路由器现**仅靠 skill 自身 `description` 自动触发**——AGENTS.md 模板已决定保持空白、不预埋指针(每个项目/agent 不一样,不规范其格式)。skill 自动触发并非 100% 可靠;参考 [`reference/superpowers`](../reference/superpowers/hooks/session-start) 的真做法是 **SessionStart hook**——会话启动时把 skill 全文注入上下文,比靠 description 触发更可靠("没有 bootstrap,skill 就是 dead weight")。AE 当前 `ae setup` 只拷 skill、不装 hook。
- **当前决策(本期不做)**:先靠 skill description 触发兜底;**若真实 session 触发不稳,再上 hook**——它已是路由器可靠触发的唯一规划升级(指针这条退路已被主动放弃)。
- **未来方向**:`ae setup` 往 `.claude/settings.json` 装 SessionStart hook 注入路由器;Codex 的 hook 机制与 Claude Code 不同,需各自接线(跨平台真工程)。
- **优先级**:P3(路由器在真实 session 里触发不稳时再启动)。

## 其他已 deferred 项(指针,详情见各自出处)

- **`ae index-rebuild` 命令** —— 见 [issues/README.md](issues/README.md)「计划中」007;是 [Issue 006](issues/006-spec-rules-progressive-disclosure.md) R1 兜底依赖,落地前用"按推导表手动重算"兜底。
- **`archived → active` 禁止规则** —— 用户表态暂不考虑(Issue 006 决策定锚 5)。
- **spec-framework「已知限制」** —— `related-needs` 双向维护成本、跨需求 issue 无机制;见 [docs/spec-framework.md](../docs/spec-framework.md) §已知限制。
