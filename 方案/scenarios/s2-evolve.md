# S2 · 方法论自演进：边做边学 + 沉淀回路（M6）

> 框架索引：[../immutable-booping-sutherland.md](../immutable-booping-sutherland.md) · 场景定义 / S2

## 场景四段式

- **触发**：S0/S1 中发现 skill 缺失 / 流程冗余 / 目录不合用；或同一项目特定规则在多场景已验证
- **入产物**：一次具体的不顺手；或一条"已被多次验证的项目特定规则"
- **出产物**：对 S0/S1 的修订（新增/修改 skill、调整骨架、更新框架文档）；或抽象到通用 skill
- **退出条件**：修订项已落地 + `handoff.md` 留痕

---

## M6 沉淀回路（核心机制，来自 CES）

```
项目特定规则（写在 AGENTS.md 项目特定段）
        │
        │  多次场景验证（≥3 次实战使用且无回滚）
        ▼
候选通用规则（提案，进 S2 队列）
        │
        │  用户确认（不自动）
        ▼
通用 skill 指南（写进 output/.claude/skills/foundation/guidelines/SKILL.md）
```

**铁律**：
- **不自动迁移**——M6 的精髓是"用户确认"
- 提案必须带证据：列出哪几个项目、哪几次场景验证过
- 沉淀后旧的项目特定规则可保留（不强制删），但通用规则优先级更高（具体优先级约定见 AGENTS.md 项目特定段）

---

## Skill 槽位

- `write-a-skill`：仿 Matt Pocock 同名 skill，生成 SKILL.md 骨架 + 模板目录
- `methodology-retro`：回看 `handoff.md` + `docs/integration/` 历史，提炼修订点
- `precipitate-rule`（M6 核心）：把项目特定规则提案为通用指南；不自动迁移、需用户确认
- `framework-bump`：把场景定义/目录骨架的修订同步到 `docs/framework.md` 与本 `方案/` 文件

---

## 触发信号（什么时候该进 S2）

显式信号：
- 同一句话「这个流程好烦」在 ≥2 次会话中出现
- `handoff.md` 中"下一步建议"重复同一句 ≥2 次（说明卡住了）
- 某条项目特定规则在 ≥3 次场景被引用且无人推翻

隐式信号（靠 `methodology-retro` 定期扫描）：
- 某个 skill 槽位长期空着，说明定义有问题
- 某个目录长期空着，说明骨架不合用
- `docs/integration/issues/` 中反复出现的根因模式（候选 ADR）

---

## 实现 TODO（S2 本场景，待 S0/S1 各落地一个 skill 后启动）

1. 写 `output/.claude/skills/s2-evolve/write-a-skill/SKILL.md`
2. 写 `output/.claude/skills/s2-evolve/methodology-retro/SKILL.md`
3. 写 `output/.claude/skills/s2-evolve/precipitate-rule/SKILL.md`（M6 实现）
4. 在 `docs/framework.md` 中开"S2 触发信号清单"段，让信号显式可查

---

## 开放问题（已全部锁定）

- ~~Q5~~：是否做 `sync-mother` skill？
  → **不做独立 skill**：初始化时手动 ingest 母本规则；后续沉淀哪些规则待按需走 S2 `precipitate-rule`
