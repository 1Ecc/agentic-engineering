"""第 5 步（MCP 版）· 用 MCP 让模型获取实时天气。

和 step5 的 skill 版【对比着看】，这是本步的全部意义：
  - skill 版：我们在 skill.md 里【写死一条 shell 命令】，告诉模型「查天气就敲这条」。
  - MCP  版：天气能力被做成一个【标准化工具 get_weather】，放在独立的 MCP 服务里，
            模型【按名字 + 参数】直接调用它，我们不在 prompt 里塞任何命令。

看懂下面这 4 步，就懂 MCP 了：
  1. 连接 MCP 服务，问它「你有哪些工具？」          （list_tools）
  2. 把这些工具告诉大模型
  3. 模型自己决定调用 get_weather(city="Beijing")
  4. 我们通过 MCP 真正执行它，把结果喂回模型，模型给出最终回答

依赖：pip install mcp openai
运行：python step5_mcp_client.py        （它会自动拉起同目录的 weather_server.py）
注：需要模型支持「工具调用 / function calling」。若 deepseek-v4-pro 报不支持 tools，
    把下面两处 model 换成 deepseek-chat 再试。
"""
import os, sys, json, asyncio
from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

load_dotenv()                                  # 自动加载 .env（向上找到 demo/.env，省去手动 source）

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")
    sys.stderr.reconfigure(errors="replace")

llm = OpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com")

SERVER = os.path.join(os.path.dirname(__file__), "weather_server.py")


async def main():
    task = input("任务 > ")            # 例如：北京现在天气怎么样？

    # 用当前 Python 解释器拉起 MCP 服务，并通过 stdio 连接它
    params = StdioServerParameters(command=sys.executable, args=[SERVER])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # 1) 问 MCP 服务有哪些工具，2) 翻译成大模型认识的格式
            mcp_tools = (await session.list_tools()).tools
            tools = [{
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.inputSchema,
                },
            } for t in mcp_tools]
            print("[MCP 工具]", [t.name for t in mcp_tools])

            # 3) 模型看到工具后，自己决定要不要调用、调用谁、传什么参数
            messages = [{"role": "user", "content": task}]
            reply = llm.chat.completions.create(
                model="deepseek-v4-pro", messages=messages, tools=tools,
            ).choices[0].message

            if not reply.tool_calls:
                print("AI >", reply.content)      # 模型没调用工具，直接回答
                return

            call = reply.tool_calls[0]
            args = json.loads(call.function.arguments)
            print(f"[模型决定调用] {call.function.name}({args})")

            # 4) 通过 MCP 真正执行这个工具，拿到真实结果
            result = (await session.call_tool(call.function.name, args)).content[0].text
            print(f"[MCP 返回] {result}")

            # 把结果喂回模型，让它用自然语言给出最终回答
            messages.append(reply)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
            final = llm.chat.completions.create(
                model="deepseek-v4-pro", messages=messages,
            ).choices[0].message.content
            print("AI >", final)


asyncio.run(main())
