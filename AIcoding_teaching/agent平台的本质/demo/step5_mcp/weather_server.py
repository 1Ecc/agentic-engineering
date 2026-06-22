"""一个【真正的 MCP 服务】—— 你会发现它就是「一个函数 + 一个装饰器」。

它对外暴露一个工具 get_weather(city)。任何支持 MCP 的客户端
（Claude Code、我们的 step5_mcp_client.py、各种 app）都能发现并调用它。

这就是「我只会用」背后的真相：所谓装一个 MCP，对方提供的就是这么一段东西。

依赖：pip install mcp
单独自测：python weather_server.py （正常会静默等待客户端连接，Ctrl+C 退出）
"""
import urllib.request
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")              # 给这个 MCP 服务起个名字

@mcp.tool()                           # ← 就这一行，把下面的普通函数变成了 MCP 工具
def get_weather(city: str) -> str:
    """查询某个城市的实时天气（city 用英文，如 Beijing / Shanghai）。"""
    # 用 http（而非 https）可避开 macOS 上 Python 常见的证书校验报错；?m 表示摄氏度
    url = f"http://wttr.in/{city}?format=3&m"
    return urllib.request.urlopen(url, timeout=10).read().decode().strip()

if __name__ == "__main__":
    mcp.run()                         # 以 stdio 方式运行，等客户端来连接
