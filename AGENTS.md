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
- **思考与成果沉淀到 `方案/` 与 `design/`**,做好目录管理;不把项目长期状态留在对话里。
- 文档与批注:面向用户的 `docs/` 用英文;`方案/` 与 `design/` 设计记录用中文。

## Stack

- Node ≥ 18,**零依赖** ESM CLI,包名 `@ecc-hgy/ae`。
- 测试用内置 `node:test`(`npm test`),无第三方框架。
- 当前发布态:`v0.3.0`(已上 npm,npmtest 人工验证通过)。

## Structure

| 路径 | 内容 |
|------|------|
| `bin/ae.js` | CLI 可执行入口 |
| `src/` | 零依赖 CLI 实现(`commands/setup.js`、`commands/init.js`、`skeleton.js`、`utils/`) |
| `skills/` | 14 个 skill 发布资产(含 `using-agentic-engineering` 路由器),随 `ae setup` 装到 `.claude/skills/` 与 `.codex/skills/` |
| `templates/entries/` | `ae init` 渲染的入口模板(含本仓 AGENTS.md 同款 shape) |
| `docs/` | 对外方法论文档(`framework.md`、`scenarios/`、`spec-framework.md`) |
| `design/` | 本仓设计记录(skill 选型池 + 改造进展板) |
| `方案/` | 方案沉淀:`issues/` 池 + `archive/` 历史归档 |
| `tests/` | `node:test` 覆盖,21 cases |
| `reference/` | 4 个素材仓库,只读参考 |

## Operating Guidelines

- **session 开始先读 `handoff.md`** 对齐当前态,再动手。
- 保持本文件精简——每个 agent session 都会加载它;详情下沉到 `docs/`、`handoff.md`、`design/`。
- 改了行为就同步对应文档:CLI 行为 → `docs/` 与 `README.md`;skill → `design/skill-candidates/`;当前态 → 覆盖 `handoff.md`。
- 声称"完成/通过"前先 `npm test` 全绿;改 CLI 行为要补/改对应用例。
- 提交与发布是两件事:提交可随时;`npm publish` 需明确要求,且攒齐改动一次性发。
- 方法论本身(S0/S1/S2、SDD+TDD、spec 规范)以 `docs/framework.md` 为准,不在本文件重复。
