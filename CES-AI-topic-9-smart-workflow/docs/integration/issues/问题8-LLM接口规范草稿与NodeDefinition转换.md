### 问题 8：LLM 接口规范草稿与 NodeDefinition 转换链路

#### bug专题：DeepSeek API Key 缺失导致接口规范生成失败

**问题描述**：

上一轮 `requests` 无法落盘 bug 修复后，用户用 `rec_1778651036056` 完成真实录制验证。录制、业务请求过滤和 LLM 输入摘要均已成功落盘，但点击完成录制后进入 LLM 节点时报错：`DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek`。

**当前态**：

- `data/recordings/rec_1778651036056.json` 已确认 `requests=179`、`filtered_requests=110`、`llm_input_summary.request_count=110`，说明采集、解析、落盘和过滤节点已生效。
- 当前环境配置中 `LLM_PROVIDER=deepseek`，`DEEPSEEK_MODEL=deepseek-v4-flash`，但未配置 `DEEPSEEK_API_KEY`。
- `finishRecording` 在持久化 `filtered_requests` 和 `llm_input_summary` 后调用 `createLLMAdapter()`；`createLLMAdapter()` 选择 deepseek 后，`createDeepSeekAdapter()` 因缺少 `DEEPSEEK_API_KEY` 直接抛错。
- 该错误发生在真正调用 DeepSeek API 之前，不是 MCP 采集、过滤策略、节点注册或工作流执行问题。

**期望态（需要跟用户沟通确认）**：

- 本轮只处理 LLM 配置断点：`filtered_requests` 已非空之后，如何让 LLM 规范生成节点继续走通或更早给出明确配置提示。
- 若继续使用 deepseek，应通过真实运行环境配置 `DEEPSEEK_API_KEY` 后重启 API 服务，并基于 `rec_1778651036056` 做断点验证，避免重复录制浏览器操作。
- 如果产品侧需要更早暴露配置缺失，应增加明确的 LLM 配置预检或错误提示，但不引入 mock、fallback 或伪成功逻辑。
- 后续接口规范结构、节点注册、工作流执行暂不参与本轮修复。

**分析与解决**：

当前链路已推进到新的断点：

1. MCP Network 读取：已通过，`requests` 非空。
2. 业务请求过滤：已通过，`filtered_requests` 非空。
3. LLM 输入摘要：已通过，`llm_input_summary` 已落盘。
4. LLM 适配器创建：失败，原因是 `LLM_PROVIDER=deepseek` 时缺少 `DEEPSEEK_API_KEY`。

因此，本轮不应修改录制解析逻辑，也不应增加 LLM fallback。优先按真实配置链路处理：确认是否补充真实 `DEEPSEEK_API_KEY` 并重启服务；若用户希望产品体验更清晰，再讨论是否把该错误前置为录制完成前的配置预检。

**to-issues**：

- [x] 使用 `rec_1778651036056` 确认上一断点已通过：`requests`、`filtered_requests`、`llm_input_summary` 均非空。
- [x] 检查运行环境配置，确认 `LLM_PROVIDER=deepseek` 且未配置 `DEEPSEEK_API_KEY`。
- [x] 定位抛错节点：`finishRecording` 持久化 LLM 输入摘要后，在 `createLLMAdapter()` / `createDeepSeekAdapter()` 创建阶段失败。
- [ ] 与用户确认修复策略：先补真实 `DEEPSEEK_API_KEY` 跑通 by-case，还是先增加产品侧 LLM 配置预检/提示。
- [ ] 基于 `rec_1778651036056` 做断点验证，不重复浏览器录制，确认 LLM 规范生成是否能进入下一节点。
- [ ] 验证通过后，再决定是否需要把配置预检沉淀为代码修改。

**bug记录**：

- 2026-05-13：用户确认上一 bug 已解决，最新录制文件为 `data/recordings/rec_1778651036056.json`；新错误为 `DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek`。
- 2026-05-13：本机断点检查确认 `rec_1778651036056` 中 `requests=179`、`filtered_requests=110`、`llm_input_summary.request_count=110`，错误边界收敛到 LLM 适配器配置创建阶段。
- 2026-05-13：当前 `.env` 仅配置 `LLM_PROVIDER=deepseek` 和 `DEEPSEEK_MODEL=deepseek-v4-flash`，未配置 `DEEPSEEK_API_KEY`；代码在 `createDeepSeekAdapter()` 中按真实依赖缺失明确失败，符合“不走 mock / fallback”的原则。
- 2026-05-13：用户配置 `DEEPSEEK_API_KEY` 并重启服务后确认该 case 已解决，链路已越过 LLM 配置节点。

**用户验收状态**：已验收。

#### bug专题：LLM 返回内容未通过 NodeDefinition 校验

**问题描述**：

DeepSeek API Key 配置并重启服务后，上一断点已通过。后续出现新的校验错误：`node.type must be a non-empty string; node.category must be a non-empty string; node.name must be a non-empty string; node.description must be a non-empty string; node.category is invalid; node.inputs must be an array; node.outputs must be an array; node.handler must be an object`。

**当前态**：

- 录制、过滤、LLM 输入摘要和 LLM Provider 配置节点均已通过。
- 当前错误来自 `validateNodeDefinition()` 对 LLM 输出结果的结构校验。
- `NodeDefinition` 必须包含 `type`、`category`、`name`、`description`、`inputs`、`outputs`、`handler` 等字段；其中 `category` 只能是 `builtin`、`connector`、`recorded`，`handler.kind` 只能是 `connector`、`builtin`、`recorded_http`。
- 当前报错组合说明 LLM 返回的 JSON 很可能不是 `NodeDefinition` 本体，或返回了空对象/包装对象/字段命名不匹配的结构。

**期望态（暂按琐碎 case 处理）**：

- 本轮使用 `rec_1778651036056.json` 作为断点数据，不重复浏览器录制。
- LLM 返回内容必须落盘到 recording，便于后续处理和分析；落盘前必须过滤 API Key、cookie、token、password、authorization 等敏感字段。
- Prompt 第一版从需求出发，先输出“接口规范草稿”，而不是直接输出最终 `NodeDefinition`。
- 定义从“接口规范草稿”到 `NodeDefinition` 的确定性转换规则。
- `NodeDefinition` 继续作为后续节点市场、workflow 编排和 runner 使用的数据 schema；如果用户意图对应多接口业务链路，则扩展支持 `recorded_http_flow`，避免把 SOP1 这类流程硬压成单接口节点。
- 不增加 mock、fallback 或伪成功逻辑；如果输出不合规，应保留明确失败，但必须能定位原始 LLM 输出、解析结果和校验差异。

**分析与解决**：

当前链路已推进到新的断点：

1. MCP Network 读取：已通过。
2. 业务请求过滤：已通过。
3. LLM 输入摘要：已通过。
4. DeepSeek 配置与调用：配置断点已通过。
5. LLM 输出解析/校验：失败，校验器没有拿到合规的 `NodeDefinition`。

最新决策：不要让 LLM 直接写最终 `NodeDefinition`。LLM 第一阶段输出结构化 `ApiCaptureSpec`，包含接口列表、业务意图、字段映射、调用顺序和自动化建议；平台再用确定性规则转换为 `NodeDefinition`。如果只有一个业务接口，则转换为 `handler.kind=recorded_http`；如果是 SOP1 这类多接口业务链路，则转换为 `handler.kind=recorded_http_flow`。

**to-issues**：

- [x] 确认该错误发生在 LLM 配置通过之后，属于 `NodeDefinition` 输出校验节点。
- [x] 定位校验入口：`extractNodeSpec()` 解析 LLM 内容后调用 `validateNodeDefinition()`。
- [x] 确认最低字段要求：`type/category/name/description/inputs/outputs/handler`，以及 `category` / `handler.kind` 合法枚举。
- [x] 在 recording 中落盘 `llm_trace`，包括脱敏后的 `prompt_messages`、`raw_output`、`parsed_output`、校验结果和转换结果。
- [x] 将 node-extract prompt 第一版改为输出接口规范草稿 `ApiCaptureSpec`。
- [x] 定义 `ApiCaptureSpec -> NodeDefinition` 转换规则：单接口转 `recorded_http`，多接口转 `recorded_http_flow`。
- [x] 扩展 `NodeDefinition` schema，支持 `handler.kind=recorded_http_flow`。
- [x] 基于 `rec_1778651036056.json` 重新验证，不重复浏览器录制。

**bug记录**：

- 2026-05-13：用户确认 DeepSeek API Key case 已解决，后续出现 `NodeDefinition` 校验错误；错误字段集中在必填元信息、输入输出数组和 handler 对象。
- 2026-05-13：当前先按琐碎 case 处理，范围收敛到 LLM 输出解析/校验节点，不扩大到节点注册和工作流执行。
- 2026-05-13：用户确认后续采用断点处理方式，使用 `rec_1778651036056.json`；本轮目标调整为先落盘 LLM trace、让 prompt 输出接口规范草稿、定义确定性转换规则，并扩展 `recorded_http_flow` schema。
- 2026-05-13：已实现 `llm_trace` 脱敏落盘、`ApiCaptureSpec` prompt、`ApiCaptureSpec -> NodeDefinition` 转换规则和 `recorded_http_flow` schema。使用 `rec_1778651036056.json` 的临时副本断点验证通过：DeepSeek 返回的 `ApiCaptureSpec` 校验通过，转换后的 `NodeDefinition` 校验通过；该 case 当前被模型判断为单接口 `recorded_http` 节点。

**用户验收状态**：待用户验证。

---

