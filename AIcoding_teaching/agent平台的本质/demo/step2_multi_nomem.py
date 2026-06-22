"""第 2 步 · 多轮（无记忆）—— 在 step1 上，把「问一次」包进 while 循环。

心智模型：能连续问了，但每轮都只把「当前这句」发给模型。
现场演示：你好 → 1+1 等于几 → 再加 1 等于几（翻车！它不记得刚才）。
结论：模型本身没有任何记忆，每次都是从零开始。

和 step1 的差别：只多了 `while True` 和 `input()` 两处（见 ← 标注）。

运行：python step2_multi_nomem.py
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()                                  # 自动加载 .env（省去手动 source）

client = OpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com")

while True:                                          # ← 新增：循环，可以一直问
    user_input = input("\n你：")                      # ← 新增：问题改成用户手输
    response = client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": user_input},   # ← 只发当前这句，没有历史
        ],
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    )
    print("\nAI：", response.choices[0].message.content)
