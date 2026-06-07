# 前端架构

## 1. 页面与路由

| 路由 | 页面 | 职责 |
|---|---|---|
| `#/workflows` | WorkflowList | 已保存流程列表 |
| `#/workflows/new` | NewWorkflow | 自然语言生成 workflow |
| `#/workflows/preview` | WorkflowPreview | YAML/卡片预览、校验、草稿试运行、保存 |
| `#/workflows/:id/run` | WorkflowRun | 已保存 workflow 运行 |
| `#/nodes` | NodeMarket | 节点市场、我的录制、试运行 |
| `#/nodes/record` | NodeRecord | 三步式节点录制 |
| `#/skills` | SkillsHub | 展示级技能入口 |

## 2. 共享组件

| 组件 | 作用 |
|---|---|
| `WorkflowNodeCard` | 工作流节点卡片，预览和运行共用 |
| `NodeChip` | 可用节点摘要 |
| `AuthBar` | 登录、保存登录态、检查登录态 |
| `Sop1ResultTable` | SOP1 legacy 结果表格 |
| `EmailDraftPanel` | 邮件草稿展示/编辑 |

## 3. 工作流卡片视图

卡片视图是新建、预览、试运行和普通运行的统一承接。

布局：

- 根据执行批次展示阶段。
- 阶段列固定宽度，横向滚动。
- 阶段内展示并行节点。
- 节点间关系由 `dependsOn` 或引用推导。

卡片默认信息：

- 节点名
- type
- 状态
- 输入来源摘要
- 输出字段摘要
- 条件/依赖摘要

详情弹层：

- configured inputs
- resolved inputs
- outputs
- run data
- error/skipped reason

## 4. NodeRecord 状态机

```text
describing
  -> recording
  -> captured/extracting
  -> draft_ready
  -> trial_running
  -> registered
```

前端职责：

- Step 1 收集用户描述。
- Step 2 启动录制并轮询 status。
- Step 3 展示 specJson、动态渲染试调用输入、展示 output。
- 捕获 `AUTH_REQUIRED` 后自动调用登录浏览器并展示 AuthBar。

## 5. NodeMarket 状态

页面数据：

- nodes list
- grouped builtin/recorded
- market platforms
- selected platform
- inspecting node
- trial inputs/result
- sync busy state

交互：

- 点击平台切换节点面板。
- 点击节点打开详情。
- 同步按钮只影响 recorded 节点。
- 试运行不使用固定 sample。

## 6. 错误展示

前端应区分：

- 配置错误：LLM/MCP/auth。
- 校验错误：workflow/node schema。
- 业务错误：接口失败、DATA_NOT_FOUND。
- 鉴权错误：AUTH_REQUIRED。
- 空状态：没有节点、没有录制、没有同步平台。

## 7. 验收

- 普通 workflow 不再落到 SOP1 StepCard。
- 卡片不因复杂输入被撑开。
- 草稿试运行结果回填卡片。
- 节点试运行遇到鉴权失效能拉起登录浏览器。
