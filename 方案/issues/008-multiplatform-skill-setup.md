# Issue 008: `ae setup` 多平台 skill 安装适配

## 状态

- 状态:已实现并本地测试通过;真实平台抽检与发布待做
- 优先级:P2
- 发现时间:2026-06-17
- 来源:[roadmap R-03 多平台适配](../roadmap.md#r-03-多平台适配扩展到更多-ai-编码平台) + 对 [rpamis/comet](https://github.com/rpamis/comet) 的源码审计

## 背景

AE 当前 CLI 已经把"项目骨架初始化"下沉到平台无关的 `ae init`,但 `ae setup` 仍写死安装到两处:

- `.claude/skills/`
- `.codex/skills/`

这与 README / roadmap 中"未来兼容 Cursor / Trae / 更多 AI 编码平台"的方向不一致。用户指出 comet 的 `comet init` 宣称支持 29 个 AI 编码平台,需要调研其实现方式,再决定 AE 的多平台兼容方案。

## comet 实现审计结论

审计对象:

- 仓库:`rpamis/comet`
- commit:`1f22275128c1a7bb66f118eac23af88820fd6cd3`
- README-zh「支持平台」列出 29 个平台,核心口径是平台到技能目录的映射。

关键源码证据:

- 平台 registry:[`src/core/platforms.ts`](https://github.com/rpamis/comet/blob/1f22275128c1a7bb66f118eac23af88820fd6cd3/src/core/platforms.ts#L10-L259)
- `init` 编排:[`src/commands/init.ts`](https://github.com/rpamis/comet/blob/1f22275128c1a7bb66f118eac23af88820fd6cd3/src/commands/init.ts#L406-L587)
- 平台检测:[`src/core/detect.ts`](https://github.com/rpamis/comet/blob/1f22275128c1a7bb66f118eac23af88820fd6cd3/src/core/detect.ts#L110-L220)
- skill 复制:[`src/core/skills.ts`](https://github.com/rpamis/comet/blob/1f22275128c1a7bb66f118eac23af88820fd6cd3/src/core/skills.ts#L42-L109)
- manifest:[`assets/manifest.json`](https://github.com/rpamis/comet/blob/1f22275128c1a7bb66f118eac23af88820fd6cd3/assets/manifest.json#L1-L41)

### 1. 29 平台不是 29 套实现,而是一张平台映射表

`PLATFORMS` 统一描述每个平台:

- `id` / `name`
- `skillsDir`
- 可选 `globalSkillsDir`
- 可选 `detectionPaths`
- 可选 `rulesDir` / `rulesFormat`
- 可选 `supportsHooks` / `hookFormat`

因此扩平台的主路径是加 registry 条目,不是复制安装逻辑。

### 2. 安装主体是"manifest 列资产 + 平台目录拼接"

comet 用 `assets/manifest.json` 列出 skill 文件、rule 文件、hook 脚本。安装 Comet 自有 skill 时,核心逻辑只是:

```text
assets/<languageSkillsDir>/<skillRelPath>
  -> <baseDir>/<platformSkillsDir>/skills/<skillRelPath>
```

其中:

- `baseDir = projectPath` 或 `os.homedir()`
- `platformSkillsDir = scope === 'global' && globalSkillsDir ? globalSkillsDir : skillsDir`
- `languageSkillsDir = skills` 或 `skills-zh`

这说明"多平台"的基本面就是目录分发。

### 3. 自动检测只做轻量启发

`detectPlatforms(projectPath)` 遍历 registry:

- 有 `detectionPaths` 的平台,检查这些项目内路径是否存在;
- 否则检查项目内 `skillsDir` 目录是否存在。

安装前的 `hasSkills(...)` 再检查目标 `skills/` 下是否已有 `openspec-*`、Superpowers 标志 skill 或 `comet*` skill;项目级安装时还会检查全局目录,避免重复安装。

### 4. 少数平台有桥接特例

虽然主体是 skill 目录复制,comet 仍为少数平台做了额外适配:

- OpenCode:从 skill 生成 `.opencode/commands/<skill>.md`,把 slash command 语义桥接到 skill。
- Pi:写 `.pi/.../extensions/comet-commands.ts`,注册命令入口。
- 支持 rules 的平台:把 `comet-phase-guard.md` 分发到各自 rules/instructions 目录,Cursor 用 `.mdc`,GitHub Copilot 用 `.instructions.md`。
- 支持 hooks 的平台:按平台格式写 settings / hooks JSON。

因此 roadmap 里"只发生在 skills 目录层"需要修正为:主路径是 skills 目录分发,但 comet 已经把 rules / hooks / command bridge 作为平台能力层处理。

### 5. comet 不负责通用入口规则文件适配

未发现 comet 针对每个平台生成类似 AE `AGENTS.md` / `CLAUDE.md` / `.cursorrules` 的项目入口规则文件。它的策略是:

- 自己的 workflow 能力放在 skill 中;
- 平台差异通过 skill 目录、rules 目录、hook 配置和少数 command bridge 消化;
- 项目工作目录只创建 Comet 自用的 `docs/superpowers/*` 和 `.comet/config.yaml`。

这对 AE 很关键:不要把多平台第一阶段做成"入口规则文件大适配",否则范围会迅速失控。

## 对 AE 的设计判断

AE 应分清两层:

1. `ae init`:平台无关项目骨架事实源,继续渲染 `AGENTS.md` / `CLAUDE.md` / `spec/*` / `handoff.md` 等入口和方法论产物。
2. `ae setup`:平台资产安装器,先做多平台 skill 分发;入口 rules / hooks / bridge 作为后续能力层逐步加。

第一阶段目标不做 29 平台大而全,但首批纳入明确平台集合。目标承诺:

- 可把 AE skills 安装到首批平台的项目级约定目录;
- `ae setup` 不再静默固定安装 Claude Code + Codex,而是交互选择或自动识别;
- 暂不处理入口规则文件适配,继续保持 `ae init` 当前逻辑。

## 对齐决策(2026-06-17)

1. **无静默默认平台**:`ae setup` 在交互终端中应提示选择平台;如果能自动识别当前项目已有平台目录,则预选/推荐对应平台后让用户确认。非交互场景必须显式传 `--platform <ids>`,否则报错并提示可选平台。
2. **MVP 平台范围**:首批支持 15 个平台:
   - Claude Code
   - Codex
   - Windsurf
   - GitHub Copilot
   - Kilo Code
   - Kimi Code
   - CodeBuddy
   - Qoder
   - Trae
   - Cursor
   - OpenCode
   - Antigravity
   - Gemini CLI
   - Qwen Code
   - Kiro
3. **安装范围**:第一版只做项目级安装,不写用户 home,不做 global scope。
4. **不提供 `--all`**:避免无差别全量写入,也避免把目录级安装误读成全平台完整适配。
5. **支持口径**:首批平台先按 supported 处理,不区分 experimental;如果后续真实验证发现平台侧不识别 skill,再降级或加 bridge。
6. **入口规则文件**:暂时不处理 `.cursorrules`、`GEMINI.md`、Copilot instructions 等平台入口文件,保持当前 `ae init` 渲染 `AGENTS.md` / `CLAUDE.md` 的逻辑。
7. **命令体验**:`ae setup` 应类似常见初始化器,执行后提示平台选择;指定平台时走无交互路径。

## 建议方案

### 方案 A:平台 registry + `ae setup` 多目标安装

新增平台定义模块,形态参考 comet,但字段先收敛:

```js
{
  id: 'cursor',
  name: 'Cursor',
  skillsDir: '.cursor',
  detectionPaths: ['.cursor'],
  support: 'skills-dir'
}
```

`ae setup` 改为:

- 交互终端:自动检测项目中已有平台目录,预选识别到的平台;若未识别到,展示首批 15 平台 checklist 让用户选择。
- 非交互终端:要求显式传 `--platform <ids>`,否则失败并输出用法。
- `ae setup --platform claude,codex,cursor` 指定平台并跳过选择提示。
- 第一版只写项目级目录,不提供 `--scope`。
- 第一版不提供 `--all`。
- 后续再考虑 `--skip-existing` / `--overwrite`。

优点:

- 与 comet 的成熟形态一致。
- 改动集中在 setup,不动 init 骨架。
- 易测试:临时目录里断言各平台 `skills/` 是否落地。

缺点:

- 只能解决"skill 文件分发",如果平台实际不识别 skill,后续需要补 command bridge / rules / hook。
- 需要为每个平台维护真实路径知识。

### 方案 B:只扩 Claude / Codex / Cursor / Trae 四平台(已放弃)

先把平台范围缩小到 README 曾提到的 deferred 平台:

- Claude Code
- Codex
- Cursor
- Trae

优点:

- 风险最小。
- 可以配真实平台抽检。

放弃原因:

- 用户已拍板首批覆盖 15 个平台,但仍用 registry 控制范围,不直接上 29 平台。

### 方案 C:直接照 comet 做 29 平台 registry(已放弃)

优点:

- 宣传面最大。
- 后续用户有平台目录即可试用。

放弃原因:

- 真实兼容性不可验证,容易变成"复制文件到目录"式虚假支持。
- AE 目前没有 comet 的 rules / hooks / command bridge 层,直接宣称同等支持不严谨。

## 决策建议

采用 **方案 A**,并按 2026-06-17 对齐结果收敛:

1. 先重构出平台 registry 和通用安装器。
2. `ae setup` 默认进入交互选择,不静默安装固定平台。
3. 首批平台为 Claude Code / Codex / Windsurf / GitHub Copilot / Kilo Code / Kimi Code / CodeBuddy / Qoder / Trae / Cursor / OpenCode / Antigravity / Gemini CLI / Qwen Code / Kiro。
4. 第一版只做项目级安装,不做 global scope,不提供 `--all`。
5. 暂不做入口规则文件适配。

## 实施 todo

- [x] 新建 `src/platforms.js`:定义 platform registry、`getPlatformSkillsDir(platform)`、平台 ID 校验。
- [x] 新建或改造 setup 内部安装函数:从固定 `.claude/.codex` 改为遍历 selected platforms。
- [x] 首批 registry 纳入 15 平台:`claude`、`codex`、`windsurf`、`github-copilot`、`kilocode`、`kimicode`、`codebuddy`、`qoder`、`trae`、`cursor`、`opencode`、`antigravity`、`gemini`、`qwen`、`kiro`。
- [x] 实现交互式平台选择:项目内识别到平台目录时预选;未识别到时展示 15 平台 checklist。
- [x] 增加 CLI 参数解析:`--platform <ids>`;显式指定时跳过交互。
- [x] 非交互且未传 `--platform` 时失败,输出可选平台和示例命令。
- [x] 第一版只写项目级目录;不实现 `--scope`。
- [x] 增加幂等策略:默认跳过已存在文件;后续可补 `--overwrite`。
- [x] 更新测试:显式指定单平台、多个平台、非交互缺平台报错、未知平台报错、幂等重复执行、任意平台 setup 后 init 可继续。
- [x] 更新 README 英文文档:说明 `ae setup` 会选择平台并列出首批 15 平台目录。
- [x] 更新 `docs/` 中文方法论文档:说明 `ae init` 与 `ae setup` 的职责边界。
- [ ] 真实抽检至少 Claude Code + Codex + Cursor / Trae 之一;其余平台先以目录落地测试覆盖。
- [ ] 不执行 `npm publish`;等多平台实现和验证收口后统一 bump 版本发布。

## 暂不做

- 不在本 issue 中实现 `ae index-rebuild`。
- 不为每个平台生成入口规则文件,例如 `.cursorrules`、`GEMINI.md`、Copilot instructions。
- 不做 29 平台;首批只做 15 平台。
- 不实现 `--all`。
- 不实现 global scope。
- 不修改 `ae init` 的 skeleton 语义。

## 验收标准

- `npm test` 全绿。
- `ae setup` 在交互终端中提示选择平台;识别到项目内平台目录时预选对应平台。
- 非交互执行 `ae setup` 且未传 `--platform` 时失败并提示用法。
- `ae setup --platform cursor` 可在临时项目生成 `.cursor/skills/<AE skill>/SKILL.md`。
- `ae setup --platform claude,codex,cursor` 可一次安装多个平台。
- 未知平台 ID 输出明确错误,不产生 skill 写入。
- README 列出首批 15 平台与对应项目级 skills 目录。

## 实现记录(2026-06-17)

- 新增 `src/platforms.js` 承载首批 15 平台 registry、别名、项目级 skills 目录、轻量检测路径。
- `src/commands/setup.js` 支持 `--platform <ids>`;非交互无平台时报错;交互模式展示编号列表并以检测到的平台作为默认选择。
- `src/commands/init.js` 的资产检查改为遍历首批平台,不再只认 `.claude/skills/` / `.codex/skills/`。
- 测试从 22 增至 27,覆盖非交互缺平台、单平台、多平台、未知平台、任意平台 setup 后 init。
- 文档同步:README 英文平台表、`docs/framework.md`、`docs/scenarios/s0-bootstrap.md`。
- CLI smoke:显式 `--platform cursor,trae` 后 `ae init` 通过;非交互无 `--platform` 正确失败;TTY 交互提示可展示 15 平台,无检测结果时不预选默认平台,并可用编号 `10` 安装 Cursor。
- 仍未做平台侧真实识别抽检:Claude Code / Codex / Cursor / Trae 客户端是否实际自动加载这些 skill,需后续手工验证。
