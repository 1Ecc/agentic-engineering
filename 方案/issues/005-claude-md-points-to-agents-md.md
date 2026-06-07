# Issue 005: AGENTS.md / CLAUDE.md 内容重复,长期会 drift;CLAUDE.md 应改为指针

## 状态

- 状态:v0.3 已实施,待 npm 发布
- 优先级:P1
- 发现时间:2026-06-07
- 发现方式:用户在真实跑通 v0.2 链路后预判长期维护问题

## 背景

v0.2 当前 `ae init` 渲染入口模板时:

- `AGENTS.md` 和 `CLAUDE.md` 从**同一份占位符模板**渲染
- 渲染后的初始内容**完全相同**(基于同一组 `{{PROJECT_NAME}}` `{{PROJECT_GOAL}}`)
- AE:RULES block 也对**两份文件分别同步**一份相同内容

```
templates/entries/AGENTS.md  →  渲染 →  <target>/AGENTS.md  (含 AE:RULES block)
templates/entries/CLAUDE.md  →  渲染 →  <target>/CLAUDE.md  (含 AE:RULES block,内容同上)
```

## 实际问题

**长期 drift 风险**:用户在项目演进中通常只主动维护一份入口文件(经验上是 `AGENTS.md`,因为 Codex / 多 agent 工具都认它),另一份会逐渐落后。

具体表现:

- 用户加了新项目规则 → 编辑 `AGENTS.md`
- 没记得同步 `CLAUDE.md` → Claude Code 拿到的是旧规则
- 一段时间后两份文件内容**显著不一致**,Claude 与 Codex 行为出现差异
- 调试这种"行为不一致"非常困难,因为根因是 prompt drift 而不是代码 bug

**根本原因**:`AGENTS.md` 与 `CLAUDE.md` 是两份独立可编辑的文件,工具(`ae init` 之后)不再管它们的同步,完全依赖用户自律。

## 期望

`AGENTS.md` 是**单一信息源**(Codex 默认读它,多 agent 工具都认它)。`CLAUDE.md` 改为**极简指针**——3 行,无扩展段:

```markdown
# {{PROJECT_NAME}}

**Always read [AGENTS.md](./AGENTS.md) at the start of every session before doing any work.**

This project's instructions, rules, structure, and operating guidelines are all defined in `AGENTS.md`.
```

这样:

- 用户**只维护** `AGENTS.md` 一份
- Claude Code 加载 `CLAUDE.md` 时被强指令引向 `AGENTS.md`
- CLAUDE.md 极简:仅 3 行有效内容,不留扩展段,降低用户在 CLAUDE.md 加内容导致 drift 的可能

## 决策定锚(2026-06-07 用户拍板)

三个相关决策已锁定,不再开放讨论:

1. **采用缓解策略**:用**强指令** "Always read AGENTS.md at the start of every session" 降低 Claude Code 跳过 AGENTS.md 的概率,不依赖未来 Claude Code 行为变化
2. **极简方案**:CLAUDE.md 只有 3 行(标题 + 强指令 + 一句说明),**不**保留 `## Claude-Specific Overrides` 或其他扩展段
3. **CLAUDE.md 不删除**:仍生成 CLAUDE.md 文件,否则 Claude Code 无 system prompt 可用,体验退化

### 为什么不留扩展段

之前折中方案在 CLAUDE.md 里留了 `## Claude-Specific Overrides` 给"未来可能的 Claude 专属指令"。但用户判断:

- 这个扩展段实际几乎不会用到(项目级规则统统应该在 AGENTS.md,因为 Codex 也要遵守)
- 留着等于鼓励用户写 Claude 特有内容,反向引入 drift
- 极简到 3 行才能形成"CLAUDE.md 就是指针,不要在这里写东西"的强约束

### 缓解策略的验证不阻断 v0.3 落地

原方案要求"先手动验证 Claude Code 会展开读 AGENTS.md,通过后再落代码"。决策修正:**验证作为发布后的人工抽检项**,不阻断 v0.3 代码落地。

理由:
- 强指令模式是 LLM 经验上最稳的写法,不读的概率极低
- 即便 Claude 偶尔跳过,损失是单次 session 行为有偏,不是数据损坏
- 把"必须验证才能 commit"改为"发布后 1-2 个 session 抽检",降低 v0.3 的执行成本

## 路径形式

用户问:"给个相对路径?给个超链接?"

| 形式 | 写法 | 评估 |
|------|------|------|
| 纯相对路径文本 | `AGENTS.md` | 极简,但 LLM 可能不识别为"要读取的文件" |
| markdown 链接 | `[AGENTS.md](./AGENTS.md)` | 标准 markdown,LLM 明确识别为引用 ✅ |
| Claude Code 特殊语法 | `@AGENTS.md` | 部分版本支持自动展开,但**未验证当前 Claude Code 是否支持** |
| 完整路径 | `/Users/.../AGENTS.md` | 反模式,跨机器不可移植 ❌ |

**已选**:markdown 链接 `[AGENTS.md](./AGENTS.md)`。通用、清晰、跨工具兼容。如未来验证 Claude Code 支持 `@AGENTS.md` 且更稳,可在 v0.3.x 平滑切换(零破坏)。

## 备选方案(已淘汰,留存供参考)

### 方案 A 极简版(已选 ✅)

CLAUDE.md = 3 行强指针,无扩展段。

### 方案 A 折中版(放弃)

CLAUDE.md = 强指针 + `## Claude-Specific Overrides` 扩展段。被极简版替换。

### 方案 B 工具层同步检测(放弃)

`ae lint` 检测 drift。治标不治本,工具复杂度上升,放弃。

### 方案 C 维持现状(放弃)

不动 v0.2。长期 drift 必然,放弃。

### 方案 D 删除 CLAUDE.md(放弃)

用户明确决策:**CLAUDE.md 不删除**。Claude Code 默认读它,不读 AGENTS.md,删了等于 Claude Code 没 system prompt,体验退化。

## 与 Issue 004 的关系

发现 4 和发现 5 是同一次真实使用观察的两面:

- **Issue 004**:规则**怎么进 AGENTS.md** —— 不要中间文件,模板直接含
- **Issue 005**:规则**进了 AGENTS.md 后,CLAUDE.md 怎么办** —— 改为极简指针,避免 drift

必须在同一 v0.3 版本一起改:

- 若只改 004 不改 005:AGENTS.md 简化了,但 CLAUDE.md 还是独立内容,drift 问题仍在
- 若只改 005 不改 004:CLAUDE.md 改成指针,但工具还在往两份文件同步注入,指针被覆盖

## 详细方案(v0.3)

> 与 [Issue 004](004-rules-injection-is-redundant.md) 合并到同一个 v0.3 版本一次性落地。本 issue 主要负责"CLAUDE.md 模板改为极简指针"。

### `templates/entries/CLAUDE.md` 最终内容

全文(3 行有效内容 + 必要换行):

```markdown
# {{PROJECT_NAME}}

**Always read [AGENTS.md](./AGENTS.md) at the start of every session before doing any work.**

This project's instructions, rules, structure, and operating guidelines are all defined in `AGENTS.md`.
```

**逐行说明**(给后续维护者):

| 行 | 内容 | 作用 |
|----|------|------|
| 1 | `# {{PROJECT_NAME}}` | 标题,占位符在渲染时被项目目录 basename 替换 |
| 2 | 空 | markdown 标题与正文之间的必要空行 |
| 3 | `**Always read ...**` | 加粗强指令,放在最显眼位置 |
| 4 | 空 | 段间空行 |
| 5 | `This project's instructions ...` | 提示"不读会丢什么",让 Claude 明白成本 |

**结构约束**(任何修改必须满足):

- 总行数 ≤ 6(含末尾换行)
- 必须含字串 `AGENTS.md`(锁定指针目标)
- 必须含字串 `Always read`(锁定强指令)
- **不得**含 `## ` 二级标题(防止扩展段回归)
- 必须含 `{{PROJECT_NAME}}` 占位符

测试用这五条做断言(见阶段 C)。

### `templates/entries/AGENTS.md` 调整

由 [Issue 004](004-rules-injection-is-redundant.md) 阶段 A 完成。AGENTS.md 内嵌 `## Project-Specific Rules` 占位段,作为单一信息源。

### v0.2 → v0.3 用户升级路径

由于 `ae init` 幂等(不覆盖已存在文件):

- 用户 `CLAUDE.md` 已存在 → 工具**不动**它,保留用户内容
- 用户想享受 DRY 收益 → **手动**简化自己的 CLAUDE.md 为指针形式
- 用户 `AGENTS.md` 已存在 → 同样不动;用户可手动迁移规则到 `## Project-Specific Rules` 段

CHANGELOG 与 README 提供清晰的迁移示例(见阶段 D)。

### 工具行为不变

本 issue **不引入** CLI 子命令、**不改** 参数、**不改** init 流程的 step 排序。纯模板内容调整。`renderEntryFiles` 仍然按 v0.2 方式工作:目标存在 → skipped,不存在 → 渲染占位符 + 写入。

### 渲染期望

`ae init` 后,用户项目根目录:

```text
AGENTS.md          # 含 `## Project-Specific Rules` 占位段(Issue 004)
CLAUDE.md          # 极简指针(本 issue)
README.md          # 不变
handoff.md         # 不变
spec/README.md     # 不变
spec/INDEX.md      # 不变
```

CLAUDE.md 与 AGENTS.md **字节级不同**,这一点被测试覆盖。

## 实施 Todo(v0.3)

> 与 [Issue 004](004-rules-injection-is-redundant.md) 在同一 git commit / 同一版本中落地。Issue 004 改 AGENTS.md 模板、CLI 代码、删除 ae-rules.md;本 issue 只改 CLAUDE.md 模板与对应测试 / 文档。

### 阶段 A:模板修改

- [ ] 用上方"templates/entries/CLAUDE.md 最终内容"全部替换原 `templates/entries/CLAUDE.md`
- [ ] 核对最终文件:
  - [ ] 总行数 ≤ 6
  - [ ] 含 `# {{PROJECT_NAME}}`
  - [ ] 含 `[AGENTS.md](./AGENTS.md)`
  - [ ] 含 `Always read`
  - [ ] **不含** `## `(无任何二级标题)
- [ ] `git diff templates/entries/CLAUDE.md` 人工抽检:旧的项目描述、Setup、Usage 段全删

### 阶段 B:无需 Claude Code 行为验证作为前置

> 决策已定:验证作为发布后人工抽检,不阻断 commit。本阶段保留作为发布后检查表的指引,不作为 commit 前必须项。

发布后人工抽检步骤(放进 GitHub release notes 或 issue 收口报告):

- [ ] 在一个真实项目跑完 `ae init`
- [ ] 用 Claude Code 开启新 session,问 "What rules apply to this project?"
- [ ] 观察 Claude 是否:
  - [ ] 引用了 `AGENTS.md` 中 `## Project-Specific Rules` 段的内容
  - [ ] 或主动用工具读取了 `AGENTS.md`
- [ ] 在 Codex 中重复,确认 Codex 行为不变(它本来就读 AGENTS.md)
- [ ] 若 Claude **没有**读 AGENTS.md:
  - [ ] 收集 session 文本,作为 issue 反馈
  - [ ] v0.3.x 升级指针文本:加粗+大写 / 多句强调 / 尝试 `@AGENTS.md` 语法

### 阶段 C:测试

- [ ] `tests/init.test.js` 新增 case 「CLAUDE.md 是极简指针」:
  - [ ] init 后读 `<target>/CLAUDE.md`,断言:
    - [ ] 总行数 ≤ 6
    - [ ] 含 `# <basename>`(`{{PROJECT_NAME}}` 已替换)
    - [ ] 含 `[AGENTS.md](./AGENTS.md)`
    - [ ] 含 `Always read`
    - [ ] **不含** 任何以 `## ` 开头的行
    - [ ] **不含** 项目规则正文(可断言:不含 `## Project-Specific Rules`、`Stack`、`Structure` 等 AGENTS.md 才有的段标题)
- [ ] `tests/init.test.js` 已有的「占位符替换」case 扩展:
  - [ ] 加断言 `<target>/CLAUDE.md` 含 `# <basename>`(原案可能只断言了 AGENTS.md)
- [ ] `tests/init.test.js` 新增 case 「CLAUDE.md 与 AGENTS.md 内容不同」:
  - [ ] 断言两份文件的字节大小不相等
  - [ ] 断言 `CLAUDE.md` 大小 < `AGENTS.md` 大小(指针应该更短)
- [ ] 「冷启动正常路径」case 中关于"CLAUDE.md 含完整项目规则"的旧断言(若有)删除
- [ ] 「幂等」case 不变,但额外抽检 CLAUDE.md 在二次 init 时字节不变
- [ ] `npm test` 全部通过

### 阶段 D:文档同步

- [ ] `README.md` 加"单一信息源"段:
  ```markdown
  ## Single source of truth

  - `AGENTS.md` is the canonical project instructions file. Both Codex and
    Claude Code see identical rules through it.
  - `CLAUDE.md` is a 3-line pointer to `AGENTS.md`. Don't edit it.
  - All project-specific rules live in `AGENTS.md` under
    `## Project-Specific Rules`.
  ```
- [ ] `docs/framework.md`:
  - [ ] S0 段加一句:"CLAUDE.md 是 AGENTS.md 的指针,用户只维护 AGENTS.md。"
  - [ ] 删除任何关于"CLAUDE.md 与 AGENTS.md 分别承载不同内容"的描述(若有)
- [ ] `docs/scenarios/s0-bootstrap.md`:同步上述
- [ ] `handoff.md`:
  - [ ] 同步 v0.3 进展
  - [ ] "关键文件入口"表中 CLAUDE.md 一行注明"指针,指向 AGENTS.md"
- [ ] `CHANGELOG.md`:`0.3.0` 段(Issue 004 已起草)追加 CLAUDE.md 相关内容:
  ```
  ### Changed (Issue 005)
  - `CLAUDE.md` template is now a 3-line pointer to `AGENTS.md`.
    AGENTS.md is the single source of truth; do not edit CLAUDE.md.
  - Existing CLAUDE.md in user projects are NOT migrated automatically.
    To benefit from the DRY pattern: manually replace CLAUDE.md contents
    with a pointer to AGENTS.md.
  ```

### 阶段 E:本地验证

> 与 Issue 004 阶段 E 共享真实项目验证步骤;本 issue 关心的指标列在此。

- [ ] `npm test` 通过(本 issue 新增的 3 个 case 全过)
- [ ] `npm pack --dry-run` 文件清单含 `templates/entries/CLAUDE.md`
- [ ] 在 `/Users/huguiyuan/workspace/npmtest`(或新空目录)清空旧产物后:
  - [ ] `npx --package <new-tarball> ae setup`
  - [ ] `npx --package <new-tarball> ae init "v0.3 验证"`
  - [ ] 抽检 `<target>/CLAUDE.md`:
    - [ ] 总行数 ≤ 6
    - [ ] 内容含强指令 `Always read [AGENTS.md](./AGENTS.md)`
    - [ ] 内容**不含** `## Project-Specific Rules`、`## Stack` 等 AGENTS.md 才有的段标题
  - [ ] 抽检 `<target>/AGENTS.md` 与 `<target>/CLAUDE.md` 是不同的文件(`cmp` 或 `diff` 报差异)
  - [ ] 二次 `ae init` 幂等,两份文件均不变
- [ ] (可选)即时做一轮发布后人工抽检(阶段 B):用 Claude Code 跑一个 session,观察是否读 AGENTS.md

### 阶段 F:发布

> 与 Issue 004 阶段 F 同一次操作。

- [ ] 提交信息由 Issue 004 起草,本 issue 不单独发版

## 验收标准

- `ae init` 渲染的 CLAUDE.md 是极简指针形式,**总行数 ≤ 6**,内容主体指向 AGENTS.md
- AGENTS.md 是单一可编辑的项目规则源
- CLAUDE.md 与 AGENTS.md 渲染后字节级不同(测试覆盖)
- Claude Code 在新 session 中能够通过 CLAUDE.md 的指引主动加载 AGENTS.md 的规则(发布后人工抽检)
- Codex 行为不变(它一直读 AGENTS.md)
- 用户长期编辑只需要维护 AGENTS.md 一份,不会出现 CLAUDE.md / AGENTS.md drift
- CLAUDE.md 模板不含 `## ` 二级标题,杜绝扩展段回归
