# ADR-005：MCP responseFilePath 是完整响应体主证据

## 状态

已采纳。

## 背景

九丘详情录制曾因 responseBody 不完整，导致 LLM 猜测不存在的 `serviceProducts` 字段。现场验证表明 chrome-devtools MCP 可以通过详情接口拿到完整响应体，问题在产品化录制路径没有稳定落盘完整 body。

## 决策

`list_network_requests` 只作为请求索引；完整 response body 必须通过 `get_network_request(reqid, responseFilePath)` 获取并落盘。

## 影响

- telemetry 中的 `xcontext.response` 不作为业务 responseBody 主证据。
- response 文件读取后立即清理。
- LLM 输入摘要可截断，但原始 recording 证据不应截断。
- 明细数组输出应使用字段投影，避免完整响应体导致输出膨胀。

