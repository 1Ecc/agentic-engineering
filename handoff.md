# Handoff

> 当前态最新快照。每次覆盖更新,不追加,不承载历史。

## 项目目标

搭建贴合个人习惯、轻量的软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。本仓既是方法论本体,也是交付它的 npm CLI(`@ecc-hgy/ae`)。

仓库处于 v0.3 已发布态。本会话有一批**未发布**的本地改动,攒齐后统一 bump 版本再发(版本仍 `0.3.0`)。

## ⚠️ 显式待办(下次必做)

- **【下一步核心】继续打磨路由器 `skills/using-agentic-engineering/SKILL.md`**:IN/OUT 场景表边界、判定措辞、灰区轻提示话术、分发到各节点的衔接。建议配真实 session 抽检:用 4 条试金石(随手脚本 / 解释代码 / 更严 PR 规则 / 小改别走流程)+ 1 条真需求各跑一遍,看路由判定与触发是否如预期。
  - ✅ 已做:**Step 0 Orient 改按需触发**——只在新会话冷启动或拿不准当前态时才读 `handoff.md` + `spec/INDEX.md`,暖会话有上下文就跳过、不每轮重读(治"每次必读"枷锁)。
  - ✅ 已做:**`templates/entries/AGENTS.md` 改空白**(只剩标题+目标),撤掉路由器指针——不规范用户 AGENTS.md 格式。路由器改靠 skill `description` 自动触发;触发不稳再上 hook(roadmap R-02)。⚠️ **抽检重点**:无指针后路由器在真实 session 能否被自动调起,是这次决策的最大风险点。
- **新建 issue 007:实现 `ae index-rebuild`**。它是 Issue 006 的 R1 兜底依赖,当前**不存在**(`src/cli.js` 只路由 `setup`/`init`)。skills + `spec/AGENTS.md` §R1 已引用它作"未来兜底",在它落地前用"按推导表手动重算"兜底。落地范围见 Issue 006「ae index-rebuild 现状」段。

## 本会话累积改动(均未 publish)

1. **新增第 13 个 skill `karpathy-guidelines`**(全程编码纪律:编码前思考 / 简洁优先 / 精准修改 / 目标驱动),并完成文档接入(README / framework / s1-main-loop / design)。
2. **根 `AGENTS.md` 重写**:刷新为吐纳本仓自己模板的 shape(Project-Specific Rules / Stack / Structure / Operating Guidelines);校正 stale(reference 四仓实为 OpenSpec / andrej-karpathy-skills / mattpocock-skills / superpowers)。
3. **`docs/` 中文化**:`docs/framework.md`、`docs/scenarios/s0-bootstrap.md` 译为简体中文(`方案/`、`design/`、`docs/spec-framework.md`、`docs/scenarios/s1-main-loop.md` 本就是中文)。
4. **Issue 006 已实现并二次验证**:spec-framework 规则改用**渐进式披露**下放(见下)。
5. **spec/AGENTS.md 二次精简**:瘦身到核心(`总领` + `INDEX 推导规则` + `R1`),其余 skills 已扛的重复小节(命名 / frontmatter / 状态机 / README 形态 / 边界规则)+ 头部不随包引用全部删除;README≠INDEX 与全局架构提示搬进 `spec/README.md`,issues 跨需求应对丢弃;配套清 `todo-template` 两处 `§` 悬空 + `diagnose` 补 `<topic>` kebab。详见 Issue 006「二次精简」段。
6. **补全 INDEX 列含义并就近放置**:新增 prd/design/todo/issues 各列怎么填的说明,作**内联注释**放入 `spec/INDEX.md`(文件本地撰写规范就近在场,Option ①);`spec/AGENTS.md` §INDEX 只留跨文档的推导表(被 5 个 skill 引用)。
7. **根 README 模板改内联注释引导式 + 设计稿 README 消歧**:根 `README.md` 模板用 `<!-- -->` 引导(它是什么+价值 / 为什么·给谁 / Quick Start / 示例 / 目录地图·文档入口),不固化小节;`docs/spec-framework.md` 的 `## README.md 格式` → `## spec/README.md 格式` 并加一句区分,消除"根 README vs spec/README"混淆。
8. **新增 `方案/roadmap.md`(后续迭代计划)**:`docs/spec-framework.md` 至此**基本啃完**,可执行规则均已落地,剩余皆为有意 deferred 项。新建 roadmap 记录 **R-01 大型项目结构升级机制**(设计稿的行数阈值不合理、本期不迭代、拆分判断暂交 `skills/brainstorming`)+ 其他 deferred 指针(007 / archived→active / 已知限制);`方案/README.md` 已登记,设计稿 §大型项目升级口子 加回指。
9. **新增路由器 skill `using-agentic-engineering`(第 14 个)**:给用户项目顶层补"编排主脑"。grill-me 对齐后定的形态——**薄路由器**:判定请求是否构成"需求"(主判据=产品级行为、值得落 spec),灰区**放行+轻提示**,分发到现有节点 skill。优先级阶梯(用户 > 项目规则 > AE 默认)在 skill 内,治"枷锁"。节点→skill 总表从 `spec/AGENTS.md §总领` **上移至此(单源)**。根 `AGENTS.md` 加**一行指针**兜底触发(AE 无 superpowers 那种 SessionStart hook);`方案/roadmap.md` 加 **R-02**(hook 升级,P3)。skill 计数 13→14。
10. **路由器 Step 0 Orient 改按需触发**:`using-agentic-engineering/SKILL.md` 把"路由前必读 handoff + INDEX"改成**仅在新会话冷启动或拿不准当前态时读**,暖会话跳过、不每轮重读。SKILL 单文件改动,framework/s1 描述无连带。
11. **新增 AE 核心逻辑框架图(ASCII)**:补上唯一缺的"全方法俯视图"——画出**路由器这道前置门**(Request→是不是 need→进/不进 S1)+ S0/S1(A/B、SDD/TDD)/S2 + spec/INDEX/handoff 状态轨。无边框流式画法(规避中文双宽顶歪边框)。两处对齐:根 `README.md` 新增 `## How It Works`(英文,npm/GitHub 门面);`docs/framework.md` §三个场景 把原粗框 `S0|v S1...` 替换为同款(中文)。`s1-main-loop.md` 的节点级详流图不动(不同海拔,不冲突)。
12. **`templates/entries/AGENTS.md` 改空白 + 撤路由器指针(决策反转)**:用户定调"AGENTS.md 该保持空白,每个项目/agent 不一样,不规范其格式"。模板瘦到只剩 `# {{PROJECT_NAME}}` + `> {{PROJECT_GOAL}}`,删掉 Project-Specific Rules / Stack / Structure / Operating Guidelines 全部预设段 **及路由器指针**。⚠️ **指针是 item 9 的承重墙,这里主动撤回**:路由器改为**只靠 skill `description` 自动触发**(赌它够用,兜不住再上 hook)。连带同步:测试 2 处断言(`init.test.js` 改"AGENTS.md 含规则段+指针"→"无段无指针",`npm test` 22 仍绿)、docs 4 处(`s0-bootstrap`/`framework`(含路由触发段)/`README`/`spec-framework` 不再声称模板带规则段/指针)、`design/skill-candidates` 路由器行、`方案/roadmap.md` **R-02 升级为路由器可靠触发的唯一规划升级**(指针退路已弃)。`方案/issues/*` 作历史不改。

## Issue 006:spec 规则渐进式披露(已实现,二次验证通过,待发布)

**问题**:`docs/spec-framework.md` 不随包(`files` 不含 `docs/`),8 处 skill 却引用它 → 用户项目里悬空。最实质缺口:INDEX「当前节点推导表」和 R1「落盘后同步 INDEX」无任何随包资产承载。

**决策**:用渐进式披露(目录级 AGENTS.md/CLAUDE.md 自动加载),不做成 skill。

**已落地**:

- 新增 4 个模板:`templates/entries/spec/{AGENTS.md,CLAUDE.md}` + `templates/entries/spec/ADR/{AGENTS.md,CLAUDE.md}`
  - `spec/AGENTS.md`:**总领简表 + INDEX 推导规则(含推导表)+ R1 同步**(二次精简后只剩这三块;命名 / frontmatter / 状态机 / README 形态 / 边界已下放到对应 skill 或 `spec/README.md`)
  - `spec/ADR/AGENTS.md`:ADR `NNNN-` 命名 + `proposed/accepted/superseded` 状态机 + `status/date/supersedes` frontmatter
  - 两个 CLAUDE.md 是指针
- `src/skeleton.js` `ENTRY_FILES` 追加这 4 路径(幂等逻辑不变)
- skills 去悬空:8 处 `spec-framework.md` → `spec/AGENTS.md`;7 处 `/ae-index-rebuild` → `ae index-rebuild`
- `docs/framework.md` / `docs/scenarios/s0-bootstrap.md` 骨架与入口清单补 4 文件;`docs/spec-framework.md` 标注自身为设计稿、可执行子集随包
- 测试:`tests/init.test.js` + `tests/skeleton.test.js` 已补

**覆盖地图复核(二次验证)**:grep 真实 `ae init` 渲染产物,17 条规则 token 全部命中。覆盖地图**全部缺口已解决**,仅剩两项有意保留:

- `ae index-rebuild` 命令(独立 CLI 特性 → 见上「显式待办」,新建 issue 007)
- `archived → active` 禁止(用户表态暂不考虑)

## v0.3 当前行为

```text
ae setup            # 装 skills 到 .claude/skills/ + .codex/skills/(整目录递归)
ae init [goal]      # 建 skeleton + 渲染入口文件(幂等,不覆盖已存在文件)
```

`ae init` 现渲染的入口文件:`README.md`、`AGENTS.md`、`CLAUDE.md`、`handoff.md`、`spec/README.md`、`spec/INDEX.md`、**`spec/AGENTS.md`、`spec/CLAUDE.md`、`spec/ADR/AGENTS.md`、`spec/ADR/CLAUDE.md`**。

## 验证记录(2026-06-15:Orient 按需 + 框架图 + AGENTS 空白)

- `npm test`:**22 全绿**(改动 10/11/12 后复跑;含 `init.test.js` 两条断言反转)
- Orient 按需:`using-agentic-engineering/SKILL.md` Step 0 已改"only when needed",措辞含冷启动 / 拿不准两触发 + "Don't re-read every turn"
- 框架图:`README.md` §How It Works 与 `docs/framework.md` §三个场景 渲染对齐,路由器门 + S0/S1/S2 + 状态轨在场;`s1-main-loop.md` 详流图未动
- AGENTS 空白:`templates/entries/AGENTS.md` 现仅标题+目标;`grep` 确认全仓(除 `方案/issues/*` 历史)无"模板带 Project-Specific Rules / 路由器指针"的活描述;测试断言已反转为"无段无指针"
- ⚠️ **未验**:无指针后路由器靠 description 自动触发的真实可靠性——需真实 session 抽检(roadmap R-02 的启动条件)

### 上一轮(2026-06-14 二次验证)

- `npm test`:**22 全绿**(精简断言 + 路由器装载/指针断言)
- 真实 `ae setup && ae init`:`using-agentic-engineering` 路由器装到 `.claude` + `.codex`;根 `AGENTS.md` 含路由器一行指针;`spec/AGENTS.md` §总领 已收口为指针;`spec/README.md` 两条提示在场
- **节点→skill 表单源**:渲染产物里 `to-prd` 表行只在 router 命中(spec/AGENTS.md 0 命中)
- **试金石(治枷锁)**:4 条非 AE 请求对 router 逻辑自检——随手脚本 / 解释代码 / 更严 PR 规则 / 小改别走流程——全部"直接做、不被挡"(OUT 清单 + 优先级阶梯命中)
- `grep` 确认 skills 内无 `spec-framework.md` 悬空、无 `§frontmatter`/`§边界规则` 悬空;`§INDEX 推导规则` 引用保留
- npm 远端仍 `latest: 0.3.0`(本会话改动未发布)

## 关键文件入口

| 文件 | 内容 |
|------|------|
| `package.json` | 版本 `0.3.0`(未随本会话改动 bump) |
| `src/cli.js` | 顶层路由:仅 `setup` / `init`(`index-rebuild` 待加) |
| `src/commands/{setup,init}.js` | 两步 CLI |
| `src/skeleton.js` | `createDirectories` / `renderEntryFiles`;`ENTRY_FILES` 含 4 个新 spec 文件 |
| `templates/entries/` | 入口模板:根 4 文件 + `spec/{README,INDEX,AGENTS,CLAUDE}.md` + `spec/ADR/{AGENTS,CLAUDE}.md` |
| `skills/` | 14 个 skill;新增 `using-agentic-engineering` 路由器(顶层编排);节点 skill 现引用 `spec/AGENTS.md` |
| `docs/` | 方法论文档(framework / scenarios / spec-framework),全中文 |
| `方案/issues/` | issue 池 001–006;006 = spec 渐进式披露(下一个 007 = ae index-rebuild) |
| `tests/` | `node:test`,22 cases |

## 待处理

按优先级:

1. **【核心】打磨路由器细节**:`using-agentic-engineering/SKILL.md` + `templates/entries/AGENTS.md`(见顶部「显式待办」)——本会话落了 v1 骨架,下一步把场景表 / 措辞 / 指针排版调到真实可用
2. **新建 issue 007 实现 `ae index-rebuild`**——Issue 006 的 R1 兜底依赖
3. **发布**:把本会话全部改动(karpathy skill + AGENTS 重写 + docs 中文化 + Issue 006 + spec 精简 + 路由器)攒齐,bump 版本后 `npm publish`
4. **真实 session 抽检**:`spec/` 下自动加载 `spec/AGENTS.md`、写代码吊起 `karpathy-guidelines`、根 AGENTS.md 指针能把路由器带起来
5. **阶段 3 长尾**:`ae update` 升级路径、GitHub Actions CI、Windows 验证
6. **后续迭代项**已归入 `方案/roadmap.md`(R-01 大型项目结构升级、R-02 SessionStart hook,P3,择期启动)

## 下次起手建议

1. **先打磨路由器两文件细节**(`using-agentic-engineering/SKILL.md` + `templates/entries/AGENTS.md`)——本会话刚落 v1 骨架,这是下一步核心;边打磨边用 4 条试金石 + 真需求做真实 session 抽检,验证路由判定与触发
2. 顺带确认嵌套 AGENTS.md / `spec/AGENTS.md` 自动加载、`karpathy-guidelines` 吊起(渐进式披露成立)
3. 再新建 issue 007 实现 `ae index-rebuild`(补齐 Issue 006 唯一功能性缺口)
4. 以上稳定后,把本会话所有改动统一 bump + 发布
