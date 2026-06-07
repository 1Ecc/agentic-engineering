# ADR-001：禁止 mock fallback 伪造成功

## 状态

已采纳。

## 背景

联调早期存在 LLM mock adapter、MCP demo 抓包 fallback、runner mock executor 等逻辑，会让链路看起来可用，但不能证明真实功能打通。

## 决策

阶段二 demo 不使用 mock/fallback 伪造成功。真实依赖缺失时必须明确失败。

## 影响

- LLM provider/key 缺失直接报配置错误。
- MCP 未启用或不可用直接失败。
- 抓包为空直接提示未捕获业务请求。
- 节点输出映射失败返回显性错误。
- 测试覆盖失败边界，而不是 mock 成功路径。

