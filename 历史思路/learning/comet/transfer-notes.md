# Comet 可迁移笔记

学习案例后，在这里记录可复用想法。

## 候选迁移点

- 用 OpenSpec 管 WHAT，用 Superpowers 管 HOW。
- 用状态文件恢复长流程进度。
- 阶段流转前使用 guard 条件。
- 生成确定性的 handoff 上下文，而不是依赖聊天记忆。
- archive 前必须有 verification report。

## 潜在冲突

- Comet 同时创建 OpenSpec artifacts 和 `docs/superpowers/` 文档，可能与本项目的单一 OpenSpec 根偏好冲突。
- 自动化程度较高，可能比早期方法论设计需要的更重。
