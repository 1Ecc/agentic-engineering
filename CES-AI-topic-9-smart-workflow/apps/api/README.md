# SOP1 API / CLI

## 命令

首次登录多平台：

```bash
npm run auth:login
```

系统会打开项目专用浏览器。请在该浏览器里手动登录服务云、九丘、SDI/SPOS。登录态会保存在：

```text
secrets/browser-profile/
```

SPOS 必须通过“服务云 -> SDI -> SPOS”链路进入。通常只需要执行 `npm run auth:login` 一次。

如果服务云和九丘已经登录，但 SPOS 单独失效，可以只执行：

```bash
npm run auth:spos
```

执行 SOP1：

```bash
npm run sop1 -- --work-order-no 202604273400100002
```

启动后端 API：

```bash
npm run api:dev
```

健康检查：

```http
GET http://localhost:3000/health
```

创建 SOP1 执行：

```http
POST http://localhost:3000/api/workflows/sop1-direct-order-invoice/run
Content-Type: application/json

{
  "work_order_no": "202604273400100002"
}
```

查询结果：

```http
GET http://localhost:3000/api/workflows/sop1-direct-order-invoice/runs/{run_id}
```

## 输出

SOP1 最终输出：

- `result_form`：结果表单。
- `extra_processing`：额外处理，固定 6 大场景。

## 安全

- 不保存账号密码。
- 不提交 `secrets/`。
- 不在日志中输出 Cookie、Token、Authorization、BSFToken。
