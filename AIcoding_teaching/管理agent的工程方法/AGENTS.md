# 第三章 · 管理 agent 的工程方法（agentic engineering）

> 1 小时培训第三章（约 15 分钟）。承接第二章「平台把壳做成工程」，落到 **怎么把 agent 放进真实工作流程**：AI coding 的核心不是我们自己 coding，而是 **管好 agent**——让它把事做对、做好、可持续、能复利。

## 这一章要讲什么

核心问题：光有好平台 ≠ 会用。真实使用一定会碰到——怎么沟通、怎么对齐需求、文件放哪、哪些写进记忆、怎么验证、后期怎么维护、怎么把一次成功变成复利。

一句主张（本仓方法论）：

> **SDD 管「做什么」，TDD 管「怎么做对」。**

脊柱：拿 **一个真实但模糊的业务需求**，现场用本仓 `ae` 这套方法跑一遍 **S0 → S1 → S2**，让大家亲眼看到「管理 agent」长什么样——不是看 agent 写代码，是看 **人怎么驾驭**：先对齐、再落 spec、再拆步、再 TDD、再验证、再 handoff、再沉淀。

## 呈现形式

现场实操为主：在隔离 sandbox 里 `ae setup` / `ae init`，然后用 **一句模糊需求** 驱动 S1 主循环，沿途各节点 skill 自动接力（`brainstorming` → `to-prd` → `writing-plans` → `to-issues` → `tdd` → `verification-before-completion` → `handoff`）。讲稿只给「话术 + 顺序 + 兜底」，功能本身现场跑。

## 贯穿 case（现场造一个产品，并与第四章咬合）

**现场开发一个产品 ——「Knode v0，一个团队内部的 skills hub」**：本地 `.claude/skills` 同步 + 广场（团队/集团）浏览 + 搜索/详情/下载 + 轻量安全徽章。详见 `讲解设计.md`。

**形态为现场稳定性而定**：**纯前端 `index.html` + 只读轻量服务**（同步脚本扫 skills→json + `python -m http.server`）；不写盘、不建库、无自写后端 API。

刻意选成 **第四章 Knode 的雏形**：

- **它本身就是第四章要讲的产品** —— 本章用 agentic engineering 现场把它跑出来。
- 本地同步的就是 `ae setup` 刚装的 skills（吃自己狗粮）；广场第一条就是已沉淀的 `skills/powerautomate-email-to-sharepoint-excel`（第四章 Exhibit A）。
- 现场造的 Knode，**第一批货就是我们自己沉淀的节点** → 自然交棒第四章「节点复用与知识复利」。

## 目录指针

| 文件 | 内容 |
|------|------|
| `讲解设计.md` | 本章剧本：脊柱、贯穿 case、S0→S2 逐节点映射真实 skill、跨人群翻译、兜底、时间预算 |
| `demo/plaza_nodes.json` | 广场种子节点（4 张：邮件抓取 / 格式整理 / 接口补字段 / 驱动后台，含 `scope` 团队·集团） |
| `demo/产品说明_v0.md` | Knode v0 形态 + 数据模型 + 板块范围 + 验收标准（**讲师参照**：用来判断现场「对齐」是否到位） |

方法论本体以仓库根 `docs/framework.md` 为准（S0/S1/S2、SDD+TDD、节点 skill 清单），本章不重复抄。
