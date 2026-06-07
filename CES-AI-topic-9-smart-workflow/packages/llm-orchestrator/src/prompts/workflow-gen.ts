import type { NodeDefinition } from "../../../shared/src/index.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldItemNames(field: NodeDefinition["outputs"][number]): string[] {
  const items = (field as unknown as { items?: { properties?: Record<string, unknown> } }).items;
  return items?.properties ? Object.keys(items.properties) : [];
}

function mappingItemNames(node: NodeDefinition, outputName: string): string[] {
  const spec = node.handler.spec;
  if (!isObject(spec) || !isObject(spec.response_mapping)) return [];
  const mapping = spec.response_mapping[outputName];
  if (!isObject(mapping) || !isObject(mapping.item_mapping)) return [];
  return Object.keys(mapping.item_mapping);
}

function formatField(field: NodeDefinition["inputs"][number] | NodeDefinition["outputs"][number], itemNames: string[] = []): string {
  const label = field.label ? `(${field.label})` : "";
  const required = "required" in field && field.required ? "*" : "";
  const description = field.description ? ` - ${field.description}` : "";
  const items = itemNames.length > 0 ? `; item fields: ${itemNames.join(", ")}` : "";
  return `${field.name}${required}:${field.type}${label}${description}${items}`;
}

export function buildWorkflowGenerationPrompt(input: {
  userPrompt: string;
  availableNodes: NodeDefinition[];
  contextYaml?: string;
}): string {
  const nodeTable = input.availableNodes
    .map((node) => {
      const inputs = node.inputs
        .map((field) => formatField(field))
        .join(", ") || "none";
      const outputs = node.outputs
        .map((field) => {
          const itemNames = fieldItemNames(field);
          return formatField(field, itemNames.length > 0 ? itemNames : mappingItemNames(node, field.name));
        })
        .join(", ") || "none";
      return `| ${node.type} | ${node.name} | ${node.description} | ${inputs} | ${outputs} |`;
    })
    .join("\n");

  return `你是一个工作流编排助手。基于用户的自然语言描述，输出符合当前 runner 可执行 schema 的 YAML。

只输出 YAML 正文，不要输出 Markdown 代码块，不要输出解释。

当前可用节点：
| type | name | description | inputs | outputs |
|---|---|---|---|---|
${nodeTable}

约束：
1. 只能使用上述可用节点
2. 顶层只能使用 id/name/description/inputs/nodes/outputs，不要使用 workflow 包裹层
3. 节点间数据流引用使用 $nodeId.fieldName
4. 输入变量引用使用 $inputs.fieldName
5. 节点 inputs 的字段名必须严格使用节点定义中的 inputs 名称
6. outputs 必须是对象，不要使用 output 单数
7. mail.draft 的正文必须使用 template 字段，多行模板中的变量使用 {{ inputs.field }} 或 {{ $nodeId.field }}
8. 条件执行使用 when: $ruleNode.passed
9. rules.evaluate / rules.first_match 的 expression 仅使用 ==、!=、&&、||、empty(field)、notEmpty(field)，不使用括号和复杂表达式
10. 需要简单并行时使用 dependsOn: [上游节点ID]；未写 dependsOn 时按 nodes 顺序串行执行
11. data.compose 用于把多源节点输出整理成结构化对象，只能做对象/数组/固定值/引用/模板组装，不要生成 JS、SQL、map/filter/reduce
12. 多场景只命中一个时使用 rules.first_match，按 rules 顺序判断，命中第一条后停止
13. 执行期不调用 LLM，所有流程必须能被确定性 runner 执行

可执行 YAML 模板示例：
id: wf_direct_order_invoice_summary
name: 直客订单查询与场景判断
description: 输入工单号，查询服务云、九丘和 SPOS 信息，合并结构化表单并做优先级场景判断。
inputs:
  - name: work_order_no
    type: string
    label: 工单号
    required: true
nodes:
  - id: sf_query
    type: serviceforce.query
    inputs:
      work_order_no: $inputs.work_order_no
  - id: jq_detail
    type: jiuqiu.query
    dependsOn: [sf_query]
    inputs:
      jiuqiu_order_no: $sf_query.paid_jiuqiu_order.orderNo
  - id: spos_info
    type: spos.query
    dependsOn: [sf_query]
    inputs:
      jiuqiu_order_no: $sf_query.paid_jiuqiu_order.orderNo
  - id: order_form
    type: data.compose
    dependsOn: [jq_detail, spos_info]
    inputs:
      value:
        work_order_no: $inputs.work_order_no
        jiuqiu_order_no: $sf_query.paid_jiuqiu_order.orderNo
        order_status: $jq_detail.orderStatusName
        pgi: $jq_detail.items[0].pgi
        s4_order_no: $jq_detail.items[0].so
        pgi_push_time: $jq_detail.items[0].s4ToSscmTime
        btcp_order_no: $spos_info.rows[0].platOrderCode
        invoice_status: $spos_info.rows[0].invoiceStatusName
        invoice_type: $spos_info.rows[0].invoiceTypeName
        invoice_link: $spos_info.rows[0].invoiceDownloadAddress
  - id: route
    type: rules.first_match
    dependsOn: [order_form]
    inputs:
      facts: $order_form
      rules:
        - id: R1
          name: 无九丘订单号
          expression: empty(jiuqiu_order_no)
          action:
            type: none
            need_email: false
        - id: R3
          name: BTCP 推送确认
          expression: order_status == "已完成" && empty(order_items)
          action:
            type: mail.draft
            need_email: true
            to:
              - yangyn12@lenovo.com
            cc:
              - wuty1@lenovo.com
            subject: BTCP 推送确认
  - id: mail_summary
    type: mail.draft
    dependsOn: [route]
    when: $route.action.need_email
    inputs:
      to: $route.action.to
      cc: $route.action.cc
      subject: $route.action.subject
      template: |
        工单号：{{ inputs.work_order_no }}
        九丘订单号：{{ $order_form.jiuqiu_order_no }}
        命中规则：{{ $route.name }}
outputs:
  order_form: $order_form.value
  matched_rule: $route.rule_id
  route_reason: $route.reason
  mail_draft: $mail_summary.draft

${input.contextYaml ? `在以下 YAML 基础上修改：\n${input.contextYaml}\n` : ""}
用户需求：
${input.userPrompt}`;
}
