# step5（MCP 版）· 同一个「查天气」，换成 MCP 来做

这是 step5 的**平行版本**，用来讲清 MCP 到底是什么、和 skill 有什么区别。
**建议先跑 skill 版（`../step5_agent_skill.py`），再跑这个，对比着讲。**

## skill 和 MCP，到底差在哪？

| | step5 · skill 版 | step5 · MCP 版（本目录） |
|---|---|---|
| 能力放在哪 | 一段写死在 `skill.md` 里的 **shell 命令** | 一个独立 MCP 服务里的 **标准化工具** `get_weather` |
| 模型怎么用 | 模型**输出一段文字命令**，我们解析后执行 | 模型**按名字+参数结构化调用**，平台负责执行 |
| 谁来执行 | 我们自己 `subprocess` 跑命令 | MCP 协议负责跨进程调用，结果按标准返回 |
| 复用性 | 这段 prompt 跟着这个脚本走 | 任何支持 MCP 的 app（Claude Code…）都能直接接 |
| 一句话 | **教模型用「本机已有的命令」** | **给模型接上一个「外部标准能力」** |

> 本质相同：都是「提前把能力给到模型」。MCP 只是把这件事**标准化、跨进程、可复用**了。

## 两个文件

- `weather_server.py` —— 一个真正的 MCP 服务，核心就是「一个函数 + 一个 `@mcp.tool()` 装饰器」。
- `step5_mcp_client.py` —— 客户端：连服务 → 列工具 → 交给模型 → 模型调用 → 执行 → 喂回。

## 运行

```bash
cd AIcoding_teaching/coding本质/demo/step5_mcp
source ../.env                       # 里面有 DEEPSEEK_API_KEY
pip install mcp openai               # 或 ../.venv/bin/pip install mcp
python step5_mcp_client.py           # 会自动拉起 weather_server.py
# 任务 > 北京现在天气怎么样？
```

## 注意

- 需要模型支持**工具调用 / function calling**。若 `deepseek-v4-pro` 报不支持 `tools`，
  把客户端里两处 `model` 换成 `deepseek-chat` 再试。
- 这是教学用最小实现：只处理「模型调用一次工具」的情况，没做多轮工具循环、错误重试等。
- 现场讲解口径：**「MCP 服务 = 别人写好的能力，我只要连上就能用」**——正好呼应「我只会用」。



MCP 不是模型，也不是一个函数。
MCP 是 Host 和外部能力提供方之间的标准协议。

┌──────────────┐
│ config.toml  │  声明有哪些 MCP Server
└──────┬───────┘
       ▼
┌──────────────┐
│ Codex Host   │  读取配置、连接 MCP Server
└──────┬───────┘
       ▼
┌──────────────┐
│ MCP Server   │  暴露 tools / resources / prompts
└──────┬───────┘
       ▼
┌──────────────┐
│ Codex Host   │  把可用能力整理成模型可见的工具说明
└──────┬───────┘
       ▼
┌──────────────┐
│ LLM          │  判断是否需要调用工具
└──────┬───────┘
       │ tool call
       ▼
┌──────────────┐
│ Codex Host   │  接住 tool call，路由到对应 MCP Server
└──────┬───────┘
       │ MCP tools/call
       ▼
┌──────────────┐
│ MCP Server   │  执行真实操作，访问 GitHub/Figma/DB/API
└──────┬───────┘
       ▼
┌──────────────┐
│ Codex Host   │  把结果放回模型上下文
└──────┬───────┘
       ▼
┌──────────────┐
│ LLM          │  基于结果继续推理或回复用户
└──────────────┘


Codex Host
= AI 应用 / Runtime / 调度器
= 读配置、连 MCP、管权限、执行工具、回填结果

LLM
= 决策器
= 看工具说明，判断要不要调用，生成 tool call

MCP Client
= Codex Host 里的协议连接器
= 负责和 MCP Server 通信

MCP Server
= 外部能力提供方
= 把 GitHub、Figma、数据库、浏览器、内部系统包装成标准能力

Tools
= 可执行动作
= 最像 API / 函数，例如 search_issues、read_figma_node、query_db

Resources
= 可读取上下文
= 最像文件、数据源、文档、代码片段

Prompts
= 可复用提示词模板
= 最像预设任务模板或工作流模板

Tool call
= LLM → Codex Host
= 模型说：“我要调用哪个工具，参数是什么。”

MCP tools/call
= Codex Host → MCP Server
= Host 真的按照 MCP 协议请求 Server 执行。

不是：模型直接调用 MCP Server

而是：
模型产生 tool call
  ↓
Codex Host 接住
  ↓
Codex Host 通过 MCP Client 调 MCP Server
  ↓
MCP Server 执行并返回结果
  ↓
Codex Host 把结果喂回模型


Skill = 告诉 Codex “这类任务应该怎么做”
MCP   = 让 Codex “可以接入哪些外部能力”
Tool  = MCP Server 暴露的具体动作
Tool call = 模型在执行过程中发起的一次调用意图

