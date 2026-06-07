# SOP1 Network Capture API 文档

> 捕获范围：仅记录业务相关的 `fetch / XHR / GraphQL / WebSocket` 请求。已忽略 JS/CSS/图片/字体/埋点/监控/静态资源。
>
> 安全处理：文档不记录 `Cookie`、`authapitoken`、`x-xsrf-token` 等认证信息；客户姓名、手机号、地址等隐私字段仅做脱敏摘要。

## 1. 服务云平台：按工单号获取九丘订单号

### 1.1 查询当前工单列表

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://serviceforce.lenovo.com.cn/fieldserviceapi/api/ServiceOrder/GetServiceOrderList` |
| Status | `200` |
| 业务含义 | 在当前工单列表中按工单号查询。该 case 当前列表无结果，随后进入历史工单查询。 |

#### Query

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `isDesc` | `true` | 倒序 |
| `pageIndex` | `1` | 页码 |
| `pageSize` | `10` | 每页数量 |
| `soid` | `202604273400100002` | 工单号 |
| `_t` | `1778309806797` | 时间戳/防缓存 |

其余筛选项如 `projectNO`、`rawNO`、`serviceTypeId`、`custName`、`custPhone`、`productSN`、`orderStatus` 等为空。

#### Request Payload

无，参数通过 query string 传递。

#### Response 摘要

```json
{
  "rows": [],
  "total": 0,
  "code": 200,
  "msg": "成功"
}
```

---

### 1.2 查询历史工单列表

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://serviceforce.lenovo.com.cn/fieldserviceapi/api/ServiceOrderHis/GetServiceOrderHisList` |
| Status | `200` |
| 业务含义 | 当前工单列表无结果后，按工单号查询历史工单，得到历史工单基础信息和进入详情页所需的 `passKey/checkCode`。 |

#### Query

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `isDesc` | `true` | 倒序 |
| `pageIndex` | `1` | 页码 |
| `pageSize` | `10` | 每页数量 |
| `soid` | `202604273400100002` | 工单号 |
| `_t` | `1778309808981` | 时间戳/防缓存 |

其余筛选项为空。

#### Request Payload

无。

#### Response 摘要

```json
{
  "rows": [
    {
      "soid": "202604273400100002",
      "serviceTypeName": "保外直客尊享",
      "orderStatus": "1000",
      "orderStatusName": "已关单",
      "orderServiceModeName": "约修",
      "productSN": "PF3074TV",
      "catalogName4": "Lenovo Legion R7000P 2021",
      "partStatusName": "已满足",
      "projectName": "联想售后服务业务",
      "createTime": "2026-04-27 15:51:04",
      "closeTime": "2026-04-30 12:19:02",
      "application_name": "fieldservicejapi",
      "passKey": "091a2cc92f804494a71c218586b43849"
    }
  ],
  "total": 1,
  "code": 200,
  "msg": "成功"
}
```

---

### 1.3 查询工单详情

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://serviceforce.lenovo.com.cn/fieldservicejapi/serviceOrderHistory/detail` |
| Status | `200` |
| 业务含义 | 根据历史工单号和 `checkCode/passKey` 获取工单详情，用于展示工单基本信息、客户化状态、产品信息等。 |

#### Query

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `soId` | `202604273400100002` | 工单号 |
| `checkCode` | `091a2cc92f804494a71c218586b43849` | 历史工单接口返回的 `passKey` |
| `_t` | `1778309830169` | 时间戳/防缓存 |

#### Request Payload

无。

#### Response 摘要

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "soId": "202604273400100002",
    "serviceTypeName": "保外直客尊享",
    "projectName": "联想售后服务业务",
    "status": "1000",
    "statusName": "已关单",
    "customerStatus": "已支付",
    "productSeries": "拯救者笔记本",
    "serviceModeName": "约修",
    "createTime": "2026-04-27 15:51:04",
    "serviceCompleteTime": "2026-04-30 12:18:58",
    "closeTime": "2026-04-30 12:19:02",
    "customer": {
      "customerName": "已脱敏",
      "customerPhone": "已脱敏"
    },
    "serviceOrderProducts": [
      {
        "productSn": "PF3074TV",
        "materialNo": "82JW000ECD",
        "productName": "Lenovo Legion R7000P2021BKDR716G51210C",
        "catalogName1": "笔记本",
        "catalogName2": "Lenovo系列",
        "catalogName3": "拯救者笔记本",
        "catalogName4": "Lenovo Legion R7000P 2021"
      }
    ]
  }
}
```

#### 备注

同一页面也触发了：

```text
GET /fieldservicejapi/serviceOrder/detail?soId=...&checkCode=...
```

该接口返回 `historyFlag: true` 但主要详情字段为空。对历史工单详情应优先使用 `/serviceOrderHistory/detail`。

---

### 1.4 查询客户订单列表，获取九丘订单号

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://serviceforce.lenovo.com.cn/fieldservicejapi/customerOrder/list` |
| Status | `200` |
| 业务含义 | 在工单详情页“客户订单”栏目获取关联订单。SOP1 中用于筛选 `systemFlag=jiuqiu` 且 `orderStatusName=已支付` 的九丘订单号。 |

#### Query

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `soId` | `202604273400100002` | 工单号 |
| `_t` | `1778309840069` | 时间戳/防缓存 |

#### Request Payload

无。

#### Response 摘要

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "soId": "202604273400100002",
      "orderNo": "RETAIL20260430000023",
      "orderAmount": 907.00,
      "orderStatus": "PAID",
      "orderStatusName": "已支付",
      "systemFlag": "jiuqiu",
      "createTime": "2026-04-30 11:28:27",
      "updateBy": "JIUQIU",
      "updateTime": "2026-04-30 12:07:41",
      "requestJson": {
        "repairOrderNo": "202604273400100002",
        "routeCode": "RETAIL",
        "serviceStationNo": "34001003",
        "snCode": "PF3074TV",
        "itemList": [
          {
            "materialNo": "5CB1C93000",
            "materialType": "主机上盖（含键盘）",
            "sscmOrderNo": "SO34001003260427001"
          }
        ]
      }
    }
  ]
}
```

#### SOP1 字段映射

| SOP 字段 | 接口字段 | 当前样例 |
| --- | --- | --- |
| 工单号 | `soId` | `202604273400100002` |
| 九丘订单号 | `data[].orderNo` | `RETAIL20260430000023` |
| 九丘订单支付状态 | `data[].orderStatusName` | `已支付` |
| 订单来源系统 | `data[].systemFlag` | `jiuqiu` |

#### 自动化建议

1. 先调用历史工单列表接口获取 `passKey`。
2. 使用 `soId + passKey` 获取历史工单详情。
3. 调用客户订单列表接口。
4. 从 `data[]` 中筛选：
   - `systemFlag == "jiuqiu"`
   - `orderStatus == "PAID"` 或 `orderStatusName == "已支付"`
5. 取 `orderNo` 作为下一步九丘系统查询输入。

---

## 2. 九丘系统：按九丘订单号查询订单详情

### 2.1 查询订单列表

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://jiuqiu.lenovo.com.cn/order/list` |
| Status | `200` |
| 业务含义 | 在九丘“订单查询”页面，按九丘订单号查询订单列表，获取订单内部 `id`，用于进入订单详情。 |

#### Query

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `orderNo` | `RETAIL20260430000023` | 九丘订单号 |
| `pageNum` | `1` | 页码 |
| `pageSize` | `10` | 每页数量 |
| `startCreateDate` | 空 | 创建时间开始。用户清空时间条件后为空 |
| `endCreateDate` | 空 | 创建时间结束。用户清空时间条件后为空 |
| `_t` | `1778310421171` | 时间戳/防缓存 |

页面操作过程中观察到 3 次相同业务查询：

1. 第一次仍带 `endCreateDate=2026-05-09`。
2. 后两次已清空 `startCreateDate/endCreateDate`。
3. 三次返回同一条订单，自动化时建议直接使用清空日期后的查询。

其余筛选项如 `materialNo`、`hostNo`、`customerPhone`、`customerName`、`routeCode`、`orderStatus`、`repairNo` 等为空。

#### Request Payload

无，参数通过 query string 传递。

#### Response 摘要

```json
{
  "total": 1,
  "rows": [
    {
      "id": 11650722,
      "orderNo": "RETAIL20260430000023",
      "orderType": 8,
      "orderTypeName": "备件订单",
      "routeCode": "RETAIL",
      "agentCode": "服务零售",
      "organizationName": "服务零售",
      "dealPrice": 907.00,
      "orderSettlePrice": 907.00,
      "customerName": "已脱敏",
      "hostNo": "PF3074TV",
      "machineName": "Lenovo Legion R7000P2021BKDR716G51210C",
      "serviceStationNo": "34001003",
      "settlementStatusName": "不核销",
      "registerStatusName": "不需要注册",
      "orderStatus": 3,
      "orderStatusName": "已成交",
      "createDate": "2026-04-30",
      "dealDate": "2026-04-30",
      "repairNo": "202604273400100002",
      "thirdPartyOrderNo": "2026042734001000021777519705582",
      "remark": "更换主机上盖(含键盘)",
      "clientTypeName": "线下门店",
      "customerModeName": "C",
      "mtm": "82JW000ECD"
    }
  ],
  "code": 200,
  "msg": "查询成功"
}
```

#### SOP1 字段映射

| SOP 字段 | 接口字段 | 当前样例 |
| --- | --- | --- |
| 九丘订单内部 ID | `rows[].id` | `11650722` |
| 九丘订单号 | `rows[].orderNo` | `RETAIL20260430000023` |
| 订单状态 | `rows[].orderStatusName` | `已成交` |
| 工单号 | `rows[].repairNo` | `202604273400100002` |
| 平台订单号/第三方订单号 | `rows[].thirdPartyOrderNo` | `2026042734001000021777519705582` |

#### 自动化建议

1. 用 `orderNo` 精确查询。
2. 清空创建时间条件，避免默认时间范围漏查。
3. 从 `rows[0].id` 获取九丘内部订单 ID。
4. 若 `total=0`，输出九丘查询无结果。

---

### 2.2 查询订单详情

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://jiuqiu.lenovo.com.cn/order/detail/{id}` |
| Status | `200` |
| 业务含义 | 进入九丘订单详情页，获取订单主信息、服务产品明细、S4 订单号、PGI、PGI 抛送 sscm 成功时间。 |

#### Path

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `id` | `11650722` | 订单列表接口返回的九丘内部订单 ID |

#### Query

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `_t` | `1778310441859` | 时间戳/防缓存 |

#### Request Payload

无。

#### Response 摘要

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "order": {
      "id": 11650722,
      "orderNo": "RETAIL20260430000023",
      "platformOrderNo": "2026042734001000021777519705582",
      "machineNo": "PF3074TV",
      "machineName": "Lenovo Legion R7000P2021BKDR716G51210C",
      "routeCode": "RETAIL",
      "orderTypeName": "备件订单",
      "orderStatus": 3,
      "orderStatusName": "已成交",
      "submitTime": "2026-04-30 11:28:26",
      "dealTime": "2026-04-30 12:07:39",
      "mtm": "82JW000ECD"
    },
    "orderDetail": {
      "repairId": "202604273400100002",
      "shipmentsSo": "2026042734001000021777519705582",
      "serviceStationNo": "34001003"
    },
    "orderCustomer": {
      "name": "已脱敏",
      "phone": "已脱敏"
    },
    "orderItem": [
      {
        "materialNo": "5CB1C93000",
        "dealPrice": 807.00,
        "number": 1,
        "sscmOrderNo": "SO34001003260427001",
        "factoryCode": "0110",
        "storageCode": "0203",
        "so": "E013891958",
        "pgi": "6906458020",
        "s4ToSscmTime": "2026-05-09 10:24:56"
      },
      {
        "materialNo": "CESOWLQ302",
        "productName": "维修服务费",
        "dealPrice": 100.00,
        "number": 1,
        "factoryCode": "0140",
        "storageCode": "CHFN",
        "so": "E013891957",
        "pgi": "1200379000",
        "s4ToSscmTime": "2026-05-09 10:24:51"
      }
    ],
    "orderInvoice": null
  },
  "error": null
}
```

#### SOP1 字段映射

| SOP 字段 | 接口字段 | 当前样例 |
| --- | --- | --- |
| 九丘订单号 | `data.order.orderNo` | `RETAIL20260430000023` |
| 订单状态 | `data.order.orderStatusName` | `已成交` |
| PGI | `data.orderItem[].pgi` | `6906458020`, `1200379000` |
| S4 订单号 | `data.orderItem[].so` | `E013891958`, `E013891957` |
| PGI 抛送 sscm 成功时间 | `data.orderItem[].s4ToSscmTime` | `2026-05-09 10:24:56`, `2026-05-09 10:24:51` |

#### 业务判断备注

原 SOP 文档中异常规则写的是“订单状态为已完成”，但本次九丘接口实际返回 `orderStatusName=已成交`、`orderStatus=3`。后续规则实现时需要确认：

1. 是否将九丘 `已成交` 视为 SOP 中的“已完成”。
2. 是否优先使用状态码 `orderStatus=3` 判断，而不是文案。

#### 自动化建议

1. 订单级状态取 `data.order.orderStatusName`。
2. PGI/S4/抛送时间来自 `data.orderItem[]`，可能多条。
3. 若多条 `orderItem` 都有 PGI/S4 信息，结果表可展开为多行或合并展示；后续 SPOS/BTCP 查询仍以九丘订单号作为平台订单号。
4. `orderInvoice` 当前为 `null`，发票状态仍需进入 SPOS 查询。

---

### 2.3 字典接口：订单状态等枚举

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://jiuqiu.lenovo.com.cn/base/dict/multiple/{dictTypes}` |
| Status | `200` |
| 业务含义 | 页面加载订单查询筛选项时获取字典。对 SOP1 主流程不是必须接口，但可用于确认订单状态码含义。 |

#### Query / Path

```text
dictTypes = order_status,order_register_status,order_settlement_status,order_return_status,order_type,customer_mode,series_upgrade,sys_yes_no,order_delivery_label
```

#### Response 摘要

订单状态字典关键项：

| dictValue | dictLabel |
| --- | --- |
| `0` | 仅保存 |
| `1` | 待支付 |
| `2` | 已否决 |
| `3` | 已成交 |
| `8` | 已失效 |
| `9` | 已撤销 |

---

## 3. SPOS 系统：按平台订单号查询 BTCP 与发票信息

### 3.1 查询 B2C 销售订单明细

| 项 | 内容 |
| --- | --- |
| Method | `POST` |
| URL | `https://spos.lenovo.com.cn/spos-sales/b2cSales/order/queryPage` |
| Status | `200` |
| 业务含义 | 在 SPOS “B2C 销售 / 订单查询”页面，以九丘订单号作为平台订单号查询 BTCP 订单、开票状态、发票类型、发票下载链接，以及每条物料明细对应的 S4/PGI/SSCM 信息。 |

#### Request Payload

```json
{
  "createEndTime": "2026-05-09",
  "createStartTime": "2026-04-24",
  "paymentTimeBegin": "",
  "paymentTimeEnd": "",
  "eccSOCode": "",
  "itemAmountStart": "",
  "itemAmountEnd": "",
  "legalCode": "0001",
  "offset": 0,
  "platformCode": "",
  "orderStatus": "",
  "platOrderCode": "RETAIL20260430000023",
  "serviceID": "",
  "isSepcialOrder": "",
  "isReturn": "",
  "pageIndex": 1,
  "pageSize": 10,
  "invoiceStatus": "",
  "so": "",
  "sscmOrderNo": "",
  "shop": ""
}
```

#### Payload 说明

| 字段 | 示例值 | 说明 |
| --- | --- | --- |
| `platOrderCode` | `RETAIL20260430000023` | 平台订单号，即九丘订单号 |
| `legalCode` | `0001` | 法人/主体编码。本次页面选择后自动带出 |
| `createStartTime` | `2026-04-24` | 创建时间开始。页面默认近两周 |
| `createEndTime` | `2026-05-09` | 创建时间结束 |
| `pageIndex` | `1` | 页码 |
| `pageSize` | `10` | 每页数量 |

#### Response 摘要

```json
{
  "success": true,
  "data": {
    "totalPage": 1,
    "totalNumber": 2,
    "pageIndex": 1,
    "pageSize": 10,
    "dataList": [
      {
        "id": 3255201,
        "platOrderCode": "RETAIL20260430000023",
        "orderSource": "保外直客",
        "eccSOCode": "N028686732",
        "orderStatus": "ORDER_STOCK_OUT",
        "orderStatusName": "已发货",
        "materialName": "主机上盖（含键盘）COVER Upper Case ASM_ENG L82JW BK_WHW/F",
        "itemQuantity": 1.0,
        "itemPrice": 807.00,
        "itemAmount": 807.00,
        "itemActualAmount": 807.00,
        "invoiceType": "SD",
        "invoiceTypeName": "数电发票",
        "invoceNo": null,
        "invoiceDownloadAddress": "https://btcp.app.lefile.cn/btcp/vatpdf/2026/4/20260430124312lzruuF642F80E5875747D575534D34D7C54F11.pdf",
        "invoiceDownloadAddressXML": "https://btcp.app.lefile.cn/btcp/vatpdf/2026/4/20260430124312GqBAsM8691E39EF1856D659ABD672CF5D994A0.xml",
        "invoiceDownloadAddressOFD": "https://btcp.app.lefile.cn/btcp/vatpdf/2026/4/202604301243138yoLJ70B69C89CEB175B586AE3B6913DE7D5EA.zip",
        "btcpOrderStatus": "12000",
        "btcpOrderStatusName": "已处理",
        "btcpOrderSubStatus": "12500",
        "btcpOrderSubStatusName": "已签收",
        "invoiceStatus": 1,
        "invoiceStatusName": "已开票",
        "so": "E013891958",
        "pgi": "6906458020",
        "sscmOrderNo": "SO34001003260427001",
        "shop": "BWZK"
      },
      {
        "id": 3255201,
        "platOrderCode": "RETAIL20260430000023",
        "orderSource": "保外直客",
        "eccSOCode": "N028686732",
        "orderStatusName": "已发货",
        "materialName": "维修服务费",
        "itemQuantity": 1.0,
        "itemPrice": 100.00,
        "itemAmount": 100.00,
        "itemActualAmount": 100.00,
        "invoiceType": "SD",
        "invoiceTypeName": "数电发票",
        "invoiceDownloadAddress": "https://btcp.app.lefile.cn/btcp/vatpdf/2026/4/20260430124312lzruuF642F80E5875747D575534D34D7C54F11.pdf",
        "invoiceStatus": 1,
        "invoiceStatusName": "已开票",
        "so": "E013891957",
        "pgi": "1200379000",
        "sscmOrderNo": null,
        "shop": "BWZK"
      }
    ]
  },
  "hint": null
}
```

#### SOP1 字段映射

| SOP 字段 | 接口字段 | 当前样例 |
| --- | --- | --- |
| 九丘订单号 / 平台订单号 | `data.dataList[].platOrderCode` | `RETAIL20260430000023` |
| BTCP 订单号 | `data.dataList[].eccSOCode` | `N028686732` |
| 开票状态 | `data.dataList[].invoiceStatusName` | `已开票` |
| 发票类型 | `data.dataList[].invoiceTypeName` | `数电发票` |
| 发票链接 | `data.dataList[].invoiceDownloadAddress` | PDF 链接 |
| 发票 XML 链接 | `data.dataList[].invoiceDownloadAddressXML` | XML 链接 |
| 发票 OFD/ZIP 链接 | `data.dataList[].invoiceDownloadAddressOFD` | ZIP 链接 |
| S4 订单号 | `data.dataList[].so` | `E013891958`, `E013891957` |
| PGI | `data.dataList[].pgi` | `6906458020`, `1200379000` |
| SSCM 订单号 | `data.dataList[].sscmOrderNo` | `SO34001003260427001`, `null` |

#### 自动化建议

1. 使用 `POST /spos-sales/b2cSales/order/queryPage` 作为 SOP1 的 SPOS 主查询接口。
2. 输入字段只需要稳定填入 `platOrderCode`，必要时加 `legalCode=0001`。
3. 时间范围需覆盖目标订单创建时间。SOP 文档建议回退到一年前，本次页面实际 payload 仍为近两周；后续自动化建议将 `createStartTime` 设置为当前日期前一年。
4. 同一 `eccSOCode` 可能对应多条物料明细，应全部展示；异常处理时可按同一 `eccSOCode` 去重。
5. 发票链接优先取 `invoiceDownloadAddress`，这是 PDF 下载地址。

---

### 3.2 老版 B2C 查询接口

| 项 | 内容 |
| --- | --- |
| Method | `POST` |
| URL | `https://spos.lenovo.com.cn/spos-sales/b2cSales/order/findOrderList` |
| Status | `200` |
| 业务含义 | 页面加载时触发的另一个订单列表查询接口，返回订单级列表和 `itemList`。本次 SOP 查询目标最终由 `queryPage` 返回完整明细与发票下载链接。 |

#### Request Payload

```json
{
  "legalCode": "",
  "platOrderCode": "",
  "platformCode": "",
  "eccSOCode": "",
  "orderStatus": "",
  "totalPayamountStart": "",
  "totalPayamountEnd": "",
  "createTimeStart": "2026-04-24",
  "createTimeEnd": "2026-05-09",
  "invoiceType": "",
  "serviceID": "",
  "isSepcialOrder": "",
  "pageIndex": 1,
  "pageSize": 10
}
```

#### Response 摘要

返回结构为：

```json
{
  "success": true,
  "data": {
    "totalPage": 65,
    "totalNumber": 645,
    "pageIndex": 1,
    "pageSize": 10,
    "dataList": [
      {
        "orderId": 3255866,
        "orderCode": "BWZK20260509145814765",
        "platOrderCode": "RETAIL20260414000074",
        "eccSOCode": "N028775497",
        "orderStatusName": "已发货",
        "invoiceTypeName": "数电专票",
        "btcpOrderStatusName": "已处理",
        "btcpOrderSubStatusName": "已签收",
        "invoiceStatus": 0,
        "invoiceStatusName": "未开票",
        "itemList": []
      }
    ]
  }
}
```

#### 备注

该接口未在最终精准查询中使用 `platOrderCode=RETAIL20260430000023`，且返回体被页面初始列表占用。SOP1 自动化优先使用 `queryPage`。

---

### 3.3 枚举接口：发票状态

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://spos.lenovo.com.cn/spos-sales/sales/getCommonEnums?enumKey=invoiceStatus` |
| Status | `200` |
| 业务含义 | 获取发票状态枚举。 |

#### Response

```json
[
  { "label": "未开票", "value": "0" },
  { "label": "已开票", "value": "1" }
]
```

---

### 3.4 枚举接口：发票类型

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| URL | `https://spos.lenovo.com.cn/spos-sales/sales/getCommonEnums?enumKey=taxType` |
| Status | `200` |
| 业务含义 | 获取发票类型枚举。 |

#### Response

```json
[
  { "label": "增值税专用发票", "value": "Z" },
  { "label": "数电专票", "value": "SZ" },
  { "label": "数电发票", "value": "SD" },
  { "label": "电子发票", "value": "D" }
]
```

---

## 4. SOP1 端到端接口串联建议

### 4.1 最小接口链路

1. 服务云历史工单查询：
   `GET /fieldserviceapi/api/ServiceOrderHis/GetServiceOrderHisList?soid={work_order_no}`

2. 服务云客户订单查询：
   `GET /fieldservicejapi/customerOrder/list?soId={work_order_no}`

3. 九丘订单列表查询：
   `GET /order/list?orderNo={jiuqiu_order_no}`

4. 九丘订单详情查询：
   `GET /order/detail/{jiuqiu_internal_id}`

5. SPOS 发票信息查询：
   `POST /spos-sales/b2cSales/order/queryPage`

### 4.2 当前样例最终结果

| 工单号 | 九丘订单号 | 九丘状态 | PGI | S4 订单号 | PGI 抛送 sscm 成功时间 | BTCP 订单号 | 开票状态 | 发票类型 | 发票链接 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `202604273400100002` | `RETAIL20260430000023` | `已成交` | `6906458020` | `E013891958` | `2026-05-09 10:24:56` | `N028686732` | `已开票` | `数电发票` | PDF 链接存在 |
| `202604273400100002` | `RETAIL20260430000023` | `已成交` | `1200379000` | `E013891957` | `2026-05-09 10:24:51` | `N028686732` | `已开票` | `数电发票` | PDF 链接存在 |

### 4.3 当前样例规则判断

当前样例：

- 有九丘订单号。
- 九丘状态为 `已成交`，可视为 SOP 中“已完成/成功状态”的候选值。
- PGI、S4、PGI 抛送 sscm 成功时间均存在。
- BTCP 订单号存在。
- 开票状态为 `已开票`。
- 发票 PDF 链接存在。

因此不应生成异常邮件草稿。
