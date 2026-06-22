"""第 3 步 · 多轮（有记忆）—— 在 step2 上，把历史攒进 messages 再发回去。

心智模型：所谓「记忆」，不过是每次把之前的问答原样再发一遍。
现场演示：你好 → 1+1 → 再加 1（这次对了）→「刚刚我们都说了什么」（它能复述）。
此时它看起来已经和网页聊天没区别了。

和 step2 的差别：把临时拼的 messages 换成一个【一直累积的 messages 列表】（见 ← 标注）。
⚠️ 痛点伏笔：messages 会越滚越长 —— 这就是后面要讲的「上下文管理」。

运行：python step3_multi_mem.py
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()                                  # 自动加载 .env（省去手动 source）

client = OpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com")

messages = [{"role": "system", "content": "You are a helpful assistant"}]   # ← 新增：历史，开头放一次 system
while True:
    user_input = input("\n你：")
    messages.append({"role": "user", "content": user_input})       # ← 把问题加进历史
    response = client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=messages,                                          # ← 发整段历史，不只当前句
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    )
    reply = response.choices[0].message.content
    messages.append({"role": "assistant", "content": reply})       # ← 把回复也加进历史
    print("\nAI：", reply)
