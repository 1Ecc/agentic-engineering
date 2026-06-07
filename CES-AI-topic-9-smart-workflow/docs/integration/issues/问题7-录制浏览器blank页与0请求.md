### 问题 7：录制浏览器出现两个 blank 页且真实操作后捕获 0 条请求

**问题描述**：

浏览器录制节点中：

1. 描述完节点后进入下一步，点击启动浏览器。
2. 浏览器可以拉起，但出现两个 blank 页面。
3. 用户在拉起的浏览器中以服务云为例完成了工单查询操作。
4. 前端仍显示：`模式：MCP 真实浏览器 · 状态：recording · 已捕获 0 条请求`。
5. 点击完成录制后显示：`No business API requests were captured`。

**当前态**：

- `chrome-devtools-mcp` 的 `list_network_requests` 针对当前选中的 DevTools page 读取 Network。
- 当前实现启动后没有在状态查询和结束录制前强制选中录制页，用户可能在另一个 blank 页或非录制页操作，导致后端读取的页面没有请求。
- 本机 MCP smoke 发现默认 profile 可能被旧 MCP 进程占用，并返回 `The browser is already running ... Use --isolated` 文本错误；当前代码没有把这种 MCP 文本错误识别成失败，容易出现“前端显示 recording，但 MCP 实际不可用”的假状态。

**期望态（需要跟用户沟通确认）**：

- 每次录制应打开一个明确可操作的录制页，尽量避免额外 blank 页干扰。
- 状态查询和完成录制都必须读取用户实际操作页面的 Network 请求。
- 如果 MCP profile 被占用或工具调用失败，应明确报错，而不是显示 recording。

**分析与解决**：

- 默认使用 `chrome-devtools-mcp --isolated` 启动，避免复用被旧进程占用的默认 profile。
- 启动录制时优先复用 MCP 已有默认页，避免无目标入口时额外 `new_page` 导致两个 blank 页；只有没有可用页面时才新建页。
- 启动录制后记录 `pageId`，状态查询和完成录制前都调用 `select_page` 强制切回录制页。
- 识别 MCP 工具返回的文本错误，例如 `The browser is already running`、`Cause:`、`Error:`，并转成真实异常返回前端。
- 若后续仍出现两个 blank 页，则进一步在启动后通过 `list_pages` + `close_page` 清理非录制空白页。

**to-issues**：

- [x] 默认以 isolated 模式启动 `chrome-devtools-mcp`。
- [x] 增加 MCP 文本错误识别，避免假 recording 状态。
- [x] 启动录制时优先复用默认页，减少两个 blank 页干扰。
- [x] 录制会话记录并强制选中录制 `pageId` 后再读取 Network。
- [x] 重新运行 typecheck、录制单测和 MCP smoke。
- [x] bug：MCP 返回 `networkRequests` / `networkRequest` / `requestId` 或 `reqid=...` 文本格式时，录制驱动解析不完整，导致真实 Network 结果被转换成 0 条；已补齐 MCP 0.26 字段和文本格式兼容。
- [ ] 用户重新验证服务云工单查询是否能捕获请求。

**用户验收状态**：待用户验证。

---

