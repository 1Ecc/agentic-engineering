# ADR-004：支持 recorded_http_flow 多接口录制节点

## 状态

已采纳。

## 背景

服务云“根据工单号查询九丘订单号”等场景不是单接口请求，而是多接口业务链路。录制草稿节点如果未注册，也需要直接试调用验证。

## 决策

支持 `handler.kind=recorded_http_flow`，用于顺序执行多步录制请求；支持草稿 NodeDefinition 直接试调用，不要求先注册到节点市场。

## 影响

- step 支持 `query_template`、`body_template`、`response_mapping`。
- 后续 step 可引用 `steps.step_id.field`。
- 最终输出按 flow response_mapping 汇总。
- 登录态和请求执行复用 SOP1 鉴权底座。

