# Handoff · AI coding 培训材料准备

**最后更新**：2026-06-21
**范围**：`AIcoding_teaching/`（团队内部 AI coding 培训，1 小时，面向研发 / 业务 / 产品管理混合人群）
**接力目标**：四章骨架全部落地——第一章（demo + 剧本 + 证据）、第二章（平台剧本）、**第三章**（管理 agent：贯穿 case「**现场开发 Knode v0 / skills hub**」+ S0→S2 逐节点剧本 + demo 道具）、**第四章并拔高为价值高点**（节点复用与知识复利：四段式叙事骨架，产品暂名 **Knode**）。第三章 case 与第四章 Knode 现已**首尾咬合**（主题三现场造 Knode 雏形，主题四讲它的生意）。下一步是配图、第三章 case 课前实跑录屏、用户补充第四章需求框架/案例细节/平台形态，以及现场彩排掐表。

> 说明：本文件只覆盖「AI coding 培训材料」这条线。仓库根目录 `handoff.md` 是 npm CLI / agentic-engineering 方法论主线，勿混淆。本文件每次覆盖更新，不追加历史。

## 当前定位

这场培训的业务动机：真实业务里，越来越多非技术同事已经在尝试用 AI coding / agent 化解决问题，但对 agent 是什么、怎么用、能解决什么、为什么结果不好维护、如何沉淀复利仍然模糊。因此培训先补共同语言，再进入工具和工程方法。

第一章节主题：**agent / openclaw（龙虾）的本质**。是整场 1 小时的第一主题（约 20 分钟），之后接工具/平台与 agentic engineering 工程方法论。

主线一句话：

> **agent = 大模型 + 一个循环 + 执行命令 + 一份说明书（提示词 / 技能）**

脊柱（已对齐）：①**祛魅**（agent 不神秘 = 模型+循环+命令）→ ②**赋能**（能干多少取决于你喂给它什么）。语气=赋能；压轴落点=②，并**交棒 AI IDE / harness engineering**。

## 关键文件

| 文件 | 内容 |
|------|------|
| `AIcoding_teaching/AGENTS.md` | 培训总目标 + skills/MCP/插件 概念参考节 |
| `AIcoding_teaching/大纲.md` | **1 小时培训总框架**：培训动机、目标/听众、四个主题、时间分配、待补材料 |
| `AIcoding_teaching/配图梳理.md` | **4 张配图底稿（一章一图）**：每张图的一句话 + 结构 + 准确中文标签 + 风格，可直接喂 GPT；含图 2 的「快速上手 / 模型选型」 |
| `coding本质/AGENTS.md` | 第一章节模块说明、串讲 1/2、呈现形式、目录指针 |
| `coding本质/讲解设计.md` | **怎么讲的剧本**：~20min 流程、脊柱、逐步脚本表、累积心智模型、上下文管理收尾、配图清单、时间预算 |
| `coding本质/为什么需要agent平台.md` | **收尾论证 + 证据**：harness engineering、上下文管理、claude code/codex 工程成熟度（带出处链接） |
| `coding本质/参考文案.md` | 参考视频口播稿 + 演进思路（源材料，勿改） |
| `coding本质/demo/README.md` | 讲师演示手册：步骤演进、每步那句话、风险提示、step6 手机访问 |
| `coding本质/demo/AGENTS.md` | step4+ 的 agent 系统提示词，协议：`命令:XXX` / `完成:XXX` |
| `coding本质/demo/skill.md` | step5 技能（带 frontmatter）：**查实时天气 wttr.in** |
| `coding本质/demo/step5_mcp/` | MCP 版：`weather_server.py` + `step5_mcp_client.py` + `README.md` |
| `为什么需要agent平台/` | **第二章**：平台为什么值钱（剧本 `讲解设计.md` + `AGENTS.md`） |
| `管理agent的工程方法/` | **第三章**：管理 agent 剧本（`讲解设计.md`：S0→S2 逐节点映射真实 skill）+ `demo/`（`plaza_nodes.json` 广场种子、`产品说明_v0.md` 讲师标准答案）。贯穿 case = **现场开发 Knode v0（skills hub，纯前端 + 只读轻量服务，不写盘/不建库）** |
| `节点复用与知识复利/` | **第四章（价值高点）**：四段式专题 `讲解设计.md`（发现 / 两支柱 / 复利阶梯 / 新业务机会）+ `AGENTS.md` |
| `skills/powerautomate-email-to-sharepoint-excel`（仓库根） | 第四章 **Exhibit A**：已沉淀的「邮件抓取」踩坑节点，复利的活证据 |
| `.vscode/settings.json` / `launch.json` | VS Code 运行配置，指向 demo `.venv` 和 `.env` |

## Demo 当前状态

目录：`coding本质/demo/`，依赖在专属 venv `demo/.venv/`（已装 openai 2.43、flask 3.1、mcp 1.28、python-dotenv 1.2）。

7 步演进（chat 引子 + 6 个 step）：

1. `step1_single.py`：单次 API 调用，模型=问答函数。
2. `step2_multi_nomem.py`：加 `while`，连续问但无记忆（追问翻车）。
3. `step3_multi_mem.py`：维护 `messages` 历史，记忆=把历史再喂一遍。
4. `step4_agent.py`：system 内联「命令/完成」协议 + 执行 shell + 循环 = 第一个 agent。
5. `step5_agent_skill.py`：加 `skill.md`，**案例改为「查实时天气」**（模型靠记忆做不到 → 装 skill 用 `curl wttr.in` 取真实数据）。
   - 平行版 `step5_mcp/`：同一个查天气改用 MCP 工具（server=函数+`@mcp.tool()`；client=连服务→列工具→模型 tool call→执行→回填）。
6. `step6_web/server.py`：同一套 agent 循环包成 Flask + 手机优先网页壳；手机发命令、本机执行回传，电脑页面作监控台。

代码风格（已对齐，**重要**）：

- **step1–5 统一以 DeepSeek 官方文档示例为初版**：保留 `stream=False`、`reasoning_effort="high"`、`extra_body={"thinking":{"type":"enabled"}}`；`model="deepseek-v4-pro"`；`base_url="https://api.deepseek.com"`。每步只在外层「包装」上做最小增量（while / messages / 读说明书 / 执行命令），体现逐步迭代。
- **所有脚本已加 `load_dotenv()`**（step1–5 + step5_mcp + step6）：从脚本所在目录向上找 `.env`，**直接 `python stepN.py` 即可，无需再 `source .env`**。
- step6 现场版细节：启动打印电脑+手机局域网地址；`/events` 轮询事件流；`/status` 显示连接/工作目录；`LOBSTER_PORT`、`LOBSTER_WORKDIR`、`LOBSTER_MAX_STEPS`、`LOBSTER_COMMAND_TIMEOUT` 可调；命令/结果用文本节点渲染避免 XSS。
- `.env` 含真实 key，已被 `.gitignore` 忽略；不要提交、不要粘贴。

## 教学设计要点（已与用户对齐）

- `大纲.md` 已按用户最新口径重排：开场讲「为什么需要这场培训」（真实业务里非技术人员想用 agent 但认知模糊），主题一讲 agent / AI coding 本质，主题二讲工具与 agent 平台，主题三讲如何管理 agent 并引出 agentic engineering，主题四讲后续可做事项、建议和小技巧。
- 第三主题的核心问题已明确：AI coding 的核心不是「我们自己 coding」，而是如何管理 agent，包括沟通、需求对齐、文件/记忆管理、验证、可维护性和复利沉淀。
- 收尾「上下文管理」不展示 messages，而是打**价格/质量/时间**三敏感：越喂越多 → token 烧得快（贵）、注意力稀释 context rot（质量降）、推理变慢（慢）。
- 交棒 AI IDE：claude code / codex / workbuddy；回环金句「平台底层也就是 step1 那个调用，没订阅可换模型自己接」。
- skills/mcp 各画一张「用户输入→调用实现」机理图（用户拿去喂 GPT image2）；token/时间趋势图建议用 SVG（生成模型画坐标轴不准）。**配图底稿已就绪（`配图梳理.md`，4 图 + 准确标签），实际图片尚未产出。**

## 运行方式

```bash
cd /Users/huguiyuan/workspace/agentic-engineering/AIcoding_teaching/coding本质/demo
.venv/bin/python step1_single.py          # 无需 source，已自动 load_dotenv
.venv/bin/python step2_multi_nomem.py
.venv/bin/python step3_multi_mem.py
.venv/bin/python step4_agent.py
.venv/bin/python step5_agent_skill.py
cd step5_mcp && ../.venv/bin/python step5_mcp_client.py   # MCP 版
cd ../step6_web && ../.venv/bin/python server.py          # 网页版
```

VS Code：已配解释器 `demo/.venv/bin/python` 与 envFile `demo/.env`；左侧「运行和调试」有 step1–6 配置。

## 已验证（2026-06-19）

- step1–6 + step5_mcp 两文件全部 `py_compile` 通过。
- **step1 无 `source` 直接跑通**：`load_dotenv` 自动加载，DeepSeek 返回正常（确认 `deepseek-v4-pro` 是有效模型）。
- **step5_mcp 端到端验证**：MCP 握手→list_tools→call_tool 全通，真实取到 `Beijing: +28°C`（已改 `http://wttr.in` 避证书报错、`&m` 出摄氏度）。LLM tool-call 那步需真 key + 模型支持 function calling，**尚未实跑**（deepseek-v4-pro 若不支持 tools，换 deepseek-chat）。
- step6 web 先前已 smoke：手机/桌面页面、`/status`、`/events` 监控台、低风险任务「列目录」全链路正常。

## 待办（按优先级）

1. **第四章用户补充**（最高价值）：需求框架（节点库/平台的输入输出契约、登记、检索调用）、四个 case 的真实背景 + 收益数字、平台形态（如何挖掘本地可沉淀资料 / 维护 / 激励）、对外路径。槽位见 `节点复用与知识复利/讲解设计.md` 文末。
   - 平台/产品**暂名 Knode**（knowledge + node，知识节点）；定位「把踩过坑的节点，攒成可复用、可复利的知识节点」。名字已写进第四章 `讲解设计.md`「名字 · Knode」节，暂定可再收。
2. **配图产出**：底稿在 `配图梳理.md`（一章一图 + 准确标签 + 风格 + image2 提示词）。**图1 / 图2 / 图3a / 图3b 已细化**（原图3 太满，已拆：**图3a**=痛点钩子(5 类) + 巨人改 `参考对象｜核心关键词(本质)｜简单介绍` 四行表(superpowers=完整方法论 / OpenSpec=spec 制品框架 / mattpocock=实战 skill 工具箱 / karpathy=编码纪律·横切；锚点已删)收敛成 `ae`·WHY；**图3b**=两列·过程节点 1:1 落进项目骨架·WHAT（左 S1-A `节点│名称│skills│产物` 表 + S1-B 折叠链、右完整骨架树圈定 S0 底座、门禁缩成连线小锁🔒、图内标题 agentic engineering、痛点色标/对照表已去），**建议 SVG**）；**图4 已拆 4a/4b 并细化**（**图4a**=发现·一张「共享节点矩阵」6 节点×4 需求，去掉「复用方式」列，格子改用 `●` 标准件 / `⚠` 同名异构；右上角图例解释符号；大标题+副标题放左上角；数据 aha 改为双视角：节点视角 `6/6 节点都被 ≥2 个需求复用，平均 2 个需求/节点`；需求视角 `①4/4 · ②2/2 · ③4/4 · ④2/2 可复用`，并标标准件占比 `①2/4 · ②1/2 · ③3/4 · ④2/2，其余为方法论复用`；旧落点双句已删，只保留桥到 4b；同名异构两行仍挂小注 devtools mcp 抓接口·playwright / 多源汇集·按需梳理；**图4b**=改成故事插画，围绕 `获取 Outlook 邮件` case：左边“我”踩坑（集团账号接不进 / COM·IMAP 走不通 / Graph 授权被拦 / PA 细节坑）→ 趟出 `Power Automate → SharePoint Excel(Table) → SharePoint Sync/OneDrive → 本地只读` → 沉淀成 `Outlook 邮件获取知识流`，小字 `skill / DRA / MCP 等`；右边讲复利扩散：团队成员也有同样需求 → 技术平权+标准化形成“人+机器人”的碳硅组合 → 一群碳硅组合从团队公共区复用知识流 → 升级到 `Knode（我们设计的集团平台）` → 对外拓展产品，输出方法论 + 知识流标准 + 节点生态 + 平台能力；**结构+短标签+口播+image2 提示词已定稿，SVG 待出**）。**待产出**实际图片；另有 **图2b 上下文压缩阶梯**（建议 SVG）。
3. **第三章贯穿 case 课前实跑**：在空 sandbox 跑通 `ae setup`/`ae init` → 模糊需求（造 Knode v0）→ A1 对齐+砍范围 → TDD 红绿 → A6 网页验收 → handoff。**形态已定为纯前端 + 只读轻量服务**（`index.html` + 同步脚本扫 `.claude/skills`→json + `python -m http.server`），不写盘/不建库；A1/A5/A6 三步录屏兜底。想更贴真实设想就改 `demo/产品说明_v0.md` + `demo/plaza_nodes.json`。
4. **step5_mcp 实跑确认**：用真 key 跑通 LLM tool-call 一步；确认 deepseek-v4-pro 是否支持 `tools`。
5. **现场串讲彩排**：完整四章掐表（5/18/12/15/10）；确认第一章 step2 翻车 / step3 成功 / step4 天气不稳定 的节奏。
6. **核对 claude code 上下文数字**：讲解里「98%/13k/20k」来自社区整理（DeepWiki），官方只确认机制；要引精确数字需查官方 changelog，否则口播说「接近上限自动压缩」。

> 已完成（本次）：`配图梳理.md` 四图底稿；**图1 改为问题驱动 / 用户闯关式**（起点修正为「ChatGPT·豆包 问答 → AI coding 改走 API 接口 → 单轮无记忆」）；**图2 改为「几十行 vs 几十万行（3 月源码反编译钩子）→ harness 四块（上下文/能力/规划/安全）→ 快速上手」**，并加 **图2b 上下文压缩四档阶梯**；`为什么需要agent平台.md` 增补几十行 vs 几十万行钩子 + harness 四块 + 典型请求结构(~215k) + 压缩阶梯（micro/auto/手动/兜底，反编译 sources 已加）；第二章 `讲解设计.md` ① 加钩子、② 标注四块 + 阶梯指针。**图3 经多轮 grill 后由「一张总图」拆成两页**：**图3a（WHY）**已从呆板表格改成**三幕故事图**，主标题 `从混乱协作，到工程化编排`：① AI coding 失控现场（人+agent 混乱协作，5 张问题卡：需求做偏 / session 失忆 / token 越贵 / 没测试闭环 / 同坑重踩）→ ② 参考蓝图墙（4 张蓝图卡保留 GitHub 原名和 star 角标：superpowers 234k / mattpocock skills 138k / OpenSpec 55.8k / karpathy 179k；每张有一句介绍 + 强项 / 边界）→ ③ 工程蓝图输出 `agentic engineering = SDD + TDD + 软件生命周期节点 skills`，强调不是重复造轮子，而是基于自身工程经验把软件生命周期核心节点 skills 化，面向个人/小团队、平台无关、轻量闭环、可沉淀复利；设计语言为左侧噪声、中间调研、右侧秩序；3a 只做 3b 入口。**图3b（WHAT）**=**两列 + 图内左上角标题 `agentic engineering`、副标题「SDD 管做什么·TDD 管做得对」**。左=过程框架，**S1-A 用 `节点│名称│skills│产物` 表格**（A1–A6，名称/skills 取自 s1-main-loop），S1-B 折叠成一条链；右=**完整项目骨架树**（恢复上一版整树，不再切分区框），用一个框**圈定 S0 建的底座**；**S1 节点产物 1:1 连线**到具体文件：A2→prd、A3→design、A4→todo、B4→issues、**B7→反哺 prd/design/ADR**；A1/A5/A6 产物纯文字。**两道门禁缩成连线上的小锁🔒**（A1→A2、B2→B3）；**中间 handoff⟺INDEX 说明已删**（占位置·乱布局；handoff.md/INDEX.md 仍作为文件留在右侧骨架）；**痛点色标 + 对照表已全部去掉**（3a 已讲痛点，3a 末尾的前向引用也已改）。karpathy 横切。**已定**：不画 CODEX.md 框（CLI 不产，Codex 原生读 AGENTS.md）；本轮不出 SVG。**待办**：①把图3a 新三幕故事 + 图3b 架构并入第三章 `讲解设计.md`（目前 runsheet 直奔 Knode case）；②结构已锁，待用户点头可出图3a/图3b 的 SVG 骨架。

## 安全提醒

- step4 / step5 / step5_mcp / step6 会**真实执行模型返回的 shell 命令**，现场只在隔离目录跑低风险任务（建文件、列目录）。
- step6 只有循环上限/超时/工作目录，**不是安全沙箱**；手机能触发本机 shell，别连公共 Wi-Fi 暴露服务。
- `.env` 有真实 `DEEPSEEK_API_KEY`，不要提交；该 key 曾在早期对话/模板里出现过明文，**建议轮换**。
- `AIcoding_teaching/` 在 git 里整体未跟踪；提交前清理 `__pycache__/`、`.env`、`.venv/`。

## Suggested skills / 后续工具

- `handoff`：会话结束时继续覆盖更新本文件。
- `run` / `verify`：实跑 demo，尤其 step5_mcp 的 LLM tool-call 和 step6 网页版。
- 出 SVG 配图：可用内置可视化能力直接产出趋势图 / 机理图。
- `skill-creator`：若把 `skill.md` 升级成正式 skill 资产。
