### 问题 12：MCP 录制完整响应体采集路径

#### bug专题：MCP 能拿到完整 responseBody，但产品化录制路径没有稳定落盘完整响应体

**问题描述**：

问题 11 中曾判断“响应体不完整的根因是 MCP 无法稳定提供完整 body”，并临时把默认录制实现切到 Playwright Network。经过用户反馈和现场 MCP 实验，该判断需要修正：

- `chrome-devtools-mcp` 本身可以在九丘订单详情场景拿到完整 `/order/detail/{id}` response body。
- 旧录制文件 `data/recordings/rec_1778730863154.json` 中 responseBody 不完整，是产品化录制路径没有把 MCP 的完整详情响应正确落盘。
- 后续 telemetry 回填又把 1500 字符截断片段写入 `filtered_requests.responseBody`，造成“看似有响应体、实际不完整”的假证据。

现场复测：

```text
页面：https://jiuqiu.lenovo.com.cn/#/ordermanage/search/detail/11650722
MCP 请求：reqid=162 GET https://jiuqiu.lenovo.com.cn/order/detail/11650722?_t=1778736329055 [200]
```

MCP `get_network_request(162)` inline 已返回完整响应体，且使用 `responseFilePath` 保存后验证：

```json
{
  "bytes": 3826,
  "chars": 3692,
  "hasOrderItem": true,
  "itemCount": 2,
  "firstPgi": "6906458020",
  "firstSo": "E013891958",
  "firstS4ToSscmTime": "2026-05-09 10:24:56",
  "secondPgi": "1200379000",
  "secondSo": "E013891957",
  "secondS4ToSscmTime": "2026-05-09 10:24:51"
}
```

对比旧录制文件：

```json
[
  {
    "section": "requests",
    "chars": 0,
    "hasOrderItem": false
  },
  {
    "section": "filtered_requests",
    "chars": 1500,
    "hasOrderItem": false,
    "tail": "...\"orderCustomer\":{\"id\":11317504,\"orderId\":11650722,\"name\":\"王康健\",\"c$"
  }
]
```

**当前态**：

- 默认录制接口命名仍是 `createMcpClient()`、`mcpEnabled`、`mode: "mcp"`。
- 前一次修复曾把 `createMcpClient()` 默认实现改为 `PlaywrightNetworkRecorderDriver`，该方向不符合当前项目的 MCP 录制架构，已撤销。
- `ChromeDevToolsMcpRecorderDriver` 原路径存在两个关键缺陷：
  - `list_network_requests` 在实际 MCP 工具中可能只返回文本列表，文本里包含 `reqid=...`；旧代码只从 structured payload 提取 reqid，导致没进入 `get_network_request` 详情路径。
  - 详情读取未强制使用 `responseFilePath` 保存响应体；即使 inline 可用，也不应把展示文本当作唯一完整证据。
- telemetry `xcontext.response` 已证明会截断，不能再作为业务 responseBody 来源。

**期望态（需要跟用户沟通确认）**：

- 继续采用 `chrome-devtools-mcp` 作为录制节点的浏览器采集能力，不切换到 Playwright。
- `list_network_requests` 只作为请求索引来源；完整响应体必须通过 `get_network_request(reqid, responseFilePath)` 获取。
- 对每个业务候选请求：
  - 从 structured payload 和文本列表两类 MCP 返回中都能提取 `reqid`。
  - 调用 `get_network_request` 获取详情。
  - 优先读取 `responseFilePath` 保存的响应体文件，解析 JSON 后写入原始 `requests[].responseBody`。
  - inline `Response Body` 只作为兼容来源，不作为优先证据。
- `filtered_requests` 不再从 telemetry 回填 body，只对已完整落盘的业务请求做过滤、脱敏和排序。
- 针对九丘详情的验收标准：新录制 `/order/detail/{id}` 的原始 `requests` 与 `filtered_requests` 均能看到完整 `data.orderItem[]`，并包含 `pgi`、`so`、`s4ToSscmTime`。
- 新增输出收敛验收：完整 responseBody 只作为证据保存；节点最终输出必须按用户描述收敛。若用户只要求“订单状态、服务产品信息的 PGI、S4 订单号、PGI 抛送 sscm 成功时间”，则 `service_products` 不能返回整条 `orderItem` 对象，只能返回这些目标字段和必要行标识。

**分析与解决**：

根因不是“筛选规则过滤掉了响应体”，也不是“MCP 无法拿完整响应体”，而是录制路径把 MCP 能力用错了。

正确链路应该是：

```text
list_network_requests
  -> 解析 reqid / method / url / status
  -> 对 reqid 调 get_network_request
  -> 使用 responseFilePath 保存完整响应体
  -> 从文件读取并 JSON 解析
  -> 写入原始 recording.requests[].responseBody
  -> filterCapturedRequests 只过滤业务请求，不做 telemetry body 回填
  -> LLM 基于完整业务响应体做字段映射
```

本轮代码修正：

- 恢复 `createMcpClient()` 默认返回 `ChromeDevToolsMcpRecorderDriver`。
- 移除默认 Playwright 录制路径，避免 MCP 架构被误切换。
- `listRequestsForSelectedPage()` 同时从 structured payload 和文本列表解析 reqid。
- `get_network_request` 详情调用增加 `responseFilePath`，从临时 `.network-response` 文件读取完整 body 并解析 JSON。
- 当详情文本缺少 method 时，优先使用列表里的 method，避免 POST 被错误降级成 GET。
- 临时 response 文件读取后立即清理，避免敏感业务响应长期残留。
- 保留 telemetry 过滤，不再把 telemetry 当作 responseBody 来源。

**bug：完整响应体导致输出层膨胀**：

2026-05-14 用户在 `rec_1778737298797.json` 中发现：MCP 完整响应体采集修复后，录制文本和响应证据明显更完整，但最终节点输出也明显变多。

分析后确认：

- 该 recording 的 `outputs` 顶层已经较收敛，只有 `order_status` 和 `service_products`。
- 真正膨胀点在 `service_products` 的运行映射：它直接映射 `$.data.orderItem`，导致每个服务产品返回完整 `orderItem` 对象。
- 用户目标只要求 `PGI`、`S4订单号`、`PGI抛送sscm成功时间`，可选增加 `material_no/product_name` 这类行标识；不应默认返回 `dealPrice`、`settlePrice`、`createTime`、`tenantId` 等未要求字段。
- 因此根因不是“响应体太完整”，而是 recorded_http runner 只支持整段 JSONPath 提取，缺少数组明细的字段投影能力。

本轮修复：

- 保持录制层完整 responseBody 不变。
- 暂不处理 LLM 输入摘要，后续单独优化。
- 为 recorded_http/recorded_http_flow 的 step `response_mapping` 增加投影映射能力：

```json
{
  "service_products": {
    "path": "$.data.orderItem",
    "item_mapping": {
      "material_no": "materialNo",
      "pgi": "pgi",
      "s4_order_no": "so",
      "pgi_to_sscm_success_time": "s4ToSscmTime"
    }
  }
}
```

运行时会先取 `$.data.orderItem` 数组，再对每条 item 只投影 `item_mapping` 指定字段，避免把完整 item 原样输出。

同时更新 LLM prompt：当用户要求列表/明细数组中的部分字段时，必须使用投影映射，不允许把整条数组对象原样作为最终输出。

**to-issues**：

- [x] 用真实九丘流程验证 chrome-devtools MCP 可获取完整 `/order/detail/{id}` response body。
- [x] 对比旧录制 `rec_1778730863154`，确认原始 `requests` 无 body、`filtered_requests` 为 1500 字符截断片段。
- [x] 撤销默认 Playwright 录制实现，恢复 MCP 默认录制。
- [x] 修复 MCP reqid 提取路径：structured payload 与文本列表都可提取 reqid。
- [x] 修复 MCP 详情路径：使用 `get_network_request(reqid, responseFilePath)` 保存并读取完整响应体。
- [x] 保持 telemetry 请求过滤，并禁止 telemetry 回填业务 `responseBody`。
- [ ] 用户重新录制九丘 case，验证新 recording 的 `/order/detail/{id}` 原始响应体包含 `data.orderItem[]`、`pgi`、`so`、`s4ToSscmTime`。
- [ ] 基于新 recording 重新生成节点，确认不再生成无证据的 `$.data.serviceProducts`。
- [x] 记录 `rec_1778737298797` 暴露的新 bug：完整响应体进入链路后，`service_products: $.data.orderItem` 会把整条明细对象输出，超出用户目标字段。
- [x] 增加 step `response_mapping` 数组投影能力，支持 `{ path, item_mapping }` 只输出用户目标子字段。
- [x] 更新 LLM prompt，要求 outputs 按用户描述收敛；明细数组部分字段必须使用投影映射，不能返回整条对象。
- [x] 增加回归测试：完整 `orderItem` 响应中存在未要求字段时，节点结果只返回 `material_no/pgi/s4_order_no/pgi_to_sscm_success_time`。
- [ ] 用户重新生成该九丘节点，验证 `service_products` 不再包含完整 `orderItem` 冗余字段。

**bug记录**：

- 2026-05-14：用户指出将 MCP 默认录制改成 Playwright 不合理，应回到 MCP 路线并修正 MCP 路径。
- 2026-05-14：现场 MCP 实验证明 `get_network_request(162)` 能拿到完整九丘 `/order/detail/11650722` 响应体，保存文件为 3826 bytes，包含 `data.orderItem[]` 两条明细。
- 2026-05-14：旧录制 `rec_1778730863154` 中同一接口原始 `requests.responseBody` 为空，`filtered_requests.responseBody` 只有 1500 字符且截断在 `orderCustomer`，不含 `orderItem/pgi/so/s4ToSscmTime`。
- 2026-05-14：确认根因是产品化 MCP 录制路径没有稳定进入完整详情响应读取与落盘，而不是 MCP 本身无法获取完整响应。
- 2026-05-14：用户发现 `rec_1778737298797` 完整响应体进入链路后，最终输出内容明显变多。确认根因是 `service_products` 直接映射整条 `$.data.orderItem`，已增加数组投影映射能力并更新 prompt 约束。

**用户验收状态**：待用户重新录制/重新生成九丘 case 验证。
