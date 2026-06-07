# 节点市场 PRD

## 1. 范围

节点市场承载平台可复用节点的展示、详情查看、试运行和同步状态管理。

覆盖：

- 内置通用能力
- 已同步到市场的录制节点
- 我的录制节点
- 节点详情与试运行
- 同步/取消同步

不覆盖：

- 节点审核
- 点赞、评论、评分
- 多租户权限
- 节点版本管理
- 节点变更监测

---

## 2. 信息结构

### 2.1 内置通用能力

展示 runner 内置节点，例如：

- `data.compose`
- `rules.evaluate`
- `rules.first_match`
- `mail.draft`

展示内容：

- 名称
- 描述
- type
- 输入输出摘要

### 2.2 已接入平台

展示已同步到节点市场的录制节点，以平台为一级分组。

统计口径：

```text
N 个平台 · M 个节点 · K 个接口
```

接口数计算：

- `recorded_http`：1 个接口。
- `recorded_http_flow`：按 steps 数计。

交互：

- 默认先展示平台列表。
- 点击平台后展示该平台下的节点。
- 不在平台列表中直接平铺所有节点。

### 2.3 我的录制

展示用户录制出来的节点。

规则：

- 注册后的录制节点默认进入“我的录制”。
- 默认 `visibility=private`。
- 用户可选择同步到节点市场。
- 同步后 `visibility=public`，进入对应平台分组。
- 取消同步后仍保留在“我的录制”。

---

## 3. 节点卡片信息

节点卡片展示：

- icon
- name
- description
- type
- platform / platform_label
- handler.kind
- 输入字段
- 输出字段
- 接口数量
- 创建者
- 同步状态

对于录制节点，还应展示：

- 是否已同步到市场
- source recording id（可在详情中展示）
- created_at

---

## 4. 节点详情

详情侧栏/弹层展示：

- 基础信息：名称、描述、type、category、platform。
- 输入 schema：name、type、label、required。
- 输出 schema：name、type、label。
- handler kind。
- handler spec 摘要。
- 试运行输入区。
- 试运行输出或错误。

HTTP spec 可展示给开发/联调用，但不要求业务用户理解完整 JSON。

---

## 5. 试运行

入口：节点详情。

规则：

- 根据节点 inputs 动态渲染输入控件。
- 必填字段为空时前端阻止提交。
- object/array 输入可用 textarea 输入 JSON。
- boolean 输入使用 select。
- number 输入使用 number input。
- 调用真实 `/api/nodes/:type/invoke`。
- 输出 JSON 展示。

错误处理：

- `AUTH_REQUIRED`：自动拉起登录浏览器，展示 AuthBar。
- `DATA_NOT_FOUND`：展示缺失输出字段和 mapping。
- 未注册节点：展示明确错误。
- 内置节点不可删除。

---

## 6. 同步到市场

操作：

- “同步到节点市场”：`private -> public`
- “取消同步”：`public -> private`

影响：

- 同步后节点进入平台分组。
- 取消同步后平台分组刷新。
- 我的录制始终展示该节点。

Demo 期不做：

- 审核流
- 团队权限
- 冲突处理
- 版本保留

---

## 7. 与新建工作流的关系

新建工作流的可用节点来源应包括：

- 内置节点
- connector 节点
- 已同步到市场的录制节点
- 当前用户我的录制节点

用户从节点市场点击“在新流程中使用”时，应跳转新建页并带入 node type hint。

---

## 8. 验收标准

- 已同步录制节点按平台展示。
- 平台统计能正确计算平台数、节点数、接口数。
- 我的录制中可看到 private/public 录制节点。
- 同步和取消同步能改变平台分组展示。
- 节点详情可查看输入输出和 handler 类型。
- 节点试运行需要真实 input，不使用固定 sample。
- 鉴权失效会拉起登录流程，不返回空成功。
