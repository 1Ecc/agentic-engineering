# 数据存储

## 1. 原则

Demo 期使用文件系统，不引入数据库。

目标：

- 简单可观察。
- 便于联调断点复现。
- 保留录制证据和运行快照。

---

## 2. 目录结构

```text
data/
  workflows/
    {id}.yaml
    {id}.meta.json
  nodes/
    builtin/
    connectors/
    {type}.json
  recordings/
    rec_xxx.json
  runs/
    {run_id}/
      result.json
      log.ndjson
```

---

## 3. workflows

`{id}.yaml`：

- workflow 定义。

`{id}.meta.json`：

- name
- description
- favorite
- run_count
- created_at
- updated_at
- last_run_at

保存前必须通过 workflow validate。

---

## 4. nodes

节点来源：

- `builtin/`：平台内置节点。
- `connectors/`：阶段一 connector 节点。
- 根目录 recorded json：用户录制节点。

recorded 节点 metadata：

- created_by
- created_at
- source_recording_id
- visibility

---

## 5. recordings

recording 是联调证据，应尽量完整保留。

字段：

- id
- status
- user description
- raw requests
- filtered requests
- llm_input_summary
- llm_trace
- converted_node
- error

注意：

- 原始 responseBody 不因 LLM token 限制截断。
- trace 必须脱敏。

---

## 6. runs

保存：

- workflow inputs
- node snapshots
- final outputs
- logs
- status
- errors

`log.ndjson` 适合流式追加节点进度。

---

## 7. 敏感信息

不得写入：

- API Key
- password
- authorization
- cookie
- token

必须脱敏：

- LLM trace prompt。
- captured headers。
- error details 中的敏感 header。

---

## 8. 后续演进

生产化建议迁移：

- SQLite/PostgreSQL 存 workflow/node/run。
- 对象存储保存大 response body。
- 安全凭据服务保存登录态。
- 增加用户、团队和版本维度。
