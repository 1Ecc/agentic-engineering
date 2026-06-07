# 测试策略

## 1. 命令

常用：

```bash
npm run typecheck
npm run web:build
npm run test:runner
npm run test:llm-recorder
npm run test:api
```

断点：

```bash
npm run debug:recording-node -- rec_xxx input_name=value
```

鉴权：

```bash
npm run auth:login
npm run auth:status
```

---

## 2. 原则

- 测试真实失败边界，不测试 mock 成功。
- 对 LLM 不稳定结果使用 schema/fixture/trace 断点控制。
- 用户真实操作后，优先用 recording 断点复测，减少重复浏览器操作。
- 能在校验阶段发现的问题，不拖到运行阶段。

---

## 3. Runner 测试

覆盖：

- YAML parse。
- workflow schema。
- `$inputs` / `$node.field` / 数组下标插值。
- `dependsOn` 批次执行。
- `when` skipped。
- `data.compose`。
- `rules.evaluate`。
- `rules.first_match`。
- recorded_http query/body 渲染。
- recorded_http_flow steps 引用。
- time templates。
- 数组投影映射。
- `DATA_NOT_FOUND`。
- `AUTH_REQUIRED`。

---

## 4. Recorder / LLM 测试

覆盖：

- MCP 0 请求。
- MCP 工具失败。
- reqid 文本解析。
- responseFilePath body 读取。
- 请求过滤和排序。
- 非空业务参数遗漏校验。
- `ApiCaptureSpec` schema。
- `ApiCaptureSpec -> NodeDefinition` 转换。
- `recorded_http_flow` 生成。
- 模板白名单。
- LLM trace 脱敏。

---

## 5. API 测试

覆盖：

- LLM_PROVIDER 缺失。
- provider key 缺失。
- workflow generate / validate / run draft。
- node invoke / invoke draft。
- recording start/status/finish。
- auth required 结构化错误。

注意：

- 测试中若需要模拟 provider 缺失，应显式设置环境变量为空，避免 `.env` 自动回填。

---

## 6. 前端验证

一般文档或纯逻辑改动不要求 Playwright。

需要前端验证时，优先人工打开本地页面确认：

- `#/workflows/new`
- `#/workflows/preview`
- `#/workflows/:id/run`
- `#/nodes`
- `#/nodes/record`
- `#/skills`

如果用户明确不需要 Playwright，则不做自动浏览器走查。

---

## 7. 验收断点样例

服务云多接口节点：

```bash
npm run debug:recording-node -- rec_1778664090416 service_order_id=202604273400100002
```

验收：

- 不报 Node type unregistered。
- 鉴权正常时能返回九丘订单号。
- 鉴权失效时报 `AUTH_REQUIRED`。
