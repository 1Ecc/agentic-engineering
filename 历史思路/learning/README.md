# 学习工作区

这个目录用于在修改本项目方法论之前，先系统学习参考仓库。

## 参考仓库

| 仓库 | 本地源码 | 学习目录 |
| --- | --- | --- |
| Fission-AI/OpenSpec | `.codex/skills/OpenSpec` | `learning/openspec/` |
| obra/superpowers | `.codex/skills/superpowers` | `learning/superpowers/` |
| mattpocock/skills | `.codex/skills/mattpocock-skills` | `learning/mattpocock-skills/` |
| rpamis/comet | `.codex/skills/comet` | `learning/comet/` |

## 学习流程

1. 从 `.codex/skills/<repo>/` 阅读本地源码。
2. 在 `cases/` 中记录具体案例。
3. 在 `summaries/` 中写聚焦的学习总结。
4. 在 `source-map.md` 中记录阅读过的重要源码文件。
5. 在 `transfer-notes.md` 中记录可迁移点、风险和与本项目的冲突。

## 规则

- 学习阶段不修改 `design/` 或 `output/`。
- 先分清“观察结论”和“优化建议”。
- 优先记录具体案例，不只写抽象评价。
- 每个仓库先独立学习，等需要跨仓库综合时再统一对比。
