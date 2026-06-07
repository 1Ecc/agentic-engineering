# 产品文档入口

> 适用范围：CES AI 创想争霸赛 · 九号课题 · 阶段二平台原型  
> 文档职责：稳定产品信源，不记录联调过程流水账

---

## 1. 文档地图

| 文档 | 说明 |
|---|---|
| [vision.md](vision.md) | 产品愿景、阶段目标、边界和二期方向 |
| [user-roles.md](user-roles.md) | 用户角色、典型任务和关注点 |
| [information-architecture.md](information-architecture.md) | 导航、页面关系、模块承接 |
| [requirements/workflows.md](requirements/workflows.md) | 工作流列表、新建、预览、试运行、保存和运行 |
| [requirements/node-market.md](requirements/node-market.md) | 节点市场、我的录制、同步与试运行 |
| [requirements/node-recording.md](requirements/node-recording.md) | 节点录制、MCP 浏览器、接口规范生成与试调用 |
| [requirements/auth.md](requirements/auth.md) | 登录态与鉴权复用 |
| [requirements/skills-hub.md](requirements/skills-hub.md) | Skills Hub 展示入口 |
| [requirements/demo-scope.md](requirements/demo-scope.md) | Demo 边界、失败策略、验收和风险 |

---

## 2. 产品主线

阶段二的产品主线是：

1. 业务人员通过“录制接口”在真实浏览器中操作业务系统。
2. 平台采集 Network 请求和完整响应体，生成接口规范草稿。
3. 系统将规范草稿转换为可执行节点，节点默认进入“我的录制”。
4. 用户可把节点同步到节点市场，使其成为平台可复用能力。
5. 业务人员在“新建工作流”中用自然语言描述目标流程。
6. LLM 基于当前可用节点生成可校验的 workflow。
7. 平台用节点卡片展示、试运行、保存和复用 workflow。

这条主线对应一句话叙事：

> 阶段一是开发写死一条 SOP；阶段二是业务把系统操作录制成节点，再用自然语言组装 SOP。

---

## 3. 当前能力覆盖

| 能力 | 当前阶段状态 | 说明 |
|---|---|---|
| SOP1 真实执行 | 已具备 | 作为阶段一可信样例与鉴权底座 |
| 节点录制 | 已具备核心链路 | 真实 MCP 浏览器、请求采集、LLM 规范生成、草稿试调用 |
| 节点市场 | 已具备 demo 能力 | 平台分组、我的录制、同步状态、节点试运行 |
| 自然语言生成工作流 | 已具备 demo 能力 | 依赖真实 LLM provider，输出可执行 YAML |
| 草稿试运行 | 已具备 | 未保存 workflow 可直接运行，结果回填节点卡片 |
| 简单串并行 | 已具备 | 通过 `dependsOn` 形成执行阶段 |
| 场景判断 | 已具备 demo 能力 | `rules.evaluate` 与 `rules.first_match` |
| 结构化表单 | 已具备 demo 能力 | `data.compose` 整理多源节点输出 |
| Skills Hub | 展示级 demo | 不参与执行 |
| 权限/多租户/版本 | 不做 | 二期或成熟平台底座考虑 |

---

## 4. 从 integration 到产品文档

`docs/integration/` 是问题跟踪和协作缓冲区。以下内容经验证或阶段性稳定后，才沉淀到产品文档：

- 用户流程和页面规则
- 功能边界和非目标
- 错误提示与失败策略
- 验收标准
- 演示路径和产品叙事

技术实现、数据模型和 API 细节应沉淀到 `docs/architecture/`；关键取舍沉淀到 `docs/decisions/`。
