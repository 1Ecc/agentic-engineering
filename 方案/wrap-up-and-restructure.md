# 项目收尾 + 本地仓库整理计划

> 范围:把当前阶段做完的资产盘清楚,本地仓库按"未来发成 npm CLI"的目标形态归位。
> 不在范围:CLI 代码实现、发版、`ae-index-rebuild` 命令本体。

## 1. 终态确认

- **发行形态**:npm CLI(参照 OpenSpec)。用户最终用法:
  ```bash
  npx @<scope>/ae init        # 在自己项目里初始化 spec/ + 入口文件 + .claude/
  npx @<scope>/ae ingest-mother
  npx @<scope>/ae index-rebuild
  ```
  CLI 本质是个分发壳:做一次显式映射,把仓库根的 `commands/` `skills/` `config/` 拷到用户项目对应位置:
  ```js
  copyTree('commands/', dest + '/.claude/commands/')
  copyTree('skills/',   dest + '/.claude/skills/')
  copyTree('config/',   dest + '/config/')
  ```
  方法论靠 Claude Code 的 skills + slash commands 承载。
- **仓库名**:`agentic-engineering`(对应 git 仓库与 npm 包名)。
- **CLI 命令前缀**:`ae`(沿用 `/ae-init` 这套现有命名)。

## 2. 当前资产盘点

### 2.1 已完成且要进发布包的

| 资产 | 当前位置 | 状态 |
|------|----------|------|
| `/ae-init` 命令契约 | `commands/ae-init.md` | ✅ |
| `/ae-init` 入口模板 | `commands/ae-init.templates/` | ✅(README/AGENTS/CLAUDE/handoff 四份) |
| `/ae-init` 验收脚本 | `commands/ae-init.test.sh` | ✅ |
| `/ae-ingest-mother` 命令契约 | `commands/ae-ingest-mother.md` | ✅ |
| 规则注入示例 | `config/ae-rules.md.example` | ✅ |
| 已改造的 12 个 skill | `skills/` | ✅ |

> 澄清:`ae-init.templates/` 是 `/ae-init` 命令运行时往用户项目根写的入口文件模板(README/AGENTS/CLAUDE/handoff),**保留**。之前裁掉的是 `spec/_templates/*`(PRD/design/issue 等 spec 内文档模板),不是同一回事。

### 2.2 已采纳的 12 个 skill 明细

| 节点 | skill | 源路径 |
|------|-------|--------|
| A1 粗 | brainstorming | `superpowers/brainstorming/` |
| A1 细 / B2 / B6 | grill-me | `mattpocock/productivity/grill-me/` |
| A2 | to-prd | `mattpocock/engineering/to-prd/` |
| A3 | writing-plans | `superpowers/writing-plans/` |
| A4 | to-issues | `mattpocock/engineering/to-issues/` |
| A5 / B5 | tdd | `mattpocock/engineering/tdd/` |
| A6 | verification-before-completion | `superpowers/verification-before-completion/` |
| B3 | diagnose | `mattpocock/engineering/diagnose/`(含 `assets/issue-7-sections.md`、`scripts/`) |
| B7 | review | `mattpocock/in-progress/review/` |
| 横切 | handoff | `mattpocock/productivity/handoff/` |
| 横切 | improve-codebase-architecture | `mattpocock/engineering/improve-codebase-architecture/`(含 LANGUAGE / HTML-REPORT / INTERFACE-DESIGN / DEEPENING 四份附文档) |
| 横切 | zoom-out | `mattpocock/engineering/zoom-out/` |

### 2.3 设计档案(留仓库,不进发布包)

- `方案/immutable-booping-sutherland.md` —— 框架索引
- `方案/spec-framework.md` —— spec 目录规范
- `方案/scenarios/` —— S0 / S1 场景规格
- `方案/skill-candidates/README.md` + `customization-plan.md` —— 43 候选 skill 索引 + 改造进展
- `handoff.md` —— 会话交接(根目录保留)

### 2.4 不进发布、不进 git 的

- `reference/` —— 外部素材(OpenSpec / superpowers / mattpocock-skills / comet)
- `CES-AI-topic-9-smart-workflow/` —— 母本项目
- `历史思路/` —— 弃用

## 3. 目标目录结构(阶段 1 完成后)

```text
agentic-engineering/                       # git 仓库根 = 未来 npm 包根
├── README.md                              # 对外文档
├── handoff.md                             # 会话交接(已存在,继续覆盖维护)
├── LICENSE                                # 待补,MIT
├── .gitignore                             # 已存在,核对排除 reference/ 等
│
├── commands/                              # ★ 资产层:跟 skills/、config/ 顶层并列
│   ├── ae-init.md
│   ├── ae-init.templates/                 # /ae-init 运行时拷给用户项目的入口文件模板
│   ├── ae-init.test.sh
│   ├── ae-ingest-mother.md
│   └── ae-index-rebuild.md                # ⏳ 待做,阶段 3
│
├── skills/                                # ★ 资产层:12 个 skill 平铺
│   ├── brainstorming/
│   ├── grill-me/
│   ├── to-prd/
│   ├── writing-plans/
│   ├── to-issues/
│   ├── tdd/
│   ├── verification-before-completion/
│   ├── diagnose/
│   ├── review/
│   ├── handoff/
│   ├── improve-codebase-architecture/
│   └── zoom-out/
│
├── config/                                # ★ 资产层:规则示例
│   └── ae-rules.md.example
│
├── docs/                                  # 方法论说明(用户看)
│   ├── framework.md                       # 由 immutable-booping-sutherland 改写
│   ├── spec-framework.md
│   └── scenarios/
│       ├── s0-bootstrap.md
│       └── s1-main-loop.md                # 由现有"s1 deep-orbiting-fog"重命名
│
├── design/                                # 设计档案(自己/贡献者看)
│   └── skill-candidates/
│       ├── README.md
│       └── customization-plan.md
│
└── 方案/                                  # 阶段 1 保留原样,等人工 check 后整体删除
                                           # 阶段 2 才会出现:
                                           # ├── package.json
                                           # ├── bin/ae.js                CLI 入口
                                           # └── src/                     CLI 实现源码(JS/TS)
```

**对照关键点**:
- `commands/` `skills/` `config/` 顶层并列,语义对称(都是"要拷到用户项目的资产")
- `src/` 这个名字留给阶段 2 的 CLI 源码,本阶段不占用
- `.claude/` 这层不在仓库里出现,由 CLI 在执行时做映射
- `方案/` 阶段 1 完整保留,docs/ 与 design/ 是基于它的"重组 + 改写",二者并存便于人工对照,确认无误后再删

## 4. 阶段 1 执行 todo

> 每一步落地后勾选;全部完成后 git 收口。
> **原则**:`方案/` 在本阶段全程**只读不动**;`docs/` `design/` 走"读 → 改写 → 新建"路线。
>
> **当前进展**:阶段 1 已完成并提交。
> - 阶段 1 前基线提交:`9380792 chore: checkpoint before stage 1 restructure`
> - 阶段 1 完成提交:`72f79a0 chore: restructure repo for npm CLI distribution (stage 1)`

### 4.1 资产搬迁(commands / config)

- [x] 在仓库根新建 `commands/`
- [x] 把 `agentic-engineering/.claude/commands/ae-init.md` 移到 `commands/ae-init.md`
- [x] 把 `agentic-engineering/.claude/commands/ae-init.templates/` 整目录移到 `commands/ae-init.templates/`
- [x] 把 `agentic-engineering/.claude/commands/ae-init.test.sh` 移到 `commands/ae-init.test.sh`
- [x] 把 `agentic-engineering/.claude/commands/ae-ingest-mother.md` 移到 `commands/ae-ingest-mother.md`
- [x] 在仓库根新建 `config/`
- [x] 把 `agentic-engineering/config/ae-rules.md.example` 移到 `config/ae-rules.md.example`
- [x] 删除空的 `agentic-engineering/` 子目录(及其 `.claude/`、`config/` 空壳)
- [x] 核对:`commands/ae-init.md` 中对 `ae-init.templates/` 的相对路径引用仍然成立(应该仍是相对当前文件的同层目录,无需改)

### 4.2 资产搬迁(skills 平铺)

- [x] 在仓库根新建 `skills/`
- [x] 把 §2.2 的 12 个 skill **整目录拷贝**到 `skills/<skill-name>/`,源路径来自 `方案/skill-candidates/...`,保留各自的 `SKILL.md`、`assets/`、`scripts/`、附属 `*.md`
  - 拷贝(非移动)的目的:`方案/` 全程保留原貌,便于阶段 1 末尾人工对照
- [x] 拷贝完成后,`grep -rn "AE-CHANGE" skills/` 应返回空——如有残留,据 customization-plan 的人工 check 注释清理掉
- [x] 核对 12 个 skill 各自的 SKILL.md frontmatter 仍合法(`name:`、`description:` 必填)

### 4.3 文档改写(docs)

- [x] 在仓库根新建 `docs/`
- [x] 把 `方案/spec-framework.md` **拷贝**到 `docs/spec-framework.md`(语气保持现状,后续 README 中链向它)
- [x] 新建 `docs/scenarios/`
- [x] 把 `方案/scenarios/s0-bootstrap.md` **拷贝**到 `docs/scenarios/s0-bootstrap.md`
- [x] 把 `方案/scenarios/s1 deep-orbiting-fog.md` **拷贝**到 `docs/scenarios/s1-main-loop.md`(文件名脱掉项目内昵称,改为语义清晰名)
- [x] 由 `方案/immutable-booping-sutherland.md` 改写出 `docs/framework.md`:
  - 去掉"草稿口吻"和项目内昵称(immutable-booping-sutherland 这类代号)
  - 语气改为面向使用者:这套方法论是什么、三场景结构、怎么入门
  - 保留三场景 + 两道硬门禁这些固化结论
  - 链向 `docs/scenarios/*` 与 `docs/spec-framework.md`

### 4.4 设计档案(design)

- [x] 在仓库根新建 `design/skill-candidates/`
- [x] 把 `方案/skill-candidates/README.md` **拷贝**到 `design/skill-candidates/README.md`
- [x] 把 `方案/skill-candidates/customization-plan.md` **拷贝**到 `design/skill-candidates/customization-plan.md`
- [x] 不拷贝 12 个 skill 的源文件——它们已经在 `skills/` 落位,避免双份

### 4.5 顶层文档

- [x] 写 `README.md`(对外):
  - 一句话定义:SDD + TDD 轻量个人方法论,Claude Code skills + slash commands 形态
  - **现状声明**:npm CLI 形态待实现(阶段 2),当前可手动:
    ```bash
    cp -r commands/ /your/project/.claude/commands/
    cp -r skills/   /your/project/.claude/skills/
    cp -r config/   /your/project/config/
    ```
  - 三场景速览(S0 / S1A / S1B)+ 一张节点表
  - 12 个 skill 一句话列表
  - 链到 `docs/framework.md`、`docs/spec-framework.md`、`docs/scenarios/`
  - 路线图:阶段 2 CLI、阶段 3 ae-index-rebuild
- [x] 写 `LICENSE`(MIT,作者署名见 §5 待拍板)
- [x] 更新 `handoff.md`:
  - "已完成"段加上"阶段 1 仓库结构整理完成"
  - "下次起手建议"指向阶段 2 CLI 实现
  - 顶部"关键文件入口"表更新为新路径(`commands/...`、`skills/...`、`docs/...`)

### 4.6 .gitignore 与 git 收口

- [x] 确认 `.gitignore` 排除:`reference/`、`CES-AI-topic-9-smart-workflow/`、`历史思路/`、`.DS_Store`
- [x] `git status` 核对:`commands/` `skills/` `config/` `docs/` `design/` 是新增;`agentic-engineering/` 子目录消失;`方案/` 无变动
- [x] `git add` 上述新增目录与改动文件
- [x] 提交,建议信息:
  ```
  chore: restructure repo for npm CLI distribution (stage 1)

  - Hoist commands/, skills/, config/ to repo root as flat asset layers.
  - Copy framework docs into docs/ and design archives into design/.
  - Keep 方案/ untouched pending manual review.
  ```
- [x] **不打 tag**,等阶段 2 CLI 完成后 `v0.1.0`

阶段 1 验证结果:
- `bash commands/ae-init.test.sh` 通过
- `git diff --cached --check` 通过
- `skills/` 与 `方案/skill-candidates/` 下 12 个源 skill 目录一致
- `skills/` 无 `AE-CHANGE`
- `reference/` / `CES-AI-topic-9-smart-workflow/` tracked 数量为 0,本地目录保留
- 阶段 1 提交后 `方案/` 无变动

### 4.7 人工 check(由你完成,清单先备好)

- [x] 对比 `skills/` 与 `方案/skill-candidates/` 下 12 个 skill 的内容,确认拷贝无遗漏、无脏内容(技术校验已完成;仍建议人工抽读)
- [ ] 通读 `docs/framework.md`,确认对外语气可接受
- [ ] 通读 `README.md`,确认"它是什么 / 怎么用 / 局限"三件事讲清楚了
- [ ] check 通过后,**手动**删除 `方案/`,补一次 commit:`chore: drop 方案/ after manual review`

## 5. 阶段 1 启动前待你拍板

1. **作者署名**:LICENSE 用谁?(GitHub handle / 真名 / 邮箱)
   - 已处理:`huguiyuan`
2. **README 里的 npm scope**:阶段 2 才用,但 README 路线图段会提到。先占位 `@<your-scope>/ae`?还是先确定下来(`@ecc-hgy/ae` / 别的)?
   - 已处理:README 路线图先写 `@ecc-hgy/ae`
3. **`reference/` 是否进 `.gitignore`**:体量大、是只读素材,建议进。但要先核当前 git 是否已经 add 了——若已 tracked,需要 `git rm -r --cached reference/` 才能让 .gitignore 生效。
   - 已处理:`reference/` 已进 `.gitignore`,且已 `git rm -r --cached reference`
4. **handoff.md 与 commands/ae-init.templates/handoff.md 的关系**:后者是 `/ae-init` 拷给用户的初始 handoff 模板,前者是本仓库自己的会话交接。两份独立,确认 OK。
   - 已处理:两份独立保留

## 6. 阶段 2:npm CLI 实现 + 发布

> **已固化的关键决策**(2026-06-07):
> 1. **CLI 职责边界 = 路线 a:只做分发**。CLI 只把 `commands/` `skills/` `config/` 拷到用户项目对应位置;真正的 spec/ 骨架创建、入口文件渲染、AE:RULES 同步,**全部交给 Claude/Codex 在用户项目里跑 `/ae-init` 时执行**。markdown contract 是事实源,CLI 不重写它的逻辑。
> 2. **子命令仅暴露 `init` + `ingest-mother`**。`index-rebuild` 推迟到阶段 3 与 markdown contract 同步。
> 3. **技术栈:纯 ESM JS,零依赖**。无 TypeScript 编译链,`bin/ae.js` 直接是入口。Node 内置 `node:test`、`node:fs/promises`、`node:path` 足够。
> 4. **第一个版本号**:`0.1.0`。npm scope `@huguiyuan`(待 npm 上确认可用)。

> 原则:跟阶段 1 一样,每一步落地后勾选;全部完成后 git 收口并打 tag。
>
> **当前进展**:阶段 2 本地实现与本地验证已完成;外部 npm 登录 / 发布、真实 Claude Code 交互验收仍需用户执行。
> - 阶段 2 前快照提交:`7382aa5 chore: checkpoint before stage 2 cli work`
> - 阶段 2 完成提交:`5dc03de feat(cli): implement npm CLI for asset distribution (stage 2)`
> - 本地 tag:`v0.1.0 Initial npm release`

### 6.1 包结构脚手架

- [x] 仓库根新建 `package.json`,字段:
  - `name`: `@ecc-hgy/ae`
  - `version`: `0.1.0`
  - `description`: 与 README 顶部一句话对齐
  - `type`: `"module"`
  - `bin`: `{ "ae": "./bin/ae.js" }`
  - `files`: `["bin", "src", "commands", "skills", "config", "README.md", "LICENSE"]`
  - `engines`: `{ "node": ">=18" }`(`import.meta.url` 与 `node:test` 都稳定)
  - `scripts`: `{ "test": "node --test tests/" }`
  - `keywords`: `["claude-code", "agentic", "skills", "tdd", "sdd"]`
  - `repository` / `homepage` / `bugs` 指向未来 GitHub 仓库(占位 `huguiyuan/agentic-engineering`)
  - `license`: `MIT`
  - `author`: `huguiyuan`
  - `publishConfig`: `{ "access": "public" }`
- [x] 仓库根新建 `bin/ae.js`,加 shebang `#!/usr/bin/env node`,内容只做一件事:`import('../src/cli.js').then(m => m.run(process.argv.slice(2)))`
- [x] `chmod +x bin/ae.js`
- [x] 仓库根新建 `src/` 目录及内部骨架:
  - `src/cli.js` —— 入口路由
  - `src/commands/init.js`
  - `src/commands/ingest-mother.js`
  - `src/utils/paths.js`
  - `src/utils/copy.js`
  - `src/utils/report.js`
- [x] 仓库根新建 `tests/` 目录(端到端测试放这里)
- [x] 更新 `.gitignore`:补充 `node_modules/`、`*.tgz`(npm pack 产物)

### 6.2 工具层:路径解析 + 文件拷贝

- [x] `src/utils/paths.js`:
  - `packageRoot()`:基于 `import.meta.url` 向上找到 `package.json` 所在目录,返回绝对路径
  - `assetPath(name)`:返回 `packageRoot()/<name>`,name ∈ `commands` / `skills` / `config`
- [x] `src/utils/copy.js`:
  - `copyTreeIdempotent(srcDir, destDir, { dryRun })` 函数:
    - 递归遍历 srcDir
    - 对每个文件:目标已存在 → skipped;不存在 → created(dry-run 时只记录不写)
    - 对每个空目录:同理保留 `.gitkeep` 行为
    - 返回 `{ created: string[], skipped: string[] }`,路径相对 destDir
  - **不实现 `--force`**:与 `ae-init.md` 的幂等契约对齐,绝不覆盖已有文件
  - 跨平台:全程用 `node:path` 的 `join` / `relative`,不出现裸字符串 `/`
- [x] `src/utils/report.js`:
  - `formatInitReport({ created, skipped, target })` —— 输出格式对齐 `ae-init.md` 的报告 schema,便于用户感觉一致
  - `formatIngestReport(...)` 同理

### 6.3 `init` 子命令实现

- [x] `src/commands/init.js` 主流程:
  1. 解析参数:`--target <path>`(默认 `process.cwd()`)、`--dry-run`、`--help`
  2. 校验 target 是已存在目录;不存在则 mkdir(允许用户 `mkdir new-project && cd new-project && ae init`)
  3. 三次拷贝调用:
     - `copyTreeIdempotent(assetPath('commands'), target + '/.claude/commands')`
     - `copyTreeIdempotent(assetPath('skills'),   target + '/.claude/skills')`
     - `copyTreeIdempotent(assetPath('config'),   target + '/config')`
  4. 汇总三组结果,调用 `formatInitReport` 输出
  5. **末尾追加 next-step 提示**:
     ```
     Next: open Claude Code in this project and run `/ae-init "<one-line goal>"`
     to create the spec/ skeleton and entry files.
     ```
- [x] 错误处理:任何一次拷贝失败 → 打印失败路径与原因,exit code 1
- [x] **不创建** `spec/`、`AGENTS.md`、`CLAUDE.md`、`handoff.md`、`spec/INDEX.md` —— 这些是 `/ae-init` 的职责,CLI 路线 a 严格不越界

### 6.4 `ingest-mother` 子命令实现

> CLI 这边只做"预检 + 指引",真正的母本规则抽取由 Claude 在用户项目内执行 `/ae-ingest-mother` 时完成。

- [x] `src/commands/ingest-mother.js` 主流程:
  1. 解析参数:`<mother-path>`(必填位置参数)、`--target <path>`(默认 `cwd`)、`--help`
  2. 参数缺失 → 打印 usage,exit 1
  3. 预检 mother-path:存在?是目录?至少有 `AGENTS.md` / `CLAUDE.md` / `handoff.md` 其一?三者皆无给警告但不阻断
  4. 预检 target:`.claude/commands/ae-ingest-mother.md` 在不在?不在则提示用户"似乎未运行 `ae init`,请先运行后再试",exit 1
  5. 输出指引信息:
     ```
     Mother project ready: <abs path>
     Next: open Claude Code in <target> and run `/ae-ingest-mother <abs path>`.
     The slash command will read mother entry files, propose AGENTS.md diffs,
     and ask for your confirmation before writing.
     ```
- [x] **不读取母本内容、不修改 target 任何文件**——纯指引性

### 6.5 CLI 入口与参数路由

- [x] `src/cli.js` `run(argv)` 函数:
  1. 提取 subcommand = argv[0],rest = argv.slice(1)
  2. 全局 flag:`--help` / `-h`、`--version` / `-v`
  3. 路由:
     - `init` → `import('./commands/init.js').run(rest)`
     - `ingest-mother` → `import('./commands/ingest-mother.js').run(rest)`
     - 缺失或 `--help` → 打印总帮助
     - 未知子命令 → 错误 + 总帮助,exit 1
- [x] 总帮助文本(参照 OpenSpec 的简洁风格):
  ```
  Usage: ae <command> [options]

  Commands:
    init                 Install commands/, skills/, config/ into the current project's .claude/.
    ingest-mother <path> Pre-check a mother project before running `/ae-ingest-mother`.

  Options:
    -h, --help     Show help
    -v, --version  Show version

  After `ae init`, open Claude Code in the project and run `/ae-init` to
  create the spec/ skeleton.
  ```
- [x] `--version` 从 `package.json` 读取 `version` 字段,不硬编码

### 6.6 端到端测试

> 用 `node:test` 自带 runner,不引第三方框架。每个测试用例自建临时目录,跑完清理。

- [x] `tests/_helpers.js`:`makeTmpDir()` / `cleanup(dir)` / `runCli(argv, opts)` 辅助
- [x] `tests/init.test.js`:
  - case A 「冷启动」:空目录跑 `ae init`,断言:
    - `.claude/commands/ae-init.md` 存在
    - `.claude/commands/ae-init.templates/README.md` 存在(目录拷贝递归正确)
    - `.claude/skills/diagnose/SKILL.md` 存在(随机抽 3 个 skill 验证)
    - `.claude/skills/improve-codebase-architecture/LANGUAGE.md` 存在(验证多文件 skill 完整)
    - `config/ae-rules.md.example` 存在
    - 输出包含 "Next: open Claude Code"
    - exit code 0
  - case B 「幂等」:case A 之后再跑一次 `ae init`,断言:
    - 退出码 0
    - 报告显示全部 skipped、none created
    - 文件 mtime / 内容未被覆盖(抽 1 个文件 hash 对比)
  - case C 「dry-run」:空目录跑 `ae init --dry-run`,断言:
    - 报告显示 "would create" 清单
    - 文件系统无实际写入
  - case D 「target 参数」:`ae init --target /tmp/xxx` 写入指定目录
- [x] `tests/ingest-mother.test.js`:
  - case A 「缺参数」:`ae ingest-mother`,断言:exit 1 + usage
  - case B 「mother 路径不存在」:exit 1 + 错误信息含路径
  - case C 「target 未 init」:在空目录跑 `ae ingest-mother <valid path>`,断言:提示先 `ae init`,exit 1
  - case D 「正常路径」:先 `ae init`,再 `ae ingest-mother`,断言:输出指引,exit 0,文件系统不变
- [x] `tests/cli.test.js`:`--help` / `--version` / 未知子命令 / 无参数
- [x] 所有测试本地 `npm test` 通过

### 6.7 本地 `npm link` 自测(端到端冒烟)

- [x] 在仓库根 `npm link`
- [x] `mktemp -d` 建临时项目目录,`cd` 进入
- [x] `ae init` —— 检查输出与 `.claude/` 结构
- [ ] 进 Claude Code,在该临时项目跑 `/ae-init "测试目标"`,验证:
  - `spec/` 骨架建好
  - `AGENTS.md` / `CLAUDE.md` / `README.md` / `handoff.md` 渲染合理
  - 跑 `bash .claude/commands/ae-init.test.sh`(已装到用户项目)通过
- [x] 再跑 `ae ingest-mother <abs path to CES-AI-topic-9-smart-workflow>`,检查指引输出
- [ ] 进 Claude Code 跑 `/ae-ingest-mother` 走一遍真实抽取流程,验证 contract 仍然成立
- [x] `npm unlink -g @ecc-hgy/ae`,确认临时目录的 `.claude/` 内容未被破坏

说明:Claude Code 内 `/ae-init` 与 `/ae-ingest-mother` 真实交互验收需要用户在本机手动执行;本次已完成 CLI 层 `npm link` 冒烟。

### 6.8 README 与 handoff 同步

- [x] README 顶部"现状声明"段:
  - 从"手动 cp"切到 `npx @ecc-hgy/ae init` + `/ae-init` 两步说明
  - 删除 `cp -r` 那段,或挪到"高级:不通过 npm"
  - 增加一段"它在 npm CLI 里只做安装;真正的初始化逻辑在 Claude Code 跑 `/ae-init` 时执行",让用户预期一致
- [x] README 加 badges:`npm version`、`license`、(暂不加 CI,阶段 3 再说)
- [x] README 路线图:阶段 2 划掉,阶段 3 描述更新
- [x] `handoff.md`:
  - "已完成"段加阶段 2 完成项
  - "下次起手建议"指向阶段 3 `ae-index-rebuild` markdown contract
  - "关键文件入口"表加 `package.json`、`bin/ae.js`、`src/cli.js`、`tests/`

### 6.9 发布前 checklist

- [ ] `npm login`(用户操作,首次)
- [ ] `npm whoami` 确认账号
- [ ] `npm access ls-packages @huguiyuan` 或 web 端确认 scope `@huguiyuan` 已注册可用;若未注册,先在 npmjs.com 创建
- [x] `npm pack --dry-run` 查看 tarball 文件清单:
  - 必含:`bin/`、`src/`、`commands/`、`skills/`、`config/`、`README.md`、`LICENSE`、`package.json`
  - 不应含:`tests/`、`docs/`、`design/`、`方案/`、`reference/`、`.git/`、`handoff.md`
- [x] `npm pack` 真打包,记录 tarball 体积。预期 < 500 KB(skills 是主体),> 2 MB 需调查
- [x] 解包 tarball,人工抽检:`.claude/commands/ae-init.md` 等内容正确

打包结果:
- `npm pack --dry-run` 通过
- `npm pack` 生成 `huguiyuan-ae-0.1.0.tgz`
- package size:45.7 kB;unpacked size:123.6 kB;total files:44
- tarball 不包含 `tests/`、`docs/`、`design/`、`方案/`、`handoff.md`

### 6.10 npm publish

- [ ] `npm publish --access public`
- [ ] 在干净机器 / 干净目录:`npx @ecc-hgy/ae@0.1.0 --version` 验证拉得到
- [ ] 干净目录:`npx @ecc-hgy/ae init` 跑一次完整链路,逐项核对 6.7 的产物
- [ ] npmjs.com 页面信息核对:description、README 渲染、files 清单

说明:npm 发布需要用户账号登录、scope 可用性确认与外部发布操作,本次未自动执行。

### 6.11 git 收口

- [x] `git status` 核对:`package.json`、`bin/`、`src/`、`tests/`、README/handoff 改动
- [x] `git add` 上述
- [x] 提交,信息:
  ```
  feat(cli): implement npm CLI for asset distribution (stage 2)

  - Pure ESM, zero-dep. Commands: init, ingest-mother.
  - Route a: CLI only copies commands/skills/config; spec/ scaffold
    remains the job of `/ae-init` inside Claude Code.
  - Adds tests/ with node:test end-to-end coverage.
  ```
- [x] `git tag -a v0.1.0 -m "Initial npm release"`
- [ ] `git push && git push --tags`(若已配 remote)

说明:本地提交与 tag 由本次阶段 2 收口执行;push 留给用户确认后再做。

### 6.12 阶段 2 人工 check(由你完成)

- [ ] 通读 `src/cli.js` + `src/commands/*.js`,确认逻辑边界与路线 a 一致(无任何创建 spec/ 或渲染入口文件的行为)
- [ ] `npx @ecc-hgy/ae init` 在你自己一个真实新项目里跑一遍,从 npm 装到 Claude Code `/ae-init` 完成,体验顺畅
- [ ] 检查 npmjs.com 页面没有泄露 `design/` `方案/` `handoff.md` 等仓库内文件
- [ ] 若包体积异常或安装速度不佳,记录到 §7 阶段 3 优化清单

## 7. 阶段 3:长尾

- `ae update` 子命令:用于已 `setup` 项目升级 skills / templates / rules starter,避免把升级语义塞回 `setup` 或 `init`
- `ae index-rebuild` 子命令:`spec/INDEX.md` 重建规则与 CLI 实现
- 12 个 skill 的最后一轮 cross-check
- 如有意推广:`CONTRIBUTING.md`、GitHub Actions(CI 跑 `npm test`)
- 跨平台:Windows 路径与权限验证(v0.2 目前仅 macOS 验证)

---

阶段 1 尾巴(删 `方案/` + 通读 `docs/framework.md` / `README.md`)由用户自行收口,不阻断阶段 2 开干。
