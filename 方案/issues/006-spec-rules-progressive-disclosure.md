# Issue 006: spec-framework 规则未随包覆盖;改用渐进式披露下放到 spec/AGENTS.md

## 状态

- 状态:已实现并本地验证通过,随下次发布上 npm
- 优先级:P1
- 发现时间:2026-06-14
- 发现方式:`docs/` 中文化后,用户人工逐条 check skill / 模板对 `spec-framework.md` 规则的覆盖

## 收口结果(2026-06-14)

- 新增模板:`templates/entries/spec/{AGENTS.md,CLAUDE.md}` + `templates/entries/spec/ADR/{AGENTS.md,CLAUDE.md}`
- `src/skeleton.js` `ENTRY_FILES` 追加 4 路径;`renderEntryFiles` 幂等逻辑不变
- skills 去悬空:8 处 `spec-framework.md` → `spec/AGENTS.md`(7 文件);7 处 `/ae-index-rebuild` → `ae index-rebuild`(6 skill);grep 确认无残留
- spec/AGENTS.md 的章节名(`## INDEX 推导规则` / `## frontmatter` / `## 边界规则`)与 skill 内 `§...` 引用对齐,引用可解析
- 文档同步:`docs/framework.md`、`docs/scenarios/s0-bootstrap.md` 骨架/入口清单补 4 文件;`docs/spec-framework.md` 顶部标注其可执行子集随包;`CHANGELOG.md` Unreleased 记录
- 测试:`tests/init.test.js` 新增 spec 渐进式披露断言 + 4 文件落盘断言;`tests/skeleton.test.js` fixture 补 4 模板;`npm test` 22 全绿
- 本地验证:`npm pack --dry-run` 含 4 新模板;真实 `ae setup && ae init` 4 文件落地、推导表 / ADR 状态机在场
- 仍 pending:`ae index-rebuild` 命令未实现(R1 已降级措辞);嵌套 AGENTS.md 加载行为待真实 session 抽检;未 `npm publish`

## 覆盖地图复核(实现后,2026-06-14 二次验证)

> 注:下表部分证据列指向 `spec/AGENTS.md §小节`,这些小节在后续「二次精简」中已删除/搬家(见文末「二次精简」)。规则仍随包,只是落点变了。

对「重新梳理的覆盖地图」逐项复核,grep 真实 `ae init` 渲染产物为证:

| 缺口 / 项 | 原 | 现 | 证据(随包渲染文件) |
|-----------|----|----|------|
| G1 skill 悬空引用 `spec-framework.md` | ❌ | ✅ | 8 处改 `spec/AGENTS.md`;grep skills 无残留 |
| G2 当前节点推导表未内联 | ❌ | ✅ | `spec/AGENTS.md` §INDEX 推导规则(含条件→节点表) |
| G3 R1 落盘后同步 INDEX | ❌ | ✅ | `spec/AGENTS.md` §R1 |
| G4 `/ae-index-rebuild` slash 引用 | ❌ | ✅ | 7 处改 `ae index-rebuild`;grep 无残留 |
| **G4 `ae index-rebuild` 命令** | ❌ | ⏳ **仍 pending** | 命令未实现(见「ae index-rebuild 现状」);R1 已降级措辞 |
| debug 主题 kebab / ADR `NNNN` 4 位 | ⚠️ | ✅ | `spec/AGENTS.md` 命名规范 / `spec/ADR/AGENTS.md` |
| ADR `proposed/accepted/superseded` | ⚠️ | ✅ | `spec/ADR/AGENTS.md` 状态机 |
| ADR `date` / `supersedes` frontmatter | ❌ | ✅ | `spec/ADR/AGENTS.md` frontmatter |
| todo `x/N`、INDEX 不手编 | ⚠️ | ✅ | `spec/AGENTS.md` §INDEX 推导规则 |
| README≠INDEX | ❌ | ✅ | `spec/AGENTS.md` §README 形态 |
| issues 单需求 + 跨需求应对 | ⚠️ | ✅ | `spec/AGENTS.md` §边界规则 |
| `archived→active` 禁止 | ❌ | ⏸️ **暂不做** | 用户表态暂不考虑 |

**结论**:覆盖地图全部缺口已解决,仅剩两项**有意保留**——`ae index-rebuild` 命令(独立 CLI 特性,另排)与 `archived→active`(用户暂不考虑)。

**二次验证**:`npm test` 22 全绿;`npm pack --dry-run` 含 4 模板;真实 `ae init` 渲染产物 grep 17 条规则 token 全部命中;skills 无 `spec-framework.md` / `/ae-index-rebuild` 残留。

## 二次精简(2026-06-14):spec/AGENTS.md 进一步瘦身

二次验证后复核发现 `spec/AGENTS.md` 大量重复 skills 已随包的规则,且头部还引用了不随包的 `docs/spec-framework.md`(本身即一条悬空引用)。按「越简单越精简」原则瘦身,只保留**不可替代的核心**:`## 总领` + `## INDEX 推导规则` + `## R1`。

被删小节与其规则的新落点:

| 删掉的小节 | 规则现在的单点落点 |
|-----------|------------------|
| 头部 `docs/spec-framework.md` 引用 | 删除(消除悬空) |
| `## 命名规范` | 需求目录 kebab → `to-prd`;状态值 → to-prd frontmatter;debug 主题 kebab → `diagnose` 出口契约;ADR `NNNN-` → `spec/ADR/AGENTS.md` |
| `## frontmatter` | prd → `to-prd`;design → `writing-plans`;todo 无 frontmatter → `todo-template`;issues 无 frontmatter → `issue-7-sections.md` |
| `## 状态机` | `to-prd` / `writing-plans` / `verification-before-completion` / `review` |
| `## README 形态` | README≠INDEX + 全局架构画大流程图 → `spec/README.md`(在场) |
| `## 边界规则` | prd/design/多需求→ADR/todo 派生 → 各 skill;**issues 跨需求应对 → 丢弃**(真跨需求极罕见,默认单需求隐含) |

配套防悬空:`todo-template.md` 删掉两处 `spec/AGENTS.md §frontmatter` / `§边界规则` 交叉引用(规则正文本就完整);`diagnose` 出口契约补 `<topic>` kebab-case。

grep 复验:skills 内对 `spec/AGENTS.md` 的引用只剩 `§INDEX 推导规则`(保留)与文件级引用(总领承接);无 `§frontmatter` / `§边界规则` 悬空;渲染产物里 spec/AGENTS.md 只含 总领 / INDEX / R1。

**INDEX 列含义补全与放置(撰写规范归属判定的应用)**:此前缺一项——INDEX 各列(prd/design/todo/issues)填什么没有随包说明(设计稿示例表不随包)。补全后按"撰写规范放哪"的判定:它是 **INDEX 文件本地的撰写说明、无 skill 引用** → 作**内联注释**放入 `spec/INDEX.md`(Option ①,就近在场)。而 `§INDEX 推导规则`(`当前节点` 推导表)是**跨文档、被 5 个 skill 引用**的逻辑 → 留在 `spec/AGENTS.md`(Option ②)。两者职责清晰、不重复。

## ae index-rebuild 现状

**不存在。** `src/commands/` 只有 `init.js` / `setup.js`;`src/cli.js` 只路由 `setup` / `init`,`ae index-rebuild` 返回 `Unknown command: index-rebuild`。

目前它只作为**未来兜底**被引用(skills + `spec/AGENTS.md` §R1 写"未来可用 `ae index-rebuild` 幂等重扫")。要实现时:

- 新建 `src/commands/index-rebuild.js`:扫 `spec/needs/*/` 的 frontmatter + todo 勾选 + issues 状态,按「当前节点推导表」重算并写回 `spec/INDEX.md`(幂等,输出 diff 报告)
- `src/cli.js` 加一条 `index-rebuild` 路由分支

属阶段 3 长尾,本 issue 不含;在此之前 R1 用"按推导表手动重算"兜底。

## 背景

`docs/spec-framework.md` 沉淀了大量 spec 规则(命名、frontmatter、状态机、INDEX 格式与当前节点推导、README 形态、边界规则、INDEX 兜底)。但这份文档**不随 npm 包发布**:`package.json` 的 `files` 只含 `bin / src / skills / templates / README.md / LICENSE`,不含 `docs/`。

与此同时,8 处已发布 skill 用 `per spec-framework.md §...` 引用这些规则。结果:skill 装进用户项目的 `.claude/skills/`,却让 agent 去查一份用户项目里**根本不存在**的文档——悬空引用。

## 实际问题

规则没有完整进入"已发布的包"。具体覆盖见下节。最实质的两个缺口:

- **当前节点推导表**(条件→节点)只活在不随包的 doc 里,5 个 skill 只写"按 spec-framework.md 重算",没有任何随包资产承载这张表。
- **R1「落盘 spec/needs 后必须同步 INDEX」** 跨切规则,spec-framework 说它该进 `AGENTS.md`,但发布的 `templates/entries/AGENTS.md` 的 `## Project-Specific Rules` 是空占位。

## 重新梳理的覆盖地图

图例:**✅ 已随包** / **⚠️ 部分** / **❌ 缺口**。证据为审计时的 `文件:行`。

### 1. 命名规范

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| 需求目录 kebab-case | ✅ | `to-prd:16` |
| debug 主题文件 kebab-case | ⚠️ | 只引用 `<topic>.md`(`diagnose:21`),无 kebab 明文 |
| ADR `NNNN-<标题>.md` 4 位序号 | ⚠️ | 用 `NNNN-<title>.md`(`review:90`/`writing-plans:98`),"4 位"未强调 |
| 状态值小写三选一 | ✅ | frontmatter 注释 `to-prd:82` |
| ADR 状态 `proposed/accepted/superseded` | ⚠️ | proposed/accepted 有,**superseded 全无** |

### 2. frontmatter 规范

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| prd.md frontmatter(status/last-aligned/related-needs) | ✅ | `to-prd:82-84` |
| design.md frontmatter | ✅ | `writing-plans:47-49` |
| 字段语义 | ✅ | `to-prd:90-93`、`writing-plans:69-70` |
| todo.md 无 frontmatter | ✅ | `to-issues/todo-template.md` |
| issues 无 frontmatter + 7 段 | ✅ | `diagnose/assets/issue-7-sections.md` |
| ADR frontmatter `date` / `supersedes` 字段 | ❌ | 任何 skill 都没给;只出现 `status: proposed` |

### 3. 状态转换规则

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| `draft → active`(须用户对齐) | ✅ | `to-prd:90`、`writing-plans:69` |
| `active → archived`(不删文件) | ✅ | `to-prd:91`、`writing-plans:70` |
| archived 仅用于被取代非完成 | ✅ | `verification-before-completion:140`、`review:108` |
| 不存在 `archived → active` | ❌ | 无 skill 明文(**本轮暂不考虑,见决策**) |
| ADR `proposed→accepted→superseded` | ⚠️ | 前两态有,superseded 转换无 |

### 4. INDEX 格式 + 推导

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| INDEX 表格 + `当前节点` 列形态 | ✅ | `templates/entries/spec/INDEX.md`(空表头壳) |
| 落盘后同步 INDEX 行 | ✅ | 各节点 skill |
| 跨需求引用从 `related-needs` 聚合 | ✅ | `to-issues:19`、`review:48` |
| **「当前节点」推导表(条件→节点)** | ❌ **G2** | 仅 5 处引用 `spec-framework.md §INDEX 推导规则`,表本身未内联 |
| todo 进度 `已勾/总数`、无则 `-` | ⚠️ | 约定只在 spec-framework |
| INDEX 是推导态、不手编当前节点列 | ⚠️ | 未随包明文 |

### 5. README 格式

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| ASCII 三类图 | ✅ | `templates/entries/spec/README.md`(三段 TODO 占位) |
| README 不是 INDEX 镜像 | ❌ | 模板无此提醒 |

### 6. 边界规则

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| prd 写 WHAT 不写 HOW | ✅ | `to-prd:104-107` |
| design 写局部技术方案 | ✅ | `writing-plans:115` |
| 多需求决策 → 升 ADR | ✅ | `writing-plans:98`、`to-prd:108`、`review:90` |
| 全局架构总览 → README 大流程图 | ⚠️ | 间接,未明文 |
| todo 派生 / 打勾不删 / 不超 design | ✅ | `to-issues/todo-template.md:22` |
| issues 默认单需求 | ⚠️ | diagnose 隐含,跨需求应对规则未随包明文 |

### 7. INDEX 兜底机制 + 悬空引用

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| `index-rebuild` 命令 | ❌ **G4** | 5 skill 当兜底引用,`src/commands/` 只有 init/setup,**未实现**;`to-prd:18` 还引用废弃的 slash 形态 `/ae-index-rebuild` |
| AGENTS.md R1 规则(落盘后同步 INDEX) | ❌ **G3** | `templates/entries/AGENTS.md` 的 Project-Specific Rules 空占位 |
| 8 处引用 `spec-framework.md`(不随包) | ❌ **G1** | review/tdd/to-issues/to-prd/writing-plans/verification 都让 agent 查一份不存在的文档 |

### 8. handoff 时机

| 规则 | 覆盖 | 证据 / 说明 |
|------|------|------|
| handoff 覆盖不追加、只存快照 | ✅ | `handoff:11` |
| 仅会话结束触发、S1 节点只更 INDEX | ✅ | handoff skill 性质 + 各节点 skill |

### 缺口汇总

- **G1**:8 处 skill 悬空引用 `spec-framework.md`(用户项目无此文件)
- **G2**:INDEX「当前节点推导表」未内联到任何随包资产(最实质)
- **G3**:AGENTS.md 模板缺 R1「落盘后同步 INDEX」跨切规则
- **G4**:`index-rebuild` 未实现 + `to-prd` 引用废弃的 `/ae-index-rebuild`
- **小**:ADR `superseded` 状态、ADR `date`/`supersedes` 字段、README≠INDEX、issues 跨需求应对——未随包

## 问题澄清(回应人工 check)

逐条回答 check 中的提问,确保后续口径一致。

1. **「当前节点推导表」作用是啥**:由各文件状态(prd/design 的 status、todo 勾选、issues 状态)推出"该需求当前在 A1…B7 哪一步",让 INDEX 一眼看到进度,而不必在 frontmatter 里存阶段标签。被 5 个 skill 共用 → 应**单点抽出**,放 `spec/AGENTS.md`。

2. **`ae index-rebuild` 作用是啥、是不是更新 INDEX**:是。它是一个纯计算、幂等的命令:扫 `spec/` 全目录,按推导表**重算并写回 INDEX.md**。作用是兜底——防 skill 漏更新或人工手改导致 INDEX 陈旧。当前**未实现**。

3. **todo 进度 `x/N` 是不是当前 need 的节点位次**:**不是**。`x/N` 是 A5 执行内部"已勾切片 / 总切片"的子进度;S1 节点是 INDEX 里**另一列**「当前节点」。例:`1/8` = 已经到 A5、8 件实现任务做完 1 件(不是"需求对齐"——需求对齐是 A1,那时 todo.md 还没生成,todo 列显示 `-`);`8/8` = 实现全做完 → 推进到 A6 verify(还**不算"完成"**,完成要再过 verify + 用户验收 B1)。

4. **"INDEX 是推导态、不手编当前节点列" / "未明文 shipped" 啥意思**:「当前节点」这一格是**算出来的**,不要手敲;要让它变,就去改底层文件(或跑 rebuild)让它重新推导。"未明文 shipped" = 这条"别手编"的规则**没写进任何随包资产**,只活在不随包的 `docs/spec-framework.md` 里。

5. **issues 单需求 + "未明文 shipped" 啥意思**:一个 debug issue 文件**默认只属于一个需求**(挂在该需求的 `issues/` 下)。极少数真跨多需求的情形 = 选一个主需求挂 + 在 7 段格式的分析段里列出其他涉及需求,**不**建全局 `integration/` 目录。`diagnose` 只是隐含按单需求处理,但没把这条规则写进任何随包文件。

## 决策定锚(2026-06-14 用户拍板)

1. **采用渐进式披露,不做成 skill**。spec 规则是**参考**不是**流程**:skill 适合"做 X→Y"的流程、靠 description 命中才触发(不可靠);`spec/AGENTS.md` 由**目录上下文自动加载**(Codex 就近合并 AGENTS.md;Claude Code 进入子树拉取该目录 AGENTS.md/CLAUDE.md),工作在 `spec/` 下时必然在场。沿用项目既有 `AGENTS.md=源 / CLAUDE.md=指针` 约定,零新机制。
2. **不新增"总领" skill**:由 `spec/AGENTS.md` 顶部一段 S1 节点→产物→skill 简表 + 两道硬门禁承担总领。
3. **ADR 走独立 `spec/ADR/AGENTS.md`**:ADR 由 3 个 skill 创建(writing-plans / review / improve-codebase-architecture)= 多处,按"多处则在子目录加 AGENTS.md"的规则下放,只在动 `spec/ADR/` 时才加载 ADR 细则。
4. **`docs/spec-framework.md` 保留**为仓库内方法论设计稿(设计立意 / 验证 / 已知限制);`templates/entries/spec/AGENTS.md` 是它的**可执行子集**。两者保持同步(写进维护规则)。
5. **暂不写** `archived → active` 禁止规则(用户表态暂不考虑)。
6. **`ae index-rebuild` 仍 pending**:本 issue 不实现该命令;R1 规则降级措辞为"不确定就按推导表手动重算(或未来 `ae index-rebuild`)"。

### 为什么不做成 skill

- 规则是查阅型内容,需要"在场即生效",而非"被调用才执行"。auto-load 的 AGENTS.md 命中率 100%,skill 命中率取决于 description 与上下文。
- 已有 13 个 skill 都在各自节点引用规则,真正缺的是一个"在场的单点规则源",这正是 AGENTS.md 的职责,不是再加一个 skill。

## 详细方案

### 新增 4 个渲染模板(渐进式披露)

| 新文件 | 内容要点 |
|--------|---------|
| `templates/entries/spec/AGENTS.md` | ① 总领:S1 节点→产物→skill 简表 + 两道硬门禁;② 命名规范(含 debug 主题 kebab);③ prd/design frontmatter + todo 无 frontmatter;④ 三态状态机;⑤ INDEX 格式 + **当前节点推导表**;⑥ README 三图形态 + "README≠INDEX";⑦ 边界规则(prd/design/todo/issues 单需求);⑧ **R1:落盘 spec/needs 后同步 INDEX,不确定按推导表手动重算(或未来 `ae index-rebuild`)** |
| `templates/entries/spec/CLAUDE.md` | 3 行指针:`Always read [AGENTS.md](./AGENTS.md)`,镜像根目录约定 |
| `templates/entries/spec/ADR/AGENTS.md` | ADR 专属:`NNNN-<title>.md`(4 位序号)命名;状态机 `proposed→accepted→superseded`;frontmatter `status / date / supersedes` |
| `templates/entries/spec/ADR/CLAUDE.md` | 3 行指针 |

### CLI 改动(小)

- `src/skeleton.js` 的 `ENTRY_FILES`(L23-30)追加这 4 个路径;`spec/ADR/` 已在 `SKELETON_DIRS`,`renderEntryFiles` 幂等与占位符逻辑无需改。
- `spec/ADR/` 若有了 AGENTS.md,可考虑从 `GITKEEP_DIRS` 移除(非必须,留着无害)。

### skill 改动(仅去悬空,不把规则塞回 skill)

- 8 处 `spec-framework.md` → 改指向 `spec/AGENTS.md`(用户项目真实存在):`to-prd`、`writing-plans`、`to-issues`、`tdd`、`verification-before-completion`、`review`、`to-issues/todo-template.md`。
- `to-prd:18` 的废弃 `/ae-index-rebuild`(slash 形态)→ `ae index-rebuild`。
- §命名 / §ADR / superseded 等细则**写进新模板,不回填 skill**,保持 skill 精简、规则单点。

### 与现有文档的关系

- `docs/framework.md` / `docs/spec-framework.md`:加一句"用户项目里规则由 `spec/AGENTS.md` 渐进式披露承载"。
- `docs/scenarios/s0-bootstrap.md`:标准骨架 + 入口文件清单补上新增的 spec 级 AGENTS.md/CLAUDE.md。

## 实施 Todo

### 阶段 A:模板

- [ ] 写 `templates/entries/spec/AGENTS.md`(从 `docs/spec-framework.md` 抽可执行子集,中文)
- [ ] 写 `templates/entries/spec/CLAUDE.md`(指针)
- [ ] 写 `templates/entries/spec/ADR/AGENTS.md`(ADR 细则)
- [ ] 写 `templates/entries/spec/ADR/CLAUDE.md`(指针)

### 阶段 B:CLI + 测试

- [ ] `src/skeleton.js` `ENTRY_FILES` 追加 4 路径
- [ ] `tests/init.test.js` 加断言:init 后 4 个文件渲染、内容含关键串(推导表标题 / R1 / ADR 状态机);二次 init 幂等不覆盖
- [ ] `npm test` 全绿

### 阶段 C:skill 去悬空

- [ ] 8 处 `spec-framework.md` → `spec/AGENTS.md`
- [ ] `to-prd` 的 `/ae-index-rebuild` → `ae index-rebuild`
- [ ] grep 确认 skills 内无残留 `spec-framework.md` 悬空引用

### 阶段 D:文档同步

- [ ] `docs/framework.md` / `docs/spec-framework.md` / `docs/scenarios/s0-bootstrap.md` 同步渐进式披露说明 + 新入口文件
- [ ] `CHANGELOG.md` `## Unreleased` 追加该项
- [ ] `handoff.md` 覆盖更新

### 阶段 E:本地验证

- [ ] `npm pack --dry-run` 文件清单含 4 个新模板
- [ ] 空目录 `ae setup && ae init`:`spec/AGENTS.md`、`spec/ADR/AGENTS.md` 等落地,内容正确
- [ ] 真实 session 抽检:在 `spec/` 下工作时,Claude Code / Codex 是否加载到 `spec/AGENTS.md`(见开放问题)

## 验收标准

- `ae init` 后用户项目含 `spec/AGENTS.md`、`spec/CLAUDE.md`、`spec/ADR/AGENTS.md`、`spec/ADR/CLAUDE.md`,内容覆盖上述缺口(尤其推导表 + R1 + ADR 状态机/frontmatter)
- skills 内无 `spec-framework.md` 悬空引用;无 `/ae-index-rebuild` slash 形态
- `npm test` 全绿;`npm pack` 含新模板
- `docs/spec-framework.md` 仍是仓库内设计稿,与模板子集口径一致

## 开放问题

- **嵌套 AGENTS.md / CLAUDE.md 的加载行为**:渐进式披露依赖"工作在 `spec/` 子树时,agent 会加载该目录的 AGENTS.md/CLAUDE.md"。Codex 文档支持就近合并;Claude Code 子目录加载需**真实 session 抽检**确认(参照 Issue 005 把指针验证作为发布后人工抽检、不阻断落地的处理方式)。若某平台不自动加载,退路:在根 `AGENTS.md` 留一行指针指向 `spec/AGENTS.md`。
- **模板与 `docs/spec-framework.md` 的同步成本**:两份需手动保持一致;后续可考虑由单一源生成,暂手工维护并在两处互相注明。
