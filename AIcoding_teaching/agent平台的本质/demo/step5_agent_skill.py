"""第 5 步 · 给 agent 装技能 —— 引出「命令」的本质。

和第 4 步几乎一模一样，只多了一行：把 skill.md 也拼进系统提示词。
现场演示（先翻车，再装技能）：任务「北京现在天气怎么样？」
  - 没装 skill：模型受「知识截止日期」限制，只会凭记忆编一个天气，或说自己查不了。
  - 装上 skill（skill.md 告诉它用 curl wttr.in 取实时数据）：同一只龙虾立刻给出真实天气。
  注意：别选「下载视频」这类任务——模型本就知道用 yt-dlp，体现不出 skill 的价值；
       要选「模型靠记忆做不到」的实时类任务（天气 / 新闻 / 汇率），对比才明显。

心智模型：
  - 万物皆可命令：小到读写文件，大到起服务、调远程 API，都是一行命令。
  - 厉害的不是这几十行代码，而是【命令本身】+【模型知道用哪条命令】+【你给的说明书】。
  - 所以「不是它厉害，是你厉害」—— 同一只龙虾，装了 skill 就脱胎换骨。
  - 万物皆可命令 = 万物皆可 coding —— 回到主题：AI coding。

运行：python step5_agent_skill.py
"""
import os, subprocess
from openai import OpenAI
from dotenv import load_dotenv

_here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_here, ".env"))       # 自动加载同目录 .env（省去手动 source）

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com")

system = open(os.path.join(_here, "AGENTS.md"), encoding="utf-8").read()
system += "\n\n" + open(os.path.join(_here, "skill.md"), encoding="utf-8").read()   # ← 唯一的新增：装技能
messages = [{"role": "system", "content": system}]
messages.append({"role": "user", "content": input("任务 > ")})

while True:
    reply = client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=messages,
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    ).choices[0].message.content
    messages.append({"role": "assistant", "content": reply})
    print("AI >", reply)
    if "命令:" in reply[:4] or "命令：" in reply[:4]:
        cmd = reply.split("命令:", 1)[-1].split("命令：", 1)[-1].strip()
        out = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        result = (out.stdout + out.stderr).strip() or "(无输出)"
        print(f"[执行] {cmd}\n[结果] {result}")
        messages.append({"role": "user", "content": f"命令执行结果:\n{result}"})
    else:
        break
