# Node Recorder

## 1. 角色边界

Node Recorder 是后端模块，作为 MCP Client 驱动 chrome-devtools MCP。

```text
Web -> API -> Node Recorder -> chrome-devtools MCP -> Chrome -> Network evidence -> LLM
```

LLM 只消费后端整理后的请求证据，不直接控制 MCP 或浏览器。

---

## 2. RecorderDriver

抽象接口：

```ts
interface RecorderDriver {
  startSession(input): Promise<RecorderSession>
  getStatus(recordingId): Promise<RecordingStatus>
  listCapturedRequests(recordingId): Promise<CapturedRequest[]>
  cleanupSession(recordingId): Promise<void>
}
```

实现：

- `ChromeDevToolsMcpRecorderDriver`

不再默认切换到 Playwright 录制路径。Playwright 可作为调试参考，但不是当前产品默认实现。

---

## 3. 录制生命周期

### startSession

流程：

1. 启动或连接 chrome-devtools MCP。
2. 使用 isolated 模式避免 profile 冲突。
3. 打开或选择页面。
4. 如果有 entryUrl，导航到目标地址。
5. 创建 recording 文件初始快照。
6. 保存 active recorder 到当前进程内存。

返回：

- recording_id
- page/session info
- status
- started_at

### getStatus

流程：

1. 查找 active recorder。
2. 基于当前页面选择策略读取 network request index。
3. 解析请求摘要。
4. 更新 recording 文件中的 request_count 和 recent requests。
5. 返回给前端。

### finishRecording

流程：

1. 最后一次读取 network request index。
2. 对业务候选请求调用详情接口获取完整 body。
3. 持久化原始 requests。
4. 过滤业务请求。
5. 生成 LLM 输入摘要。
6. 调用 LLM。
7. 转换并校验 NodeDefinition。
8. cleanup session。

---

## 4. 页面选择策略

问题背景：

- SPOS 流程可能从服务云打开 SDI，再进入 SPOS。
- 初始页面可能关闭或不再是业务页面。
- MCP selected page 可能停留在旧 page。

当前策略：

1. `list_pages` 获取页面列表。
2. 优先选择已经出现业务请求的页面。
3. 如果还没有业务请求，多页场景优先选择后打开的页面。
4. 已记录页面存在时可作为 fallback。
5. 不强制 bringToFront，避免把用户从当前页面切回旧页面。
6. 不默认合并所有标签页请求。

---

## 5. Network 请求采集

`list_network_requests` 只作为索引来源。

需要兼容：

- structured payload: `networkRequests`
- singular payload: `networkRequest`
- `requestId`
- 文本格式：`reqid=162 GET https://... [200]`

每条请求需要提取：

- reqid
- method
- url
- status
- request headers 摘要
- query
- post body 摘要

---

## 6. 完整 response body

正确路径：

```text
list_network_requests
  -> parse reqid/method/url/status
  -> get_network_request(reqid, responseFilePath)
  -> read response file
  -> parse JSON if possible
  -> attach to requests[].responseBody
  -> delete temp response file
```

规则：

- `responseFilePath` 文件内容是完整 body 主证据。
- inline Response Body 可作为兼容来源，但不是优先证据。
- telemetry `xcontext.response` 不作为主证据。
- 原始 recording 不应因 LLM token 限制截断 body。
- 如需控制 prompt token，应在 LLM 输入摘要阶段压缩结构。

---

## 7. 请求过滤

过滤目标：

- 降低 LLM 输入噪声。
- 保留真实业务请求。
- 移除敏感 header。

过滤掉：

- 静态资源。
- analytics/monitor/telemetry。
- login/captcha/auth 噪声。
- config/dictionary/privacy/permission/message center。
- heartbeat/polling/sockjs。

保留排序优先级：

1. 用户描述匹配。
2. 非空业务参数多。
3. HTTP status 成功。
4. responseBody 完整。
5. 请求路径属于业务 API。

---

## 8. 落盘结构

recording 文件包含：

```json
{
  "id": "rec_xxx",
  "status": "recording|closed|failed",
  "description": "...",
  "requests": [],
  "filtered_requests": [],
  "llm_input_summary": {},
  "llm_trace": {},
  "converted_node": {},
  "error": null
}
```

---

## 9. 错误处理

| 错误 | 处理 |
|---|---|
| MCP 启动失败 | start 失败 |
| MCP 工具返回文本错误 | 转为异常 |
| 页面关闭 | 重新选择可用业务页 |
| active recorder 不存在 | 返回 session inactive |
| 0 请求 | finish 明确失败 |
| 过滤后 0 业务请求 | 明确提示无业务 API |
| body 读取失败 | 保留请求但标记 body missing |
| LLM 配置缺失 | finish 返回配置错误 |

---

## 10. 验收

- 录制期间 status 能从 0 变为非 0。
- MCP 文本 reqid 能解析。
- 九丘详情 response body 包含完整 `data.orderItem[]`。
- SPOS 多页面录制不固定第一页。
- telemetry 不回填业务 responseBody。
- 失败时能区分 MCP、页面、过滤、LLM、转换错误。
