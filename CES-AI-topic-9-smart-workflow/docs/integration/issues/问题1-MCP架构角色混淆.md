### 问题 1：MCP 架构角色混淆——LLM 不是 MCP Client

**问题描述**：

当前技术方案和代码中，MCP（chrome-devtools-mcp）的角色定位存在混淆。设计文档里 LLM 与 MCP 的关系边界不够清晰，容易让人理解为"LLM 驱动 MCP"。实际上 **LLM 不是 MCP Client**，LLM 只负责「总结/提取」，真正驱动浏览器和抓包的 Client 应该是**我们的后端**。

**用户期望的正确流程**：

```
1. 用户触发"开始录制接口"
2. 后端启动 / 连接 chrome-devtools-mcp（后端作为 MCP Client）
3. chrome-devtools-mcp 拉起一个独立 Chrome 实例
4. 用户在这个 Chrome 里操作业务流程
5. 平台持续采集 Network 请求
6. 用户点击"结束录制 / 生成接口规范"
7. 后端过滤、去重、整理请求与响应
8. LLM 基于整理后的数据生成接口规范（LLM 在这里才介入）
9. 平台做 JSON Schema / OpenAPI 校验
10. 展示、导出或保存接口文档
```

**期望的架构分层**：

```
前端平台
  ↓ 开始采集 / 结束采集 / 展示接口文档
后端 API
  ↓ 作为 MCP Client
chrome-devtools-mcp（MCP Server）
  ↓ 控制
独立 Chrome 实例
  ↓ 产出
Network 请求数据
  ↓
请求清洗与归一化（后端）
  ↓
LLM 总结（后端调用 LLM adapter）
  ↓
OpenAPI / JSON Schema 校验
  ↓
节点规范产出
```

**分析与解答**：

✅ **好消息：当前代码的实际执行路径是正确的**。

查看 `packages/node-recorder/src/index.ts` 和 `packages/node-recorder/src/mcp-client.ts`，实际代码里：

1. **后端**（`startRecording` → `JsonRpcMcpClient`）作为 MCP Client 发 JSON-RPC 调用
2. **chrome-devtools-mcp** 作为 MCP Server 控制浏览器、抓包
3. **LLM** 只在 `finishRecording` 的**最后阶段**（过滤请求后）被调用来提取节点规范

所以代码层面的调用链路和你描述的 10 步流程完全一致。

⚠️ **问题出在文档的表述上**：技术方案 §7.1 的时序图虽然能读出正确含义，但文档其他部分多次出现"MCP + LLM"并列的表达方式（如 §1.2 决策表中"chrome-devtools MCP 抓包 + LLM 提取规范"），容易被误解为 LLM 直接参与了 MCP 通信。需要在文档中显式标注：

- **MCP Client = 后端 node-recorder**，不是 LLM
- **LLM = 数据消费者**，只在步骤 8 介入，消费后端整理好的请求数据
- 两者之间没有直接交互

**后续优化方向**：

- [ ] 更新技术方案 §7 的表述，明确 MCP Client 身份
- [ ] 考虑在架构图中增加角色标注（MCP Client / MCP Server / LLM Consumer）

**用户验收状态**：已验收。

验收说明：用户确认该问题已经解答，当前架构中 LLM 并不是 MCP Client，后端作为 MCP Client 驱动 chrome-devtools-mcp 的架构判断是正常的。该问题引出新的问题 5：当前“录制新接口”核心功能仍不满足预期。


---

