# ADR-002：LLM 不是 MCP Client

## 状态

已采纳。

## 背景

MCP 录制链路曾在文档表述上容易被理解为“LLM 驱动 MCP”。实际正确边界是：后端驱动 MCP，LLM 只消费整理后的请求证据。

## 决策

后端 Node Recorder 是 MCP Client。chrome-devtools MCP 是 MCP Server。LLM 不与 MCP 直接交互。

## 影响

- 浏览器启动、页面选择、Network 采集都在后端完成。
- LLM 只参与接口规范草稿生成。
- MCP 失败不得被包装成 LLM 生成失败或空请求成功。

