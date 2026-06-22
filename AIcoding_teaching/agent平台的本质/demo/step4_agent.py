"""第 4 步 · 第一个 agent —— 能操作本地文件了。

比 step3 多了两样东西，agent 就诞生了：
  1）把 system 从「You are a helpful assistant」换成一份【说明书】：
     约定模型要么回「命令:…」、要么回「完成:…」（见下方 system）
  2）一个【执行】动作：模型回命令 → 程序执行 → 把结果喂回 → 模型再判断…直到回「完成」

心智模型：agent 不神秘，就是「大模型 + 循环 + 执行命令 + 一份说明书」。
现场演示（务必在隔离 / 测试目录里跑）：
  - 任务 > 创建 hello.txt，内容写 hello world      （能干活）
  - 任务 > 给我今天的天气                           （还没装 skill → 大概率瞎编/说做不到/乱试命令，不稳定，正好引出 step5）

注：这份写在 system 里的【说明书】，本质就是 Claude Code / Codex 的入口规则文件
    （AGENTS.md / CLAUDE.md）的雏形 —— step5 / step6 会把它抽成外接文件来加载。
    另外注意 system（说明书，定规矩）和 user（任务，提需求）是两种不同的角色。

⚠️ 这里会真的执行模型给的 shell 命令，注意风险。

运行：python step4_agent.py
"""
import os, subprocess
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()                                  # 自动加载 .env（省去手动 source）

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com")

system = """
你的目标是完成用户的任务，你必须选择下面的其中一种格式进行回复:
1.如果你认为需要执行命令，则输出'命令:XXX'，XXX为命令本身，不要用任何的格式，不要解释
2.如果你认为不需要执行命令，则输出'完成:XXX'，XXX为你的总结信息
"""

messages = [{"role": "system", "content": system}]     # system 放最前，定规矩
messages.append({"role": "user", "content": input("任务 > ")})

print("---- Agent 循环开始 ----")
while True:                                             # ← agent 的核心就是这个循环
    reply = client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=messages,
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    ).choices[0].message.content
    messages.append({"role": "assistant", "content": reply})
    print("[AI]", reply)

    if reply.startswith(("命令:", "命令：")):           # 模型想执行命令
        cmd = reply[3:].strip()                         # 去掉「命令:」前缀
        out = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        result = (out.stdout + out.stderr).strip() or "(无输出)"
        print(f"[执行] {cmd}\n[结果] {result}")
        messages.append({"role": "user", "content": f"命令执行结果:\n{result}"})
    else:                                               # 模型认为做完了
        print("---- Agent 循环结束 ----")
        break
