# spec/ 目录规范

> 框架索引:[immutable-booping-sutherland.md](immutable-booping-sutherland.md) · 场景定义 / [scenarios/s1 deep-orbiting-fog.md](scenarios/s1%20deep-orbiting-fog.md)

## 设计立意

- **切片单位 = 需求**(不是业务模块):工作流的天然推进单位
- **双入口、双受众**:INDEX 给模型读,README 给人读
- **三态固化**:`draft | active | archived`,只有这三个值,不允许自由发挥
- **进度由数据组合推导,不再加阶段标签**:status 字段保持单文件粒度;"当前在哪一步"由 INDEX 从各文件状态推导,不入 frontmatter
- **职责分离**:INDEX = 项目结构态(各节点自动维护);handoff.md = 会话交接态(focus / 待裁决 / 下一步,仅在会话结束时由 handoff skill 触发)
- **横切类不混入需求**:全局决策、跨需求主题各有独立去处
- **专为中小项目**:大型项目(prd > 200 行 / design > 300 行)留升级口子,v0.1 不实现

---

## 目录骨架

```
spec/
├── README.md                 # 给人看:项目地图 + ASCII 流程图
├── INDEX.md                  # 给模型看:需求/ADR 索引 + 状态(由 skill 助维护)
│
├── needs/                    # 需求(主体)
│   ├── <需求名>/             # kebab-case,如 order-list-sort
│   │   ├── prd.md            # A2 产物:业务需求(WHAT),有 frontmatter
│   │   ├── design.md         # A3 产物:技术方案 + 局部架构(HOW),有 frontmatter
│   │   ├── todo.md           # A4 产物:任务清单,滚动维护,无 frontmatter
│   │   └── issues/           # 场景 B 产物:本需求的debug 主题文件
│   │       └── <主题>.md     # 7 段格式
│   └── ...
│
└── ADR/                      # 全局/横切决策
    └── NNNN-<标题>.md        # 如 0001-postgres-as-primary-store.md
```

---

## 命名规范

| 对象 | 规则 | 示例 |
|------|------|------|
| 需求目录 | kebab-case,动名词或名词短语 | `order-list-sort` / `user-profile-edit` |
| debug 主题文件 | kebab-case,描述问题主题 | `sort-result-wrong.md` / `payment-timeout.md` |
| ADR 文件 | `NNNN-<标题>.md`,4 位序号 | `0001-postgres-as-primary-store.md` |
| 状态值 | 三选一,小写 | `draft` / `active` / `archived` |
| ADR 状态值 | 三选一,小写(ADR 行业惯例) | `proposed` / `accepted` / `superseded` |

---

## frontmatter 规范

### prd.md / design.md(需求层 + 技术层)

```yaml
---
status: active                 # draft | active | archived
last-aligned: 2026-06-06       # 最近一次与用户对齐的日期
related-needs: [<其他需求名>]  # 涉及哪些其他需求;空则省略此字段
---
```

**字段语义**:
- `status`:三态固化。draft = 起草未对齐;active = 已对齐已落盘当前有效;archived = 已废弃或被取代
- `last-aligned`:用于判断 spec 是否陈旧;改动 prd/design 时同步更新
- `related-needs`:跨需求时填,作为"模块割裂"的兜底;INDEX 可据此聚合视图

### todo.md(任务清单)

**不要 frontmatter**——它是工作中的活产物,不走三态。

格式建议(轻量,非强制):
```markdown
# Todo - <需求名>

> 派生自:prd.md + design.md

## 实施
- [ ] T1 ...
- [ ] T2 ...
- [x] T3 ...

## 阻塞 / 待澄清
- B1 ...
```

### ADR 文件

```yaml
---
status: accepted               # proposed | accepted | superseded
date: 2026-06-06
supersedes: 0000-xxx.md        # 若取代旧 ADR 才填
---
```

### issues/ 下的debug 主题文件

不用 frontmatter,直接按 7 段格式写。状态用文末"用户验收状态"段表达。

---

## 状态转换规则

### prd.md / design.md

```
draft ─► (与用户对齐) ─► active ─► (被取代/废弃) ─► archived
```

- `draft → active`:必须经过 A1 / A3 的用户对齐;skill 自动写入需带"对齐已完成"标记
- `active → archived`:出现新版本或需求废弃时;不删除文件(保留 git 历史外的可读历史)
- **不存在 archived → active**:重新启用时新建版本

### ADR

```
proposed ─► (评审接受) ─► accepted ─► (新 ADR 取代) ─► superseded
```

---

## INDEX.md 格式(给模型看)

由 A2 / A3 / A4 / A5 / A6 / B4 / B7 等节点 skill 完成后追加/更新,人工补漏。

### 推荐格式(表格 + 当前节点列)

```markdown
# spec 索引

## 需求

| 需求名               | prd     | design  | todo   | issues   | 当前节点    |
|----------------------|---------|---------|--------|----------|-------------|
| order-list-sort      | active  | active  | 5/8    | 0        | A5 执行     |
| user-profile-edit    | active  | draft   | -      | 0        | A3 设计     |
| payment-retry        | draft   | -       | -      | -        | A1 需求对齐 |
| sort-result-wrong    | active  | active  | 8/8    | 1 active | B3 根因定位 |
| legacy-export        | archived| archived| -      | -        | 已归档      |

## ADR

| 编号 | 标题                        | 状态     | 日期       |
|------|-----------------------------|----------|------------|
| 0001 | postgres-as-primary-store   | accepted | 2026-06-01 |
| 0002 | jwt-stateless-auth          | proposed | 2026-06-05 |

## 跨需求引用

- auth-flow: 被 [user-profile-edit, payment-retry] 引用
```

### 当前节点推导规则

"当前节点"列不存储在任何文件 frontmatter 中,由 skill 从该需求下文件状态**实时推导**。规则:

| 条件 | 当前节点 |
|------|---------|
| prd.md 不存在 或 status=draft | A1 / A2 |
| prd active + design 不存在 或 design.status=draft | A3 设计+落盘(合并节点) |
| prd active + design active + todo.md 不存在 | A4 任务拆解 |
| prd + design active + todo 有未完成项 | A5 执行 |
| todo 全勾 + 代码未端到端验证 | A6 verify |
| 所有 issues 都已验收 + 需求已交付 | 已完成 |
| 存在 active 的 issues 文件 | 切换到 B 子路径,按 issues 文件状态推导:B2 对齐 / B3 根因 / B4 落盘 / B5 修复 / B6 复验 / B7 沉淀 |
| prd / design 任一 archived | 已归档 |

todo 进度用 `已勾数 / 总数` 表示;无 todo 时显示 `-`。

### 核心要求
- 一次扫描能看到所有需求 + 状态 + **进度位置**
- ADR 单列,跟需求并列
- 跨需求引用从各 frontmatter 的 `related-needs` 聚合而来
- INDEX 是**推导态**:文件状态变 → 重新推导;不应手动编辑当前节点列

---

## README.md 格式(给人看)

ASCII 图为主、文字为辅。建议三类图:

1. **项目需求地图**:所有需求 + 当前状态一眼看清
   ```
   订单         用户          支付
   ─────       ─────         ─────
   [active]    [active]      [draft]
   list-sort   profile-edit  retry
   ```
2. **大流程图**:核心业务流(冷启动画一次,大改才更新)
3. **需求间关系**(可选):依赖/触发关系

**README 不是 INDEX 的镜像**——它服务"我自己回忆这项目长什么样",所以可以省略细节、突出全貌。

---

## 边界规则

### prd.md 写什么
- 业务/产品语言(用户场景、操作流程、边界条件、不做什么)
- 不写技术选型、不写代码结构

### design.md 写什么
- 本需求的技术方案 + **局部**架构变更
- 接口/数据结构变更、依赖与影响
- 关键决策 + 理由

### design.md 不写什么(关键边界)
- **影响多个需求的决策**:上升到 spec/ADR/
  - 典型例子:"全局用 Postgres"、"统一鉴权方案"、"日志格式约定"
  - 判断标准:这个决策被推翻时,会触发改动多少需求?多于 1 个 ⇒ ADR
- **全局架构总览**:画在 spec/README.md 的大流程图里

### todo.md 写什么
- 从 prd + design **派生**出的具体任务,逐项可执行
- 完成打勾、新增追加;不删除已完成项(保留可见的进展)
- 不应该出现 design 里没提的事——出现了就该回去补 design

### issues/<主题>.md 默认针对单需求
- debug 场景天然针对**单需求**(用户反馈"某个需求的某处不对");issue 文件挂在该需求下即可
- 真正跨多需求的情况(极少见)不在本规范处理,出现时按"选主需求挂 + 在 7 段格式分析段列出涉及的其他需求"临时应对,不引入全局 integration/ 目录

---

## 大型项目升级口子(v0.1 不实现)

预警阈值(主观):
- `prd.md > 200 行` → 考虑拆 `prd/overview.md + prd/<子主题>.md`
- `design.md > 300 行` → 考虑拆 `design/overview.md + design/<子模块>.md`
- `<需求名>/` 下文件 > 10 个 → 考虑拆子需求,每个子需求独立目录

升级动作(v0.2 再做):
- 把单文件改为子目录
- INDEX 显示子文件
- skill 写入时按子目录分发

v0.1 暂不实现——出现时手动拆即可,只要文件名收敛到约定范围。

---

## 验证(用规范自身回答)

1. "本需求的 design 里写了一段 'jwt 替代 session'" → 怎么放?
   → 看是否影响其他需求:是 ⇒ 上升 ADR;否 ⇒ 留在 design.md
2. "user-profile-edit 和 user-list 都要用同一个权限组件" → 怎么避免割裂?
   → 两个需求的 prd.md 在 `related-needs` 里互相声明;INDEX 聚合视图能看到
3. "debug 发现的'金额必须保留两位小数'规则" → 沉淀到哪?
   → 反哺原需求的 prd.md(业务规则);若多需求都用 ⇒ ADR 或独立小需求
4. "我自己想看项目大致长什么样" → 看哪个文件?
   → README.md(ASCII 图)
5. "模型/agent 要找'当前哪些需求在做'" → 看哪个文件?
   → INDEX.md
6. "todo.md 里有一项 design 里没提" → 怎么办?
   → 回去补 design;不允许 todo 偷偷扩张范围

---

## INDEX 兜底机制

INDEX 由各节点 skill 助维护,但为防止 skill 未触发 / 人工漏写导致 INDEX 陈旧,做两层兜底:

### 1. `index-rebuild` 命令(纯计算,幂等)
- 输入:`spec/` 全目录
- 行为:扫描 `spec/needs/*/` 下各文件的 frontmatter + todo 勾选 + issues 状态,按"当前节点推导规则"重算 INDEX.md
- 退出:写入 INDEX.md,与原文件 diff 给出报告(新增 / 改动 / 移除)
- 调用时机:任何时候,人工触发或在 skill 末尾自动跑
- 不破坏:`index-rebuild` 是幂等的——多次运行结果一致

### 2. `AGENTS.md` 规则约定(R1 级规则,所有 skill 默认遵守)
- "落盘 `spec/needs/<需求名>/` 下任何文件后,必须同步更新 `spec/INDEX.md`(相应行)"
- "若不确定如何更新,跑 `index-rebuild` 命令兜底"
- 具体文案待 AGENTS.md 落地时写

---

## 已知限制

1. **`related-needs` 双向维护成本**:A 引用 B 时需在 A 写,可选地在 B 也写;skill 助维护时应做双向校验
2. **大型项目升级路径仅留口子**:实际触发阈值后的迁移工具未实现
3. **跨需求 issue 极少见但无机制**:出现时主观选主需求挂;不做自动迁移

---

## 与场景的对应关系

| 场景节点 | 产物 | 落盘位置 | 同步更新 INDEX |
|----------|------|---------|----------------|
| A2 prd 落盘 | prd.md | `spec/needs/<需求名>/prd.md` | ✓(新增行 / 改 prd 列) |
| A3 设计+落盘(合并) | design.md | `spec/needs/<需求名>/design.md` | ✓(改 design 列) |
| A4 任务拆解 | todo.md | `spec/needs/<需求名>/todo.md` | ✓(改 todo 列) |
| A5 执行(过程中) | 代码 + 更新 todo 勾选 | (仓库内 + todo.md) | ✓(改 todo 进度) |
| A6 verify | (代码 + 测试,不在 spec/) | (仓库内) | ✓(切到 "已完成") |
| B4 issue 落盘 | issues/<主题>.md | `spec/needs/<需求名>/issues/<主题>.md` | ✓(切到 B 节点 + issues 列) |
| B5 修复(过程中) | 代码 + 追加 bug 段 | (仓库内 + issue 文件) | ✓(B 节点细化) |
| B7 沉淀分流 | 反哺 prd / design / ADR | 见上述对应文件 | ✓(可能改回到 active) |

> **handoff.md 何时更新**:**会话结束或项目交接时**,由 foundation 级 handoff skill 人工触发——不在任何 S1 节点级动作里。S1 节点只更新 INDEX。
