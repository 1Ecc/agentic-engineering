### 问题 6：录制新接口点击打开浏览器时报错仍读取旧 Demo 录制文件

**问题描述**：

浏览器录制节点中，点击“打开录制浏览器”后报错：

```text
ENOENT: no such file or directory, open 'D:\coding\Project\Workspace\CES-AI创想争霸赛\data\recordings\demo-stock-query.json'
```

**当前态**：

- `data/recordings/demo-stock-query.json` 已在问题 4 清理 mock 数据时删除。
- 当前源码中没有 `demo-stock-query` 引用，运行时报错说明仍有旧前端状态、旧构建产物或旧后端进程在使用历史 Demo recording id。
- `apps/web/dist` 是静态服务可能使用的构建产物，如果没有重新构建，用户通过 API 静态服务访问时可能仍命中旧页面逻辑。

**期望态（需要跟用户沟通确认）**：

- 点击“打开录制浏览器”必须创建新的真实录制会话，生成新的 `rec_{timestamp}` recording id。
- 打开浏览器流程不得读取或依赖 `demo-stock-query.json`。
- 如果浏览器录制启动失败，应返回 MCP / 配置相关的真实错误，而不是读取旧 Demo 文件。

**分析与解决**：

- 先确认源码和数据目录中已无 `demo-stock-query` 残留引用。
- 更新前端录制入口，启动新录制前清空旧 session / spec / 试调用状态，避免旧页面状态继续传入历史 recording id。
- 重新构建 web 静态产物，避免 API 静态服务继续返回旧 dist。
- 需要用户重启当前 dev/API 服务或刷新页面后重新验证。

**to-issues**：

- [x] 检查源码与数据目录，确认 `demo-stock-query` 不再存在。
- [x] 前端点击“打开录制浏览器”前清空旧录制状态。
- [x] 重新构建 web 静态产物并运行验证。
- [ ] 复现 bug：问题 5 的 0 请求现象仍存在时，同步排查是否由旧页面状态、旧后端进程、旧 MCP 子进程或旧构建产物导致新录制会话未真正生效。
- [ ] 用户重启服务/刷新页面后验证是否还会读取 `demo-stock-query.json`。

**bug记录**：

- 2026-05-13：当前仍需把“是否命中旧 session/旧进程/旧 dist”作为问题 6 下的关联 bug 排查。源码与数据目录未见 `demo-stock-query` 残留，但运行态仍可能由未重启服务或残留 MCP/Node 进程引发。

**用户验收状态**：待用户验证。
