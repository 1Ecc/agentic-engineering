# specs/spec.md 模板

> 落盘位置:`openspec/changes/<topic>/specs/spec.md`
>
> 由 `align-and-spec` skill 在 N2 PRD 段产出。规范参考自 mattpocock 的 `to-prd` skill。

---

## 分阶段填写指引(重要)

本模板有 7 段。**`align-and-spec` 处于 N1+N2 阶段,只负责填前 5 段 + 留后 2 段骨架**:

| 段 | N1+N2 阶段(本 skill) | N3+N4 阶段(后续 technical-design / writing-plans) |
|---|---|---|
| Problem Statement | ✅ 填 | — |
| Solution | ✅ 填(从用户视角,不写技术方案) | — |
| User Stories | ✅ 填(详尽) | — |
| Out of Scope | ✅ 填 | 可能补 |
| Further Notes | ✅ 填 | 可能补 |
| **Implementation Decisions** | ⚠️ **只留段标题 + 占位注释**,不填实质内容 | ✅ 由 N3 填 |
| **Testing Decisions** | ⚠️ **只留段标题 + 占位注释**,不填实质内容 | ✅ 由 N4 / N6 填 |

如果在 N1+N2 阶段填了 Implementation/Testing Decisions,就是越界——技术决策应当在拿到 spec 之后,通过 N3 的方案探索再确认。

---

## 模板

```markdown
# <Capability> Specification

## Problem Statement
<从用户视角描述他们面临的问题。不写解决方案,只写痛点>

## Solution
<从用户视角描述解决方案。不写技术细节,只写"用户看到/感知到什么">

## User Stories
<一份长且编号的用户故事清单。每一条格式:
1. 作为 <角色>,我希望 <功能>,以便 <价值>

要详尽,覆盖功能的所有面向>

1. 作为 <角色>,我希望 ...,以便 ...
2. 作为 <角色>,我希望 ...,以便 ...
3. ...

## Implementation Decisions
<!-- 待 N3 technical-design skill 补全。本段在 N1+N2 阶段留空。 -->

## Testing Decisions
<!-- 待 N3/N4 阶段补全。本段在 N1+N2 阶段留空。 -->

## Out of Scope
<本 spec 明确不做的事>

- <项>
- <项>

## Further Notes
<其他需要记录的备注、外部依赖、参考资料、未决议题>
```

## 撰写要点

### Problem Statement / Solution

- **从用户视角写,不从工程视角写**。
- Problem Statement 写"用户痛在哪里",不写"我们要做什么"。
- Solution 写"用户会看到什么变化",不写"我们要用 Redis 加缓存"。

### User Stories

- 必须是**编号列表**,后续 N3/N4/N5 会用编号引用具体 User Story。
- 数量必须**足够覆盖功能**。三五条勉强够用的小变更可以,十几条以上才是常态。
- 每一条都要能落到具体的 Scenario / 测试用例,如果一条 User Story 太抽象到落不下去,拆。
- 角色具体到岗位 / 用户类型,不要笼统写"用户"。

### Out of Scope

- 与 proposal.md 的"不包含"段呼应,但更细节、更技术化。
- 这是后续防漂移的锚:实现期遇到"要不要顺便加上 X",回来对照 Out of Scope。

### Further Notes

- 外部依赖、参考文档、相关 RFC、未决议题、已知风险等。
- 不要把这里当成杂物筐——能放到前面任何一段的就放过去。

### Implementation Decisions / Testing Decisions(留位说明)

这两段的存在是为了让 N3/N4/N6 阶段的 skill 直接来填,不用再新建文件。在 N1+N2 阶段:

- 段标题保留
- 段内只放一行 HTML 注释占位:`<!-- 待 N3 technical-design skill 补全 -->`
- **不要**填技术栈/接口/模块/测试策略——这些不属于"对齐需求"阶段

如果你(在 grill 过程中)和用户已经讨论到了具体技术选型,把它记到 proposal.md 的"需求探查痕迹"段,而不是直接写进 spec.md 的 Implementation Decisions。
