# Issue 003: `/ae-ingest-mother` 语义与真实期望不一致

## 状态

- 状态:v0.2 本地解决,待 npm 发布
- 优先级:P0
- 发现时间:2026-06-07
- 发现方式:用户在新项目中尝试执行 `/ae-ingest-mother <config/ae-rules.md.example>.`

## 背景

当前 `/ae-ingest-mother` 的设计语义是:

```text
从一个母项目目录中读取 AGENTS.md / CLAUDE.md / handoff.md 等高信号文件,
抽取稳定项目规则,
再提议写入当前项目的 AGENTS.md。
```

也就是说,它需要一个"母项目根目录"作为参数:

```text
/ae-ingest-mother /absolute/path/to/mother-project
```

真实使用时,用户期望的语义不同:

```text
从某个配置文件中读取已沉淀的规则,
例如 config/ae-rules.md.example,
然后写入当前项目的 AGENTS.md 或 CLAUDE.md。
```

这是"规则文件注入 / 同步"语义,不是"母项目抽取"语义。

## 复现

在新项目中执行:

```text
/ae-ingest-mother
```

得到:

```text
Error: Mother project path is empty. Re-run as /ae-ingest-mother <absolute-path-to-mother-project>.
```

再执行:

```text
/ae-ingest-mother <config/ae-rules.md.example>.
```

得到:

```text
Error: Mother project path <config/ae-rules.md.example>. looks like an unfilled placeholder, not a real path.
```

从当前 contract 看,这个报错行为是正确的;但从用户真实意图看,命令设计不对。

## 实际问题

当前命令名 `ingest-mother` 与用户实际想完成的动作之间存在偏差。

用户想做的是:

1. 选择一份规则文件。
2. 把规则文件内容沉淀进当前项目入口文件。
3. 目标文件可能是:
   - `AGENTS.md`
   - `CLAUDE.md`
   - 或两者都同步

当前命令做的是:

1. 选择一个母项目目录。
2. 读取母项目的入口文件。
3. 让 agent 总结 / 分类 / 提议规则。
4. 再经用户确认写入。

这两个动作都可能有价值,但不应混在同一个命令里。

## 需要澄清的概念

### 规则文件同步

输入是文件:

```text
config/ae-rules.md.example
~/.config/agentic-engineering/ae-rules.md
/some/path/rules.md
```

输出是当前项目入口文件里的规则块:

```markdown
<!-- AE:RULES:BEGIN -->
...
<!-- AE:RULES:END -->
```

这是确定性文件操作,适合 CLI 实现。

### 母项目抽取

输入是目录:

```text
/Users/huguiyuan/workspace/some-old-project
```

输出是候选规则 / ADR / skill 候选建议。

这是需要 agent 判断的分析任务,适合保留为交互式能力,但不适合作为用户第一次接触的核心初始化路径。

## 建议重新拆分命令

### 命令 1:规则同步

建议 CLI 命令:

```bash
ae rules sync --from config/ae-rules.md.example --to both
```

或更轻:

```bash
ae init --rules config/ae-rules.md.example
```

职责:

- 读取指定规则文件。
- 写入或替换 `AGENTS.md` / `CLAUDE.md` 中的 `AE:RULES` block。
- 检查 marker 数量,异常时停止。
- 不让 agent 自由总结规则,只做确定性同步。

可选参数:

```bash
--from <path>
--to agents|claude|both
--dry-run
```

### 命令 2:母项目分析

保留但改名更明确:

```bash
ae mother inspect <mother-project-path>
```

或 agent 内命令:

```text
/ae-mother-inspect /absolute/path/to/mother-project
```

职责:

- 读取母项目高信号文件。
- 提炼候选规则。
- 分类为:
  - project-specific rule
  - global rule
  - ADR
  - S2 skill candidate
- 只提出建议,写入前必须确认。

## 与 Issue 001 的关系

如果 `ae init` 改为平台无关 CLI 初始化,规则同步应并入 CLI 初始化流程:

```bash
ae init "项目目标" --rules config/ae-rules.md.example
```

或默认读取:

```text
~/.config/agentic-engineering/ae-rules.md
```

这样初始化时即可完成:

- skeleton 创建
- 入口文件渲染
- 规则注入
- 平台资产安装

## 详细方案

本 issue 经 grill-me 重新对齐后,**用户期望大幅简化**——本来要拆"规则同步 + 母项目分析"两个命令,现在只剩"规则同步"。由 [Issue 001](001-platform-agnostic-cli-init.md) 的 v0.2 主方案统一吸收。

### 用户期望澄清

经过对齐确认:用户对 `/ae-ingest-mother` 的真实期望就是**"从某个规则文件读取,写入当前项目 AGENTS.md / CLAUDE.md 的指定区域"**,即 "规则文件同步"。**不存在**真正需要 AI 判断的"母项目分析"场景。

因此:
- 不需要保留 "母项目分析" 命令(原方案的 `ae inspect-mother`)
- 不需要拆 `ae sync-rules` 独立子命令(直接并入 `ae init` 即可)
- 未来如真出现"需要 LLM 分析项目并提议规则"的场景,通过 **skill** 实现,不再增加 CLI 子命令

### v0.2 处理方式

1. **规则同步并入 `ae init` 流程**
   - `ae setup` 装 `templates/ae-rules.md` 到用户项目的 `config/ae-rules.md`(初始模板)
   - 用户可在 `setup` 之后、`init` 之前编辑 `config/ae-rules.md`
   - `ae init` 自动读 `config/ae-rules.md` → 写入 `AGENTS.md` / `CLAUDE.md` 的 `<!-- AE:RULES:BEGIN --> ... <!-- AE:RULES:END -->` block
   - `--rules <path>` 显式覆盖默认路径(必须是文件,传目录立即报错)

2. **彻底删除 `ae ingest-mother` 子命令与所有相关资产**
   - `commands/ae-ingest-mother.md` 删除(随 commands/ 整目录消失)
   - `src/commands/ingest-mother.js` 删除
   - `tests/ingest-mother.test.js` 删除
   - `src/cli.js` 移除路由

3. **不引入 `ae sync-rules` 独立命令**
   - 原方案曾考虑独立 `ae sync-rules` 命令,本期取消
   - 理由:`ae init` 已经覆盖"装完资产 + 改 rules + 一次性同步"场景;真正"已经初始化好的项目,后续单独再同步一次新规则"是低频需求,通过 `ae update`(阶段 3 推迟)解决
   - 简化收益:CLI 命令面更小,只有 setup / init 两个,认知负担最低

### `config/ae-rules.md` 格式

v0.2 用纯 markdown(无 frontmatter)。理由:目标格式就是 markdown(注入到 AGENTS/CLAUDE 的 block 内),源用 markdown 最自然。

模板初始内容见 [Issue 001](001-platform-agnostic-cli-init.md) §`config/ae-rules.md` 格式段。

### CLI 命令树最终形态(v0.2.0)

```
ae setup                         # 装 skills + config/ae-rules.md(模板)
ae init [goal] [--rules <path>]  # 建 skeleton + 入口 + AE:RULES block 同步(读 config/ae-rules.md 或 --rules)
```

**对比原计划**:

| 原 v0.2 设计 | 实际 v0.2 |
|--------------|-----------|
| `ae init [goal] [--rules <path>]` | ✅ 保留 |
| `ae sync-rules --from <path>`(独立) | ❌ 取消,需求并入 `ae init` |
| `ae inspect-mother <path>`(改名版) | ❌ 取消,命令本身删除 |

### 与 Issue 001 / 002 的关系

- 规则同步实现 = Issue 001 阶段 A(`syncRulesBlock`)+ 阶段 D(`ae init` 主流程 step 3-4)
- 命令删除 = Issue 001 阶段 B + E
- 不需要独立排期,所有动作在 001 主线中完成

## 实施 Todo

> 本 issue 不引入独立的代码改动,所有动作在 [Issue 001](001-platform-agnostic-cli-init.md) 阶段 A-F 中执行。本 todo 是行为变更对照表 + 验证清单。

## v0.2 实施结果

- 已删除 `ae ingest-mother` 子命令、旧 slash command contract 与相关测试。
- 规则文件同步已并入 `ae init`:默认读取 `<target>/config/ae-rules.md`,也支持 `--rules <path>` 显式覆盖。
- `syncRulesBlock` 已实现 marker 校验、追加、替换、dry-run 和异常保护。
- 自动测试覆盖默认 rules、显式 `--rules`、缺失文件、目录误传、marker 异常、幂等。
- `/Users/huguiyuan/workspace/newtest` 真实 tarball 验证已覆盖默认规则注入、二次 init 幂等、显式 `--rules` 覆盖和目录参数报错。

### A. v0.2 行为变更(由 Issue 001 主流程完成,此处仅对照)

- [ ] `src/commands/ingest-mother.js` 删除(Issue 001 阶段 B)
- [ ] `tests/ingest-mother.test.js` 删除(Issue 001 阶段 B)
- [ ] `commands/ae-ingest-mother.md` 删除(`commands/` 整目录删,Issue 001 阶段 B)
- [ ] `src/cli.js` 移除 `ingest-mother` 路由(Issue 001 阶段 E)
- [ ] `ae setup` 装 `templates/ae-rules.md` → `config/ae-rules.md`(Issue 001 阶段 B + C)
- [ ] `ae init` 主流程读 `config/ae-rules.md` 并调用 `syncRulesBlock`(Issue 001 阶段 D)
- [ ] `ae init --rules <path>` 显式覆盖,文件预检:传目录 → exit 1 + "expected a file, got directory"(Issue 001 阶段 D)

### B. 规则同步测试断言(在 Issue 001 阶段 F `tests/init.test.js` 中覆盖)

以下 case 已列入 Issue 001 阶段 F,此处作为本 issue 独立验证清单:

- [ ] 「自动从 config/ae-rules.md 同步」:setup 后 init 不传 `--rules`,断言 AGENTS / CLAUDE 含 AE:RULES block,内容 = `config/ae-rules.md`
- [ ] 「--rules 显式覆盖」:传入另一份 rules 文件,断言 AGENTS / CLAUDE 含该文件内容,**不读** `config/ae-rules.md`
- [ ] 「--rules 路径不存在」:exit 1 + 错误含路径
- [ ] 「--rules 是目录」:exit 1 + "expected a file, got directory"
- [ ] 「config/ae-rules.md 缺失」:Rules 行报告 `skipped`
- [ ] 「marker 异常」:预置 2 组 marker → exit 1,文件不变
- [ ] 「幂等」:二次 init 内容不变
- [ ] 「替换已有 block」:预置含旧 block 的 AGENTS.md,init 后 block 内部内容被替换,其余字节不变

### C. 文档同步(在 Issue 001 阶段 G 一并完成)

- [ ] README 不再列 `ae ingest-mother` / `ae sync-rules`(它们都不存在)
- [ ] CHANGELOG `0.2.0` 已包含 "Removed: ae ingest-mother; rule sync moved into ae init"
- [ ] `docs/framework.md` S0 段反映新流程:`ae setup` → 编辑 `config/ae-rules.md` → `ae init`
- [ ] `docs/scenarios/s0-bootstrap.md` 更新规则同步路径

### D. 真实环境验证

- [ ] 在新空目录:
  - [ ] `ae setup` 后,`config/ae-rules.md` 存在且可编辑
  - [ ] 编辑 `config/ae-rules.md` 加几行项目规则
  - [ ] `ae init "测试"` 后,`AGENTS.md` 与 `CLAUDE.md` 的 `<!-- AE:RULES:BEGIN --> ... <!-- AE:RULES:END -->` block 含用户编辑后的内容
  - [ ] 二次 `ae init` 幂等,block 内容不变
- [ ] 验证 `ae init --rules <some-other-file.md>` 覆盖 `config/ae-rules.md`,AGENTS / CLAUDE 含 `<some-other-file.md>` 内容
- [ ] 验证 `ae init --rules <some-dir>` 立即报错

### E. issue 状态收口

- [ ] v0.2 发布后,本 issue 状态从"待重设计"改为"已解决",注明 "Resolved by v0.2.0: rule sync integrated into `ae init`; mother analysis dropped as it was not the real user need"

## 验收标准

- 用户可以把 `config/ae-rules.md.example` 或任意真实规则文件同步进当前项目。
- 文件路径参数支持相对路径和绝对路径。
- 如果传入目录,规则同步命令明确报错:"expected a file, got directory"。
- 如果执行母项目分析,命令名必须明确表达"mother project"或"inspect",避免用户误以为它能同步规则文件。
- `AGENTS.md` 和 `CLAUDE.md` 的规则块写入行为幂等。
- marker 异常时停止,不破坏用户文件。
