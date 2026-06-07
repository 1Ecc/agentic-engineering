# ADR-003：先生成 ApiCaptureSpec，再转换 NodeDefinition

## 状态

已采纳。

## 背景

让 LLM 直接输出最终 `NodeDefinition` 时，出现过空对象、包装对象、字段名不匹配、遗漏核心业务参数等问题。

## 决策

录制链路中 LLM 第一阶段输出结构化接口规范草稿 `ApiCaptureSpec`，平台再用确定性规则转换为 `NodeDefinition`。

## 影响

- 可记录 `selected_request`、`query_parameters`、`ignored_parameters`、`response_summary` 等证据。
- 可用校验器拦截非空业务参数遗漏。
- 单接口转换为 `recorded_http`。
- 多接口链路转换为 `recorded_http_flow`。

