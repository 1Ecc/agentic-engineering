export function buildResultViewPrompt(input: { result: unknown; existingViews?: unknown }): string {
  return `你是企业自动化结果展示配置助手。请根据工作流运行结果生成通用 ResultView JSON 数组。

只输出 JSON 数组，不要输出 Markdown、解释或代码块。

ResultView schema:
[
  {
    "id": "snake_case_view_id",
    "type": "table | detail | cards | timeline | status | mail_draft | json",
    "title": "中文标题",
    "source": "$outputs.path.to.value",
    "columns": [
      { "key": "field_name", "label": "中文列名", "format": "text | status | link | datetime | number" }
    ]
  }
]

约束:
1. 只能引用 result 中真实存在的字段，source 使用 $outputs 开头。
2. 数组对象优先使用 table；适合概览的数组对象可使用 cards；包含时间字段的列表可使用 timeline；状态/结论类对象可使用 status；普通对象使用 detail；邮件草稿结构使用 mail_draft；无法判断时使用 json。
3. table 的 columns 只选择业务人员最需要看的字段，不要把完整原始对象全部铺开。
4. 状态字段使用 status，URL 使用 link，时间字段使用 datetime，数字金额数量使用 number。
5. 保证配置通用，不生成任何 UI 代码。

${input.existingViews ? `现有 views，可作为参考但可以优化:\n${JSON.stringify(input.existingViews, null, 2)}\n` : ""}
运行结果:
${JSON.stringify(input.result, null, 2)}`;
}
