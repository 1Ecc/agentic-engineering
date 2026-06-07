# Issue 004: `config/ae-rules.md` + AE:RULES 注入机制冗余,与模板渲染语义重叠

## 状态

- 状态:v0.3 已实施,待 npm 发布
- 优先级:P1
- 发现时间:2026-06-07
- 发现方式:用户在 `/Users/huguiyuan/workspace/npmtest` 真实跑通 v0.2 完整链路后回看设计

## 背景

v0.2 当前流程:

1. `ae setup`:把 `templates/ae-rules.md` 拷到用户项目的 `config/ae-rules.md`(初始模板)
2. 用户可选编辑 `config/ae-rules.md`
3. `ae init`:渲染 6 个入口模板 + 读 `config/ae-rules.md` → 同步进 `AGENTS.md` 与 `CLAUDE.md` 的 `<!-- AE:RULES:BEGIN -->...<!-- AE:RULES:END -->` block

实际真实链路输出(已验证):

```text
$ npx @ecc-hgy/ae@0.2.0 setup
AE setup complete
- Installed: 49 (.claude/skills/..., config/ae-rules.md, ...)

$ npx @ecc-hgy/ae@0.2.0 init
AE init complete
- Created: 17 (spec/, ..., AGENTS.md, CLAUDE.md, ...)
- Rules: synced
```

## 实际问题

`config/ae-rules.md` + AE:RULES block 这套机制和"模板渲染"在功能上**等价**,只是多了一层中转:

| 通过 ae-rules.md(当前) | 直接写进模板(简化) |
|--------------------------|------------------------|
| `ae setup` 装 `config/ae-rules.md` 模板 | 无 |
| 用户编辑 `config/ae-rules.md` | 用户在 `ae init` 后编辑 `AGENTS.md` |
| `ae init` 读 ae-rules.md 注入 AGENTS/CLAUDE 的 marker block | `ae init` 渲染时模板内已含规则段 |

两条路径最终产物**字节级相同**(用户编辑都进了 AGENTS.md),但当前路径多出:

- 一个中间文件(`config/ae-rules.md`)
- 一段 marker 协议(`<!-- AE:RULES:BEGIN -->` / `<!-- AE:RULES:END -->`)
- 一个 CLI 参数(`--rules <path>`)
- 一段同步逻辑(`src/skeleton.js` 的 `syncRulesBlock` 函数 + 单测)
- 一段流程(setup → 编辑中间文件 → init)

## 历史动机回顾

v0.1.0 设计这套机制时的真实初衷是:

1. **全局规则跨项目同步**:`~/.config/agentic-engineering/ae-rules.md` 是用户跨项目共享规则,`/ae-init` 时自动拉同一份,多项目一致
2. **可管理边界**:marker 框起来"哪段是工具管理的",升级时(原计划 `ae update`)只替换 block 内,用户自己加的项目特定段不动

但 v0.2 实际落地后:

- **全局同步逻辑没实现**:`~/.config/...` 探测被砍,只读 `<target>/config/ae-rules.md`
- **可管理边界没真正发挥作用**:用户每个项目都从模板初始化一份 `config/ae-rules.md`,跟"直接写进 AGENTS.md"功能上完全等价

结果是 v0.2 留下了一个**没有实际价值的中间层**。

## 期望

简化掉冗余机制,工作流变成:

```
ae setup           # 只装 skills(.claude/skills + .codex/skills)
ae init [goal]     # 建 skeleton + 渲染入口文件(模板内已含规则段)
$EDITOR AGENTS.md  # 用户在 AGENTS.md 中直接沉淀项目规则
```

收益:

- CLI 命令面更纯:`setup` 只装 skill,`init` 只建项目结构,职责清晰
- 用户认知模型简化:不再需要理解"为什么有个 config/ae-rules.md 跟 AGENTS.md 内容很像"
- 代码面减少:删除 `syncRulesBlock` + 相关测试 + `--rules` 参数 + `templates/ae-rules.md`
- 文档同步:README、framework.md、s0-bootstrap.md 都可以删除"编辑 ae-rules.md"这一步

## 损失评估

唯一会失去的能力:**未来"全局规则一键同步到多项目"**。

但:

- 这个能力在 v0.2 当前**并未实现**
- 实际价值存疑——不同项目的规则差异往往很大,全局规则容易沦为 cargo cult
- 如果未来真有需求,可以在 `ae update` 设计时引入更专门的机制(例如 `ae update --pull-global-rules`),不必现在用 marker block 占位

## 备选方案

### 方案 A:删除整套 rules 注入机制(推荐)

如 §期望 所述。AGENTS.md / CLAUDE.md 模板内直接含规则段占位,用户编辑入口文件。

优点:

- 最简单,认知负担最低
- 与 [Issue 005](005-claude-md-points-to-agents-md.md)(CLAUDE.md 指向 AGENTS.md)天然兼容

缺点:

- 永远放弃 v0.1.0 设想的"全局规则跨项目同步"语义(但实际从未实现)

### 方案 B:保留 AE:RULES marker,但延迟到 `ae update` 再激活

保留模板里的 marker block(空内容),不在 `ae init` 时做任何注入,等阶段 3 `ae update` 实现后再决定如何使用。

优点:

- 不放弃未来扩展空间

缺点:

- 模板里有未用的 marker,反而令人困惑
- 实际代码里还要保留检测逻辑,简化效果打折

### 方案 C:维持现状

不动 v0.2 设计。

优点:

- 无破坏性

缺点:

- 用户已经发现冗余,工具会继续给"为什么 AGENTS.md 跟 ae-rules.md 内容差不多"的疑惑

## 建议方向

方案 A,在 v0.3 一并落地(与 [Issue 005](005-claude-md-points-to-agents-md.md) 合并)。

理由:

- 简化收益大,损失小(损失的是一个从未真正实现的设计意图)
- 与 issue 005 强耦合(AGENTS.md 成为单一信息源是 issue 005 的前提)
- 是 breaking change,但用户基数小(目前只有用户自己),v0.3 一次性改完代价最低

## 与 Issue 005 的关系

发现 4 和发现 5 都源自同一次真实使用,可视为一个完整简化方向的两面:

- **Issue 004**:规则**怎么进 AGENTS.md** —— 不要中间文件,模板直接含
- **Issue 005**:规则**进了 AGENTS.md 后,CLAUDE.md 怎么办** —— 改为指针,避免 drift

两者必须在同一个 v0.3 版本中一起改,否则会出现"AGENTS.md 简化了但 CLAUDE.md 还在重复内容"或"CLAUDE.md 改成指针但 AGENTS.md 内容仍来自 ae-rules.md"的中间态。

## 详细方案(v0.3)

> 与 [Issue 005](005-claude-md-points-to-agents-md.md) 合并到同一个 v0.3 版本一次性落地。本 issue 主要负责"删除中间层 + 调整 AGENTS.md 模板",Issue 005 负责"调整 CLAUDE.md 模板"。

### v0.3 用户工作流

```text
$ npx @ecc-hgy/ae@0.3.0 setup
AE setup complete
- Installed: 48 (.claude/skills/..., .codex/skills/...)
- Skipped: 0 (none)
- Target: /path/to/project
- Next: run `ae init "<goal>"`.

$ npx @ecc-hgy/ae@0.3.0 init "我的项目目标"
AE init complete
- Created: N (spec/, ..., AGENTS.md, CLAUDE.md, ...)
- Skipped: 0 (none)
- Target: /path/to/project

$ $EDITOR AGENTS.md    # 用户在 AGENTS.md 直接沉淀项目规则,不再有中间文件
```

对照 v0.2:`Next: edit config/ae-rules.md ...` 这一步消失;`ae init` 报告中没有 `Rules: synced` 一行;`config/` 目录在用户项目中不再出现。

### 删除清单(v0.2 → v0.3)

**仓库内文件**:

- `templates/ae-rules.md` —— 整个文件删除

**用户项目内**(`ae setup` 不再创建):

- `config/ae-rules.md`
- `config/` 目录(项目里没有其他 `config/<file>` 时)

**源码**:

- `src/skeleton.js`:
  - `syncRulesBlock(targetFile, rulesContent, { dryRun })` 函数及其内部辅助
  - `RulesMarkerError` 自定义错误类
  - 导出列表移除 `syncRulesBlock`、`RulesMarkerError`
- `src/commands/init.js`:
  - `--rules <path>` 参数解析
  - 规则文件路径选择逻辑(--rules 优先、否则探测 `<target>/config/ae-rules.md`)
  - "校验 --rules 是文件不是目录"分支
  - `syncRulesBlock(AGENTS.md, ...)` 与 `syncRulesBlock(CLAUDE.md, ...)` 两次调用
  - 报告中 `Rules: synced | skipped | failed` 一行
  - 顶部 import 中 `syncRulesBlock` / `RulesMarkerError` 引用
- `src/commands/setup.js`:
  - 拷贝 `templates/ae-rules.md → <target>/config/ae-rules.md` 的逻辑
  - `<target>/config/` 目录创建(若无其他需求)
- `src/cli.js`:
  - 帮助文本中 `--rules` 段落与 `edit config/ae-rules.md` 提示
  - `Typical workflow` 三行精简为两行

**测试**:

- `tests/skeleton.test.js`:
  - 全部 `syncRulesBlock` 相关 case(0 marker / 1 对 / >1 异常 / dry-run / 替换内容 / 末尾换行归一化)
  - 同时移除对应的 import 与 fixture
- `tests/init.test.js`:
  - case 「自动从 config/ae-rules.md 同步」
  - case 「--rules 显式覆盖」
  - case 「--rules 路径不存在」
  - case 「--rules 是目录」
  - case 「config/ae-rules.md 缺失」
  - case 「marker 异常」
  - case 「替换已有 block」
- `tests/setup.test.js`:
  - 「冷启动」断言中关于 `config/ae-rules.md` 存在的 expect
  - 「用户已编辑 ae-rules.md」case 整个删除
- `tests/cli.test.js`:
  - 任何对 `--rules` 帮助文本的断言

### 新增测试(锁定不变量)

- `tests/setup.test.js` 新增 case 「不创建 `config/` 目录」:
  - setup 后 `<target>/config/` 不存在
- `tests/init.test.js` 新增 case 「不创建 `config/` 目录」:
  - init 后 `<target>/config/` 不存在
- `tests/init.test.js` 新增 case 「AGENTS.md 含规则占位段」:
  - init 后读 `<target>/AGENTS.md`,断言含 `## Project-Specific Rules` 标题
  - 断言 **不含** `<!-- AE:RULES:BEGIN -->` 或 `<!-- AE:RULES:END -->` 字串

### AGENTS.md 模板最终内容

`templates/entries/AGENTS.md`(全文):

```markdown
# {{PROJECT_NAME}}

> {{PROJECT_GOAL}}

## Project-Specific Rules

<!-- 在这里写本项目的稳定规则,例如:
     - 代码风格 / 注释语言
     - 提交规范
     - 协作偏好
     这些规则会被 Claude Code / Codex 在每次 session 自动加载。
     未来新规则直接追加到本段,不需要其他工具命令。 -->

## Stack

TODO: 简述项目技术栈与运行环境。

## Structure

TODO: 简述目录结构,标注关键入口。

## Operating Guidelines

TODO: 简述代码、测试、提交、PR 的操作规范。
```

**关键变更对照 v0.2**:

| v0.2 | v0.3 |
|------|------|
| 含 `<!-- AE:RULES:BEGIN --> ... <!-- AE:RULES:END -->` block,内容由工具同步 | 含 `## Project-Specific Rules` 占位段,用户手工编辑 |
| 工具会写入 / 替换 block 内容 | 工具只渲染初始模板,之后从不动入口文件 |
| 多文件 drift 可能(AGENTS.md / CLAUDE.md / config/ae-rules.md 三份) | 单一信息源(AGENTS.md 本身) |

### CLAUDE.md 模板

CLAUDE.md 模板由 [Issue 005](005-claude-md-points-to-agents-md.md) 负责,本 issue 不展开。两者必须一起落地。

### v0.2 → v0.3 用户升级路径

由于 `ae init` 幂等(不覆盖已存在文件),v0.2 用户升级到 v0.3 时:

- `AGENTS.md` / `CLAUDE.md` 已存在 → 不动,保留用户内容
- `config/ae-rules.md` 已存在 → 工具不再读它,但**也不删除**(避免破坏用户数据)
- 用户可以手动:
  - 把 `config/ae-rules.md` 内容追加到 `AGENTS.md` 的 `## Project-Specific Rules` 段
  - 删除 `config/ae-rules.md`(以及空 `config/` 目录)
  - 删除 AGENTS.md / CLAUDE.md 中的 `<!-- AE:RULES:BEGIN --> ... <!-- AE:RULES:END -->` block(因为工具不再同步)

CHANGELOG / README 提供清晰的迁移段(见阶段 D)。

### CLI 命令最终形态(v0.3)

```text
ae setup                # 装 .claude/skills + .codex/skills
ae init [goal]          # 建 skeleton + 渲染 6 入口模板

可选参数:
  --target <path>       目标目录(默认 cwd)
  --dry-run             不写文件,只输出会做什么
  -h, --help            帮助
  -v, --version         版本
```

`--rules <path>` 在 v0.3 完全移除。`config/` 不出现在用户项目。

### 版本号

`v0.3.0`,标记 breaking change(`ae init` 报告格式变化、`--rules` 参数移除、`config/ae-rules.md` 不再产生)。

## 实施 Todo(v0.3)

> 与 [Issue 005](005-claude-md-points-to-agents-md.md) 在同一个 git commit / 同一个版本中落地。下方按职责分阶段;阶段 A-C 强耦合,建议串行;阶段 D-F 可并行。

### 阶段 A:模板调整(纯文本)

- [ ] 编辑 `templates/entries/AGENTS.md`:
  - [ ] 删除原 `<!-- AE:RULES:BEGIN --> ... <!-- AE:RULES:END -->` block 段
  - [ ] 加入 `## Project-Specific Rules` 段(全文见上方"AGENTS.md 模板最终内容")
  - [ ] 保留 `# {{PROJECT_NAME}}` 与 `> {{PROJECT_GOAL}}` 占位符
  - [ ] 保留 `## Stack`、`## Structure`、`## Operating Guidelines`(若 v0.2 已有则不动)
- [ ] 编辑 `templates/entries/CLAUDE.md`:
  - [ ] 由 [Issue 005](005-claude-md-points-to-agents-md.md) 阶段 A 完成,本 issue 不展开
- [ ] 删除 `templates/ae-rules.md`(整个文件)
- [ ] 核对 `git status`:`templates/` 下应只有 `entries/` 子目录与其中的 6 个 `.md` 文件

### 阶段 B:源码删除

- [ ] `src/skeleton.js`:
  - [ ] 删除 `syncRulesBlock` 函数(从 `export function syncRulesBlock` 到对应右花括号)
  - [ ] 删除 `RulesMarkerError` 类(以及任何只为它服务的辅助)
  - [ ] 检查文件顶部 import:若 `node:fs/promises` 仅供 `syncRulesBlock` 使用,继续保留(其他函数也用);否则清理
  - [ ] 运行 `grep -n "syncRulesBlock\|RulesMarkerError" src/` 确认仓库内无其他引用
- [ ] `src/commands/init.js`:
  - [ ] import 列表中移除 `syncRulesBlock`、`RulesMarkerError`
  - [ ] 参数解析中删除 `--rules <path>` 分支
  - [ ] 主流程中删除 step 3(规则源选择)与 step 4(两次 `syncRulesBlock` 调用)
  - [ ] 报告对象中移除 `rules` 字段
  - [ ] 任何 `try/catch` 专门处理 `RulesMarkerError` 的也删除
- [ ] `src/commands/setup.js`:
  - [ ] 删除 "拷贝 `templates/ae-rules.md` → `<target>/config/ae-rules.md`" 那一步
  - [ ] 若 `mkdir <target>/config` 也是只为它存在,一并删除
  - [ ] 报告中 `Installed` 列表不再含 `config/ae-rules.md`
  - [ ] `Next:` 提示从 `edit config/ae-rules.md (optional), then run \`ae init "<goal>"\`.` 改为 `run \`ae init "<goal>"\`.`
- [ ] `src/cli.js`:
  - [ ] 帮助文本删除 `--rules <path>` 行
  - [ ] `Typical workflow` 段从三行精简为两行:
    ```
    Typical workflow:
      ae setup
      ae init "<one-line project goal>"
    ```
- [ ] `src/utils/report.js`(若存在 rules 相关):
  - [ ] `formatInitReport` 移除 `rules` 字段渲染
- [ ] 运行 `grep -rn "ae-rules\|--rules\|syncRulesBlock\|RulesMarkerError" src/` 确认全部清理

### 阶段 C:测试调整

- [ ] `tests/skeleton.test.js`:
  - [ ] 删除整个 `describe('syncRulesBlock')` 块(或对应的 `test('syncRulesBlock 0 marker')` 等独立 case)
  - [ ] 顶部 import 中清理 `syncRulesBlock`、`RulesMarkerError`
- [ ] `tests/init.test.js`:
  - [ ] 删除 case 「自动从 config/ae-rules.md 同步」
  - [ ] 删除 case 「--rules 显式覆盖」
  - [ ] 删除 case 「--rules 路径不存在」
  - [ ] 删除 case 「--rules 是目录」
  - [ ] 删除 case 「config/ae-rules.md 缺失」
  - [ ] 删除 case 「marker 异常」
  - [ ] 删除 case 「替换已有 block」(若有)
  - [ ] 保留 case 「未 setup 直接 init」「冷启动正常路径」「占位符替换」「幂等」「dry-run」
  - [ ] **新增** case 「不创建 config/ 目录」:init 后 `<target>/config/` 不存在
  - [ ] **新增** case 「AGENTS.md 含规则占位段」:init 后 `<target>/AGENTS.md` 含 `## Project-Specific Rules`、不含 `<!-- AE:RULES:` 字串
- [ ] `tests/setup.test.js`:
  - [ ] case 「冷启动」断言列表中删除 `config/ae-rules.md` 存在的 expect
  - [ ] 删除整个 case 「用户已编辑 ae-rules.md」
  - [ ] **新增** case 「不创建 config/ 目录」:setup 后 `<target>/config/` 不存在
  - [ ] 「幂等」case 内容不变,但断言中 `Installed` 数量需对应调整(少了 1 个文件)
- [ ] `tests/cli.test.js`:
  - [ ] 检查 `--help` 断言,确保不再期待 `--rules` 字串
- [ ] `npm test`:全部通过

### 阶段 D:文档同步

- [ ] `README.md`:
  - [ ] Quick Start 段从三行简化为两行:
    ```
    npx @ecc-hgy/ae setup
    npx @ecc-hgy/ae init "我的项目目标"
    ```
  - [ ] 删除 `# 可选:编辑 config/ae-rules.md` 那一行
  - [ ] 删除任何"规则同步 / `--rules`"提及
  - [ ] "规则维护"段(若有)改为:"项目规则写在 AGENTS.md 的 `## Project-Specific Rules` 段。CLAUDE.md 是 AGENTS.md 的指针,无需单独维护。"
- [ ] `docs/framework.md`:
  - [ ] S0 段流程图把"setup → 编辑 ae-rules.md → init"改为"setup → init → 编辑 AGENTS.md"
  - [ ] 删除"AE:RULES block"相关解释
- [ ] `docs/scenarios/s0-bootstrap.md`:同步上述
- [ ] `handoff.md`:
  - [ ] "v0.2 CLI 行为边界"段更新为 v0.3
  - [ ] "关键文件入口"表删除 `templates/ae-rules.md`、`src/skeleton.js`(改为标注"含 createDirectories / renderEntryFiles 两个函数")
  - [ ] 更新"开放问题 / 待处理"
- [ ] `CHANGELOG.md`:在 `0.2.0` 之上新增:
  ```
  ## 0.3.0 (breaking)

  ### Removed
  - `config/ae-rules.md` and the AE:RULES sync mechanism. Project-specific
    rules now live directly in `AGENTS.md` under `## Project-Specific Rules`.
  - `--rules <path>` CLI flag.
  - `templates/ae-rules.md`.
  - `Rules: synced | skipped | failed` line from `ae init` report.

  ### Changed
  - `ae setup` no longer creates `config/` in user projects.
  - `AGENTS.md` template now includes a `## Project-Specific Rules` section.
  - `CLAUDE.md` template is now a pointer to `AGENTS.md` (see Issue 005).
    AGENTS.md is the single source of truth.

  ### Upgrade notes (v0.2 → v0.3)
  - `ae init` is idempotent: existing AGENTS.md / CLAUDE.md are not touched.
  - To benefit from v0.3 single-source-of-truth: manually copy your
    `config/ae-rules.md` contents into `AGENTS.md` `## Project-Specific Rules`,
    then optionally delete `config/ae-rules.md`.
  - The `<!-- AE:RULES:BEGIN/END -->` markers in your AGENTS.md / CLAUDE.md
    are no longer managed; you can keep them or remove them, the tool ignores
    them now.
  ```

### 阶段 E:本地验证

- [ ] `npm test` 通过
- [ ] `node bin/ae.js --help` 输出不含 `--rules`、不含 `ae-rules.md`
- [ ] `node bin/ae.js init --help`(若实现了子命令帮助)同上
- [ ] `npm pack --dry-run` 文件清单:
  - [ ] 含 `templates/entries/`(6 个 `.md`)
  - [ ] **不含** `templates/ae-rules.md`
  - [ ] 总文件数比 v0.2(42)少 1
- [ ] `npm pack` 真打包,记录 tarball 大小(预期比 v0.2 略小,差值约几百字节)
- [ ] 在 `/Users/huguiyuan/workspace/npmtest`(或新空目录):
  - [ ] `rm -rf .claude/ .codex/ spec/ config/ AGENTS.md CLAUDE.md handoff.md README.md`
  - [ ] `npx --package <new-tarball> ae setup`
  - [ ] 断言 `.claude/skills/`、`.codex/skills/` 存在
  - [ ] 断言 `config/` 目录**不存在**(用 `[ ! -d config ]`)
  - [ ] 断言 setup 输出不含 `ae-rules.md` 字串
  - [ ] `npx --package <new-tarball> ae init "v0.3 验证"`
  - [ ] 断言 6 个入口文件齐
  - [ ] 断言 `AGENTS.md` 含 `## Project-Specific Rules` 标题
  - [ ] 断言 `AGENTS.md` **不含** `<!-- AE:RULES:` 字串
  - [ ] 断言 `init` 输出**不含** `Rules:` 字串
  - [ ] 编辑 `AGENTS.md` 添加几行项目规则
  - [ ] 二次 `ae init` 幂等,`AGENTS.md` 字节不变
- [ ] Issue 005 阶段 E 的 CLAUDE.md 验证同期完成

### 阶段 F:发布

- [ ] `package.json` version 由 `0.2.0` → `0.3.0`
- [ ] `git add` 上述全部改动
- [ ] 提交,信息:
  ```
  feat!: drop rules injection; single source of truth in AGENTS.md (v0.3)

  - Remove templates/ae-rules.md and config/ae-rules.md from setup.
  - Remove syncRulesBlock and --rules flag; rules now live directly in
    AGENTS.md under ## Project-Specific Rules.
  - Together with Issue 005, CLAUDE.md becomes a pointer to AGENTS.md.
  - Resolves Issues 004, 005.
  ```
- [ ] `git tag -a v0.3.0 -m "Drop rules injection; AGENTS.md as single source of truth"`
- [ ] `npm publish --access public`(用户操作)
- [ ] 发布后:
  - [ ] `npx --yes @ecc-hgy/ae@0.3.0 --version` 输出 `0.3.0`
  - [ ] 在干净目录跑完整链路再验一次

## 验收标准

- `ae setup` 不再创建 `config/ae-rules.md`,也不创建 `config/` 目录
- `ae init` 不再读 `config/ae-rules.md`,不再支持 `--rules` 参数
- AGENTS.md 模板内已含 `## Project-Specific Rules` 占位段,用户直接编辑
- 测试覆盖"`config/` 不被创建"与"AGENTS.md 含规则段"两个不变量
- v0.2 用户升级时,旧的 `config/ae-rules.md`、`<!-- AE:RULES:BEGIN/END -->` 不会被破坏,工具不再读它们
- 文档中所有"编辑 ae-rules.md"、"`--rules` 参数"步骤被移除
- CHANGELOG 提供清晰的 v0.2 → v0.3 升级注记
