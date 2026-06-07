# SOP1 技术方案：后端架构与鉴权说明

## 1. 目标

SOP1 后端需要实现“输入工单号 -> 跨服务云、九丘、SPOS 查询 -> 输出结果表单 + 额外处理”的完整链路。

技术方案优先满足：

1. 开发成本低，能快速进入可演示状态。
2. 代码边界清晰，避免把页面自动化、业务规则、邮件模板混在一起。
3. 为后续平台化预留模块化接口，但当前阶段不做过度抽象。

## 2. 技术选型

| 模块 | 建议技术 | 说明 |
| --- | --- | --- |
| 后端 API | Node.js + TypeScript | 与 Playwright 生态贴合，适合快速开发 |
| Web 自动化 | Playwright | 复用持久化浏览器会话，支持页面操作和页面内请求 |
| 工作流编排 | 本地 TypeScript 编排 + `workflow.yaml` | SOP1 先固定编排，后续再平台化 |
| 规则判断 | TypeScript 规则执行器 + `rules.yaml` | 固定 6 大额外处理场景 |
| 运行日志 | JSONL / 文件日志 | 便于演示、排障、回放 |
| 配置管理 | `.env` + YAML | 敏感信息不入库 |

## 3. 鉴权方案

### 3.1 最低开发成本方案

SOP1 阶段不做账号密码管理、不做后端鉴权中心、不处理验证码/短信/SSO 自动登录。

采用：

```text
Playwright persistent context + 人工登录一次 + 本地浏览器 profile 复用
```

也就是：

1. 后端提供登录态初始化命令。
2. 命令启动一个项目专用浏览器。
3. 用户在该浏览器中手动登录服务云、九丘、SDI/SPOS。
4. 浏览器登录态自动保存到本地目录。
5. 后续 SOP1 执行时复用该浏览器 profile。
6. 若登录态失效，后端返回 `AUTH_REQUIRED`，提示用户重新登录。

### 3.2 登录态目录

```text
secrets/
└── browser-profile/
```

该目录保存 Cookie、LocalStorage、SessionStorage 等浏览器会话信息，已经由 `.gitignore` 排除，禁止提交到 Git。

### 3.3 用户操作流程

首次使用：

```bash
npm run auth:login
```

系统拉起浏览器，用户手动登录：

1. 服务云
2. 九丘
3. 回到服务云，点击 SDI，再在 SDI 中点击 SPOS，直到成功进入 SPOS 页面

登录完成后关闭浏览器即可。

通常只需要执行 `npm run auth:login` 一次。`npm run auth:spos` 是补救命令，仅用于服务云和九丘已登录但 SPOS 登录态单独失效的场景。

后续执行 SOP1：

```bash
npm run sop1 -- --work-order-no 202604273400100002
```

后端复用 `secrets/browser-profile/` 中的登录态。

### 3.4 登录态失效处理

任一平台发现未登录、跳转登录页、接口返回未授权时，后端统一返回：

```json
{
  "code": "AUTH_REQUIRED",
  "platform": "spos",
  "message": "SPOS 登录态已失效，请重新登录"
}
```

平台枚举：

| platform | 说明 |
| --- | --- |
| `serviceforce` | 服务云 |
| `jiuqiu` | 九丘 |
| `sdi` | SDI |
| `spos` | SPOS |

### 3.5 安全约束

1. 不保存平台账号密码。
2. 不在日志中输出 Cookie、Token、Authorization、BSFToken。
3. 不把 `secrets/` 提交到 Git。
4. API 文档和运行日志中的客户姓名、手机号、地址默认脱敏。

## 4. 后端架构

### 4.1 总体结构

```text
apps/api
  HTTP API、任务创建、任务查询、错误响应

packages/workflow-core
  工作流执行器、步骤上下文、统一错误模型、运行日志

packages/connectors
  serviceforce/
  jiuqiu/
  spos/
  browser/

packages/rules
  SOP1 六大额外处理路由判断

packages/shared
  DTO、平台枚举、日期工具、脱敏工具

workflows/sop1-direct-order-invoice
  workflow.yaml
  rules.yaml
  email-templates/
```

### 4.2 调用链路

```text
API
  -> workflow-core
    -> serviceforce connector
    -> jiuqiu connector
    -> spos connector
    -> normalize result
    -> rules engine
    -> build result_form + extra_processing
```

### 4.3 SOP1 主流程

```text
runSop1(work_order_no)
  -> serviceforce.getPaidJiuqiuOrder(work_order_no)
  -> jiuqiu.getOrderDetail(jiuqiu_order_no)
  -> spos.getInvoiceInfo(jiuqiu_order_no, last_1_year)
  -> normalizeSop1Result()
  -> evaluateExtraProcessing()
  -> return { result_form, extra_processing }
```

## 5. 分层职责

### 5.1 `apps/api`

职责：

1. 暴露 HTTP API。
2. 创建 SOP1 执行任务。
3. 查询 SOP1 执行结果。
4. 将内部错误转换为稳定 API 响应。

不做：

1. 不写平台页面操作。
2. 不写业务规则。
3. 不拼邮件模板。

### 5.2 `workflow-core`

职责：

1. 执行 SOP1 步骤。
2. 管理步骤上下文。
3. 记录运行日志。
4. 捕获平台错误、鉴权错误、数据缺失错误。

不做：

1. 不关心服务云、九丘、SPOS 的字段细节。
2. 不直接判断 6 大业务场景。

### 5.3 `connectors`

职责：

1. 每个平台一个 connector。
2. connector 内部负责页面进入、接口调用、响应解析。
3. 将平台原始字段转换成平台 DTO。

不做：

1. 不判断“是否需要额外处理”。
2. 不生成邮件草稿。
3. 不把平台字段泄漏到规则层之外。

建议 connector：

| Connector | 职责 |
| --- | --- |
| `browser` | 创建 Playwright persistent context、复用浏览器 profile |
| `serviceforce` | 查询历史工单、客户订单、已支付九丘订单 |
| `jiuqiu` | 查询九丘订单列表和订单详情 |
| `spos` | 查询 BTCP、开票状态、发票链接 |

### 5.4 `rules`

职责：

1. 输入标准化后的 SOP1 聚合结果。
2. 输出 `extra_processing`。
3. 固定判断 6 大场景。

不做：

1. 不调用任何平台接口。
2. 不读取 Playwright 页面。

### 5.5 `shared`

职责：

1. 定义通用 DTO。
2. 定义平台枚举。
3. 提供日期、脱敏、空值判断等工具。

## 6. 核心数据模型

### 6.1 最终输出

```ts
export interface Sop1Result {
  result_form: Sop1ResultForm;
  extra_processing: Sop1ExtraProcessing;
  run_status: "success" | "partial_success" | "failed";
  errors: Sop1Error[];
}
```

### 6.2 结果表单

```ts
export interface Sop1ResultForm {
  work_order_no: string;
  jiuqiu_order_no: string | null;
  jiuqiu_order_status: string | null;
  rows: Sop1ResultRow[];
}

export interface Sop1ResultRow {
  work_order_no: string;
  jiuqiu_order_no: string | null;
  jiuqiu_order_status: string | null;
  pgi: string | null;
  s4_order_no: string | null;
  pgi_sscm_success_time: string | null;
  btcp_order_no: string | null;
  invoice_status: string | null;
  invoice_type: string | null;
  invoice_link: string | null;
}
```

### 6.3 额外处理

```ts
export type Sop1ExtraProcessingRoute =
  | "NO_EXTRA_NO_JIUQIU_ORDER"
  | "NO_EXTRA_JIUQIU_NOT_COMPLETED"
  | "EMAIL_BTCP_MISSING"
  | "EMAIL_PGI_SSCM_MISSING"
  | "EMAIL_DIGITAL_NORMAL_NOT_INVOICED"
  | "EMAIL_DIGITAL_SPECIAL_NOT_INVOICED"
  | null;

export interface Sop1ExtraProcessing {
  route: Sop1ExtraProcessingRoute;
  name: string;
  need_email_draft: boolean;
  email_draft: EmailDraft | null;
}
```

## 7. 额外处理规则

额外处理固定 6 大场景：

| 路由 | 邮件草稿 |
| --- | --- |
| `NO_EXTRA_NO_JIUQIU_ORDER` | 否 |
| `NO_EXTRA_JIUQIU_NOT_COMPLETED` | 否 |
| `EMAIL_BTCP_MISSING` | 是 |
| `EMAIL_PGI_SSCM_MISSING` | 是 |
| `EMAIL_DIGITAL_NORMAL_NOT_INVOICED` | 是 |
| `EMAIL_DIGITAL_SPECIAL_NOT_INVOICED` | 是 |

正常完成时：

```json
{
  "route": null,
  "name": "无额外处理",
  "need_email_draft": false,
  "email_draft": null
}
```

## 8. API 设计建议

### 8.1 初始化登录态

```http
POST /api/auth/browser-login/start
```

行为：

- 启动 Playwright persistent browser。
- 用户手动登录多平台。
- 后端只负责拉起浏览器，不接触账号密码。

### 8.2 检查登录态

```http
GET /api/auth/status
```

Response:

```json
{
  "serviceforce": "ok",
  "jiuqiu": "ok",
  "spos": "auth_required"
}
```

### 8.3 执行 SOP1

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

### 8.4 获取执行结果

```http
GET /api/workflows/sop1-direct-order-invoice/runs/{run_id}
```

Response:

```json
{
  "run_id": "run_20260509_001",
  "status": "success",
  "result_form": {
    "work_order_no": "202604273400100002",
    "jiuqiu_order_no": "RETAIL20260430000023",
    "jiuqiu_order_status": "已成交",
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

## 9. 错误模型

| 错误码 | 说明 |
| --- | --- |
| `AUTH_REQUIRED` | 平台登录态失效，需要人工重新登录 |
| `PLATFORM_REQUEST_FAILED` | 平台接口请求失败 |
| `PLATFORM_RESPONSE_INVALID` | 平台响应结构异常 |
| `DATA_NOT_FOUND` | 关键业务数据未查到 |
| `WORKFLOW_FAILED` | 工作流执行失败 |

错误示例：

```json
{
  "code": "AUTH_REQUIRED",
  "platform": "jiuqiu",
  "step": "jiuqiu.getOrderDetail",
  "message": "九丘登录态已失效，请重新登录"
}
```

## 10. 代码质量约束

1. 一个 connector 只负责一个平台。
2. connector 返回 DTO，不直接返回页面原始大对象给规则层。
3. 规则层只接收标准化后的聚合对象。
4. 邮件模板单独维护，不散落在流程代码中。
5. 每个步骤要有明确输入、输出、错误。
6. 禁止把 Cookie、Token、密码写进日志。
7. SOP1 可以固定编排，但代码结构必须允许后续新增 SOP。

## 11. 开发顺序

1. 初始化 Node.js + TypeScript 项目。
2. 实现 `browser` connector，支持 persistent profile。
3. 实现 `auth:login` 命令。
4. 实现服务云 connector。
5. 实现九丘 connector。
6. 实现 SPOS connector。
7. 实现 SOP1 DTO normalize。
8. 实现 6 大额外处理规则。
9. 实现 API 层。
10. 加入运行日志、脱敏、错误处理。
