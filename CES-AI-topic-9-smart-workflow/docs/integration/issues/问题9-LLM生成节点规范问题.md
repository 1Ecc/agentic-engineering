### 问题 9：LLM 生成节点规范问题

#### bug专题：按用户操作生成接口规范时遗漏关键业务参数

**问题描述**：

用户以 `data/recordings/rec_1778654331293.json` 为断点数据，对比 `docs/api/sop1-network-capture.md` 后发现，LLM 生成的 `serviceforce.query_service_order_list` 节点规范漏掉了 `soid`。这是不可接受的，因为端上实际操作是按工单号 `soid=202604273400100002` 查询工单，`soid` 是本次用户操作的核心业务输入。

当前 `llm_trace.raw_output` / `parsed_output` 把该接口总结成了通用“工单列表查询”，仅保留 `page_index`、`page_size`、`order_status`、`cust_name`、`create_start_time`、`create_end_time`，没有保留 `soid`。相比之下，`docs/api/sop1-network-capture.md` 对同一接口的总结更符合用户操作：明确记录 Method、URL、Query、Request Payload、Response 摘要、业务含义，并说明其余筛选项为空，为后续自动化保留扩展空间。

**当前态**：

- `rec_1778654331293.json` 中 `requests=180`、`filtered_requests=110`，说明过滤后仍有大量监控、登录、鉴权、字典、配置类请求进入 LLM 输入。
- `filtered_requests` 中存在两条 `GetServiceOrderList`：
  - 一条 `soid=` 为空。
  - 一条 `soid=202604273400100002`，这是用户操作触发的关键查询。
- LLM 生成的 `evidence_request_urls` 选中了 `soid=` 为空的 URL，导致后续 `inputs` 和 `query_template` 没有纳入 `soid`。
- 当前 `ApiCaptureSpec` schema 只要求 `inputs`、`outputs`、`steps`、`response_mapping` 合法，没有要求模型保留“非空业务 query 参数”，也没有要求对被忽略参数写明原因。
- 当前 prompt 主要要求“从用户意图和 request query/body 推导输入字段”，但没有把“用户实际操作中的非空业务参数必须进入输入或明确进入排除清单”定义为硬约束。

**期望态（已与用户初步达成一致）**：

- 以用户实际操作为准生成接口规范；用户操作中出现的非空业务参数不能被 LLM 静默丢弃。
- Step 1 中用户填写的“节点名称”和“一句话描述”必须成为 LLM 判断业务意图的最高优先级输入；尤其“一句话描述”代表用户真正想实现的链路，而不是普通提示词。
- 对 `serviceforce.query_service_order_list`，`soid` 应被识别为工单号输入，例如 `work_order_no` 或 `soid`，并映射到 query 参数 `soid`。
- `_t`、时间戳、防缓存参数、鉴权 header/cookie/token 等不应成为用户输入；但必须有明确的过滤或排除理由。
- 对空筛选项不强行生成输入，但应像 `docs/api/sop1-network-capture.md` 一样保留“其余筛选项为空/可扩展”的文档信息。
- Prompt 侧不再承担静态资源、监控、登录、鉴权请求过滤的主要职责；这些应优先在过滤层完成。Prompt 只作为最后防线，要求模型忽略已漏入的非业务请求。
- LLM 输出不退回纯 Markdown；应输出 JSON 格式的结构化接口文档草稿，再由平台按需确定性转换 NodeDefinition。Markdown API 文档可作为后续展示产物，不作为 LLM 的唯一输出格式。

**分析与解决**：

`soid` 漏掉的直接原因不是转换器丢字段，而是 LLM 的 `ApiCaptureSpec` 草稿阶段已经没有生成该字段。更具体地说：

1. 输入噪声过多：`filtered_requests` 仍包含监控、登录、鉴权、配置、字典等请求，业务接口候选不够干净。
2. 关键证据选择错误：同一接口出现了空 `soid` 和非空 `soid` 两次，模型选中了空 `soid` 请求作为 evidence。
3. Prompt 约束不够硬：当前只说从 query/body 推导输入，没有明确要求“非空业务参数必须保留或解释排除”。
4. Schema 缺少可校验证据结构：`inputs` 与 observed query 参数之间没有确定性校验关系，因此 `soid` 被漏掉后仍能通过 `validateApiCaptureSpec()` 和 `validateNodeDefinition()`。
5. 当前 recording 中目标请求缺少 response body，模型只能基于 URL/query 推断输出，进一步增加了“泛化成通用列表查询”的概率。

现有过滤机制还不完善。当前 `filterCapturedRequests()` 主要过滤静态扩展、`heartbeat/polling/metrics/analytics/sockjs`，并脱敏敏感 header；但 `rec_1778654331293.json` 的 `filtered_requests` 仍保留了大量 `app-analysis-tdp.lenovo.com/up`、登录、验证码、鉴权、配置、字典等非目标业务请求。过滤层应优先把这些请求排除，再把少量疑似业务请求交给 LLM 判断。

建议将“接口文档总结”和“节点规范生成”统一为 JSON 结构化中间层，而不是让模型直接输出 Markdown 或最终 NodeDefinition。新 schema 可在 `ApiCaptureSpec` 基础上补充：

- `trigger_action`：用户触发页面操作，例如“在服务云工单列表按工单号查询”。
- `business_meaning`：该接口在本次操作中的业务含义。
- `selected_request`：选中的主证据请求，必须包含 method、url、status、query、body 摘要。
- `query_parameters`：逐项记录 query 参数、示例值、来源分类和处理决策。
- `ignored_parameters`：记录 `_t`、空筛选项、鉴权、系统参数等被忽略或不作为输入的原因。
- `optional_filters`：记录本次为空但属于业务筛选空间的参数，例如 `projectNO`、`rawNO`、`serviceTypeId`、`custName`、`custPhone`、`productSN`、`orderStatus`。
- `response_summary`：记录 response status 和 response body 摘要；如果抓包没有 response body，应明确标记 `missing_response_body=true`，不要伪造字段证据。
- `node_mapping`：从接口文档草稿到 NodeDefinition 的确定性映射，包括 inputs、outputs、query_template、response_mapping。

同步增加确定性校验：

- 非空业务 query/body 参数如果没有进入 `inputs` 或 `node_mapping.query_template`，且没有出现在 `ignored_parameters` 中，校验失败。
- evidence URL 不应优先选择空业务参数请求；同一路径多次出现时，优先选择与用户操作最相关、非空业务参数最多、状态成功且有 response body 的请求。
- `response_mapping` 如果依赖 response body，但录制数据没有 response body，应标记为低证据或待确认，不能当作完整可靠结论。

建议后的 JSON 输出大致分层：

```json
{
  "type_suggestion": "serviceforce.query_service_order_list",
  "name": "工单查询",
  "description": "按工单号查询服务云当前工单列表",
  "trigger_action": "用户在服务云工单列表页输入工单号并点击查询",
  "business_meaning": "在当前工单列表中按工单号查询工单",
  "selected_request": {
    "method": "GET",
    "url": "https://serviceforce.lenovo.com.cn/fieldserviceapi/api/ServiceOrder/GetServiceOrderList",
    "status": 200
  },
  "query_parameters": [
    {
      "name": "soid",
      "example": "202604273400100002",
      "meaning": "工单号",
      "decision": "input",
      "input_name": "work_order_no"
    }
  ],
  "ignored_parameters": [
    {
      "name": "_t",
      "reason": "时间戳/防缓存参数，不作为用户输入"
    }
  ],
  "optional_filters": ["projectNO", "rawNO", "serviceTypeId", "custName", "custPhone", "productSN", "orderStatus"],
  "response_summary": {
    "status": 200,
    "body_mapping_evidence": "missing_response_body"
  },
  "node_mapping": {
    "inputs": [],
    "outputs": [],
    "query_template": {}
  }
}
```

**to-issues**：

- [x] 新建问题专题，记录 `serviceforce.query_service_order_list` 漏掉 `soid` 的问题。
- [x] 明确该问题从问题 8 拆出：问题 8 解决的是 LLM trace 落盘和 NodeDefinition 转换链路；问题 9 关注 LLM 生成内容的业务正确性。
- [x] 梳理并加固过滤层规则：排除 analytics、monitor、login、captcha、auth、static、config、dictionary、privacy、permission、message center 等非目标业务请求，降低 LLM 输入噪声。
- [x] 增加候选请求排序规则：同一路径多次出现时，优先选择与用户描述匹配、非空业务参数最多、状态成功且有 response body 的请求。
- [x] 将 Step 1 的节点名称和一句话描述升级为 LLM prompt 的高优先级意图输入，明确“一句话描述”代表用户真正要实现的链路。
- [x] 迭代 `ApiCaptureSpec` schema，加入 `trigger_action`、`business_meaning`、`selected_request`、`query_parameters`、`ignored_parameters`、`optional_filters`、`response_summary`、`node_mapping`。
- [x] 迭代 prompt：要求输出 JSON 结构化接口文档草稿；以用户操作为准；非空业务参数必须保留或解释排除；空筛选项进入 `optional_filters` 而不是强行变成输入。
- [x] 增加确定性校验：非空业务 query/body 参数被静默遗漏时失败；`selected_request` 选择空业务参数版本时需要明确理由，否则失败。
- [x] 调整 `ApiCaptureSpec -> NodeDefinition` 转换：优先使用 `node_mapping` 生成 inputs、outputs、query_template、response_mapping。
- [x] 使用 `rec_1778654331293.json` 做断点验证，确认 `soid` 被识别为输入并映射到 `query_template.soid`。
- [x] 对比 `docs/api/sop1-network-capture.md` 的 Query 总结形式，确认 JSON 草稿能覆盖 method/path/query/request body/response status/response summary/鉴权排除/触发页面操作/业务含义推测。
- [x] 复盘测试策略：将 `soid/GetServiceOrderList` 专项排序单测改为中性 `businessId` 机制测试；`rec_1778654331293.json` 仅作为临时 regression fixture，不作为通用策略契约。
- [x] 拆分 LLM 提示词：`system prompt` 承载角色、规则、schema 和格式约束；`user prompt` 仅承载用户描述和抓包数据。

**bug记录**：

- 2026-05-13：用户指出 `serviceforce.query_service_order_list` 节点规范漏掉 `soid`，而端上实际操作就是按 `soid` 查询工单，该遗漏不可接受。
- 2026-05-13：对比 `docs/api/sop1-network-capture.md` 后确认，文档中的接口总结更符合用户操作，特别是 Query 表格、其余筛选项为空、业务含义推测和自动化建议。
- 2026-05-13：初步定位为 LLM 草稿生成和证据选择问题，不是 `ApiCaptureSpec -> NodeDefinition` 转换器单独导致。
- 2026-05-13：用户认可问题拆分方向，并确认后续方案应同时处理过滤层噪声、强化 Step 1 用户描述权重、将 prompt/schema 迭代为 JSON 结构化接口文档草稿，而不是纯 Markdown。
- 2026-05-13：已完成代码侧闭环：过滤层将 `rec_1778654331293.json` 从 180 条原始请求收敛到 3 条业务候选；同一路径候选中非空 `soid=202604273400100002` 的 `GetServiceOrderList` 排在空 `soid` 版本前；`ApiCaptureSpec` schema/prompt/转换器已支持结构化接口文档草稿和 `node_mapping`；校验会拒绝静默遗漏非空业务 query 参数或选择更弱证据请求。
- 2026-05-13：用户指出前一版单测和过滤存在“按当前 case 设计策略”的风险，尤其 `soid` 专项排序测试可能对其他 case 形成错误约束。已将核心单测改为中性业务参数样例，仅保留断点录制为临时 regression。
- 2026-05-13：用户要求拆分 LLM prompt。已调整为 system prompt 放规则/schema/格式约束，user prompt 只放用户描述和抓包数据；同时强化 `steps` 非空约束，避免模型在有业务请求时输出 `steps: []`。
- 2026-05-13：新增 bug：`data/recordings/rec_1778660251017.json` 运行报错 `Extracted API capture spec is invalid: steps must be a non-empty array`。该样本过滤后候选为 3 条业务请求，LLM 已生成 `selected_request`、`query_parameters` 和 `node_mapping`，但 `steps` 为空，定位为格式约束未稳定执行的问题，归入问题 9 跟踪。
- 2026-05-13：已通过 `npm run test:llm-recorder` 和 `npm run typecheck`；单测覆盖 prompt 分层、通用非空业务参数排序、`node_mapping.query_template` 映射、空业务参数证据选择失败，以及 `rec_1778654331293.json` 临时 regression。

**用户验收状态**：待用户验证。
