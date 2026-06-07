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
| `/ae-init` 命令契约 | `agentic-engineering/.claude/commands/ae-init.md` | ✅ |
| `/ae-init` 入口模板 | `agentic-engineering/.claude/commands/ae-init.templates/` | ✅(README/AGENTS/CLAUDE/handoff 四份) |
| `/ae-init` 验收脚本 | `agentic-engineering/.claude/commands/ae-init.test.sh` | ✅ |
| `/ae-ingest-mother` 命令契约 | `agentic-engineering/.claude/commands/ae-ingest-mother.md` | ✅ |
| 规则注入示例 | `agentic-engineering/config/ae-rules.md.example` | ✅ |
| 已改造的 12 个 skill | `方案/skill-candidates/{mattpocock,superpowers}/...` | ✅ |

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

### 4.1 资产搬迁(commands / config)

- [ ] 在仓库根新建 `commands/`
- [ ] 把 `agentic-engineering/.claude/commands/ae-init.md` 移到 `commands/ae-init.md`
- [ ] 把 `agentic-engineering/.claude/commands/ae-init.templates/` 整目录移到 `commands/ae-init.templates/`
- [ ] 把 `agentic-engineering/.claude/commands/ae-init.test.sh` 移到 `commands/ae-init.test.sh`
- [ ] 把 `agentic-engineering/.claude/commands/ae-ingest-mother.md` 移到 `commands/ae-ingest-mother.md`
- [ ] 在仓库根新建 `config/`
- [ ] 把 `agentic-engineering/config/ae-rules.md.example` 移到 `config/ae-rules.md.example`
- [ ] 删除空的 `agentic-engineering/` 子目录(及其 `.claude/`、`config/` 空壳)
- [ ] 核对:`commands/ae-init.md` 中对 `ae-init.templates/` 的相对路径引用仍然成立(应该仍是相对当前文件的同层目录,无需改)

### 4.2 资产搬迁(skills 平铺)

- [ ] 在仓库根新建 `skills/`
- [ ] 把 §2.2 的 12 个 skill **整目录拷贝**到 `skills/<skill-name>/`,源路径来自 `方案/skill-candidates/...`,保留各自的 `SKILL.md`、`assets/`、`scripts/`、附属 `*.md`
  - 拷贝(非移动)的目的:`方案/` 全程保留原貌,便于阶段 1 末尾人工对照
- [ ] 拷贝完成后,`grep -rn "AE-CHANGE" skills/` 应返回空——如有残留,据 customization-plan 的人工 check 注释清理掉
- [ ] 核对 12 个 skill 各自的 SKILL.md frontmatter 仍合法(`name:`、`description:` 必填)

### 4.3 文档改写(docs)

- [ ] 在仓库根新建 `docs/`
- [ ] 把 `方案/spec-framework.md` **拷贝**到 `docs/spec-framework.md`(语气保持现状,后续 README 中链向它)
- [ ] 新建 `docs/scenarios/`
- [ ] 把 `方案/scenarios/s0-bootstrap.md` **拷贝**到 `docs/scenarios/s0-bootstrap.md`
- [ ] 把 `方案/scenarios/s1 deep-orbiting-fog.md` **拷贝**到 `docs/scenarios/s1-main-loop.md`(文件名脱掉项目内昵称,改为语义清晰名)
- [ ] 由 `方案/immutable-booping-sutherland.md` 改写出 `docs/framework.md`:
  - 去掉"草稿口吻"和项目内昵称(immutable-booping-sutherland 这类代号)
  - 语气改为面向使用者:这套方法论是什么、三场景结构、怎么入门
  - 保留三场景 + 两道硬门禁这些固化结论
  - 链向 `docs/scenarios/*` 与 `docs/spec-framework.md`

### 4.4 设计档案(design)

- [ ] 在仓库根新建 `design/skill-candidates/`
- [ ] 把 `方案/skill-candidates/README.md` **拷贝**到 `design/skill-candidates/README.md`
- [ ] 把 `方案/skill-candidates/customization-plan.md` **拷贝**到 `design/skill-candidates/customization-plan.md`
- [ ] 不拷贝 12 个 skill 的源文件——它们已经在 `skills/` 落位,避免双份

### 4.5 顶层文档

- [ ] 写 `README.md`(对外):
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
- [ ] 写 `LICENSE`(MIT,作者署名见 §5 待拍板)
- [ ] 更新 `handoff.md`:
  - "已完成"段加上"阶段 1 仓库结构整理完成"
  - "下次起手建议"指向阶段 2 CLI 实现
  - 顶部"关键文件入口"表更新为新路径(`commands/...`、`skills/...`、`docs/...`)

### 4.6 .gitignore 与 git 收口

- [ ] 确认 `.gitignore` 排除:`reference/`、`CES-AI-topic-9-smart-workflow/`、`历史思路/`、`.DS_Store`
- [ ] `git status` 核对:`commands/` `skills/` `config/` `docs/` `design/` 是新增;`agentic-engineering/` 子目录消失;`方案/` 无变动
- [ ] `git add` 上述新增目录与改动文件
- [ ] 提交,建议信息:
  ```
  chore: restructure repo for npm CLI distribution (stage 1)

  - Hoist commands/, skills/, config/ to repo root as flat asset layers.
  - Copy framework docs into docs/ and design archives into design/.
  - Keep 方案/ untouched pending manual review.
  ```
- [ ] **不打 tag**,等阶段 2 CLI 完成后 `v0.1.0`

### 4.7 人工 check(由你完成,清单先备好)

- [ ] 对比 `skills/` 与 `方案/skill-candidates/` 下 12 个 skill 的内容,确认拷贝无遗漏、无脏内容
- [ ] 通读 `docs/framework.md`,确认对外语气可接受
- [ ] 通读 `README.md`,确认"它是什么 / 怎么用 / 局限"三件事讲清楚了
- [ ] check 通过后,**手动**删除 `方案/`,补一次 commit:`chore: drop 方案/ after manual review`

## 5. 阶段 1 启动前待你拍板

1. **作者署名**:LICENSE 用谁?(GitHub handle / 真名 / 邮箱)
2. **README 里的 npm scope**:阶段 2 才用,但 README 路线图段会提到。先占位 `@<your-scope>/ae`?还是先确定下来(`@huguiyuan/ae` / 别的)?
3. **`reference/` 是否进 `.gitignore`**:体量大、是只读素材,建议进。但要先核当前 git 是否已经 add 了——若已 tracked,需要 `git rm -r --cached reference/` 才能让 .gitignore 生效。
4. **handoff.md 与 commands/ae-init.templates/handoff.md 的关系**:后者是 `/ae-init` 拷给用户的初始 handoff 模板,前者是本仓库自己的会话交接。两份独立,确认 OK。

## 6. 阶段 2 / 阶段 3 预告(本次不做)

### 阶段 2:npm CLI 实现 + 发布
1. `package.json` + `bin/ae.js` + `src/`(TypeScript 或纯 JS,参照 OpenSpec)
2. CLI 子命令:`init` / `ingest-mother` / `index-rebuild`
3. CLI 行为:按 §1 的映射规则把 `commands/` `skills/` `config/` 拷到用户 cwd 对应位置,幂等
4. 本地 `npm link` 自测,跑现有 `commands/ae-init.test.sh` 验收
5. 发布到 npm
6. README 把"手动 cp"段替换为 `npx @<scope>/ae init`

### 阶段 3:长尾
- `commands/ae-index-rebuild.md` 命令本体(`spec/INDEX.md` 重建规则)
- 12 个 skill 的最后一轮 cross-check
- 如有意推广,补 `CONTRIBUTING.md` 与 GitHub Actions

---

回答完 §5 这 4 个问题即可开干。
