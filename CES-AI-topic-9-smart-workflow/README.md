# CES-AI创想争霸赛 - 九号课题：智能工作流

本项目围绕 CES-AI 创想争霸赛九号课题，目标是把固定、重复、跨系统的业务 SOP 智能化。

## 阶段目标

1. SOP 阶段：先实现可演示、可落地的一键工作流。
2. 平台化阶段：沉淀查询、判断、执行、输出等模块能力，支持用户自行组装工作流。

当前阶段聚焦 `SOP1：直客订单查询及发票处理工作流`。

## 当前重点

SOP1 的核心输入是工单号，系统需要自动完成：

1. 从服务云查询已支付的九丘订单号。
2. 从九丘系统查询订单状态、PGI、S4 订单号、PGI 抛送 sscm 成功时间。
3. 从 SDI/SPOS 查询 BTCP 订单号、开票状态、发票类型、发票链接。
4. 汇总展示查询结果。
5. 按规则生成邮件草稿，由业务人员最终判断是否发送。

## 目录入口

- [SOP1 需求说明](docs/requirements/sop1-direct-order-invoice.md)
- [SOP1 PRD](docs/requirements/sop1-prd.md)
- [SOP1 接口抓取文档](docs/api/sop1-network-capture.md)
- [SOP1 技术方案](docs/architecture/sop1-technical-design.md)
- [项目目录规划](docs/architecture/directory-plan.md)

## 安全约定

平台账号、密码、Cookie、Token、浏览器会话文件等敏感信息不得写入代码或需求文档。后续实现时统一放入本地 `secrets/` 或环境变量，并由 `.gitignore` 排除。

## 后端命令

```bash
npm install
npm run auth:login
npm run auth:status
npm run sop1 -- --work-order-no 202604273400100002
npm run api:dev
npm run dev

```

后端实现说明见 [apps/api/README.md](apps/api/README.md)。
前后端已开发完毕，在主目录/workflow下执行 npm run dev 启动服务。
