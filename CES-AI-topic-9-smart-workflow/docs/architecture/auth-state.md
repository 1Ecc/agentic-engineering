# 鉴权底座

## 1. 原则

阶段二复用 SOP1 鉴权底座，不新增账号密码、token、cookie 管理模型。

节点定义中不声明鉴权策略。

---

## 2. 文件

| 文件/目录 | 用途 |
|---|---|
| `secrets/browser-profile` | 用户登录浏览器 profile |
| `secrets/auth-state.json` | 保存后的 storage state |

---

## 3. 登录流程

```text
POST /api/auth/browser-login/start
  -> 打开可见浏览器
  -> 用户登录目标平台
POST /api/auth/browser-login/finish
  -> 保存 storage state 到 secrets/auth-state.json
GET /api/auth/status
  -> 检查各平台登录状态
```

---

## 4. 执行流程

runner 或 recorded handler 运行时：

1. 创建 headless 临时 browser context。
2. 加载 `secrets/auth-state.json`。
3. 使用 `requestJson` 请求业务接口。
4. 根据 URL/平台推断必要 header。
5. 判断 HTTP 和业务 JSON 是否表示登录失效。

---

## 5. AUTH_REQUIRED 判定

以下情况统一转为 `AUTH_REQUIRED`：

- 缺少本地鉴权 header。
- HTTP 401/403。
- 业务 JSON 包含 `code=401`。
- 业务 JSON 包含 `token失效`。
- 业务 JSON 包含 `credential.required`。
- SPOS `loginStatus` 返回未登录。

---

## 6. 使用场景

- SOP1 legacy 执行。
- recorded_http 单接口执行。
- recorded_http_flow 多接口执行。
- 草稿节点试调用。
- 节点市场试运行。
- workflow runner 执行。

---

## 7. 并发与 profile

原则：

- 用户登录使用持久化 browser profile。
- headless 试运行读取 storage state 创建临时上下文。
- 避免试运行占用或锁住登录浏览器 profile。

---

## 8. 安全边界

- 不把 cookie/token 写入 NodeDefinition。
- 不把 authorization 写入 LLM prompt。
- 不把未脱敏鉴权信息写入 trace。
- Demo 期本地文件保存，后续生产化需迁移到安全凭据存储。
