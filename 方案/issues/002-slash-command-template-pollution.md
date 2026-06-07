# Issue 002: 模板文件被 Claude Code 递归识别为多余 slash command

## 状态

- 状态:v0.2 本地解决,待 Claude Code UI 抽检
- 优先级:P0
- 发现时间:2026-06-07
- 发现方式:在 `/Users/huguiyuan/workspace/newtest` 中安装本地 tarball 后查看 Claude Code slash command 列表

## 背景

当前发布资产中,模板文件位于:

```text
commands/ae-init.templates/
```

执行 `ae init` 后会被复制到:

```text
.claude/commands/ae-init.templates/
```

该目录包含:

```text
.claude/commands/ae-init.templates/AGENTS.md
.claude/commands/ae-init.templates/CLAUDE.md
.claude/commands/ae-init.templates/README.md
.claude/commands/ae-init.templates/handoff.md
.claude/commands/ae-init.templates/spec/INDEX.md
.claude/commands/ae-init.templates/spec/README.md
```

## 复现

在空项目执行:

```bash
cd /Users/huguiyuan/workspace/newtest
npx --yes \
  --package /Users/huguiyuan/workspace/agentic-engineering/huguiyuan-ae-0.1.0.tgz \
  ae init
```

打开 Claude Code 后,slash command 列表中出现:

```text
ae-ingest-mother
ae-init
ae-init.templates:AGENTS
ae-init.templates:CLAUDE
ae-init.templates:handoff
ae-init.templates:README
ae-init.templates:spec:INDEX
ae-init.templates:spec:README
```

## 实际问题

Claude Code 会递归扫描 `.claude/commands/**/*.md` 并把 markdown 文件识别为 slash command。

因此模板文件被误识别为命令。这不是用户可用命令,属于命令列表污染。

## 影响

- 用户会误以为存在一组 `ae-init.templates:*` 子命令。
- 增加误操作概率。
- 降低方法论第一印象。
- 如果模板内容被作为命令执行,行为不可控。
- 即使 Issue 001 后续改成 CLI 初始化,当前包结构仍不适合作为 Claude Code 资产安装形态。

## 期望

Claude Code 中只应出现真实命令:

```text
ae-init
ae-ingest-mother
```

模板、测试脚本、内部资产不应出现在 slash command 列表中。

## 根因

内部模板目录放在了 Claude Code 的 command 扫描路径内:

```text
.claude/commands/
```

这是目录布局错误,不是 Claude Code 行为错误。

## 修复方向

如果保留 `/ae-init`,应把模板移出 `.claude/commands/`。

候选目标:

```text
.claude/ae-init.templates/
```

或更平台无关:

```text
.agentic-engineering/templates/ae-init/
```

对应需要修改:

- 源资产目录结构。
- `commands/ae-init.md` 中的模板路径说明。
- `commands/ae-init.test.sh` 的 `TEMPLATE_DIR`。
- `src/commands/init.js` 的安装映射。
- `tests/init.test.js` 中对模板位置的断言。
- README 中关于安装产物的说明。

## 与 Issue 001 的关系

如果 Issue 001 选择"CLI 成为事实源",则模板最好完全改为 CLI 内部模板资产,不再安装到 `.claude/commands/`。

推荐目标结构:

```text
templates/ae-init/
commands/
skills/
config/
src/
```

CLI 发布包内保留 `templates/`,但安装到用户项目时不进入 `.claude/commands/`。

## 详细方案

本 issue 由 [Issue 001](001-platform-agnostic-cli-init.md) 的 v0.2 主方案**自然解决**:

v0.2 完全移除 slash command 形态。仓库根的 `commands/` 整个目录删除;`ae setup` 不会向用户项目的 `.claude/commands/` 装任何文件。Claude Code 自然不会再扫描到模板文件。

也就是说:本 issue 的根因(模板放在 Claude Code 命令扫描路径内)消失,因为整个"在用户项目铺 slash command"这件事在 v0.2 不再发生。

### v0.1.0 与 v0.2.0 的差别

| 维度 | v0.1.0 | v0.2.0 |
|------|--------|--------|
| 用户项目是否有 `.claude/commands/` | 是,含 `ae-init.md` + `ae-ingest-mother.md` + `ae-init.templates/` + `ae-init.test.sh` | **否,整个目录不存在** |
| Claude Code 中是否有 `/ae-init` 等 slash | 是 | **否,改走 CLI `ae init`** |
| 模板存放位置 | 用户项目 `.claude/commands/ae-init.templates/` | CLI 包内 `templates/entries/`,不安装 |
| Claude Code 项目级 slash 列表 | 含 `ae-init.templates:*` 多余条目 | 空(预期) |

### 与 Issue 001 / 003 的关系

- 本 issue 的执行 = Issue 001 阶段 B(资产搬迁与目录清理)的副产物
- 不需要独立排期,跟随 001 v0.2 推进即可
- 本 issue 的价值在于**独立验证清单**:确保 v0.2 实际落地时,Claude Code slash command 列表没有任何 ae-* 残留

## 实施 Todo

> 本 issue 不引入独立的代码改动,所有动作在 Issue 001 阶段 B / F / H 中执行。本 todo 主要是验证清单 + 测试断言。

## v0.2 实施结果

- 已删除仓库根 `commands/` 资产,发布包不再包含或安装 slash command。
- 已将入口模板搬到 `templates/entries/`,只由 CLI 内部读取,不会安装到 `.claude/commands/`。
- `ae setup` 只安装 `.claude/skills/`、`.codex/skills/` 与 `config/ae-rules.md`。
- `tests/setup.test.js` 与 `tests/init.test.js` 均断言 `.claude/commands/` 不存在。
- `/Users/huguiyuan/workspace/newtest` 真实 tarball 验证中 `.claude/` 下仅有 `skills/`,且 `find .claude -name "ae-init.templates*"` 为空。
- 仍需人工打开 Claude Code UI 抽检项目级 slash command 列表无 ae-* 残留。

### A. 跟随 Issue 001 阶段 B 完成的动作(此处仅列对照项)

- [ ] `commands/` 整个目录删除(对照 [Issue 001](001-platform-agnostic-cli-init.md) 阶段 B)
- [ ] 模板搬到 `templates/entries/`
- [ ] `src/commands/setup.js` 不向用户项目 `.claude/commands/` 装任何内容
- [ ] `src/commands/init.js` 不向用户项目 `.claude/commands/` 装任何内容

### B. 验证断言(写进 tests/setup.test.js 与 tests/init.test.js)

- [ ] `tests/setup.test.js` case 「冷启动」加断言:
  - [ ] setup 后 `<target>/.claude/commands/` 路径**不存在**
  - [ ] setup 后 `<target>/.claude/` 下子目录只有 `skills/`
- [ ] `tests/init.test.js` case 「正常路径」加断言:
  - [ ] init 后 `<target>/.claude/commands/` 路径仍**不存在**
  - [ ] 验证 init 不会回填出 `commands/` 目录

### C. 真实环境验证(对照本 issue 复现路径)

> 复用 Issue 001 阶段 H 的临时项目环境,核对本 issue 关心的指标。

- [ ] 在 `/Users/huguiyuan/workspace/newtest`(清空旧产物)跑:
  - [ ] `rm -rf .claude/ .codex/ spec/ config/ AGENTS.md CLAUDE.md handoff.md README.md`
  - [ ] `npx --package <new-tarball> ae setup`
  - [ ] `npx --package <new-tarball> ae init "测试 v0.2"`
- [ ] `ls .claude/` 输出仅 `skills/`,**不含** `commands/`
- [ ] `find .claude -name "ae-init.templates*"` 输出为空
- [ ] 打开 Claude Code,slash command 列表抽检:
  - [ ] **不出现** `ae-init`、`ae-ingest-mother`、`ae-init.templates:*` 任何条目
  - [ ] 项目级 slash command 列表为空(v0.2 预期行为)
- [ ] 截图保存 / 文字记录验证结果,作为 issue 关闭依据

### D. 文档同步(在 Issue 001 阶段 G 一并完成)

- [ ] CHANGELOG `0.2.0` 已包含:"Removed: commands/ assets are no longer installed into user projects. Resolves slash command list pollution in Claude Code."
- [ ] README 不再提及 `.claude/commands/` 装哪些文件(因为不装了)

### E. issue 状态收口

- [ ] v0.2 发布后,本 issue 状态从"待修复"改为"已解决",注明 "Resolved by v0.2.0 architectural change (slash commands removed entirely)"

## 验收标准

- `ae init` 后打开 Claude Code,slash command 列表只出现真实命令。
- 模板文件不在 `.claude/commands/**/*.md` 下。
- `/ae-init` 如果保留,仍能找到模板并完成初始化。
- 相关测试覆盖模板路径不污染 command 列表。
