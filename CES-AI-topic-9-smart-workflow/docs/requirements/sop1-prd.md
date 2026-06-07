# SOP1 PRD：直客订单查询及发票处理工作流

## 1. 背景

保外直客业务中，用户通过联想服务小程序支付维修费用后，联想需要向用户开具发票，并在订单明细或短信中提供发票下载链接。

当前业务人员在处理客服、客诉、工程师反馈时，需要跨服务云、九丘、SDI/SPOS 多个平台手工查询订单和发票链路，确认订单是否完成、PGI 是否正常、是否推送到 BTCP/SPOS、发票是否已开出。该过程重复、耗时，且容易因系统切换遗漏关键信息。

SOP1 的目标是将该流程一键化：输入工单号，自动完成跨系统查询，输出结构化结果，并根据异常场景生成对应邮件草稿。

## 2. 产品目标

### 2.1 当前阶段目标

实现 SOP1 的一键查询与异常判断，满足业务演示和后续后端开发落地。

### 2.2 不在当前阶段范围

1. 不自动发送邮件，只生成邮件草稿。
2. 不实现通用拖拽式流程编排。
3. 不覆盖 SOP2、DFC 等其他流程。
4. 不在代码中保存账号、密码、Cookie、Token。

## 3. 用户与场景

### 3.1 目标用户

- 业务处理人员：输入工单号，查看查询结果和异常建议。
- 后端服务：根据查询结果进入对应“额外处理”路由。
- 后续平台化编排模块：复用本 SOP 的查询、判断、邮件草稿能力。

### 3.2 核心场景

用户输入一个工单号，系统自动：

1. 在服务云查询该工单对应的九丘订单号。
2. 在九丘查询订单状态、PGI、S4 订单号、PGI 抛送 sscm 成功时间。
3. 在 SPOS 查询 BTCP 订单号、开票状态、发票类型、发票链接。
4. 汇总结果表。
5. 输出结果表单，并根据“额外处理”6 大场景生成后端判断路由和邮件草稿。

## 4. 输入与输出

### 4.1 输入

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `work_order_no` | string | 是 | 服务云工单号，例如 `202604273400100002` |

### 4.2 输出

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `work_order_no` | string | 工单号 |
| `jiuqiu_order_no` | string/null | 九丘订单号 |
| `jiuqiu_order_status` | string/null | 九丘订单状态 |
| `jiuqiu_order_status_code` | string/number/null | 九丘订单状态码 |
| `result_form` | object | 结果表单，包含工单、九丘、PGI、BTCP、发票字段 |
| `extra_processing` | object | 额外处理结果，包含 6 大场景路由与邮件草稿 |
| `run_status` | string | `success` / `partial_success` / `failed` |
| `errors` | array | 查询失败或字段缺失信息 |

### 4.3 结果行字段

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `work_order_no` | 用户输入 | 工单号 |
| `jiuqiu_order_no` | 服务云 | 九丘订单号 |
| `jiuqiu_order_status` | 九丘 | 订单状态，接口样例为 `已成交` |
| `pgi` | 九丘 / SPOS | PGI |
| `s4_order_no` | 九丘 / SPOS | S4 订单号 |
| `pgi_sscm_success_time` | 九丘 | PGI 抛送 sscm 成功时间 |
| `btcp_order_no` | SPOS | BTCP 订单号，对应接口字段 `eccSOCode` |
| `invoice_status` | SPOS | 开票状态 |
| `invoice_type` | SPOS | 发票类型 |
| `invoice_link` | SPOS | PDF 发票链接 |
| `invoice_xml_link` | SPOS | XML 发票链接 |
| `invoice_ofd_link` | SPOS | OFD/ZIP 发票链接 |

## 5. 接口链路

接口详情见 [SOP1 Network Capture API 文档](../api/sop1-network-capture.md)。

### 5.1 最小接口链路

| 顺序 | 系统 | 接口 | 目的 |
| --- | --- | --- | --- |
| 1 | 服务云 | `GET /fieldserviceapi/api/ServiceOrderHis/GetServiceOrderHisList` | 按工单号查历史工单，获取 `passKey/checkCode` |
| 2 | 服务云 | `GET /fieldservicejapi/customerOrder/list` | 按工单号获取九丘订单号 |
| 3 | 九丘 | `GET /order/list` | 按九丘订单号获取九丘内部订单 ID |
| 4 | 九丘 | `GET /order/detail/{id}` | 获取订单状态、PGI、S4、PGI 抛送时间 |
| 5 | SPOS | `POST /spos-sales/b2cSales/order/queryPage` | 获取 BTCP、开票状态、发票类型、发票链接 |

### 5.2 字段映射

| 业务字段 | 接口字段 |
| --- | --- |
| 九丘订单号 | 服务云 `customerOrder/list.data[].orderNo` |
| 九丘支付状态 | 服务云 `customerOrder/list.data[].orderStatusName` |
| 九丘订单状态 | 九丘 `order/detail.data.order.orderStatusName` |
| 九丘订单状态码 | 九丘 `order/detail.data.order.orderStatus` |
| PGI | 九丘 `orderItem[].pgi`；SPOS `dataList[].pgi` |
| S4 订单号 | 九丘 `orderItem[].so`；SPOS `dataList[].so` |
| PGI 抛送时间 | 九丘 `orderItem[].s4ToSscmTime` |
| BTCP 订单号 | SPOS `dataList[].eccSOCode` |
| 开票状态 | SPOS `dataList[].invoiceStatusName` |
| 发票类型 | SPOS `dataList[].invoiceTypeName` |
| 发票链接 | SPOS `dataList[].invoiceDownloadAddress` |

### 5.3 SPOS 查询时间范围

SPOS 查询接口 `queryPage` 必须设置创建时间范围：

```text
createStartTime = 当前日期前一年
createEndTime = 当前日期
```

业务已确认统一回退一年，避免页面默认近两周范围导致历史订单漏查。

## 6. 状态归一化

### 6.1 九丘完成态

SOP 原文中使用“已完成”，实际九丘接口返回：

| 接口字段 | 样例值 |
| --- | --- |
| `orderStatus` | `3` |
| `orderStatusName` | `已成交` |

产品判断中将九丘 `orderStatus=3` 或 `orderStatusName=已成交` 归一为：

```text
JIUQIU_COMPLETED
```

后端规则判断优先使用状态码，其次使用文案。

业务已确认：SOP 中“已完成”与九丘接口“已成交 / orderStatus=3”等价。

### 6.2 发票状态

| 接口字段 | 接口值 | 归一化 |
| --- | --- | --- |
| `invoiceStatus` | `1` | `INVOICED` |
| `invoiceStatusName` | `已开票` | `INVOICED` |
| `invoiceStatus` | `0` | `NOT_INVOICED` |
| `invoiceStatusName` | `未开票` | `NOT_INVOICED` |

### 6.3 发票类型

| 接口字段 | 接口值 | 归一化 |
| --- | --- | --- |
| `invoiceType` | `SD` | `DIGITAL_NORMAL` |
| `invoiceTypeName` | `数电发票` | `DIGITAL_NORMAL` |
| `invoiceType` | `SZ` | `DIGITAL_SPECIAL` |
| `invoiceTypeName` | `数电专票` | `DIGITAL_SPECIAL` |

## 7. 额外处理场景与后端判断路由

“额外处理”是 SOP1 后端判断的核心路由。后端应在查询完成后，根据统一后的业务状态输出 `extra_processing.route`。

SOP1 最终只输出两类内容：

1. `result_form`：结果表单。
2. `extra_processing`：额外处理，固定 6 大场景，其中 4 个场景需要生成邮件草稿。

### 7.1 路由总表

| 路由 | 场景名称 | 是否生成邮件草稿 | 业务结论 |
| --- | --- | --- | --- |
| `NO_EXTRA_NO_JIUQIU_ORDER` | 无九丘订单号 | 否 | 有工单号但服务云未查到已支付九丘订单 |
| `NO_EXTRA_JIUQIU_NOT_COMPLETED` | 九丘订单未完成 | 否 | 有九丘订单，但订单未进入完成态 |
| `EMAIL_BTCP_MISSING` | BTCP 无信息 | 是 | 九丘订单已完成，但 PGI 或 BTCP 订单号缺失 |
| `EMAIL_PGI_SSCM_MISSING` | PGI 未推送到 sscm | 是 | 九丘订单已完成，但 PGI 抛送 sscm 成功时间为空 |
| `EMAIL_DIGITAL_NORMAL_NOT_INVOICED` | 数电发票未开出 | 是 | 数电发票未开票且无发票链接 |
| `EMAIL_DIGITAL_SPECIAL_NOT_INVOICED` | 数电专票未开出 | 是 | 数电专票未开票且无发票链接 |

说明：

- “正常完成，关键信息齐全，已开票且发票链接存在”属于结果表单正常态，不进入额外处理 6 大场景。
- 接口失败、权限异常、状态冲突属于系统运行异常，应进入 `errors`，不作为业务额外处理场景。

### 7.2 判断字段

后端判断前应从多系统结果聚合以下字段：

```json
{
  "work_order_no": "202604273400100002",
  "jiuqiu_order_no": "RETAIL20260430000023",
  "jiuqiu_completed": true,
  "pgi_values": ["6906458020", "1200379000"],
  "s4_order_values": ["E013891958", "E013891957"],
  "pgi_sscm_success_time_values": ["2026-05-09 10:24:56", "2026-05-09 10:24:51"],
  "btcp_order_values": ["N028686732"],
  "invoice_status_values": ["已开票"],
  "invoice_type_values": ["数电发票"],
  "invoice_link_values": ["https://...pdf"]
}
```

### 7.3 判断优先级

建议按以下顺序判断，命中即停止：

1. `NO_EXTRA_NO_JIUQIU_ORDER`
2. `NO_EXTRA_JIUQIU_NOT_COMPLETED`
3. `EMAIL_BTCP_MISSING`
4. `EMAIL_PGI_SSCM_MISSING`
5. `EMAIL_DIGITAL_NORMAL_NOT_INVOICED`
6. `EMAIL_DIGITAL_SPECIAL_NOT_INVOICED`

原因：越靠前越是链路上游缺失；上游缺失时，下游状态不应继续推断。

### 7.4 路由详情

#### 7.4.1 `NO_EXTRA_NO_JIUQIU_ORDER`

触发条件：

```text
work_order_no 非空
AND jiuqiu_order_no 为空
```

系统行为：

- 展示查询结果。
- 不生成邮件草稿。
- 前端提示：未查询到已支付九丘订单号，无需额外处理。

#### 7.4.2 `NO_EXTRA_JIUQIU_NOT_COMPLETED`

触发条件：

```text
work_order_no 非空
AND jiuqiu_order_no 非空
AND jiuqiu_completed = false
```

系统行为：

- 展示当前九丘订单状态。
- 不生成邮件草稿。
- 前端提示：九丘订单尚未完成，无需额外处理。

#### 7.4.3 `EMAIL_BTCP_MISSING`

触发条件：

```text
jiuqiu_completed = true
AND (
  所有 pgi_values 均为空
  OR btcp_order_values 为空
)
```

系统行为：

- 生成邮件草稿。
- `extra_processing.route = EMAIL_BTCP_MISSING`

邮件：

| 字段 | 内容 |
| --- | --- |
| 收件人 | `yangyn12@lenovo.com` |
| 抄送 | `wuty1@lenovo.com` |
| 正文 | 工单号“{work_order_no}”，九丘订单号“{jiuqiu_order_no}”，九丘订单已完成，BTCP 没有信息，辛苦看下订单是否成功推送给 BTCP 系统。 |

备注：

- SOP 原文写“PGI/BTCP 订单号为空”，后端实现时建议拆开记录缺失项，但路由仍归入同一场景。
- 如果 PGI 存在但 BTCP 缺失，也归入该路由。

#### 7.4.4 `EMAIL_PGI_SSCM_MISSING`

触发条件：

```text
jiuqiu_completed = true
AND pgi_sscm_success_time_values 为空
```

系统行为：

- 生成邮件草稿。
- `extra_processing.route = EMAIL_PGI_SSCM_MISSING`

邮件：

| 字段 | 内容 |
| --- | --- |
| 收件人 | `yangyn12@lenovo.com` |
| 抄送 | `wuty1@lenovo.com` |
| 正文 | 工单号“{work_order_no}”，九丘订单号“{jiuqiu_order_no}”，九丘订单已完成，PGI 没有推送到 sscm，辛苦看下 PGI 推送失败原因。 |

#### 7.4.5 `EMAIL_DIGITAL_NORMAL_NOT_INVOICED`

触发条件：

```text
jiuqiu_completed = true
AND btcp_order_values 非空
AND pgi_values 非空
AND pgi_sscm_success_time_values 非空
AND invoice_status != 已开票
AND invoice_type = 数电发票
AND invoice_link_values 为空
```

系统行为：

- 生成邮件草稿。
- `extra_processing.route = EMAIL_DIGITAL_NORMAL_NOT_INVOICED`

邮件：

| 字段 | 内容 |
| --- | --- |
| 收件人 | 待补充 BTCP 的 IT 邮箱 |
| 抄送 | `yuls1@lenovo.com` |
| 正文 | 工单号“{work_order_no}”，九丘订单号“{jiuqiu_order_no}”，BTCP 单号“{btcp_order_no}”，九丘已推送至 SPOS 系统，但是普票未开出，辛苦 IT 同学确认订单推送是否正常。 |

说明：

- BTCP 的 IT 收件人邮箱当前无须处理，按业务模板保留待补充占位。
- 邮件正文不改写，按业务人员给定模板输出。

#### 7.4.6 `EMAIL_DIGITAL_SPECIAL_NOT_INVOICED`

触发条件：

```text
jiuqiu_completed = true
AND btcp_order_values 非空
AND pgi_values 非空
AND pgi_sscm_success_time_values 非空
AND invoice_status != 已开票
AND invoice_type = 数电专票
AND invoice_link_values 为空
```

系统行为：

- 生成邮件草稿。
- `extra_processing.route = EMAIL_DIGITAL_SPECIAL_NOT_INVOICED`

邮件：

| 字段 | 内容 |
| --- | --- |
| 收件人 | `chenxf13@lenovo.com` |
| 正文 | 工单号“{work_order_no}”，九丘订单号“{jiuqiu_order_no}”，BTCP 单号“{btcp_order_no}”，九丘已推送至 SPOS 系统，但是普票未开出，辛苦会计同学确认发票是否已经到开票界面。 |

说明：

- 邮件正文不改写，按业务人员给定模板输出。

## 8. 多明细与去重规则

### 8.1 多九丘订单

服务云 `customerOrder/list` 可能返回多个九丘订单。

处理规则：

1. 优先筛选 `systemFlag = jiuqiu`。
2. 再筛选 `orderStatus = PAID` 或 `orderStatusName = 已支付`。
3. 若只有一个已支付订单，进入后续流程。
4. 若没有已支付订单，路由为 `NO_EXTRA_NO_JIUQIU_ORDER`。
5. 业务已确认：不存在多个已支付九丘订单；若服务云返回多个九丘订单，直接选择已支付订单。

### 8.2 多 PGI / S4 明细

九丘 `orderItem[]` 可能有多条明细。

处理规则：

1. 结果表展示全部明细。
2. `pgi_values`、`s4_order_values`、`pgi_sscm_success_time_values` 聚合为数组。
3. 判断“为空”时，按整体业务链路判断：
   - 所有值都为空：认为缺失。
   - 部分为空：结果表单中如实展示，额外处理按业务主状态命中规则。

### 8.3 多 SPOS / BTCP 明细

SPOS `dataList[]` 可能返回多条物料明细，且同一个 `eccSOCode` 可能重复。

处理规则：

1. 结果表展示全部明细。
2. `btcp_order_values` 按 `eccSOCode` 去重。
3. 邮件草稿只生成一份。
4. 邮件正文中的 `btcp_order_no` 多个时用中文顿号拼接。

## 9. 前端页面需求

### 9.1 查询入口

页面提供：

- 工单号输入框。
- 查询按钮。
- 查询进度展示。

### 9.2 查询结果

结果区展示：

- 工单号。
- 九丘订单号。
- 九丘订单状态。
- PGI。
- S4 订单号。
- PGI 抛送 sscm 成功时间。
- BTCP 订单号。
- 开票状态。
- 发票类型。
- 发票链接。

### 9.3 额外处理区

展示：

- 后端路由 `extra_processing.route`。
- 中文场景名。
- 处理建议。
- 邮件草稿，若有。
- “复制邮件内容”按钮。

当前阶段不提供自动发送按钮。

## 10. 后端接口建议

### 10.1 创建 SOP1 查询任务

```http
POST /api/workflows/sop1-direct-order-invoice/run
```

Request:

```json
{
  "work_order_no": "202604273400100002"
}
```

Response:

```json
{
  "run_id": "run_20260509_001",
  "status": "running"
}
```

### 10.2 获取 SOP1 查询结果

```http
GET /api/workflows/sop1-direct-order-invoice/runs/{run_id}
```

Response:

```json
{
  "run_id": "run_20260509_001",
  "status": "success",
  "input": {
    "work_order_no": "202604273400100002"
  },
  "result_form": {
    "rows": []
  },
  "extra_processing": {
    "route": null,
    "name": "无额外处理",
    "need_email_draft": false,
    "email_draft": null
  },
  "errors": []
}
```

## 11. 验收标准

1. 输入工单号后，系统能自动完成服务云、九丘、SPOS 查询。
2. 系统能输出结构化结果表。
3. 系统能准确输出 `extra_processing.route`，且只在 6 大额外处理场景内取值。
4. 命中邮件类路由时，仅生成一份邮件草稿。
5. 不命中邮件类路由时，不生成邮件草稿。
6. 多明细场景能完整展示，不丢失 BTCP、PGI、S4、发票链接。
7. 接口失败或状态冲突时进入 `errors`，不误生成业务邮件。
8. 运行过程保留日志，能定位失败系统、接口、步骤。

## 12. 已确认事项

| 编号 | 问题 | 影响 |
| --- | --- | --- |
| Q1 | SOP 原文“已完成”与九丘接口“已成交/orderStatus=3”是否确认等价 | 已确认等价 |
| Q2 | R5 的 BTCP IT 收件人邮箱 | 无须处理，按模板保留 |
| Q3 | R5/R6 邮件正文中的“普票”是否需要按发票类型改写 | 不改写，按业务模板 |
| Q4 | SPOS 查询时间范围是否统一设为当前日期前一年 | 已确认，统一回退一年 |
| Q5 | 多个已支付九丘订单是否存在真实业务场景 | 不存在；多个九丘订单时选择已支付订单 |
