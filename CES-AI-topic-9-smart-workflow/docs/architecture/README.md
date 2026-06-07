# 架构文档入口

本目录承载稳定技术信源。联调过程中的断点、bug、临时验证和用户验收状态放在 `docs/integration/`。

## 模块文档

- [stage2-technical-design.md](stage2-technical-design.md)：技术总览。
- [system-overview.md](system-overview.md)：系统边界、模块职责和关键数据流。
- [frontend.md](frontend.md)：前端页面、路由、组件和状态承接。
- [backend-api.md](backend-api.md)：API 契约、错误结构和请求/响应口径。
- [workflow-runner.md](workflow-runner.md)：workflow schema、校验、依赖执行、handler、运行记录。
- [node-registry.md](node-registry.md)：NodeDefinition、注册中心、visibility、平台分组。
- [node-recorder.md](node-recorder.md)：MCP Client、页面选择、请求采集、完整 response body、过滤和落盘。
- [llm-orchestrator.md](llm-orchestrator.md)：adapter、prompt、ApiCaptureSpec、转换和 trace。
- [auth-state.md](auth-state.md)：SOP1 登录态复用、AUTH_REQUIRED 判定。
- [data-storage.md](data-storage.md)：文件系统数据布局和敏感信息规则。
- [testing.md](testing.md)：测试命令、断点验证和覆盖范围。

## 覆盖矩阵

| 技术主题 | 主要文档 | 对应 integration 主题 |
|---|---|---|
| LLM 与 MCP 边界 | [system-overview.md](system-overview.md)、[node-recorder.md](node-recorder.md) | 问题 1 |
| mock/fallback 删除 | [system-overview.md](system-overview.md)、[testing.md](testing.md) | 问题 4 |
| MCP 录制链路 | [node-recorder.md](node-recorder.md) | 问题 5、6、7、12、13 |
| ApiCaptureSpec 和转换 | [llm-orchestrator.md](llm-orchestrator.md) | 问题 8、9、11 |
| recorded_http_flow | [workflow-runner.md](workflow-runner.md)、[node-registry.md](node-registry.md) | 问题 10 |
| 动态时间模板 | [workflow-runner.md](workflow-runner.md)、[llm-orchestrator.md](llm-orchestrator.md) | 问题 14 |
| 节点市场数据模型 | [node-registry.md](node-registry.md) | 问题 2、3、15 |
| 简单串并行与内置节点 | [workflow-runner.md](workflow-runner.md) | 问题 16 |
| 前端卡片承接 | [frontend.md](frontend.md) | 问题 18 |
| 鉴权复用 | [auth-state.md](auth-state.md) | 问题 10 |

