import type { EmailDraft, Sop1AggregatedContext, Sop1ExtraProcessing } from "../../shared/src/sop1-types.js";

function draft(subject: string, body: string, to: string[], cc: string[] = []): EmailDraft {
  return { subject, body, to, cc };
}

export function evaluateExtraProcessing(ctx: Sop1AggregatedContext): Sop1ExtraProcessing {
  if (!ctx.jiuqiu_order_no) {
    return {
      route: "NO_EXTRA_NO_JIUQIU_ORDER",
      name: "无九丘订单号",
      need_email_draft: false,
      email_draft: null,
    };
  }

  if (!ctx.jiuqiu_completed) {
    return {
      route: "NO_EXTRA_JIUQIU_NOT_COMPLETED",
      name: "九丘订单未完成",
      need_email_draft: false,
      email_draft: null,
    };
  }

  if (ctx.pgi_values.length === 0 || ctx.btcp_order_values.length === 0) {
    return {
      route: "EMAIL_BTCP_MISSING",
      name: "BTCP 无信息",
      need_email_draft: true,
      email_draft: draft(
        `【请协助确认 BTCP 推送】${ctx.work_order_no}`,
        `工单号“${ctx.work_order_no}”，九丘订单号“${ctx.jiuqiu_order_no}”，九丘订单已完成，BTCP 没有信息，辛苦看下订单是否成功推送给 BTCP 系统。`,
        ["yangyn12@lenovo.com"],
        ["wuty1@lenovo.com"],
      ),
    };
  }

  if (ctx.pgi_sscm_success_time_values.length === 0) {
    return {
      route: "EMAIL_PGI_SSCM_MISSING",
      name: "PGI 未推送到 sscm",
      need_email_draft: true,
      email_draft: draft(
        `【请协助确认 PGI 推送】${ctx.work_order_no}`,
        `工单号“${ctx.work_order_no}”，九丘订单号“${ctx.jiuqiu_order_no}”，九丘订单已完成，PGI 没有推送到 sscm，辛苦看下 PGI 推送失败原因。`,
        ["yangyn12@lenovo.com"],
        ["wuty1@lenovo.com"],
      ),
    };
  }

  if (
    ctx.invoice_normalized_status !== "INVOICED" &&
    ctx.invoice_normalized_type === "DIGITAL_NORMAL" &&
    ctx.invoice_link_values.length === 0
  ) {
    return {
      route: "EMAIL_DIGITAL_NORMAL_NOT_INVOICED",
      name: "数电发票未开出",
      need_email_draft: true,
      email_draft: draft(
        `【请协助确认数电发票开票】${ctx.work_order_no}`,
        `工单号“${ctx.work_order_no}”，九丘订单号“${ctx.jiuqiu_order_no}”，BTCP 单号“${ctx.btcp_order_values.join("、")}”，九丘已推送至 SPOS 系统，但是普票未开出，辛苦 IT 同学确认订单推送是否正常。`,
        ["TODO_BTCP_IT_EMAIL"],
        ["yuls1@lenovo.com"],
      ),
    };
  }

  if (
    ctx.invoice_normalized_status !== "INVOICED" &&
    ctx.invoice_normalized_type === "DIGITAL_SPECIAL" &&
    ctx.invoice_link_values.length === 0
  ) {
    return {
      route: "EMAIL_DIGITAL_SPECIAL_NOT_INVOICED",
      name: "数电专票未开出",
      need_email_draft: true,
      email_draft: draft(
        `【请协助确认数电专票开票】${ctx.work_order_no}`,
        `工单号“${ctx.work_order_no}”，九丘订单号“${ctx.jiuqiu_order_no}”，BTCP 单号“${ctx.btcp_order_values.join("、")}”，九丘已推送至 SPOS 系统，但是普票未开出，辛苦会计同学确认发票是否已经到开票界面。`,
        ["chenxf13@lenovo.com"],
      ),
    };
  }

  return {
    route: null,
    name: "无额外处理",
    need_email_draft: false,
    email_draft: null,
  };
}
