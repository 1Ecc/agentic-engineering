# Node Registry

## 1. 职责

Node Registry 是运行时节点查找和节点市场数据来源。

负责：

- 加载内置节点。
- 加载阶段一 connector 节点。
- 加载录制节点。
- 按 type resolve NodeDefinition 和 handler。
- 提供节点列表给前端和 LLM。

不负责：

- 执行节点。
- 校验 workflow 数据流。
- 管理多租户权限。

---

## 2. NodeDefinition

核心结构：

```json
{
  "type": "serviceforce.query_customer_order_no",
  "category": "recorded",
  "name": "服务云查询客户订单号",
  "description": "根据工单号查询九丘订单号",
  "icon": "S",
  "platform": "serviceforce",
  "platform_label": "ServiceForce",
  "inputs": [
    {
      "name": "soid",
      "type": "string",
      "required": true,
      "label": "工单号"
    }
  ],
  "outputs": [
    {
      "name": "jiuqiu_order_no",
      "type": "string",
      "label": "九丘订单号"
    }
  ],
  "handler": {
    "kind": "recorded_http_flow",
    "spec": {}
  },
  "metadata": {
    "created_by": "user@lenovo.com",
    "created_at": "2026-05-15T00:00:00.000Z",
    "visibility": "private",
    "source_recording_id": "rec_xxx"
  }
}
```

---

## 3. category

| category | 说明 |
|---|---|
| `builtin` | 平台内置能力 |
| `connector` | 阶段一封装平台能力 |
| `recorded` | 用户录制生成节点 |

---

## 4. handler.kind

| kind | 说明 |
|---|---|
| `builtin` | 内置 handler |
| `connector` | connector handler |
| `recorded_http` | 单接口 HTTP 节点 |
| `recorded_http_flow` | 多接口 HTTP flow |

---

## 5. visibility

录制节点通过 `metadata.visibility` 表达归属：

- `private`：我的录制。
- `public`：同步到节点市场。

Demo 期采用字段区分，不做目录级用户隔离。

---

## 6. 平台分组

平台字段来源：

1. 优先使用 `node.platform`。
2. 其次使用 `type.split(".")[0]`。
3. label 优先使用 `platform_label`。

节点市场统计：

- 平台数：public recorded 节点的 platform 去重。
- 节点数：public recorded 节点数量。
- 接口数：`recorded_http=1`，`recorded_http_flow=steps.length`。

---

## 7. 加载顺序

1. 注册 builtin definitions 和 handlers。
2. 注册 connector definitions 和 handlers。
3. 扫描 `data/nodes/` 加载 recorded nodes。
4. 校验 NodeDefinition。
5. 根据 handler.kind 绑定 handler。

---

## 8. LLM 可用节点注入

生成 workflow 时，availableNodes 应包含：

- builtin 节点。
- connector 节点。
- public recorded 节点。
- 当前用户 private recorded 节点。

节点摘要必须包含：

- type/name/description。
- inputs。
- outputs。
- 数组 item fields。
- handler kind（可选）。

---

## 9. 校验

NodeDefinition 校验：

- type 非空且唯一。
- category 合法。
- inputs/outputs 是数组。
- handler 是对象。
- handler.kind 合法。
- recorded_http 必须有 method/url_template/response_mapping。
- recorded_http_flow 必须有 steps。
- 模板表达式白名单。
- inputs 与 `{{ inputs.* }}` 引用一致。

---

## 10. 删除与覆盖

Demo 期规则：

- recorded 节点可删除。
- builtin/connector 不可删除。
- 同 type 注册可能覆盖旧定义；后续版本管理另行设计。

