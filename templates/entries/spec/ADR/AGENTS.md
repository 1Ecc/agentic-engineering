# spec/ADR/ 规则

> 架构决策记录(ADR)规则。在 `spec/ADR/` 下创建或修改 ADR 时遵守本文件。

## 命名

`NNNN-<标题>.md`,**4 位序号**,kebab-case 标题。例:`0001-postgres-as-primary-store.md`。

## frontmatter

```yaml
---
status: accepted          # proposed | accepted | superseded
date: 2026-06-14
supersedes: 0000-xxx.md   # 仅当取代旧 ADR 时填
---
```

正文按具体决策自然组织(背景 / 决策 / 理由 / 影响),不强加重模板。

## 状态机

```text
proposed ─(评审接受)─► accepted ─(新 ADR 取代)─► superseded
```

- `proposed`:新提案,未拍板(由 writing-plans / review / improve-codebase-architecture 创建时默认)。
- `accepted`:已评审接受;视为**约束**,其他需求不得违背。
- `superseded`:被新 ADR 取代;新 ADR 的 `supersedes` 指回旧编号,**不删旧文件**。

