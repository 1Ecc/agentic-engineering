# 阶段二 PRD 总览：自然语言编排 + 节点共建平台

> 文档版本：v2.1  
> 更新时间：2026-05-15  
> 文档定位：阶段二产品入口索引与稳定结论摘要  
> 详细信源：`docs/product/`  
> 联调过程信源：`docs/integration/`

---

## 1. 文档定位

阶段二已经从单一 SOP demo 演进为平台级产品原型，原先用一个 PRD 承载所有页面、规则、录制链路、错误边界和演进路线的方式不再合适。

本文件只保留：

- 产品目标和范围总览
- 当前阶段稳定结论
- 专题 PRD 索引
- 验收口径摘要

详细功能规则迁移到 `docs/product/requirements/` 下的专题文档。

---

## 2. 产品目标

阶段二要证明的核心主张是：

> 企业内部业务人员可以把真实系统操作录制成可复用节点，再用自然语言把节点编排成可试运行、可保存、可复用的工作流。

阶段一 SOP1 不再被视为孤立硬编码流程，而是平台能力跑出的第一条可信样例。

---

## 3. 当前范围

| 模块 | 当前定位 | 详细文档 |
|---|---|---|
| 我的流程 | 保存和复用工作流入口 | [workflows.md](../product/requirements/workflows.md) |
| 新建工作流 | 自然语言生成、预览、试运行、保存 | [workflows.md](../product/requirements/workflows.md) |
| 工作流运行 | 通用节点卡片承接运行状态；SOP1 专属页仅保留 legacy 入口 | [workflows.md](../product/requirements/workflows.md) |
| 节点市场 | 展示已同步到市场的节点平台分组，以及我的录制节点 | [node-market.md](../product/requirements/node-market.md) |
| 录制接口 | MCP 浏览器录制、LLM 生成接口规范草稿、转换为 NodeDefinition | [node-recording.md](../product/requirements/node-recording.md) |
| 鉴权 | 复用 SOP1 登录浏览器和本地登录态 | [auth.md](../product/requirements/auth.md) |
| Skills Hub | 与节点市场平级的展示级 demo 板块 | [skills-hub.md](../product/requirements/skills-hub.md) |
| Demo 边界 | 真实链路优先，依赖缺失明确失败，不做 mock fallback | [demo-scope.md](../product/requirements/demo-scope.md) |

---

## 4. 稳定产品结论

- LLM 只在设计期参与：自然语言生成 workflow、录制请求生成接口规范草稿。
- 执行期必须走确定性 runner，不调用 LLM 伪造结果。
- 节点市场按平台维度展示已同步节点；录制节点默认先进入“我的录制”，由用户决定是否同步到节点市场。
- 录制链路以真实浏览器和真实 Network 请求为证据；LLM 不凭空推断接口。
- 工作流预览和普通运行页统一使用节点卡片视图承接，不再默认套用 SOP1 专属步骤轨道。
- 新建工作流支持线性和简单串并行，使用 `dependsOn` 形成执行批次。
- SOP1 场景抽象为通用能力组合：查询节点、`data.compose`、`rules.first_match`、`mail.draft`。
- Skills Hub 目前只是展示级入口，用于表达后续可复用 AI 技能概念。

---

## 5. 非目标

- 不做完整拖拽画布编辑器。
- 不做复杂 DAG、循环、人工审批、复杂错误恢复策略。
- 不做权限、多租户、版本管理、发布审核。
- 不做假执行、mock adapter、mock runner 或 demo 抓包 fallback。
- 不把联调中未经用户验收的临时判断直接沉淀为 PRD 结论。

---

## 6. 验收摘要

- 自然语言能生成符合当前 runner schema 的 workflow。
- 预览页能以节点卡片展示依赖、输入来源、输出字段和校验状态。
- 草稿试运行能在当前卡片视图内展示节点状态、resolved inputs、outputs 和最终结果。
- 保存后的通用工作流运行页复用同一套节点卡片承接。
- 节点录制能通过 MCP 真实浏览器采集请求和完整 response body。
- LLM 生成的接口规范必须保留非空业务参数，且无证据字段必须被校验拦截。
- 录制节点试调用与节点市场试运行均复用 SOP1 登录态，鉴权失效时明确提示并拉起登录流程。
- 真实依赖缺失时明确失败，不伪造成功结果。

---

## 7. 文档入口

- [产品文档入口](../product/README.md)
- [产品愿景](../product/vision.md)
- [信息架构](../product/information-architecture.md)
- [技术方案总览](../architecture/stage2-technical-design.md)
- [架构文档入口](../architecture/README.md)
- [架构决策记录](../decisions/README.md)
- [联调优化记录](../integration/README.md)
