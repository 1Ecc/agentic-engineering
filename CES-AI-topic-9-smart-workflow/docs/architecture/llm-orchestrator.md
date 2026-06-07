# LLM Orchestrator

## 1. 职责

LLM Orchestrator 只在设计期工作：

- 自然语言生成 workflow YAML。
- 捕获请求生成 ApiCaptureSpec。
- 记录脱敏 trace。

不在执行期参与 workflow runner。

---

## 2. Adapter

接口：

```ts
interface LLMAdapter {
  generateWorkflow(input: {
    prompt: string
    availableNodes: NodeDefinition[]
    contextYaml?: string
  }): AsyncIterable<string> | Promise<string>

  extractApiCaptureSpec(input: {
    description: string
    capturedRequests: CapturedRequest[]
  }): Promise<ApiCaptureSpec>
}
```

Provider：

- DeepSeek
- Kimi
- Claude

未配置 provider 或 key 时直接失败。

---

## 3. Workflow 生成 Prompt

system prompt 包含：

- 角色说明。
- workflow schema。
- 可用节点摘要。
- 标准 YAML 模板。
- few-shot 示例。
- 禁止输出 Markdown 代码块。
- 禁止未知节点和字段。
- `dependsOn`、`data.compose`、`rules.first_match` 使用说明。

user prompt 只包含：

- 用户自然语言需求。
- 修改模式下的当前 YAML 和增量要求。

可用节点摘要必须包含：

- type
- name
- description
- inputs
- outputs
- array item fields

---

## 4. ApiCaptureSpec

LLM 不直接输出最终 NodeDefinition。录制链路先输出：

```json
{
  "type_suggestion": "serviceforce.query_customer_order",
  "name": "客户订单查询",
  "description": "根据工单号查询九丘订单号",
  "trigger_action": "用户在服务云中按工单号查询并进入客户订单板块",
  "business_meaning": "查询工单关联的九丘订单号",
  "selected_request": {},
  "query_parameters": [],
  "ignored_parameters": [],
  "optional_filters": [],
  "response_summary": {},
  "steps": [],
  "node_mapping": {}
}
```

---

## 5. ApiCaptureSpec 校验

校验规则：

- `steps` 非空。
- selected_request 必须来自 captured requests。
- 非空业务 query/body 参数必须进入 input/query/body，或进入 ignored_parameters。
- 不能优先选择空业务参数版本，除非有理由。
- response_mapping 必须有 response evidence。
- 缺少 responseBody 时，不允许生成必需中间字段映射。
- 模板表达式必须在白名单。
- 不支持的 JSONPath 不能进入运行映射。

---

## 6. 转换为 NodeDefinition

转换规则：

- 单接口 spec -> `handler.kind=recorded_http`。
- 多接口 spec -> `handler.kind=recorded_http_flow`。
- 使用 `node_mapping.inputs` 生成 inputs。
- 使用 `node_mapping.outputs` 生成 outputs。
- 使用 steps 生成 handler spec。
- 同步统一 input name，避免 `inputs.service_order_id` 与模板 `inputs.soid` 不一致。

---

## 7. Trace

recording 中应保存脱敏 `llm_trace`：

- prompt messages
- raw output
- parsed output
- validation result
- converted node
- conversion errors

脱敏字段：

- api key
- cookie
- token
- authorization
- password

---

## 8. 常见失败边界

| 失败 | 处理 |
|---|---|
| LLM key 缺失 | 配置错误 |
| 输出不是 JSON/YAML | 解析失败 |
| ApiCaptureSpec 不合法 | 展示 validation error |
| NodeDefinition 不合法 | 展示 conversion error |
| 业务参数遗漏 | 校验失败 |
| 无响应体却生成映射 | 校验失败 |

---

## 9. Prompt 边界

LLM 可以：

- 总结业务意图。
- 选择证据请求。
- 建议输入输出字段。
- 建议字段映射。

LLM 不可以：

- 凭空补接口。
- 打开浏览器。
- 吞掉采集失败。
- 生成运行期不支持的 JS/SQL/map/filter/reduce。
- 把文档摘要字段塞进运行映射。
