# 为什么需要 agent 平台（收尾论证 + 证据）

> 用途：`讲解设计.md` 收尾段「上下文管理 → AI IDE」的**论证backbone 和证据库**。
> 一句主张：**agent 本体很简单，真正难、真正值钱的是它外面那层「壳」(harness)；agent 平台的价值就是把这层壳做成了成熟工程。**

## 1. 论证链条（讲给听众的顺序）

1. **agent 本体很简单**：模型 + 工具 + `while` 循环 = **思考 → 行动 → 观察**闭环（学术界叫 **ReAct**：Reason + Act）。几十行就能跑——前 6 个 step 已经证明。
2. **但 LLM 有两个硬约束**：
   - **无记忆**：模型本身不记得上一轮，靠每次把历史重喂回去（step3 已演示）。
   - **上下文窗口有限 + 注意力有限**：Anthropic 称之为 **context rot**——「随着上下文 token 增多，模型准确召回信息的能力下降」。根因是 Transformer 的注意力是 n² 复杂度，token 越多，注意力预算被摊得越薄；模型训练时也以短序列为主，对超长上下文「经验更少」。
3. **所以光有那个循环不够**。Martin Fowler 的等式：**Agent = Model + Harness**（harness = 模型之外的一切：系统提示、检索、编排、工具、权限、反馈环、记忆）。LLM「非确定、不懂你的上下文、只按 token 思考」，真正提升「一次做对的概率 + 自动纠错」的是 harness。
4. **harness engineering** = 把这层壳做好的工程学：上下文管理、工具接入、权限可控、反馈自纠、记忆持久化。业界判断：**「大多数 agent 在生产中失败，不是因为模型弱，而是因为 harness 脆弱、不安全、不可预测。」**
5. **agent 平台（claude code / codex）的真正价值 = 一套成熟的 harness**，正好补 LLM 那两个短板。

## 1.5 现场钩子：几十行 vs 几十万行（Claude Code 源码反编译）

承上启下的最佳钩子：**「既然第一章几十行就能跑出 agent，凭什么 Claude Code 要写成几十万行？」**

- 2026 年 3 月底起，社区大规模反编译 Claude Code 的打包 `cli.js`：它是 **minify（压缩）不是加密**，其实一直随 npm 包公开发布；一去混淆，**14 万+条明文字符串**全暴露——系统提示、工具描述、行为指令、压缩策略尽在其中（所以与其说「泄露」，不如说「本就可读」）。
- 落点：那个「几十行能跑」的 ReAct 循环，**真身是几十万行量级的工程**。**多出来的，全是 harness。** 下面就把这几十万行，归纳成四块能力。

## 2. 平台真正的优势（四块工程化能力，带证据）

> Agent = Model + Harness。把「几十万行」归纳成四块：**上下文管理 / 能力接入 / 规划调度 / 安全权限**。

### ① 上下文管理（工程最成熟、最值钱的一块）

**先看为什么会爆**——一个典型请求的上下文构成（示意，找量级感）：

| 组成 | 量级 |
|------|------|
| system prompt | ~5k |
| 项目说明（AGENTS.md / CLAUDE.md） | ~10k |
| skills 定义 | ~20k |
| tool / MCP 定义 | ~30k |
| 历史会话 | ~100k |
| 代码文件 | ~50k |
| 用户问题 | ~0.1k |
| **合计** | **~215k，已撑爆 200k 窗口** |

**管理对象分四类**：短期记忆（当前会话，会被压缩）/ 长期记忆（跨会话：CLAUDE.md、memory tool）/ 基础设定（system、入口规则）/ 外部知识（按需检索，只存路径、用时再读）。

**claude code 管「短期记忆」的四档压缩阶梯**（越往下越重；机制名来自反编译分析，**阈值随版本 / 模型变动，口播统一说"接近上限自动压缩"**）：

1. **日常清理（无感、零成本）**：micro-compact——序列化时本地裁掉旧工具结果（**无 API 调用**，保护最近窗口与最近几条，省够阈值才动手）；API 原生 **context editing**——服务端帮忙清洗旧的工具结果。
2. **主动摘要（花一次 API）**：auto-compact——接近上限时生成**结构化摘要替换历史**（预留约 **13k** 缓冲、摘要上限约 **20k**）；context collapse——分段渐进折叠，而非一刀切。
3. **用户主动**：`/compact` 手动压缩（可带「重点保留什么」指令）、`/clear` 清空历史但**保留代码改动**、`/btw` 支线快问不污染主线、`/rewind` 回退会话 / 代码。
4. **兜底防御**：reactive compact——撞「Prompt Too Long(413)」时紧急压缩（只留最近几条、一次重试防死循环）；snip 强制裁剪超大块内容。

**另外两手**：`/context` 实时看占用分类；子代理用干净上下文做子任务、只回传 1–2k 摘要；memory tool 跨会话建知识库。对应 Anthropic 原则：**「找到能达成目标的、最小的高信号 token 集合。」**

### ② 能力接入与调度

- 形态：**tools / function calling**、**MCP**（标准化接外部能力：搜索、数据库、GitHub、内部系统）、**skills**（操作说明书）、**cli / shell**、**plugins**（打包分发）、**subagents**。
- 调度差异：**MCP 偏全局加载**（能力齐全但常驻占上下文）vs **skills 偏渐进式披露**（用到才加载、省上下文）——谁来加载、占多少、会不会互相打架，正是平台替你管的（呼应第一章 step5 skill / step5_mcp）。
- 价值：可插拔、可复用、可被团队标准化分发——不用每个脚本各写一遍。

### ③ 规划与编排

- 把大任务拆解、plan mode、todo 跟踪；**subagent** 派活（干净上下文做子任务、只回传摘要）。
- 反馈环：思考→行动→观察（ReAct）+ 失败自动纠错重试；**hooks** 在生命周期节点插入校验 / 动作。
- 价值：多步骤、长任务不靠一句提示词硬扛，结构化地推进与自纠。

### ④ 安全与权限

- **权限分级**（Codex profile）：`:read-only` / `:workspace` / `:danger-full-access`，按最小权限授予。
- **沙箱**：macOS 用系统 Seatbelt；**默认无网络访问**、写入**仅限当前工作区**。
- **审批机制**：只有「沙箱逃逸 / 联网请求 / 有副作用的 app·MCP 调用」才需人工批准，沙箱内动作自动放行——既安全又不打断。
- 直接呼应第一章 step4–6 的风险：我们手搓的 agent 直接跑 shell、没有任何护栏；平台把护栏做成了工程。

## 3. 讲解口径（交棒台词，可直接用）

> 「你今天看到的几十行 agent，内核就是**思考-行动-观察**的循环。但你也看到了——它**没记忆、上下文窗口有限、越喂越贵越慢**。把这层『外壳』做稳做强，就是 **harness engineering**；claude code、codex 的价值**不在模型**（模型谁都能调，就像我们 step1，没订阅还能换别的模型自己接），**而在这套成熟工程**：帮你管上下文、接工具、控权限。这就是为什么要用 **AI IDE**，也是下一段 **agentic engineering** 要讲的。」

## 4. 出处（Sources）

- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Harness engineering for coding agent users — Martin Fowler](https://martinfowler.com/articles/harness-engineering.html)
- [What Is an Agent Harness — Firecrawl](https://www.firecrawl.dev/blog/what-is-an-agent-harness)
- [What is an agent harness — Parallel](https://parallel.ai/articles/what-is-an-agent-harness)
- [Explore the context window — Claude Code Docs](https://code.claude.com/docs/en/context-window)
- [Compaction — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [Context editing — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- [Permissions — OpenAI Codex](https://developers.openai.com/codex/permissions)
- [Sandbox — OpenAI Codex](https://developers.openai.com/codex/concepts/sandboxing)

**反编译 / 上下文机制（本章新增，社区分析，非官方）**

- [Claude Code compaction deep dive（deobfuscated, v2.1.68）— gist](https://gist.github.com/sam-saffron-jarvis/9d8e291c4e696ac7948702d6c4884448)
- [Inside Claude Code · Context Compaction](https://y-agent.github.io/inside-claude-code/04-context-compaction.html)
- [Claude Code architecture deep dive: what the leaked source reveals — WaveSpeed](https://wavespeed.ai/blog/posts/claude-code-architecture-leaked-source-deep-dive/)
- [Claude Code's Source Didn't Leak. It Was Already Public for Years — AfterPack](https://www.afterpack.dev/blog/claude-code-source-leak)
- [Claude Code session commands: /clear, /compact, /rewind — BSWEN](https://docs.bswen.com/blog/2026-03-25-claude-code-session-commands/)

> 数字与机制名以社区反编译为准、随版本漂移；现场口播只说趋势（接近上限自动压缩、保留决策丢冗余），要精确引用再查官方 changelog。
