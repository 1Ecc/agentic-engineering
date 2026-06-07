import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ApiCaptureSpec, LLMAdapter } from "../../packages/llm-orchestrator/src/index.js";
import {
  apiCaptureSpecToNodeDefinition,
  buildNodeExtractSystemPrompt,
  buildNodeExtractUserPrompt,
  createLLMAdapter,
  validateApiCaptureSpec,
  validateNodeDefinition,
} from "../../packages/llm-orchestrator/src/index.js";
import {
  filterCapturedRequests,
  finishRecording,
  chooseRecordingPage,
  getConvertedNodeFromRecording,
  getRecordingStatus,
  parseCapturedRequestsFromMcpText,
  registerNode,
  startRecording,
  type RecorderDriver,
} from "../../packages/node-recorder/src/index.js";
import { createHandlerForDefinition } from "../../packages/workflow-runner/src/index.js";

assert.throws(() => createLLMAdapter("local"), /Unsupported LLM_PROVIDER/);

const systemPrompt = buildNodeExtractSystemPrompt();
const userPrompt = buildNodeExtractUserPrompt({ description: "库存查询", capturedRequests: [] });
assert.match(systemPrompt, /严禁输出 auth/);
assert.match(systemPrompt, /ApiCaptureSpec/);
assert.match(systemPrompt, /outputs 必须按用户一句话描述收敛/);
assert.match(systemPrompt, /item_mapping/);
assert.match(systemPrompt, /Step 1/);
assert.match(systemPrompt, /非空业务 query\/body 参数必须进入 inputs/);
assert.match(systemPrompt, /最短必要执行链路/);
assert.match(systemPrompt, /不要放 soid_list/);
assert.match(systemPrompt, /time\.today\(\)/);
assert.match(systemPrompt, /time\.add/);
assert.doesNotMatch(systemPrompt, /"node_mapping"/);
assert.doesNotMatch(systemPrompt, /用户描述：/);
assert.match(userPrompt, /用户描述：\n库存查询/);
assert.match(userPrompt, /抓包数据：/);

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const filtered = filterCapturedRequests([
  {
    method: "GET",
    url: "https://example.test/logo.png",
    headers: { cookie: "secret" },
  },
  {
    method: "POST",
    url: "https://example.test/api/query",
    headers: { authorization: "secret", "content-type": "application/json" },
    requestBody: { sku: "SKU-1" },
  },
  {
    method: "POST",
    url: "https://analytics.example.test/collect",
  },
  {
    method: "POST",
    url: "https://analysis.example.test/up",
  },
  {
    method: "GET",
    url: "https://example.test/api/login",
  },
]);
assert.equal(filtered.length, 1);
assert.deepEqual(filtered[0].headers, { "content-type": "application/json" });

const duplicatedBusinessRequests = filterCapturedRequests([
  {
    method: "GET",
    url: "https://example.test/api/search?businessId=&pageIndex=1&_t=1",
    status: 200,
  },
  {
    method: "GET",
    url: "https://example.test/api/search?businessId=BIZ-001&pageIndex=1&_t=2",
    status: 200,
  },
]);
assert.match(duplicatedBusinessRequests[0].url, /businessId=BIZ-001/);

const telemetryPayload = Buffer.from(
  JSON.stringify({
    xcontext: {
      method: "GET",
      fullPathName: "/fieldservicejapi/customerOrder/list?soId=202604273400100002&_t=1778723130538",
      status: "200",
      response: JSON.stringify({ data: [{ orderNo: "RETAIL20260430000023" }] }),
    },
  }),
).toString("base64");
const telemetryIgnoredRequests = filterCapturedRequests([
  {
    method: "GET",
    url: "https://serviceforce.lenovo.com.cn/fieldservicejapi/customerOrder/list?soId=202604273400100002&_t=1778723130538",
    status: 200,
  },
  {
    method: "POST",
    url: `https://app-analysis-tdp.lenovo.com/up?data=${encodeURIComponent(telemetryPayload)}`,
    status: 200,
  },
]);
assert.equal(telemetryIgnoredRequests.length, 1);
assert.equal(telemetryIgnoredRequests[0].responseBody, undefined);

// Temporary regression fixture for issue 9; keep generic tests above as the durable behavior contract.
const breakpointRecordingPath = path.resolve("data/recordings/rec_1778654331293.json");
if (await pathExists(breakpointRecordingPath)) {
  const breakpointRecording = JSON.parse(await readFile(breakpointRecordingPath, "utf-8")) as {
    requests: Array<{ method: string; url: string; status?: number }>;
  };
  const breakpointFiltered = filterCapturedRequests(breakpointRecording.requests);
  const breakpointServiceOrders = breakpointFiltered.filter((request) => /GetServiceOrderList/i.test(request.url));
  assert.equal(breakpointServiceOrders.length, 2);
  assert.match(breakpointServiceOrders[0].url, /soid=202604273400100002/);
}

if (await pathExists(path.resolve("data/recordings/rec_1778664090416.json"))) {
  const issue10Node = await getConvertedNodeFromRecording("rec_1778664090416", { dataDir: path.resolve("data") });
  assert.equal(issue10Node.type, "serviceforce.query_customer_order");
  assert.equal(issue10Node.handler.kind, "recorded_http_flow");

  const issue10Fetches: Array<{ url: string; headers?: Record<string, string> }> = [];
  const fakeServiceforceContext = {
    async newPage() {
      return {
        async goto() {
          return undefined;
        },
        async waitForTimeout() {
          return undefined;
        },
        async evaluate() {
          return "CUBE-TOKEN-1";
        },
        async close() {
          return undefined;
        },
      };
    },
    request: {
      async fetch(url: string, options?: { headers?: Record<string, string> }) {
        issue10Fetches.push({ url, headers: options?.headers });
        const body = url.includes("/customerOrder/list")
          ? { data: [{ orderNo: "JQ-ORDER-001" }] }
          : { data: [{ soid: "202604273400100002" }] };
        return {
          status: () => 200,
          ok: () => true,
          headers: () => ({ "content-type": "application/json" }),
          text: async () => JSON.stringify(body),
        };
      },
    },
  };
  const issue10Result = await createHandlerForDefinition(issue10Node).run(
    { service_order_id: "202604273400100002" },
    { inputs: {}, nodes: {}, browserContext: fakeServiceforceContext },
    issue10Node,
  );
  assert.deepEqual(issue10Result, { jiuqiu_order_no: "JQ-ORDER-001" });
  assert.match(issue10Fetches[0].url, /GetServiceOrderList/);
  assert.match(issue10Fetches[0].url, /soid=202604273400100002/);
  assert.match(issue10Fetches[1].url, /customerOrder\/list/);
  assert.match(issue10Fetches[1].url, /soId=202604273400100002/);
  assert.equal(issue10Fetches[0].headers?.authapitoken, "CUBE-TOKEN-1");
  assert.equal(issue10Fetches[0].headers?.app_namespace, "fieldservicefe");

  const expiredServiceforceContext = {
    async newPage() {
      return {
        async goto() {
          return undefined;
        },
        async waitForTimeout() {
          return undefined;
        },
        async evaluate() {
          return "EXPIRED-CUBE-TOKEN";
        },
        async close() {
          return undefined;
        },
      };
    },
    request: {
      async fetch() {
        return {
          status: () => 200,
          ok: () => true,
          headers: () => ({ "content-type": "application/json" }),
          text: async () => JSON.stringify({ data: { code: 401, msg: "token失效" } }),
        };
      },
    },
  };
  await assert.rejects(
    () =>
      createHandlerForDefinition(issue10Node).run(
        { service_order_id: "202604273400100002" },
        { inputs: {}, nodes: {}, browserContext: expiredServiceforceContext },
        issue10Node,
      ),
    /登录态已失效/,
  );

  const missingServiceforceAuthContext = {
    async newPage() {
      return {
        async goto() {
          return undefined;
        },
        async waitForTimeout() {
          return undefined;
        },
        async evaluate() {
          return null;
        },
        async close() {
          return undefined;
        },
      };
    },
    request: {
      async fetch() {
        throw new Error("should not request business API without auth state");
      },
    },
  };
  await assert.rejects(
    () =>
      createHandlerForDefinition(issue10Node).run(
        { service_order_id: "202604273400100002" },
        { inputs: {}, nodes: {}, browserContext: missingServiceforceAuthContext },
        issue10Node,
      ),
    /登录态未保存或已失效/,
  );
}

const mcpNetworkText = [
  "## Network requests",
  "Showing 1-3 of 3 (Page 1 of 1).",
  "reqid=1 GET https://serviceforce.lenovo.com.cn/#/home-page [200]",
  "reqid=2 GET https://serviceforce.lenovo.com.cn/fieldserviceapi/api/ServiceOrder/GetServiceOrderList?soid=202604273400100002&_t=1778649923566 [200]",
  "reqid=3 GET https://serviceforce.lenovo.com.cn/fieldserviceapi/api/ServiceOrderHis/GetServiceOrderHisList?soid=202604273400100002&_t=1778649925203 [200]",
].join("\n");
const parsedMcpRequests = parseCapturedRequestsFromMcpText(mcpNetworkText);
assert.equal(parsedMcpRequests.length, 3);
assert.equal(parsedMcpRequests[1].method, "GET");
assert.match(parsedMcpRequests[1].url, /GetServiceOrderList/);
assert.equal(parsedMcpRequests[1].status, 200);

assert.equal(
  chooseRecordingPage(
    [
      { pageId: 1, url: "https://serviceforce.lenovo.com.cn/#/home-page" },
      { pageId: 2, url: "https://spos.lenovo.com.cn/", selected: true },
    ],
    1,
  )?.pageId,
  2,
);
assert.equal(
  chooseRecordingPage(
    [
      { pageId: 2, url: "https://sdi.lenovo.com.cn/" },
      { pageId: 3, url: "https://spos.lenovo.com.cn/" },
    ],
    1,
  )?.pageId,
  3,
);
assert.equal(
  chooseRecordingPage(
    [
      { pageId: 1, url: "https://serviceforce.lenovo.com.cn/#/home-page", selected: true },
      { pageId: 2, url: "https://spos.lenovo.com.cn/" },
    ],
    1,
    new Map([
      [1, { requestCount: 100, businessRequestCount: 0 }],
      [2, { requestCount: 8, businessRequestCount: 2 }],
    ]),
  )?.pageId,
  2,
);

const tempDir = await mkdtemp(path.join(os.tmpdir(), "ces-recorder-"));
const fakeApiSpec: ApiCaptureSpec = {
  type_suggestion: "lenovo_stock.query",
  name: "库存查询",
  description: "根据 SKU 查询库存",
  trigger_action: "用户输入 SKU 并点击查询库存",
  business_meaning: "按 SKU 查询库存",
  selected_request: {
    method: "POST",
    url: "https://example.test/stock",
    status: 200,
    query: {},
  },
  query_parameters: [],
  ignored_parameters: [],
  optional_filters: [],
  response_summary: {
    status: 200,
    missing_response_body: false,
    body_mapping_evidence: "response_body",
  },
  node_mapping: {
    inputs: [{ name: "sku", type: "string", required: true }],
    outputs: [
      { name: "stock_qty", type: "number" },
      { name: "warehouse_id", type: "string" },
    ],
    body_template: "{ \"sku\": \"{{ inputs.sku }}\" }",
    response_mapping: {
      stock_qty: "$.data[0].quantity",
      warehouse_id: "$.data[0].warehouseId",
    },
  },
  inputs: [{ name: "sku", type: "string", required: true }],
  outputs: [
    { name: "stock_qty", type: "number" },
    { name: "warehouse_id", type: "string" },
  ],
  steps: [
    {
      id: "query_stock",
      method: "POST",
      url_template: "https://example.test/stock",
      body_template: "{ \"sku\": \"{{ inputs.sku }}\" }",
      response_mapping: {
        stock_qty: "$.data[0].quantity",
        warehouse_id: "$.data[0].warehouseId",
      },
    },
  ],
};

const queryBusinessEntitySpec: ApiCaptureSpec = {
  type_suggestion: "example.query_business_entity",
  name: "业务对象查询",
  description: "按业务标识查询对象列表",
  platform: "example",
  platform_label: "示例平台",
  trigger_action: "用户在列表页输入业务标识并点击查询",
  business_meaning: "在当前列表中按业务标识查询对象",
  selected_request: {
    method: "GET",
    url: "https://example.test/api/search?businessId=BIZ-001&pageIndex=1&pageSize=10&_t=2",
    status: 200,
    query: {
      businessId: "BIZ-001",
      pageIndex: "1",
      pageSize: "10",
      _t: "2",
    },
  },
  query_parameters: [
    {
      name: "businessId",
      example: "BIZ-001",
      meaning: "业务标识",
      source: "user_action",
      decision: "input",
      input_name: "business_id",
    },
    { name: "pageIndex", example: "1", meaning: "页码", source: "page_default", decision: "constant", reason: "分页默认值" },
    { name: "pageSize", example: "10", meaning: "每页数量", source: "page_default", decision: "constant", reason: "分页默认值" },
  ],
  ignored_parameters: [{ name: "_t", reason: "时间戳/防缓存参数，不作为用户输入" }],
  optional_filters: ["status", "owner", "startDate", "endDate"],
  response_summary: {
    status: 200,
    missing_response_body: true,
    body_mapping_evidence: "missing_response_body",
    summary: "录制数据缺少 response body，输出字段待确认",
  },
  node_mapping: {
    inputs: [{ name: "business_id", type: "string", label: "业务标识", required: true }],
    outputs: [{ name: "rows", type: "array", label: "对象列表" }],
    query_template: {
      businessId: "{{ inputs.business_id }}",
      pageIndex: "1",
      pageSize: "10",
    },
    response_mapping: {
      rows: "$.rows",
    },
  },
  inputs: [{ name: "business_id", type: "string", label: "业务标识", required: true }],
  outputs: [{ name: "rows", type: "array", label: "对象列表" }],
  steps: [
    {
      id: "query_business_entity",
      method: "GET",
      url_template: "https://example.test/api/search",
      query_template: {
        businessId: "{{ inputs.business_id }}",
        pageIndex: "1",
        pageSize: "10",
      },
      response_mapping: {
        rows: "$.rows",
      },
    },
  ],
};
const businessEntityValidation = validateApiCaptureSpec(queryBusinessEntitySpec, { capturedRequests: duplicatedBusinessRequests });
assert.equal(businessEntityValidation.valid, true, businessEntityValidation.errors.join("; "));
const businessEntityNode = apiCaptureSpecToNodeDefinition(queryBusinessEntitySpec);
assert.equal(businessEntityNode.handler.kind, "recorded_http");
assert.equal(businessEntityNode.inputs[0].name, "business_id");
assert.equal((businessEntityNode.handler.spec as { query_template?: Record<string, string> }).query_template?.businessId, "{{ inputs.business_id }}");

const invalidBusinessEntitySpec: ApiCaptureSpec = {
  ...queryBusinessEntitySpec,
  selected_request: {
    ...queryBusinessEntitySpec.selected_request,
    url: "https://example.test/api/search?businessId=&pageIndex=1&pageSize=10&_t=1",
    query: {
      businessId: "",
      pageIndex: "1",
      pageSize: "10",
      _t: "1",
    },
  },
};
const invalidBusinessEntityValidation = validateApiCaptureSpec(invalidBusinessEntitySpec, { capturedRequests: duplicatedBusinessRequests });
assert.equal(invalidBusinessEntityValidation.valid, false);
assert.match(invalidBusinessEntityValidation.errors.join("; "), /fewer non-empty business query parameters/);

const wildcardMappingSpec: ApiCaptureSpec = {
  ...queryBusinessEntitySpec,
  steps: [
    {
      ...queryBusinessEntitySpec.steps[0],
      response_mapping: {
        soid_list: "$.rows[*].soid",
      },
    },
  ],
};
const wildcardMappingValidation = validateApiCaptureSpec(wildcardMappingSpec);
assert.equal(wildcardMappingValidation.valid, false);
assert.match(wildcardMappingValidation.errors.join("; "), /wildcard JSONPath/);

const dynamicTimeSpec: ApiCaptureSpec = {
  ...queryBusinessEntitySpec,
  steps: [
    {
      ...queryBusinessEntitySpec.steps[0],
      body_template: "{\"createEndTime\":\"{{ time.today() }}\",\"createStartTime\":\"{{ time.add(time.today(), \\\"-P1Y\\\") }}\",\"businessId\":\"{{ inputs.business_id }}\"}",
    },
  ],
};
const dynamicTimeValidation = validateApiCaptureSpec(dynamicTimeSpec);
assert.equal(dynamicTimeValidation.valid, true, dynamicTimeValidation.errors.join("; "));
assert.equal(validateNodeDefinition(apiCaptureSpecToNodeDefinition(dynamicTimeSpec)).valid, true);

const unsupportedTimeSpec: ApiCaptureSpec = {
  ...queryBusinessEntitySpec,
  steps: [
    {
      ...queryBusinessEntitySpec.steps[0],
      body_template: "{\"createEndTime\":\"{{ $today }}\",\"createStartTime\":\"{{ $today - 1 year }}\",\"businessId\":\"{{ inputs.business_id }}\"}",
    },
  ],
};
const unsupportedTimeValidation = validateApiCaptureSpec(unsupportedTimeSpec);
assert.equal(unsupportedTimeValidation.valid, false);
assert.match(unsupportedTimeValidation.errors.join("; "), /unsupported template expression: \$today/);

const flowNode = apiCaptureSpecToNodeDefinition({
  ...fakeApiSpec,
  type_suggestion: "serviceforce.query_order_flow",
  steps: [
    {
      ...fakeApiSpec.steps[0],
      query_template: { sku: "{{ inputs.sku }}" },
    },
    {
      id: "query_order_detail",
      method: "GET",
      url_template: "https://example.test/order/{{ steps.query_stock.warehouse_id }}",
      depends_on: ["query_stock"],
      response_mapping: { order_id: "$.data.id" },
    },
  ],
  response_mapping: { order_id: "{{ steps.query_order_detail.order_id }}" },
});
assert.equal(flowNode.handler.kind, "recorded_http_flow");
assert.equal(validateNodeDefinition(flowNode).valid, true);
assert.equal(
  (flowNode.handler.spec as { steps: Array<{ query_template?: Record<string, string> }> }).steps[0].query_template?.sku,
  "{{ inputs.sku }}",
);

const projectedArraySpec: ApiCaptureSpec = {
  ...fakeApiSpec,
  type_suggestion: "example.query_order_detail",
  name: "订单详情查询",
  description: "提取订单状态、服务产品信息的PGI、S4订单号及PGI抛送sscm成功时间",
  platform: "example",
  platform_label: "示例平台",
  selected_request: {
    method: "GET",
    url: "https://example.test/order/detail/1",
    status: 200,
    query: {},
  },
  node_mapping: undefined,
  inputs: [],
  outputs: [
    { name: "order_status", type: "string", label: "订单状态" },
    { name: "service_products", type: "array", label: "服务产品信息" },
  ],
  steps: [
    {
      id: "query_order_detail",
      method: "GET",
      url_template: "https://example.test/order/detail/1",
      response_mapping: {
        order_status: "$.data.order.orderStatusName",
        service_products: {
          path: "$.data.orderItem",
          item_mapping: {
            material_no: "materialNo",
            pgi: "pgi",
            s4_order_no: "so",
            pgi_to_sscm_success_time: "s4ToSscmTime",
          },
        },
      },
    },
  ],
};
const projectedArrayValidation = validateApiCaptureSpec(projectedArraySpec);
assert.equal(projectedArrayValidation.valid, true, projectedArrayValidation.errors.join("; "));
const projectedArrayNode = apiCaptureSpecToNodeDefinition(projectedArraySpec);
const projectedArrayResult = await createHandlerForDefinition(projectedArrayNode).run(
  {},
  {
    inputs: {},
    nodes: {},
    browserContext: {
      request: {
        async fetch() {
          return {
            status: () => 200,
            ok: () => true,
            headers: () => ({ "content-type": "application/json" }),
            text: async () =>
              JSON.stringify({
                data: {
                  order: { orderStatusName: "已成交", orderAmount: 907 },
                  orderItem: [
                    {
                      materialNo: "5CB1C93000",
                      dealPrice: 807,
                      so: "E013891958",
                      pgi: "6906458020",
                      s4ToSscmTime: "2026-05-09 10:24:56",
                    },
                  ],
                },
              }),
          };
        },
      },
    },
  },
  projectedArrayNode,
);
assert.deepEqual(projectedArrayResult, {
  order_status: "已成交",
  service_products: [
    {
      material_no: "5CB1C93000",
      pgi: "6906458020",
      s4_order_no: "E013891958",
      pgi_to_sscm_success_time: "2026-05-09 10:24:56",
    },
  ],
});

const fakeLlm: LLMAdapter = {
  async *generateWorkflow() {
    throw new Error("not used");
  },
  async extractApiCaptureSpec() {
    return {
      apiSpec: fakeApiSpec,
      trace: {
        provider: "fake",
        model: "fake-model",
        prompt_messages: [
          { role: "system", content: "system" },
          { role: "user", content: "authorization: secret cookie=secret" },
        ],
        raw_output: '{"token":"secret","password":"secret"}',
        parsed_output: fakeApiSpec,
        validation: { valid: true, errors: [] },
        created_at: new Date().toISOString(),
      },
    };
  },
};

const fakeMcp: RecorderDriver = {
  async startSession() {
    return { browserId: "browser-1", pageId: 1, startedAt: new Date().toISOString(), status: "recording" };
  },
  async getStatus() {
    const requests = await this.listCapturedRequests({ recordingId: "rec" });
    return {
      browserId: "browser-1",
      pageId: 1,
      startedAt: new Date().toISOString(),
      status: "recording",
      requestCount: requests.length,
      recentRequests: requests,
    };
  },
  async listCapturedRequests() {
    return [
      {
        method: "POST",
        url: "https://example.test/api/query",
        headers: { "content-type": "application/json" },
        requestBody: { sku: "SKU-1" },
        responseBody: { data: [{ quantity: 24, warehouseId: "WH-01" }] },
      },
    ];
  },
  async cleanupSession() {
    return undefined;
  },
};

try {
  await mkdir(path.join(tempDir, "recordings"), { recursive: true });
  await mkdir(path.join(tempDir, "nodes"), { recursive: true });

  await assert.rejects(() => startRecording({ dataDir: tempDir, mcpEnabled: false }), /MCP_ENABLED must be true/);

  const session = await startRecording({}, { dataDir: tempDir, mcpEnabled: true, mcp: fakeMcp });
  assert.equal(session.mode, "mcp");
  assert.equal(session.request_count, 0);
  assert.equal(session.page_id, 1);

  const status = await getRecordingStatus(session.recording_id, { dataDir: tempDir, mcp: fakeMcp });
  assert.equal(status.request_count, 1);
  assert.equal(status.recent_requests?.length, 1);

  const node = await finishRecording(
    { recording_id: session.recording_id, name: "库存查询", description: "根据 SKU 查询库存" },
    { dataDir: tempDir, mcpEnabled: true, mcp: fakeMcp, llm: fakeLlm },
  );
  assert.equal(node.type, "lenovo_stock.query");
  assert.equal(node.handler.kind, "recorded_http");
  const recordingRaw = await readFile(path.join(tempDir, "recordings", `${session.recording_id}.json`), "utf-8");
  assert.match(recordingRaw, /"llm_trace"/);
  assert.doesNotMatch(recordingRaw, /authorization: secret/);
  assert.doesNotMatch(recordingRaw, /"token": "secret"/);

  const saved = await registerNode(node, { dataDir: tempDir });
  assert.equal(saved.type, "lenovo_stock.query");
  const raw = await readFile(saved.path, "utf-8");
  assert.match(raw, /"visibility": "private"/);

  await writeFile(
    path.join(tempDir, "recordings", "empty.json"),
    JSON.stringify({ id: "empty", captured_at: new Date().toISOString(), requests: [] }),
    "utf-8",
  );
  await assert.rejects(
    () => finishRecording({ recording_id: "empty", description: "empty" }, { dataDir: tempDir, llm: fakeLlm }),
    /No business API requests were captured/,
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("llm-recorder tests passed");
