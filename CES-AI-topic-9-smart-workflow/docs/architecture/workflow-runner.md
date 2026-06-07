# Workflow Runner

## 1. 职责

Workflow Runner 负责执行已经校验通过的 workflow YAML。

负责：

- 解析 YAML。
- 校验 workflow schema。
- 校验节点引用和输入字段。
- 构建依赖执行计划。
- 解析模板和变量引用。
- 调用节点 handler。
- 收集节点快照、日志和最终 outputs。

不负责：

- 调用 LLM。
- 录制接口。
- 处理账号密码。
- 写死 SOP1 业务规则。

---

## 2. Workflow Schema

顶层字段：

```yaml
id: string
name: string
description: string
inputs: WorkflowInput[]
nodes: WorkflowNode[]
outputs: Record<string, unknown>
```

`WorkflowInput`：

```yaml
name: string
type: string
label?: string
required?: boolean
default?: unknown
```

`WorkflowNode`：

```yaml
id: string
type: string
dependsOn?: string[]
when?: string
inputs: Record<string, unknown>
```

---

## 3. 校验

保存和试运行前必须校验：

- YAML 可解析。
- 顶层字段合法。
- `id` 唯一。
- node id 唯一。
- node type 存在于 registry。
- node inputs 不包含未知字段。
- 必填 inputs 已配置。
- `$inputs.field` 引用存在。
- `$node.field` 引用的 node 已定义，且字段属于该 node outputs 的顶层字段。
- 数组下标深层路径允许保留给运行时解析，但顶层字段必须存在。
- `dependsOn` 不形成环。
- `when` 表达式在支持范围内。
- 模板表达式在白名单内。

---

## 4. 执行计划

### 4.1 默认线性

未声明 `dependsOn` 时，按 nodes 顺序执行，保持旧 workflow 兼容。

### 4.2 显式依赖

声明 `dependsOn` 后，runner 构建执行批次：

```text
batch 1: 无依赖节点
batch 2: 依赖 batch 1 完成的节点
batch 3: 依赖 batch 2 或更早节点的节点
```

同一批次内节点可并行执行。

### 4.3 失败和跳过

- 节点失败：记录 error。
- `when=false`：节点 skipped。
- 依赖失败：下游 skipped，并记录原因。
- skipped 节点不产生正常 outputs。

---

## 5. 变量与模板

独立值引用：

- `$inputs.field`
- `$nodeId.field`
- `$nodeId.array[0].field`

模板字符串：

- `{{ inputs.field }}`
- `{{ $inputs.field }}`
- `{{ nodeId.field }}`
- `{{ $nodeId.field }}`
- `{{ steps.stepId.field }}`

时间函数：

- `{{ time.today() }}`
- `{{ time.now() }}`
- `{{ time.add(time.today(), "-P1Y") }}`
- `{{ time.format(value, "YYYY-MM-DD") }}`

严格模式：

- recorded_http / recorded_http_flow 渲染请求时必须使用严格模板。
- 未知表达式不能静默渲染为空。

---

## 6. Handler 类型

| kind | 说明 |
|---|---|
| `builtin` | 内置节点，如 data.compose、rules、mail |
| `connector` | 阶段一封装 connector |
| `recorded_http` | 单接口录制节点 |
| `recorded_http_flow` | 多接口录制节点 |

---

## 7. recorded_http

执行步骤：

1. 渲染 `url_template`。
2. 渲染 `query_template`。
3. 渲染 `body_template`。
4. 使用 SOP1 登录态请求业务接口。
5. 判断业务层鉴权错误。
6. 按 `response_mapping` 提取 outputs。

映射失败：

- 必需输出映射不到时返回 `DATA_NOT_FOUND`。
- 不把缺失字段转为空字符串成功。

---

## 8. recorded_http_flow

用于多接口链路。

spec 结构：

```json
{
  "steps": [
    {
      "id": "query_order",
      "method": "GET",
      "url_template": "https://...",
      "query_template": {
        "soid": "{{ inputs.service_order_id }}"
      },
      "response_mapping": {
        "order_soid": "$.rows[0].soid"
      }
    }
  ],
  "response_mapping": {
    "jiuqiu_order_no": "$.steps.query_customer_order.order_no"
  }
}
```

规则：

- steps 顺序执行。
- 每步输出写入 `steps.<step_id>`。
- 后续步骤可引用前序输出。
- flow 最终 response_mapping 汇总 outputs。

---

## 9. 数组投影映射

当用户只需要数组对象的部分字段时，使用投影映射：

```json
{
  "service_products": {
    "path": "$.data.orderItem",
    "item_mapping": {
      "material_no": "materialNo",
      "pgi": "pgi",
      "s4_order_no": "so",
      "pgi_push_sscm_time": "s4ToSscmTime"
    }
  }
}
```

目标：

- 原始 response body 可完整保存。
- 最终输出按用户目标字段收敛。

---

## 10. 内置节点

### data.compose

输入：

```yaml
value: object | array | string
```

输出：

```yaml
value: resolved value
```

只做递归插值，不做计算引擎。

### rules.evaluate

输入：

```yaml
facts: object
expression: string
```

输出：

```yaml
passed: boolean
reason: string
evaluated: object
```

支持表达式：

- `==`
- `!=`
- `&&`
- `||`
- `empty()`
- `notEmpty()`

### rules.first_match

输入：

```yaml
facts: object
rules:
  - id: R1
    expression: "..."
    action: none
    reason: "无需处理"
```

输出：

- `matched`
- `rule_id`
- `action`
- `reason`
- `evaluated`

### mail.draft

输入：

- `to`
- `cc`
- `subject`
- `template`

输出：

- `draft`

---

## 11. Run Record

运行记录应包含：

- workflow id/name
- inputs
- status
- batches
- node snapshots
- final outputs
- logs
- error

node snapshot：

- node id
- type
- status
- configured inputs
- resolved inputs
- outputs
- start/end time
- error/skipped reason

---

## 12. 验收

- 线性旧 workflow 可运行。
- `dependsOn` 可形成简单并行。
- 草稿 workflow 可运行。
- SOP1 通用链路可表达。
- `data.compose` 能组装结构化表单。
- `rules.first_match` 最多命中一条动作。
- 输出映射失败显性报错。
