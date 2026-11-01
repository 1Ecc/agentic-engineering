"""第 6 步 · 换皮 —— 给 agent 套个网页，就成了「小型龙虾 IDE」。

底层逻辑和第 5 步【完全一样】，只是把「命令行输入」换成「HTTP 接口接收」，
再配一个网页。本机起服务后，用手机/浏览器访问就能远程操作。

心智模型：大众认知里的「龙虾」≈ agent 内核 + 一层皮。皮再漂亮，
         能不能干活仍取决于底层 agent 是否稳定。

运行：
  pip install -r ../requirements.txt
  python server.py     # 电脑打开 http://localhost:5000，手机打开终端里打印的局域网地址
"""
import os
import logging
import socket
import subprocess
import threading

from flask import Flask, request, jsonify, send_file
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()                                  # 自动加载 .env（向上找到 demo/.env，省去手动 source）

HOST = "0.0.0.0"
PORT = int(os.environ.get("LOBSTER_PORT", "5000"))
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")
MAX_STEPS = int(os.environ.get("LOBSTER_MAX_STEPS", "8"))
COMMAND_TIMEOUT = int(os.environ.get("LOBSTER_COMMAND_TIMEOUT", "60"))
MAX_RESULT_CHARS = int(os.environ.get("LOBSTER_MAX_RESULT_CHARS", "6000"))

_here = os.path.dirname(os.path.abspath(__file__))
WORK_DIR = os.path.abspath(os.environ.get("LOBSTER_WORKDIR", _here))

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY") or "missing-key-for-demo",
    base_url="https://api.deepseek.com")

system = open(os.path.join(_here, "..", "AGENTS.md"), encoding="utf-8").read()
system += "\n\n" + open(os.path.join(_here, "..", "skill.md"), encoding="utf-8").read()
system += f"\n\n当前命令执行目录是：{WORK_DIR}"

app = Flask(__name__)
app.json.ensure_ascii = False
logging.getLogger("werkzeug").setLevel(logging.ERROR)

_events = []
_event_id = 0
_events_lock = threading.Lock()


def append_event(kind, text, label=None, run_id=None):
    global _event_id
    with _events_lock:
        _event_id += 1
        event = {
            "id": _event_id,
            "type": kind,
            "text": text,
            "label": label,
            "run_id": run_id,
        }
        _events.append(event)
        del _events[:-200]

    if kind == "user":
        print(f"\n任务 > {text}", flush=True)
    elif kind == "cmd":
        print(f"[执行] {text}", flush=True)
    elif kind == "result":
        print(f"[结果] {text}", flush=True)
    elif kind in ("done", "error"):
        print(f"[{label or kind}] {text}", flush=True)

    return event


def local_ips():
    ips = []

    def add(ip):
        if (
            ip
            and ip not in ips
            and not ip.startswith("127.")
            and not ip.startswith("169.254.")
        ):
            ips.append(ip)

    for interface in ("en0", "en1"):
        try:
            ip = subprocess.check_output(
                ["ipconfig", "getifaddr", interface],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
        except (OSError, subprocess.CalledProcessError):
            continue
        if ip:
            add(ip)

    try:
        output = subprocess.check_output(
            ["ipconfig"],
            text=True,
            encoding="utf-8",
            errors="ignore",
            stderr=subprocess.DEVNULL,
        )
        for line in output.splitlines():
            if "IPv4" not in line:
                continue
            _, _, value = line.partition(":")
            add(value.strip())
    except (OSError, subprocess.CalledProcessError):
        pass

    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            add(ip)
    except OSError:
        pass

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            add(s.getsockname()[0])
    except OSError:
        pass

    return ips or ["127.0.0.1"]


def local_ip():
    return local_ips()[0]


def extract_command(reply):
    text = reply.strip()
    for prefix in ("命令:", "命令："):
        if text.startswith(prefix):
            return text[len(prefix):].strip()
    return None


def trim_result(text):
    if len(text) <= MAX_RESULT_CHARS:
        return text
    return text[:MAX_RESULT_CHARS] + "\n\n...输出过长，已截断..."


def run_command(cmd):
    try:
        out = subprocess.run(
            cmd,
            shell=True,
            cwd=WORK_DIR,
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
        )
    except subprocess.TimeoutExpired as exc:
        partial = ((exc.stdout or "") + (exc.stderr or "")).strip()
        result = partial or "(超时前无输出)"
        return {
            "ok": False,
            "result": trim_result(f"[超时] 命令超过 {COMMAND_TIMEOUT} 秒未结束\n{result}"),
        }

    result = (out.stdout + out.stderr).strip() or "(无输出)"
    if out.returncode != 0:
        result = f"[退出码 {out.returncode}]\n{result}"
    return {"ok": out.returncode == 0, "result": trim_result(result)}


@app.get("/")
def home():
    return send_file(os.path.join(_here, "index.html"))


@app.get("/status")
def status():
    ips = local_ips()
    return jsonify({
        "ok": True,
        "model": MODEL,
        "work_dir": WORK_DIR,
        "max_steps": MAX_STEPS,
        "command_timeout": COMMAND_TIMEOUT,
        "local_url": f"http://127.0.0.1:{PORT}",
        "phone_url": f"http://{ips[0]}:{PORT}",
        "phone_urls": [f"http://{ip}:{PORT}" for ip in ips],
        "has_api_key": bool(os.environ.get("DEEPSEEK_API_KEY")),
    })


@app.get("/events")
def events():
    after = request.args.get("after", "0")
    try:
        after_id = int(after)
    except ValueError:
        after_id = 0

    with _events_lock:
        items = [event for event in _events if event["id"] > after_id]
        latest = _event_id

    return jsonify({"events": items, "latest": latest})


@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    task = (payload.get("task") or "").strip()
    if not task:
        return jsonify({"error": "任务不能为空"}), 400
    if not os.environ.get("DEEPSEEK_API_KEY"):
        message = "缺少 DEEPSEEK_API_KEY，请先 source ../.env 再启动 server.py"
        append_event("error", message, "错误")
        return jsonify({"error": message}), 500

    run_id = str(_event_id + 1)
    append_event("user", task, "你", run_id)
    messages = [{"role": "system", "content": system}, {"role": "user", "content": task}]
    steps = []  # 把 agent 每一步都记下来，回给前端展示
    for index in range(MAX_STEPS):  # ← 还是那个同样的 agent 循环，只是给现场演示加了保险丝
        append_event("agent", f"第 {index + 1} 轮：思考下一步...", "Agent", run_id)
        reply = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            stream=False,
            reasoning_effort="high",
            extra_body={"thinking": {"type": "enabled"}}
        ).choices[0].message.content
        messages.append({"role": "assistant", "content": reply})

        cmd = extract_command(reply)
        if cmd:
            append_event("cmd", f"$ {cmd}", "执行命令", run_id)
            executed = run_command(cmd)
            append_event(
                "result",
                executed["result"],
                "本机反馈" if executed["ok"] else "本机反馈（命令未成功）",
                run_id,
            )
            steps.append({
                "type": "cmd",
                "cmd": cmd,
                "ok": executed["ok"],
                "result": executed["result"],
            })
            messages.append({"role": "user", "content": f"命令执行结果:\n{executed['result']}"})
        else:
            append_event("done", reply, "完成", run_id)
            steps.append({"type": "done", "text": reply})
            break
    else:
        message = f"已执行 {MAX_STEPS} 轮，先停止，避免 agent 无限循环。"
        append_event("error", message, "停止", run_id)
        steps.append({"type": "error", "text": message})

    return jsonify(steps)


if __name__ == "__main__":
    os.makedirs(WORK_DIR, exist_ok=True)
    ips = local_ips()
    print("---- step6 web 小龙虾 ----")
    print(f"电脑访问: http://127.0.0.1:{PORT}")
    print("手机访问候选（手机和电脑需在同一 Wi-Fi）：")
    for ip in ips:
        print(f"  http://{ip}:{PORT}")
    print(f"命令执行目录: {WORK_DIR}")
    if not os.environ.get("DEEPSEEK_API_KEY"):
        print("提示: 当前没有 DEEPSEEK_API_KEY，聊天接口会返回错误。")
    app.run(host=HOST, port=PORT)
