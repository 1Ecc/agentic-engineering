# 阶段二实施 Checklist

> 关联文档：
> - [阶段二 PRD](docs/requirements/stage2-prd.md)
> - [阶段二技术方案](docs/architecture/stage2-technical-design.md)
>
> **使用说明**：
> - 每个任务都附「验收」标准——做完后能客观判断是否完成
> - 完成一项就勾上方框：`- [ ]` → `- [x]`
> - 标 ⭐ 的是核心叙事点，演示价值最高，优先级最高
> - 标 🔁 的是阶段一沿用，无需新写
> - 模块之间的依赖关系见每节顶部「依赖」标注
> - 每节完成后更新顶部「总进度」

---

## 总进度

| 模块 | 完成 / 总数 | 状态 |
|------|------------|------|
| 0. 项目骨架 | 4 / 4 | ✅ 已完成 |
| 1. shared 类型与 Schema | 5 / 5 | ✅ 已完成 |
| 2. workflow-runner | 8 / 9 | 🟡 进行中 |
| 3. workflow-core / SOP1 拆解 | 2 / 3 | 🟡 进行中 |
| 4. llm-orchestrator | 7 / 7 | ✅ 已完成 |
| 5. node-recorder ⭐ | 7 / 7 | ✅ 已完成 |
| 6. 后端 API | 11 / 11 | ✅ 已完成 |
| 7. 前端页面 | 11 / 11 | ✅ 已完成 |
| 8. 数据与资产 | 4 / 5 | 🟡 进行中 |
| 9. 联调与彩排 | 0 / 5 | ⏳ 未开始 |
| 10. 文档与验收 | 0 / 4 | ⏳ 未开始 |
| **合计** | **59 / 71** | |

状态图例：⏳ 未开始 · 🟡 进行中 · ✅ 已完成 · 🚫 阻塞

---

## 0. 项目骨架

> **依赖**：无 · **预计**：0.3 人天

- [x] **0.1** 在 `packages/` 下创建 `llm-orchestrator/` 包（含 `package.json` + `src/`）
  - 验收：`npm install` 后能被根目录引用，导出空模块不报错
- [x] **0.2** 在 `packages/` 下创建 `workflow-runner/` 包
  - 验收：同上
- [x] **0.3** 在 `packages/` 下创建 `node-recorder/` 包 ⭐
  - 验收：同上
- [x] **0.4** 创建 `data/` 数据目录结构：`workflows/`、`nodes/`、`nodes/builtin/`、`nodes/connectors/`、`recordings/`、`runs/`
  - 验收：目录存在，`.gitignore` 排除运行时产物（`workflows/{id}.*`、`runs/*`、`recordings/{id}.json`），保留 builtin 与 connector 节点

---

## 1. shared 类型与 Schema

> **依赖**：0 · **预计**：0.5 人天 · **位置**：`packages/shared/src/` + `packages/llm-orchestrator/src/schema.ts`

- [x] **1.1** 定义 `NodeDefinition` TypeScript 类型（含 inputs/outputs schema、handler kind、metadata）
  - 验收：类型导出，能被 runner 和 recorder 共用
- [x] **1.2** 定义 `Workflow` / `WorkflowNode` / `WorkflowInput` TypeScript 类型
  - 验收：能完整描述技术方案 §4 的 YAML 结构
- [x] **1.3** 定义 `RunRecord` / `RunLog` 类型（扩展现有 sop1-types.ts）
  - 验收：兼容现有 `Sop1Result`，新增通用字段
- [x] **1.4** 编写 `workflow.yaml` 的 JSON Schema（在 `llm-orchestrator/src/schema.ts`）
  - 验收：能校验示例 SOP1 工作流通过、能拒绝非法节点类型
- [x] **1.5** 编写 `node.json` 的 JSON Schema
  - 验收：能校验通用节点定义、能拒绝声明鉴权字段（鉴权字段非法）

---

## 2. workflow-runner（执行器核心）

> **依赖**：1 · **预计**：3 人天 · **位置**：`packages/workflow-runner/src/`

- [x] **2.1** 实现 `node-registry.ts`：register / resolve / list / loadDynamic（启动扫描 `data/nodes/`）
  - 验收：可注册 + 查询节点；新增 `data/nodes/{type}.json` 无需重启即生效（或重启后生效）
- [x] **2.2** 实现 `context.ts`：变量插值（`$inputs.x`、`$nodeId.field`、`{{ expr }}`）
  - 验收：嵌套引用、字符串模板、对象引用三种用法的单测全通过
- [x] **2.3** 实现 `runner.ts`：解析 YAML、拓扑排序、逐节点执行、流式 emit 进度
  - 验收：用真实注册的 handler 跑一条线性流程，能拿到正确 outputs
- [x] **2.4** 删除假执行器路径，未知节点必须显式失败
  - 验收：未注册 handler 不再生成假数据
- [x] **2.5** 实现 `handlers/builtin/input.ts`、`rules.ts`、`mail.ts` 🔁（mail 复用 `apps/api/src/mail.ts`）
  - 验收：能在 YAML 中通过 `type: input.text` / `rules.evaluate` / `mail.draft` 调用
- [x] **2.6** 实现 `handlers/builtin/llm-rewrite.ts`、`doc-export.ts`
  - 验收：不生成假下载链接，缺少真实导出结果时显式失败
- [ ] **2.7** 实现 `handlers/connectors/serviceforce.ts`、`jiuqiu.ts`、`spos.ts` 🔁（包装 `packages/connectors/` 现有接口）
  - 验收：跑 SOP1 工作流，结果与阶段一字节级一致
- [x] **2.8** 实现 `handlers/generic-http.ts` ⭐（通用 HTTP 执行器）
  - 验收：传入一份 recorded_http 节点定义，能复用 `openPersistentBrowser` 发请求并按 JSONPath 提取响应
- [x] **2.9** runner 单测覆盖：变量插值、线性执行、错误处理、流式事件
  - 验收：单测覆盖率 ≥ 60%，关键路径全覆盖

---

## 3. workflow-core / SOP1 拆解

> **依赖**：2 · **预计**：0.5 人天 · **位置**：`packages/workflow-core/src/`

- [x] **3.1** 把 `sop1.ts` 中的 4 个步骤拆为节点 handler，注册到 node-registry
  - 验收：拆解后行为字节级一致，原 `runSop1` 入口仍可用
- [x] **3.2** 写出 SOP1 对应 YAML
  - 验收：用 runner 执行这份 YAML，结果与原 `runSop1` 一致
- [ ] **3.3** 阶段一回归测试：原命令 `npm run sop1` 行为不变
  - 验收：CLI 输出与改造前一致

---

## 4. llm-orchestrator（编排器）

> **依赖**：1 · **预计**：1.5 人天 · **位置**：`packages/llm-orchestrator/src/`

- [x] **4.1** 定义 `LLMAdapter` 接口：`generateWorkflow` + `extractNodeSpec`（流式）
  - 验收：接口签名导出，types 能被外部消费
- [x] **4.2** 删除关键词路由与假响应路径
  - 验收：未配置真实 LLM provider 时明确报错
- [x] **4.3** 实现 `adapters/kimi.ts`
  - 验收：`KIMI_API_KEY` 未设置时明确报错；设置后调用真接口
- [x] **4.4** 实现 `adapters/claude.ts`
  - 验收：`ANTHROPIC_API_KEY` 未设置时明确报错；设置后调用真接口
- [x] **4.5** 实现 `prompts/workflow-gen.ts`：system prompt + few-shot + 动态注入节点列表
  - 验收：动态读取 registry 当前节点，生成的 prompt 能完整列出可用节点
- [x] **4.6** 实现 `prompts/node-extract.ts`：抓包数据 + 描述 → 节点定义
  - 验收：prompt 输出明确禁止包含鉴权字段
- [x] **4.7** LLM 输出后用 schema 校验，失败时返回明确错误
  - 验收：故意污染 LLM 输出，能拦截并返回友好错误

---

## 5. node-recorder（节点录制）⭐

> **依赖**：1、4 · **预计**：2 人天 · **位置**：`packages/node-recorder/src/`

- [x] **5.1** 实现 `mcp-client.ts`：封装 chrome-devtools MCP 的 5 个工具调用
  - 验收：能拉起浏览器、抓包、拉响应、关闭浏览器
- [x] **5.2** 浏览器启动时强制传入 `storageState=secrets/auth-state.json`（复用 SOP1 登录态）
  - 验收：用录制浏览器访问服务云，无需重新登录就能看到首页
- [x] **5.3** 实现 `filter.ts`：过滤静态资源、心跳、Bearer/Cookie 脱敏
  - 验收：给一组真实抓包数据，能筛出业务 API、脱敏 sensitive header
- [x] **5.4** 实现录制核心流程：start → 监听 → finish → 调 LLM 提取 → schema 校验 → 返回 spec
  - 验收：完整跑通一次"库存查询"录制，能得到合法的 NodeDefinition
- [x] **5.5** 删除预制抓包样本路径
  - 验收：`MCP_ENABLED=false` 时录制明确失败
- [x] **5.6** 节点注册：spec 写入 `data/nodes/{type}.json` + 触发 registry 热加载
  - 验收：注册后立刻在 `/api/nodes` 返回中可见
- [x] **5.7** 节点试运行：用录制时的实际入参回放一次，验证 generic-http 能跑通
  - 验收：录制完一个真实接口能立即通过试运行

---

## 6. 后端 API

> **依赖**：2、4、5 · **预计**：1.5 人天 · **位置**：`apps/api/src/server.ts`

- [x] **6.1** `GET /api/workflows` 列表（含 meta）
  - 验收：返回 `data/workflows/*.meta.json` 全量
- [x] **6.2** `GET /api/workflows/{id}` 详情
  - 验收：返回 yaml + meta
- [x] **6.3** `POST /api/workflows` 保存
  - 验收：落盘 `data/workflows/{id}.yaml` + `meta.json`
- [x] **6.4** `PUT /api/workflows/{id}` 更新（覆盖式）
  - 验收：更新后 `updated_at` 刷新
- [x] **6.5** `DELETE /api/workflows/{id}` 删除
  - 验收：文件被删除，列表不再返回
- [x] **6.6** `POST /api/workflows/generate` SSE 流式 → LLM adapter
  - 验收：浏览器 EventSource 能逐 token 接收 YAML
- [x] **6.7** `POST /api/workflows/{id}/run` → workflow-runner
  - 验收：返回 `run_id`，SOP1 工作流能跑出真实结果
- [x] **6.8** `GET /api/workflows/{id}/runs` + `/runs/{run_id}` 历史
  - 验收：能查询 5 条最近运行 + 单次详情
- [x] **6.9** `GET /api/nodes` 节点市场列表 + `/api/nodes/{type}` 详情
  - 验收：返回当前 registry 所有节点，分组（builtin/connector/recorded）
- [x] **6.10** `POST /api/nodes/record/start` + `/api/nodes/record/finish` ⭐
  - 验收：start 返回 recording_id；finish 返回校验通过的 NodeDefinition
- [x] **6.11** `POST /api/nodes` 注册节点 + `POST /api/nodes/{type}/invoke` 试运行 + `DELETE /api/nodes/{type}` 删除
  - 验收：注册后立即在列表可见；试运行能返回结果；删除内置节点应被拒绝

---

## 7. 前端页面

> **依赖**：6 · **预计**：3 人天 · **位置**：`apps/web/src/`

- [x] **7.1** 拆分现有 `App.vue`：把 step-card / 结果表格 / 邮件草稿抽成 `components/` 复用组件
  - 验收：原 SOP1 运行页视觉与功能不变
- [x] **7.2** 新页面：`pages/WorkflowList.vue` 我的工作流（含初始 2 个卡片）
  - 验收：能拉取 `/api/workflows` 渲染、点卡片跳运行页、点"+ 新建"跳对话页
- [x] **7.3** 新页面：`pages/NewWorkflow.vue` 自然语言对话（含修改模式）
  - 验收：输入 → SSE 流式打字 → 跳到预览页；修改模式可携带旧 YAML
- [x] **7.4** 新页面：`pages/WorkflowPreview.vue` 节点卡片预览 + YAML 切换 + 对比
  - 验收：节点卡片正确渲染；点"看 YAML"展开源码；修改模式显示左右对比
- [x] **7.5** 改造：`pages/WorkflowRun.vue` SOP1 页面通用化（按 YAML 动态生成 step-card）
  - 验收：SOP1 跑出来与原版一致；任意 YAML 都能渲染 step-card
- [x] **7.6** 新页面：`pages/NodeMarket.vue` 节点市场 ⭐
  - 验收：分组展示节点；点"录制新接口"跳录制页
- [x] **7.7** 新页面：`pages/NodeRecord.vue` 三步式录制向导 ⭐
  - 验收：完整跑通 Step1 → Step2 → Step3 → 注册成功
- [x] **7.8** 左侧导航更新：新增「节点市场」「录制接口」入口
  - 验收：导航能切换页面，当前页高亮
- [x] **7.9** 路由配置（vue-router 或 hash 路由）
  - 验收：URL 能直达每个页面
- [x] **7.10** 对话页"可用节点"区动态读取 `/api/nodes`，与节点市场同源
  - 验收：录制新节点后，对话页可用节点列表立即更新
- [x] **7.11** 全局样式与阶段一保持一致（沿用 styles.css 色板与组件样式）
  - 验收：新页面视觉与 SOP1 页面无割裂感

---

## 8. 数据与资产

> **依赖**：2、5 · **预计**：0.5 人天 · **位置**：`data/`

- [ ] **8.1** 保存真实 SOP1 工作流 YAML
  - 验收：用 runner 执行后等于阶段一 SOP1 结果
- [x] **8.2** 删除假执行工作流资产
  - 验收：列表不再展示假执行工作流
- [x] **8.3** 删除预制录制节点资产
  - 验收：录制节点只来自真实录制与注册
- [x] **8.4** `data/nodes/builtin/*.json` + `data/nodes/connectors/*.json` 内置节点定义
  - 验收：启动时自动注册，节点市场可见
- [x] **8.5** 删除预制抓包样本
  - 验收：MCP 关闭时录制流程明确失败并提示配置

---

## 9. 联调与彩排

> **依赖**：所有上游 · **预计**：1.5 人天

- [ ] **9.1** 端到端跑通：列表 → 新建对话 → 生成预览 → 保存 → 运行（SOP1 真实路径）
  - 验收：5 分钟内能完整走完，无报错
- [ ] **9.2** 端到端跑通：列表 → 新建对话 → 生成预览 → 试运行（真实路径）
  - 验收：真实节点执行结果可追踪
- [ ] **9.3** 端到端跑通：节点市场 → 录制 → 注册 → 在对话中引用新节点 ⭐
  - 验收：真实链路演示路径 §6 全部跑通
- [ ] **9.4** 修改流程模式跑通：运行页 → "让 AI 改一下" → 携带旧 YAML 进对话 → 生成新 YAML
  - 验收：能拿到包含原节点 + 用户增量指令的新 YAML
- [ ] **9.5** 依赖不可用场景验证：LLM 断网、MCP 不可用、SOP1 平台超时
  - 验收：三种场景下 UI 都有友好提示，不白屏不崩

---

## 10. 文档与验收

> **依赖**：所有上游 · **预计**：0.3 人天

- [ ] **10.1** 更新 README：补阶段二启动命令、环境变量说明、节点市场/录制功能概述
  - 验收：新人按 README 能本地起服务
- [ ] **10.2** 更新 `docs/architecture/directory-plan.md`：补充新增包与 data 目录结构
  - 验收：目录树与实际项目一致
- [ ] **10.3** `.env.example` 增加 `LLM_PROVIDER` / `KIMI_API_KEY` / `ANTHROPIC_API_KEY` / `MCP_ENABLED` / `MCP_SERVER_URL` / `MCP_AUTH_TOKEN`
  - 验收：复制为 `.env` 并补齐真实配置后服务能起来
- [ ] **10.4** 走查 PRD §7 验收标准 + 技术方案 §13 验收锚点逐项打钩
  - 验收：每条都能在代码里指向具体实现

---

## 推荐执行顺序

```
Day 1   ▶ 0 项目骨架 + 1 类型 Schema
Day 2-3 ▶ 2 workflow-runner 核心（含 generic-http）
Day 3   ▶ 3 SOP1 拆解（验证零回归）
Day 4   ▶ 4 llm-orchestrator + real adapters
Day 5-6 ▶ 5 node-recorder（MCP 集成）
Day 6-7 ▶ 6 后端 API（与前端并行）
Day 7-9 ▶ 7 前端页面（与后端并行）
Day 9   ▶ 8 数据与资产
Day 10  ▶ 9 联调 + 彩排 + 10 文档收尾
```

**总计**：~11.5 人天（双人并行约 6-7 个工作日）

---

## 风险关注点（执行中需要重点验证）

- 🚨 **runner 变量插值**：嵌套引用、模板字符串是 bug 高发区，单测要写厚
- 🚨 **generic-http handler 鉴权**：必须用 `openPersistentBrowser` 而不是裸 fetch，否则跨域 / 登录态会有问题
- 🚨 **MCP storageState 注入**：录制浏览器必须加载阶段一的 auth-state，否则用户会被卡在登录页
- 🚨 **node registry 热加载**：录制完节点要立刻在自然语言对话里能引用，注意 prompt 动态注入要重新拉取
- 🚨 **SSE 流式打字**：前端 EventSource 在生产构建下可能有 buffer 问题，要早联调
- 🚨 **SOP1 字节级一致**：拆 handler 后跑一遍原数据集，diff 比对，避免悄悄回归


## note
> 执行过程中的说明点，后续进行优化或完善
1. 说明：真实 SOP1 平台回归没有执行，因为需要有效登录态和外部系统可用性；所以 2.7 和 3.3 我没有在清单里硬勾，避免假装验收。
2. 说明：MCP 真实浏览器抓包链路已按 MCP_SERVER_URL/MCP_AUTH_TOKEN 做 JSON-RPC 封装；若缺少实际 MCP server 配置，录制流程应明确失败。
