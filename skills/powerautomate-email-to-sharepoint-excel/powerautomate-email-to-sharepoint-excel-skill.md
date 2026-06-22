---
name: powerautomate-email-to-sharepoint-excel
description: Use when the user needs to collect specific Outlook or Microsoft 365 corporate emails, filter them by sender/subject/body rules, extract mail fields such as title and content, and persist them for later analysis when Codex, local plugins, or direct mailbox APIs cannot access the mailbox. Guides the agent through SharePoint preparation, Power Automate flow creation, and retrieving the captured data from SharePoint Excel.
---

# Outlook 邮件采集到 SharePoint Excel

这个 skill 用来指导 agent 在遇到“需要筛选 Outlook 特定邮件并获取内容”的需求时，设计一条可落地的 Microsoft 365 自动化路径。它不是某个单一 case 的记录，而是可复用的实施指南。

## 触发判断

先确认是否属于这类问题：

```text
1. 邮箱来源是 Outlook / Microsoft 365 / Exchange Online
2. 账号是集团或公司账号，权限受租户策略控制
3. 需要持续获取邮件内容，而不是人工查看一封邮件
4. Codex、浏览器插件、本地脚本或 Graph API 暂时无法直接访问邮箱
5. 用户可以使用 Power Automate、SharePoint、OneDrive 或 Excel Online
```

满足这些条件时，优先考虑 Microsoft 365 内部链路：

```text
Outlook 邮件触发
→ Power Automate 筛选和转换
→ SharePoint Excel / SharePoint List / OneDrive 文件
→ 本地同步或脚本分析
```

不要默认尝试新版 Outlook 的本地 COM/VBA 自动化；新版 Outlook 不适合这种路径。企业账号也不要假设 IMAP、Graph、HTTP webhook 一定可用。

## 工作分解

把任务拆成三部分：

```text
1. SharePoint 准备工作
2. Power Automate 创建 Flow
3. 获取 SharePoint 中的数据用于本地分析
```

当前已沉淀的方法：

| 方法 | 输出位置 | 适合情况 |
|---|---|---|
| 方法 1：Power Automate 写入 SharePoint Excel | SharePoint 文档库中的 Excel Table | 低频邮件日志、轻量分析、用户熟悉 Excel |

后续可补充的方法：

- Power Automate 写入 SharePoint List。
- Power Automate 写 JSON/CSV 到 OneDrive 或 SharePoint 文件夹。
- Microsoft Graph 本地脚本拉取邮件并写入 SQLite/JSONL。
- Graph webhook + 云端或本地隧道接收服务。

## 方法 1 总览

目标链路：

```text
SharePoint Site + 文档库 + Excel Table
        ↓
Power Automate 自动化云端流
        ↓
Office 365 Outlook：新电子邮件到达时(V3)
        ↓
按场景配置邮件筛选规则
        ↓
Html 到文本：清理正文
        ↓
Excel Online (Business)：在表中插入新行
        ↓
从 SharePoint/OneDrive 同步或下载数据做本地分析
```


## 1. SharePoint 准备工作

### 1.1 准备 SharePoint Site

确认用户有一个可用的 SharePoint Site，例如：

```text
https://tenant.sharepoint.com/sites/team-site
```

记录三类信息：

```text
SharePoint Site URL
文档库名称，常见为 文档 / Documents / Shared Documents
Excel 文件名和路径
```

在 Power Automate 的 Excel 动作中，`位置 / Location` 通常要从下拉中选择：

```text
SharePoint Site - <site name>
```

不要优先手填完整 site URL。手填 URL 可能导致后续文档库下拉报 `source 未设置或无效`。

### 1.2 准备 SharePoint Excel 文件

在 SharePoint 文档库中创建或上传 Excel 文件。文件可以是新建的，也可以使用已有文件。

建议表头按分析目标设计，最小表头：

| date | title | content |
|---|---|---|

更推荐的通用表头：

| date | sender | title | content | messageId |
|---|---|---|---|---|

可选字段：

```text
bodyPreview
receivedTime
toRecipients
ccRecipients
importance
hasAttachments
conversationId
webLink
```

### 1.3 必须转换为 Excel Table

Power Automate 的 `在表中插入新行` 只能写入 Excel Table，不能写入普通单元格区域。

操作：

```text
选中表头和数据区域
→ 插入
→ 表格
→ 勾选“表包含标题”
→ 表格设计 / Table Design
→ 表名称 / Table Name
→ 设置一个稳定表名
```

表名建议：

```text
EmailCaptureTable
OutlookMailLog
KeywordMailTable
```

注意：

- 表名称不是 Sheet 名称。
- 表名称不是文件名。
- 如果 Power Automate 的表下拉显示 `无项`，通常就是文件里还没有 Excel Table。
- 如果刚创建表后 Power Automate 仍识别不到，保存并关闭 Excel，再重新选择文件和表。

## 2. Power Automate 创建 Flow

### 2.1 创建 Flow

在 Power Automate 中创建：

```text
创建
→ 自动化云端流
→ 选择触发器：Office 365 Outlook - 新电子邮件到达时(V3)
```

Flow 命名建议体现业务场景：

```text
Capture Outlook emails to SharePoint Excel
<业务名> email capture
<关键词> mail log
```

### 2.2 配置邮件触发器

节点：

```text
Office 365 Outlook
→ 新电子邮件到达时(V3)
```

这个触发器一般高频用到 9 类参数。不同租户语言和版本名称会略有差异。

| 参数 | 用途 | 建议 |
|---|---|---|
| 文件夹 / Folder | 监听哪个邮箱文件夹 | 通常选 Inbox / 收件箱 |
| 至 / To | 收件人过滤 | 只有需要按收件人过滤时填写 |
| 抄送 / Cc | 抄送过滤 | 需要区分抄送邮件时填写 |
| 收件人或抄送 / To or Cc | To/Cc 任一命中 | 比分别填 To/Cc 更宽松 |
| 发件人 / From | 发件人过滤 | 适合固定发件人规则 |
| 主题筛选器 / Subject Filter | 主题关键词过滤 | 直接填关键词，不写 `contains()` |
| 加入附件 / Include Attachments | 是否把附件内容带出 | 默认否，除非后续要处理附件 |
| 只检索带附件的电子邮件 / Only with Attachments | 是否只要有附件邮件 | 默认否 |
| 重要性 / Importance | 按重要性过滤 | 很少用，除非业务明确需要 |

常见规则：

```text
发件人 = sender@example.com
主题筛选器 = KEYWORD
文件夹 = Inbox
加入附件 = 否
只检索带附件的电子邮件 = 否
```

规则放置原则：

- 简单发件人和主题规则优先放在触发器参数里，减少后续无效运行。
- 多条件、大小写、正文关键词、复杂收件人判断，放到后续 `Condition / 条件`。
- `Subject Filter` 填纯关键词，例如 `KEYWORD`，不要填表达式。

复杂条件示例：

```text
and(
  equals(toLower(triggerOutputs()?['body/from/emailAddress/address']), 'sender@example.com'),
  contains(toLower(triggerOutputs()?['body/subject']), 'keyword')
)
```

### 2.3 理解新邮件触发器会带出的数据

`新电子邮件到达时(V3)` 触发后已经拿到邮件的动态内容。不要再额外添加“获取标题”或“获取正文”的动作，除非需要按 Message Id 获取更完整的对象。

常见动态字段大约有 34 类，具体数量会随连接器版本、租户语言、附件配置而变化。按类别理解即可：

| 类别 | 常见字段 |
|---|---|
| 标识 | Message Id, Internet Message Id, Conversation Id |
| 时间 | Received time, Sent time, Created date time, Last modified date time |
| 标题 | Subject |
| 正文 | Body, Body preview, Body content type |
| 发件人 | From, From name, From address, Sender |
| 收件人 | To, To recipients, Cc recipients, Bcc recipients |
| 状态 | Importance, Is read, Is HTML, Has attachments |
| 分类 | Categories, Flag |
| 链接 | Web link |
| 附件 | Attachments, Attachment name/content/content type/size |
| 元信息 | Parent folder id, Inference classification, Sensitivity |

优先映射字段：

```text
date       = Received time
sender     = From address
title      = Subject
content    = Body 或 Html 到文本输出
messageId  = Message Id
```

### 2.4 Html 到文本

Outlook 正文通常是 HTML。写入 Excel 前建议加：

```text
Content Conversion
→ Html 到文本 / Html to text
```

配置：

```text
内容 / Content = 新电子邮件到达时(V3) → Body / 正文
```

用途：

- 去掉 `<div>`、`<br>`、`span` 等 HTML 标签。
- 让 Excel 中的 `content` 更适合人工查看和脚本分析。
- 避免后续本地分析时先做 HTML 清洗。

如果用户确实需要保留原始 HTML，可同时写两列：

```text
contentText = Html 到文本输出
contentHtml = Body
```

### 2.5 Excel Online (Business)

连接器：

```text
Excel Online (Business)
```

当前方法使用的动作：

```text
在表中插入新行 / Add a row into a table
```

配置顺序：

```text
位置 / Location：选择 SharePoint Site - <site name>
文档库 / Document Library：选择文档库，例如 文档 / Documents
文件 / File：用文件夹图标浏览选择 Excel 文件
表 / Table：选择 Excel Table 名称
```

不要优先手填文件路径。浏览选择文件更稳定，能减少 schema 识别异常。

选择表后，Excel Table 的表头会展开为可填写字段。映射示例：

```text
date      = Received time
sender    = From address
title     = Subject
content   = Html 到文本 → The plain text content
messageId = Message Id
```

如果只设计了三列表头：

```text
date    = Received time
title   = Subject
content = Html 到文本输出
```

## 3. 获取 SharePoint 中的数据

根据用户后续分析方式选择获取路径。

### 3.1 推荐路径：SharePoint Sync 到 OneDrive 本地

优先让用户在 SharePoint 文档库中使用 `Sync / 同步`，把包含 Excel 的文档库同步到 OneDrive 本地目录。后续分析直接读本地同步出来的 `.xlsx` 文件，不再依赖 Graph API 或浏览器下载。

```text
SharePoint Excel
→ SharePoint 文档库点击 Sync / 同步
→ OneDrive 在本机创建同步目录
→ Power Automate 写入 SharePoint Excel
→ OneDrive 在一段时间后同步更新到本地
→ 本地脚本读取同步路径下的 Excel 文件
```

落地时记录：

```text
SharePoint 文件 URL
OneDrive 本地同步路径
Excel 文件名
Excel Table 名称
表头字段
```

注意：

- OneDrive 同步不是实时强一致，Power Automate 更新后本地文件会有延迟。
- 分析脚本应把同步文件当作只读输入，避免和 OneDrive/Excel/Power Automate 同时写同一个文件。
- 如果要稳定分析，建议脚本读取 `.xlsx` 后转存为本地 `CSV / JSONL / SQLite`，后续分析读转存结果。
- 如果本地脚本读到旧数据，先检查 OneDrive 同步状态，而不是立即怀疑 Flow 写入失败。

这个路径适合个人分析和低频数据，是企业租户限制较多时最稳的默认方案。

### 3.2 手动下载 Excel

适合临时分析：

```text
SharePoint 文档库
→ 下载 Excel
→ 本地读取
```

### 3.3 脚本读取同步后的 Excel

如果文件已经同步到本地，可以用脚本读取 Excel Table 或工作表数据，输出 CSV/JSONL/SQLite。

注意：

- 分析脚本不要在 Excel 桌面版打开文件时写入同一文件。
- 如果 Flow 正在写入，脚本侧优先只读。
- 更稳定的长期分析格式是从 Excel 转存到 CSV/SQLite。

### 3.4 Graph API 路径：默认标记为需授权

如果企业授权允许，可用 Microsoft Graph 或 SharePoint API 读取文件内容，但不要默认假设可用。企业租户通常需要管理员同意权限、条件访问放行、已批准的 App Registration 或已批准的第一方客户端。

已验证的失败信号：

```text
AADSTS65002
Consent between first party application ... and Microsoft Graph must be configured via preauthorization
```

含义：当前公共客户端不能在该租户中直接申请 Graph 权限。

```text
Your sign-in was successful but does not meet the criteria to access this resource
```

含义：登录成功，但被条件访问、应用访问策略、设备/位置/认证流规则拦截。

遇到这些错误时，认为临时 Graph 读取路径不可用：

```text
不能读取 workbook/tables/usedRange
不能下载 /content
不能靠换 endpoint 绕过
```

只有在用户提供公司已批准的 Graph 应用、管理员已 consent 的权限、或确认 Graph Explorer/Graph PowerShell 可用时，才继续尝试 Graph。

## 常见问题

### 表下拉显示“无项”

原因通常是 Excel 文件没有真正的 Excel Table。

处理：

```text
1. 打开 Excel Online
2. 选中表头和数据区域
3. 插入 → 表格
4. 保存并关闭文件
5. 回到 Power Automate 重新选择文件和表
```

### 选择表后没有出现列字段

处理顺序：

```text
1. 点击 高级参数 → 全部显示
2. 确认表头没有空列、重复列、特殊符号
3. 在表格下方临时加一行 test 数据
4. 保存并关闭 Excel
5. 删除并重建 “在表中插入新行” 动作
```

### 报错 “Item/列1 在操作架构中不再存在”

Power Automate 缓存了旧的 Excel schema。

最快修复：

```text
1. 删除当前 Excel 写入动作
2. 保存 Flow
3. 退出并重新进入 Flow 编辑器
4. 重新添加 Excel Online (Business) → 在表中插入新行
5. 重新选择位置、文档库、文件、表
6. 重新映射字段
```

### 写入后正文有 HTML 标签

在 Excel 写入前增加：

```text
Html 到文本
Content = Body
content 字段 = Html 到文本输出
```

### Excel 文件被锁

避免用桌面版 Excel 长时间打开目标文件。多人同时编辑或桌面版占用时，Flow 写入可能失败。

### 文件路径手填后识别异常

优先用文件夹图标选择文件。如果必须手填路径，确认路径是文档库内路径，而不是分享链接。

## 验证流程

保存 Flow 后：

```text
测试
→ 手动测试
→ 发送一封满足筛选条件的邮件
→ 查看运行历史记录
→ 打开 Excel 检查是否新增一行
```

运行历史排查顺序：

```text
1. 新电子邮件到达时(V3)：是否触发、字段是否正确
2. Html 到文本：正文是否转换成功
3. 在表中插入新行：位置、文件、表、列映射是否正确
```

如果触发器没跑，优先检查发件人、主题筛选器、文件夹和邮件是否真的进入目标邮箱。
