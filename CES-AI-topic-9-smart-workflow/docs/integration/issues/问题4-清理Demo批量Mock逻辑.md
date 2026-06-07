### 问题 4：Demo 中存在批量 Mock 逻辑，影响功能判断与后续迭代

**问题描述**：

当前 Demo 中存在较多 mock / fallback / demo sample 逻辑，包括 LLM mock adapter、MCP 未启用时自动加载 Demo 抓包样本、workflow runner mock executor、mock 数据文件与 mock 测试路径等。这会让联调结果看起来“可运行”，但实际并不能真实反映功能链路是否打通，影响用户对功能状态、问题边界和后续迭代方向的判断。

**当前态**：

- MCP 不可用或未启用时，录制流程会自动加载 Demo 抓包样本。
- LLM provider 未配置或调用失败时，会降级到 mock adapter。
- workflow runner / node registry / 测试 / 示例数据中存在 mock executor、mock handler、mock workflow、mock node 等逻辑与内容。
- 部分文档和 checklist 将 mock 兜底作为 Demo 期验收路径。

**期望态（需要跟用户沟通确认）**：

- 删除所有 mock 逻辑与 mock 内容，系统在真实依赖缺失时应明确失败或提示配置缺失。
- 录制、LLM、工作流执行、节点调用都必须走真实配置链路，不再自动伪造成功结果。
- 保留必要的类型、接口和错误提示，但不保留 mock adapter / mock executor / mock 数据样本 / mock fallback。

**分析与解决**：

需要从源码、测试、数据和联调清单四个层面清理 mock；PRD 和技术方案在用户验证通过后再按流程统一更新：

1. LLM 层删除 mock adapter 与 fallback，provider 未配置时抛出明确错误。
2. node-recorder 删除 Demo 抓包样本 fallback，MCP 不可用时直接返回错误。
3. workflow-runner 删除 mock executor、mock handler 分支和 mock workflow 读取路径。
4. data / workflows / checklist 删除或更新 mock 相关内容。
5. 调整测试，使其验证真实依赖缺失时的失败行为，而不是 mock 成功行为。

2026-05-14 复核：针对“新建工作流”链路再次检查 mock / demo / sample 残留；运行时代码未发现 mock adapter / mock runner / mock fallback 重新出现。本次清理了新建页固定示例填充入口、固定示例 placeholder，以及空的 `data/workflows/mocks` 目录，避免新建流程继续受固定演示策略影响。

**to-issues**：

- [x] 梳理所有 mock / demo fallback 引用点，区分源码、数据、测试、文档。
- [x] 删除 LLM mock adapter 与 LLM fallback。
- [x] 删除 node-recorder Demo 抓包样本 fallback。
- [x] 删除 workflow runner / registry 的 mock executor 与 mock handler 路径。
- [x] 删除 mock 数据文件、mock workflow、CHECKLIST 中的 mock 路径描述。
- [x] 更新测试，覆盖“缺少真实依赖时明确失败”。
- [x] 运行 typecheck、web build 和相关测试。

**用户验收状态**：待用户验证。

---

