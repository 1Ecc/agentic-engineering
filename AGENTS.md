# agentic-engineering

> 轻量的个人软件全生命周期方法论:SDD 管"做什么",TDD 管"怎么做对"。本仓既是方法论本体,也是交付它的 npm CLI(`@ecc-hgy/ae`)。
>
> 当前态快照看 [handoff.md](./handoff.md);方法论总览看 [docs/framework.md](./docs/framework.md)。

## Project-Specific Rules

- **handoff.md 只做覆盖,不追加**——它只承载当前态最新快照,不承载历史。
- **抛弃历史思路**:已移入 `方案/archive/` 的方案仅作追溯,不作为当前实现依据。
- **reference/ 不全读**:四个素材仓库(OpenSpec / andrej-karpathy-skills / mattpocock-skills / superpowers)体量大,非必要不整仓读取,防 context 爆。
- **CES-AI-topic-9-smart-workflow/ 不全读**:个人参考项目,非必要请勿读取全部细节。
- **未经要求不执行 `npm publish`**:改动攒齐后统一 bump 版本再发。
- **思考与成果沉淀到 `方案/`**(`issues/` 决策、`skill-candidates/` skill 选型、`roadmap.md`、`archive/` 历史),做好目录管理;不把项目长期状态留在对话里。
- **目录按职责聚合、信息渐进披露**:除已有明确规范、框架约定或工具生成的目录外,手工维护的文件按职责或主题组织,避免无关文件长期平铺;入口保留概要与导航,细节随复杂度按需下沉,不为分层而分层;新增或修改时检查涉及范围的归属与边界,调整结构同步相关引用与说明。
- 文档与批注:面向最终用户的 `README.md` 用英文;仓库内 `docs/`(方法论文档)与 `方案/`(设计/决策记录)用中文。

## Stack

- Node ≥ 18,**零依赖** ESM CLI,包名 `@ecc-hgy/ae`。
- 测试用内置 `node:test`(`npm test`),无第三方框架。
- 当前开发版本:`v0.6.0`;npm 已发布最新版本为 `v0.5.0`,本轮验证后发布 `v0.6.0`。

## Structure

| 路径 | 内容 |
|------|------|
| `bin/ae.js` | CLI 可执行入口 |
| `src/` | 零依赖 CLI 实现(`commands/setup.js`、`commands/init.js`、`skeleton.js`、`utils/`) |
| `skills/` | 14 个 skill 发布资产(含 `using-agentic-engineering` 路由器),随 `ae setup` 装到 `.claude/skills/` 与 `.codex/skills/` |
| `templates/entries/` | `ae init` 渲染的入口模板(含本仓 AGENTS.md 同款 shape) |
| `docs/` | 方法论本体文档(`framework.md`、`scenarios/`、`spec-framework.md`),仓库内、不随包 |
| `方案/` | 方案沉淀:`issues/` 决策池 + `skill-candidates/` skill 选型 + `roadmap.md` + `archive/` 历史归档 |
| `tests/` | `node:test` 覆盖,当前 29 cases |
| `reference/` | 4 个素材仓库,只读参考 |

## Operating Guidelines

- **session 开始先读 `handoff.md`** 对齐当前态,再动手。
- 保持本文件精简——每个 agent session 都会加载它;详情下沉到 `docs/`、`handoff.md`、`方案/`。
- 改了行为就同步对应文档:CLI 行为 → `docs/` 与 `README.md`;skill → `方案/skill-candidates/`;当前态 → 覆盖 `handoff.md`。
- 声称"完成/通过"前先 `npm test` 全绿;改 CLI 行为要补/改对应用例。
- 提交与发布是两件事:提交可随时;`npm publish` 需明确要求,且攒齐改动一次性发。
- 方法论本身(S0/S1/S2、SDD+TDD、spec 规范)以 `docs/framework.md` 为准,不在本文件重复。
