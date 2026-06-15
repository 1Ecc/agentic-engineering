# spec/ 规则

> 本目录(`spec/`)的工作规则。在 `spec/` 下读写文件时遵守本文件。

## 总领

S1 节点 → 产物 → skill 的路由总览,见随包的 `using-agentic-engineering` skill——它判定"进不进 AE 流程"并分发到各节点。

两道硬门禁:**A1 未对齐不写 prd**;**B2 期望态未对齐不修复**。


## R1:落盘后同步 INDEX
落盘 `spec/needs/<需求名>/` 下任何文件后,**必须同步更新 `spec/INDEX.md`** 对应行。若不确定如何更新,按上面「INDEX 推导规则」手动重算(未来可用 `ae index-rebuild` 幂等重扫)。

### INDEX 推导规则

`spec/INDEX.md` 给模型看:一次扫描看到所有需求 + 状态 + 进度。`当前节点` 列**不存储**在任何 frontmatter,由该需求下文件状态**实时推导**:

| 条件 | 当前节点 |
|------|---------|
| prd 不存在 或 status=draft | A1 / A2 |
| prd active + design 不存在/draft | A3 设计 |
| prd+design active + todo 不存在 | A4 拆解 |
| prd+design active + todo 有未完成项 | A5 执行 |
| todo 全勾 + 未端到端验证 | A6 verify |
| 所有 issues 已验收 + 已交付 | 已完成 |
| 存在 active 的 issues | 进 B 子路径,按 issues 状态推 B2…B7 |
| prd / design 任一 archived | 已归档 |

- INDEX 是**推导态**:文件状态变就重新推导,**不要手编 `当前节点` 列**。


## 何时升 ADR

决策影响**多个需求**或属项目级不变量时,从 `design.md` 升到`spec/ADR`(判断:推翻它会改动 >1 个需求)。单需求的技术决策留在该需求的 `design.md`。