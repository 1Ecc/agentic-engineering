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

## R-03 多平台适配(扩展到更多 AI 编码平台)

- **来源**:本会话参考 [rpamis/comet](https://github.com/rpamis/comet)(`comet init` 支持 29 个 AI 编码平台);README「Platform Scope」早已声明 Cursor / Trae 故意 deferred,此条把"扩平台"正式列为规划。
- **现状**:Issue 008 已实现本地版。`ae setup` 已改为平台 registry + 交互选择 / 自动识别 + `--platform <ids>`;首批 15 平台项目级 skills 目录安装已覆盖测试。真实平台抽检与发布待做。
- **调研落点**:见 [Issue 008](issues/008-multiplatform-skill-setup.md)。
- **关键认知(comet 怎么做的)**:comet 的"29 平台"主路径是**平台 registry + skills 目录分发**——按"平台 → 项目级 / 全局目录"映射表把 skill 资产装进各家 `.<平台>/skills/`(`.claude/` `.cursor/` `.codex/` `.windsurf/` `.gemini/` `.github/` …),再做自动检测、已安装检查与覆盖/跳过策略。源码审计后需补正一点:comet 不只是复制 skills,还为少数平台补 rules / hooks / command bridge(OpenCode、Pi 等);但它仍**不做通用入口规则文件适配**(`AGENTS.md` / `CLAUDE.md` / `.cursorrules` 这类项目入口不作为 29 平台支持的核心)。回避入口文件大适配,是它能扩平台的关键。
- **后续方向**:
  - 真实平台抽检:至少 Claude Code + Codex + Cursor / Trae 之一。
  - 视真实平台识别情况再补 command bridge / rules / hook,暂不做入口规则文件大适配。

## 其他已 deferred 项(指针,详情见各自出处)

- **`ae index-rebuild` 命令** —— 见 [issues/README.md](issues/README.md)「计划中」007;是 [Issue 006](issues/006-spec-rules-progressive-disclosure.md) R1 兜底依赖,落地前用"按推导表手动重算"兜底。
- **`archived → active` 禁止规则** —— 用户表态暂不考虑(Issue 006 决策定锚 5)。
- **spec-framework「已知限制」** —— `related-needs` 双向维护成本、跨需求 issue 无机制;见 [docs/spec-framework.md](../docs/spec-framework.md) §已知限制。
