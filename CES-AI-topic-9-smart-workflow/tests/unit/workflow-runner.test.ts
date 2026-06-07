import assert from "node:assert/strict";
import {
  createRecordedHttpFlowHandler,
  createRecordedHttpHandler,
  createComposeHandler,
  createFirstMatchRulesHandler,
  createMailDraftHandler,
  createRulesHandler,
  interpolateTemplate,
  interpolateValue,
  NodeRegistry,
  parseWorkflow,
  runWorkflow,
  validateExecutableWorkflow,
} from "../../packages/workflow-runner/src/index.js";
import type { NodeDefinition } from "../../packages/shared/src/index.js";

const interpolation = interpolateValue(
  {
    direct: "$inputs.work_order_no",
    nested: "$n1.value",
    template: "工单 {{ inputs.work_order_no }} -> {{ $n1.value }}",
  },
  { inputs: { work_order_no: "WO-1" }, nodes: { n1: { value: "OK" } } },
);
assert.deepEqual(interpolation, {
  direct: "WO-1",
  nested: "OK",
  template: "工单 WO-1 -> OK",
});

const indexedInterpolation = interpolateValue(
  {
    pgi: "$jq_detail.service_products[0].pgi",
    btcp: "{{ $spos_info.order_items[0].bctp_order_no }}",
  },
  {
    inputs: {},
    nodes: {
      jq_detail: { service_products: [{ pgi: "PGI-1" }] },
      spos_info: { order_items: [{ bctp_order_no: "BTCP-1" }] },
    },
  },
);
assert.deepEqual(indexedInterpolation, { pgi: "PGI-1", btcp: "BTCP-1" });

const timeInterpolation = interpolateValue(
  {
    end: "{{ time.today() }}",
    start: "{{ time.add(time.today(), \"-P1Y\") }}",
    timestamp: "{{ time.format(time.now(), \"YYYY-MM-DD HH:mm:ss\") }}",
  },
  { inputs: {}, nodes: {}, now: new Date(2026, 4, 14, 15, 30, 5) },
);
assert.deepEqual(timeInterpolation, {
  end: "2026-05-14",
  start: "2025-05-14",
  timestamp: "2026-05-14 15:30:05",
});
assert.throws(
  () => interpolateTemplate("{{ $today }}", { inputs: {}, nodes: {} }, { strict: true }),
  /Unsupported or unresolved template expression: \$today/,
);

const registry = new NodeRegistry();
const passDef: NodeDefinition = {
  type: "test.pass",
  category: "builtin",
  name: "通过节点",
  description: "用于验证真实 handler 注册",
  inputs: [{ name: "text", type: "string" }],
  outputs: [{ name: "text", type: "string" }],
  handler: { kind: "builtin" },
};
registry.register(passDef, {
  async run(inputs) {
    return { text: String(inputs.text ?? "") };
  },
});
const rulesDef: NodeDefinition = {
  type: "rules.evaluate",
  category: "builtin",
  name: "规则判断",
  description: "用于验证条件判断",
  inputs: [
    { name: "facts", type: "object" },
    { name: "expression", type: "string", required: true },
  ],
  outputs: [
    { name: "passed", type: "boolean" },
    { name: "reason", type: "string" },
    { name: "evaluated", type: "array" },
  ],
  handler: { kind: "builtin" },
};
registry.register(rulesDef, createRulesHandler());
const firstMatchDef: NodeDefinition = {
  type: "rules.first_match",
  category: "builtin",
  name: "优先级规则路由",
  description: "用于验证 first-match 规则",
  inputs: [
    { name: "facts", type: "object", required: true },
    { name: "rules", type: "array", required: true },
  ],
  outputs: [
    { name: "matched", type: "boolean" },
    { name: "rule_id", type: "string" },
    { name: "name", type: "string" },
    { name: "reason", type: "string" },
    { name: "action", type: "object" },
    { name: "evaluated", type: "array" },
  ],
  handler: { kind: "builtin" },
};
registry.register(firstMatchDef, createFirstMatchRulesHandler());
const composeDef: NodeDefinition = {
  type: "data.compose",
  category: "builtin",
  name: "结构化组装",
  description: "用于验证结构化组装",
  inputs: [{ name: "value", type: "object", required: true }],
  outputs: [{ name: "value", type: "object" }],
  handler: { kind: "builtin" },
};
registry.register(composeDef, createComposeHandler());
const mailDef: NodeDefinition = {
  type: "mail.draft",
  category: "builtin",
  name: "邮件草稿",
  description: "用于验证邮件草稿生成",
  inputs: [
    { name: "to", type: "array", required: true },
    { name: "cc", type: "array" },
    { name: "subject", type: "string", required: true },
    { name: "template", type: "text", required: true },
  ],
  outputs: [{ name: "draft", type: "object" }],
  handler: { kind: "builtin" },
};
registry.register(mailDef, createMailDraftHandler());

const detailDef: NodeDefinition = {
  type: "test.detail",
  category: "builtin",
  name: "详情节点",
  description: "用于验证数组输出引用",
  inputs: [],
  outputs: [{ name: "service_products", type: "array" }],
  handler: { kind: "builtin" },
};
registry.register(detailDef, {
  async run() {
    return { service_products: [{ pgi: "PGI-1", pgi_sscm_time: "" }] };
  },
});
const invoiceDef: NodeDefinition = {
  type: "test.invoice",
  category: "builtin",
  name: "发票节点",
  description: "用于验证数组输出引用",
  inputs: [],
  outputs: [{ name: "order_items", type: "array" }],
  handler: { kind: "builtin" },
};
registry.register(invoiceDef, {
  async run() {
    return { order_items: [{ bctp_order_no: "BTCP-1", invoice_status: "待开票" }] };
  },
});

const run = await runWorkflow(
  {
    id: "wf_pass",
    name: "通过流程",
    inputs: [{ name: "text", type: "string" }],
    nodes: [{ id: "n1", type: "test.pass", inputs: { text: "$inputs.text" } }],
  },
  { registry, inputs: { text: "OK" }, persist: false },
);
assert.equal(run.status, "success");
assert.deepEqual(run.result, { n1: { text: "OK" } });

const yamlWorkflow = parseWorkflow(`
id: wf_rule_yaml
name: 规则 YAML 流程
inputs: []
nodes:
  - id: rule
    type: rules.evaluate
    inputs:
      facts:
        status: 3
        items: []
      expression: status == 3 && empty(items)
  - id: gated
    type: test.pass
    when: $rule.passed
    inputs:
      text: ok
outputs:
  passed: $rule.passed
  gated_text: $gated.text
`);
const yamlValidation = validateExecutableWorkflow(yamlWorkflow, registry);
assert.equal(yamlValidation.valid, true, yamlValidation.errors.join("; "));
const yamlRun = await runWorkflow(yamlWorkflow, { registry, inputs: {}, persist: false });
assert.equal(yamlRun.status, "success");
assert.deepEqual(yamlRun.result, { passed: true, gated_text: "ok" });

const indexedWorkflow = parseWorkflow(`
id: wf_indexed_refs
name: 数组引用流程
inputs: []
nodes:
  - id: jq_detail
    type: test.detail
  - id: spos_info
    type: test.invoice
  - id: rule
    type: rules.evaluate
    inputs:
      facts:
        pgi: $jq_detail.service_products[0].pgi
        btcp_order_no: $spos_info.order_items[0].bctp_order_no
      expression: notEmpty(pgi) && notEmpty(btcp_order_no)
outputs:
  pgi: $jq_detail.service_products[0].pgi
  btcp_order_no: $spos_info.order_items[0].bctp_order_no
  passed: $rule.passed
`);
const indexedValidation = validateExecutableWorkflow(indexedWorkflow, registry);
assert.equal(indexedValidation.valid, true, indexedValidation.errors.join("; "));
const indexedRun = await runWorkflow(indexedWorkflow, { registry, inputs: {}, persist: false });
assert.deepEqual(indexedRun.result, { pgi: "PGI-1", btcp_order_no: "BTCP-1", passed: true });

const composeRouteWorkflow = parseWorkflow(`
id: wf_compose_route
name: 结构化表单与优先级规则
inputs:
  - name: work_order_no
    type: string
nodes:
  - id: sf_query
    type: test.pass
    inputs:
      text: JQ-1
  - id: jq_detail
    type: test.detail
    dependsOn: [sf_query]
  - id: spos_info
    type: test.invoice
    dependsOn: [sf_query]
  - id: order_form
    type: data.compose
    dependsOn: [jq_detail, spos_info]
    inputs:
      value:
        work_order_no: $inputs.work_order_no
        jiuqiu_order_no: $sf_query.text
        order_status: 已完成
        pgi: $jq_detail.service_products[0].pgi
        pgi_sscm_time: $jq_detail.service_products[0].pgi_sscm_time
        order_items: $spos_info.order_items
  - id: route
    type: rules.first_match
    dependsOn: [order_form]
    inputs:
      facts: $order_form
      rules:
        - id: R3
          name: BTCP 信息缺失
          expression: order_status == "已完成" && empty(order_items) || empty(pgi)
          action:
            type: none
        - id: R4
          name: PGI 未推送到 sscm
          expression: order_status == "已完成" && empty(pgi_sscm_time)
          action:
            type: mail.draft
            to:
              - yangyn12@lenovo.com
            subject: PGI 推送失败原因确认
outputs:
  form_order: $order_form.jiuqiu_order_no
  rule_id: $route.rule_id
  action_type: $route.action.type
  action_to: $route.action.to[0]
`);
const composeRouteValidation = validateExecutableWorkflow(composeRouteWorkflow, registry);
assert.equal(composeRouteValidation.valid, true, composeRouteValidation.errors.join("; "));
const composeRouteRun = await runWorkflow(composeRouteWorkflow, { registry, inputs: { work_order_no: "WO-1" }, persist: false });
assert.deepEqual(composeRouteRun.result, {
  form_order: "JQ-1",
  rule_id: "R4",
  action_type: "mail.draft",
  action_to: "yangyn12@lenovo.com",
});
const startedBatches = composeRouteRun.logs?.filter((log) => log.event === "node_started").map((log) => [log.node_id, (log.data as { batch?: number }).batch]);
assert.deepEqual(startedBatches, [
  ["sf_query", 1],
  ["jq_detail", 2],
  ["spos_info", 2],
  ["order_form", 3],
  ["route", 4],
]);

const indexedRuleMailWorkflow = parseWorkflow(`
id: wf_indexed_rule_mail
name: 优先级规则邮件草稿验证
inputs:
  - name: work_order_no
    type: string
nodes:
  - id: order_form
    type: data.compose
    inputs:
      value:
        work_order_no: $inputs.work_order_no
        order_status: 已完成
        service_products:
          - pgi: PGI-1
            pgi_push_sscm_time: ""
        order_items:
          - btcp_order_no: BTCP-1
            invoice_status: 待开票
  - id: route
    type: rules.first_match
    dependsOn: [order_form]
    inputs:
      facts: $order_form
      rules:
        - id: R3
          name: BTCP 信息缺失
          expression: order_status == "已完成" && empty(order_items[0].btcp_order_no)
          action:
            type: mail.draft
            need_email: true
            to:
              - btcp@example.com
            subject: BTCP 推送确认
            template: |
              工单号：{{ inputs.work_order_no }}
              BTCP 单号缺失
        - id: R4
          name: PGI 未推送到 SSCM
          expression: order_status == "已完成" && empty(service_products[0].pgi_push_sscm_time)
          action:
            type: mail.draft
            need_email: true
            to:
              - pgi@example.com
            cc:
              - owner@example.com
            subject: PGI 推送失败原因确认
            template: |
              工单号：{{ inputs.work_order_no }}
              BTCP 单号：{{ $order_form.order_items[0].btcp_order_no }}
              PGI 未推送到 SSCM
  - id: mail_followup
    type: mail.draft
    dependsOn: [route]
    when: $route.action.need_email
    inputs:
      to: $route.action.to
      cc: $route.action.cc
      subject: $route.action.subject
      template: $route.action.template
outputs:
  rule_id: $route.rule_id
  draft_to: $mail_followup.draft.to[0]
  draft_cc: $mail_followup.draft.cc[0]
  draft_subject: $mail_followup.draft.subject
  draft_body: $mail_followup.draft.body
`);
const indexedRuleMailValidation = validateExecutableWorkflow(indexedRuleMailWorkflow, registry);
assert.equal(indexedRuleMailValidation.valid, true, indexedRuleMailValidation.errors.join("; "));
const indexedRuleMailRun = await runWorkflow(indexedRuleMailWorkflow, {
  registry,
  inputs: { work_order_no: "WO-1" },
  persist: false,
});
assert.deepEqual(indexedRuleMailRun.result, {
  rule_id: "R4",
  draft_to: "pgi@example.com",
  draft_cc: "owner@example.com",
  draft_subject: "PGI 推送失败原因确认",
  draft_body: "工单号：WO-1\nBTCP 单号：BTCP-1\nPGI 未推送到 SSCM",
});

const skippedRun = await runWorkflow(
  {
    ...yamlWorkflow,
    id: "wf_skipped",
    nodes: [
      { id: "rule", type: "rules.evaluate", inputs: { facts: { items: [] }, expression: "notEmpty(items)" } },
      { id: "gated", type: "test.pass", when: "$rule.passed", inputs: { text: "ok" } },
    ],
  },
  { registry, inputs: {}, persist: false },
);
assert.equal(skippedRun.logs?.some((log) => log.event === "node_skipped" && log.node_id === "gated"), true);
assert.deepEqual(skippedRun.result, { passed: false, gated_text: undefined });

const invalidValidation = validateExecutableWorkflow(
  {
    id: "wf_invalid",
    name: "错误流程",
    inputs: [{ name: "text", type: "string" }],
    nodes: [{ id: "n1", type: "test.pass", inputs: { wrong: "$inputs.text" } }],
  },
  registry,
);
assert.equal(invalidValidation.valid, false);
assert.match(invalidValidation.errors.join("; "), /Missing required input "text"|Input "wrong" is not defined/);

const errorRegistry = new NodeRegistry();
const failingDef: NodeDefinition = {
  type: "test.fail",
  category: "builtin",
  name: "失败节点",
  description: "用于验证错误处理",
  inputs: [],
  outputs: [],
  handler: { kind: "builtin" },
};
errorRegistry.register(failingDef, {
  async run() {
    throw new Error("expected failure");
  },
});
await assert.rejects(
  () =>
    runWorkflow(
      {
        id: "wf_fail",
        name: "失败流程",
        inputs: [],
        nodes: [{ id: "n1", type: "test.fail" }],
      },
      { registry: errorRegistry, inputs: {}, persist: false },
    ),
  /expected failure/,
);

const fetchedUrls: string[] = [];
const fakeBrowserContext = {
  request: {
    async fetch(url: string) {
      fetchedUrls.push(url);
      return {
        status: () => 200,
        ok: () => true,
        headers: () => ({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ data: [{ quantity: 24, warehouseId: "WH-01" }] }),
      };
    },
  },
};
const recordedDef: NodeDefinition = {
  type: "lenovo_stock.query",
  category: "recorded",
  name: "库存查询",
  description: "根据 SKU 查询库存",
  inputs: [{ name: "sku", type: "string", required: true }],
  outputs: [
    { name: "stock_qty", type: "number" },
    { name: "warehouse_id", type: "string" },
  ],
  handler: {
    kind: "recorded_http",
    spec: {
      method: "POST",
      url_template: "https://example.test/{{ inputs.sku }}",
      query_template: { warehouse: "{{ inputs.warehouse }}" },
      body_template: "{ \"sku\": \"{{ inputs.sku }}\" }",
      response_mapping: {
        stock_qty: "$.data[0].quantity",
        warehouse_id: "$.data[0].warehouseId",
      },
    },
  },
};
const recordedResult = await createRecordedHttpHandler().run(
  { sku: "SKU-1", warehouse: "WH-01" },
  { inputs: {}, nodes: {}, browserContext: fakeBrowserContext },
  recordedDef,
);
assert.deepEqual(recordedResult, { stock_qty: 24, warehouse_id: "WH-01" });
assert.equal(fetchedUrls.at(-1), "https://example.test/SKU-1?warehouse=WH-01");

const fetchedBodies: unknown[] = [];
const fakeTimeContext = {
  request: {
    async fetch(_url: string, options?: { data?: unknown }) {
      fetchedBodies.push(options?.data);
      return {
        status: () => 200,
        ok: () => true,
        headers: () => ({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ data: [{ status: "OK" }] }),
      };
    },
  },
};
const timeRecordedDef: NodeDefinition = {
  type: "spos.query",
  category: "recorded",
  name: "SPOS 查询",
  description: "验证时间模板",
  inputs: [{ name: "plat_order_code", type: "string", required: true }],
  outputs: [{ name: "status", type: "string" }],
  handler: {
    kind: "recorded_http",
    spec: {
      method: "POST",
      url_template: "https://example.test/spos",
      body_template: "{\"createEndTime\":\"{{ time.today() }}\",\"createStartTime\":\"{{ time.add(time.today(), \\\"-P1Y\\\") }}\",\"platOrderCode\":\"{{ inputs.plat_order_code }}\"}",
      response_mapping: { status: "$.data[0].status" },
    },
  },
};
const timeRecordedResult = await createRecordedHttpHandler().run(
  { plat_order_code: "RETAIL20260430000023" },
  { inputs: {}, nodes: {}, now: new Date(2026, 4, 14, 15, 30, 5), browserContext: fakeTimeContext },
  timeRecordedDef,
);
assert.deepEqual(timeRecordedResult, { status: "OK" });
assert.deepEqual(fetchedBodies.at(-1), {
  createEndTime: "2026-05-14",
  createStartTime: "2025-05-14",
  platOrderCode: "RETAIL20260430000023",
});

const flowDef: NodeDefinition = {
  type: "example.flow",
  category: "recorded",
  name: "多步查询",
  description: "验证 recorded_http_flow",
  inputs: [{ name: "business_id", type: "string", required: true }],
  outputs: [{ name: "final_id", type: "string" }],
  handler: {
    kind: "recorded_http_flow",
    spec: {
      steps: [
        {
          id: "query_list",
          method: "GET",
          url_template: "https://example.test/list",
          query_template: { businessId: "{{ inputs.business_id }}" },
          response_mapping: { warehouse_id: "$.data[0].warehouseId" },
        },
        {
          id: "query_detail",
          method: "GET",
          url_template: "https://example.test/detail",
          query_template: { warehouseId: "{{ steps.query_list.warehouse_id }}" },
          response_mapping: { final_id: "$.data[0].warehouseId" },
        },
      ],
      response_mapping: { final_id: "{{ steps.query_detail.final_id }}" },
    },
  },
};
const flowResult = await createRecordedHttpFlowHandler().run(
  { business_id: "BIZ-001" },
  { inputs: {}, nodes: {}, browserContext: fakeBrowserContext },
  flowDef,
);
assert.deepEqual(flowResult, { final_id: "WH-01" });
assert.equal(fetchedUrls.at(-2), "https://example.test/list?businessId=BIZ-001");
assert.equal(fetchedUrls.at(-1), "https://example.test/detail?warehouseId=WH-01");

const emptyMappingContext = {
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
      return {
        status: () => 200,
        ok: () => true,
        headers: () => ({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ data: [] }),
      };
    },
  },
};
await assert.rejects(
  () =>
    createRecordedHttpHandler().run(
      { sku: "SKU-EMPTY", warehouse: "WH-01" },
      { inputs: {}, nodes: {}, browserContext: emptyMappingContext },
      recordedDef,
    ),
  /未映射到输出字段/,
);

console.log("workflow-runner tests passed");
