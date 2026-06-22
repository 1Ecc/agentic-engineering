"""第 1 步 · 单轮对话 —— 模型就是一个「问 → 答」的函数。

心智模型：大模型本身只会一问一答，没有记忆、不会动手。
这段代码【直接来自 DeepSeek 官方文档示例】：API 不可怕，照着填 model / messages 就能用。
后面 step2~5 都是在这段「初版」上一点点改出来的。

运行：python step1_single.py
"""
# Please install OpenAI SDK first: `pip3 install openai`
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()                                  # 自动加载 .env，key 从 .env 读、不写死在代码里（省去手动 source）

client = OpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com")

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "你好"},          # ← 你要问的问题，改这里
    ],
    stream=False,
    reasoning_effort="high",
    extra_body={"thinking": {"type": "enabled"}}
)

print(response.choices[0].message.content)
