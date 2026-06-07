# 后端 API

## 1. 通用约定

- 所有接口返回 JSON。
- 错误响应应包含 `code`、`message`，可选 `details`。
- 鉴权失效使用 `AUTH_REQUIRED`。
- 输出映射失败使用 `DATA_NOT_FOUND`。
- 不通过 mock/fallback 返回成功。

错误示例：

```json
{
  "code": "DATA_NOT_FOUND",
  "message": "serviceforce.query_customer_order 未映射到输出字段 soid",
  "details": {
    "output": "soid",
    "mapping": "$.data[0].soid"
  }
}
```

---

## 2. Workflow API

### GET `/api/workflows`

返回已保存 workflow 列表。

返回字段：

- `id`
- `name`
- `description`
- `favorite`
- `run_count`
- `last_run_at`
- `meta`

### POST `/api/workflows/generate`

自然语言生成 workflow。

请求：

```json
{
  "prompt": "输入工单号后查询订单和发票信息",
  "contextYaml": "可选，修改模式传入"
}
```

处理：

1. 从 registry 读取 availableNodes。
2. 调用 LLM adapter。
3. 返回流式 YAML 或最终 YAML。
4. 后端可同步执行 parse/validate，返回校验结果。

失败：

- `LLM_PROVIDER` 缺失。
- provider key 缺失。
- LLM 输出不可解析。

### POST `/api/workflows/validate`

校验草稿 YAML。

校验项：

- 顶层 schema。
- 节点 type 是否存在。
- 节点 input 字段是否存在。
- 必填字段是否提供。
- `$inputs`、`$node.field` 引用是否可解析。
- 模板表达式是否在白名单。
- `dependsOn` 是否无环。

### POST `/api/workflows/run-draft`

未保存 workflow 草稿试运行。

请求：

```json
{
  "yaml": "id: ...",
  "inputs": {
    "work_order_no": "202604273400100002"
  }
}
```

返回：

- run id（可选）
- node snapshots
- logs
- final outputs
- status

### POST `/api/workflows`

保存 workflow。保存前必须复用同一套 validate。

### GET `/api/workflows/:id`

读取 workflow YAML 和 meta。

### POST `/api/workflows/:id/run`

运行已保存 workflow。

---

## 3. Node API

### GET `/api/nodes`

返回 registry 当前快照。

支持前端分组字段：

- category
- platform
- platform_label
- metadata.visibility
- handler.kind

### POST `/api/nodes/:type/invoke`

已注册节点试运行。

请求：

```json
{
  "inputs": {
    "soid": "202604273400100002"
  }
}
```

处理：

1. registry resolve node。
2. 校验 inputs。
3. 调用对应 handler。
4. 返回 outputs。

### POST `/api/nodes/invoke-draft`

草稿 NodeDefinition 试调用。

请求：

```json
{
  "spec": { "type": "...", "handler": { "kind": "recorded_http_flow" } },
  "inputs": {}
}
```

用途：

- 录制 Step 3 未注册前验证节点。

### POST `/api/nodes/:type/visibility`

切换录制节点同步状态。

请求：

```json
{ "visibility": "public" }
```

规则：

- 仅 recorded 节点允许切换。
- public 进入节点市场平台分组。
- private 只在我的录制展示。

### DELETE `/api/nodes/:type`

删除录制节点。内置和 connector 不可删。

---

## 4. Recording API

### POST `/api/nodes/record/start`

请求：

```json
{
  "name": "服务云客户订单查询",
  "description": "根据工单号查询九丘订单号",
  "entryUrl": "https://..."
}
```

返回：

- recording_id
- status
- browser/session info
- started_at

### GET `/api/nodes/record/:id/status`

返回：

- status
- request_count
- recent_requests
- page info
- error

该接口应实时读取 active recorder，而不是只读落盘旧快照。

### POST `/api/nodes/record/finish`

处理：

1. 从 MCP 读取 request index。
2. 对业务候选请求读取完整详情和 response body。
3. 过滤业务请求。
4. 落盘 recording。
5. 调用 LLM。
6. 转换并校验 NodeDefinition。
7. 返回草稿节点。

### POST `/api/nodes/record/:id/invoke-draft`

从 recording 中读取 `llm_trace.converted_node`，直接试调用。

用途：

- 断点调试。
- 避免前端传错 spec 或走旧 registry 路径。

---

## 5. Auth API

### POST `/api/auth/browser-login/start`

打开登录浏览器。

### POST `/api/auth/browser-login/finish`

保存 storage state。

### GET `/api/auth/status`

检查目标平台登录状态。

---

## 6. API 验收

- 缺少真实依赖时返回明确错误。
- 节点试运行和草稿试调用错误结构一致。
- recording status 能反映真实请求数。
- finish 不吞 MCP 异常。
- workflow 保存前强校验。
