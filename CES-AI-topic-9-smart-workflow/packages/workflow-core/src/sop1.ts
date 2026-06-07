import type { BrowserContext } from "playwright";
import { jiuqiu, serviceforce, spos } from "../../connectors/src/index.js";
import { evaluateExtraProcessing } from "../../rules/src/sop1.js";
import { toSop1Error } from "../../shared/src/errors.js";
import type { Sop1Input, Sop1Result, SposInvoiceRow } from "../../shared/src/sop1-types.js";
import { buildSop1AggregatedContext, buildSop1ResultForm } from "./sop1-normalize.js";

export async function runServiceforceQueryNode(context: BrowserContext, input: Sop1Input) {
  return serviceforce.getPaidJiuqiuOrder(context, input.work_order_no);
}

export async function runJiuqiuQueryNode(context: BrowserContext, jiuqiuOrderNo: string) {
  return jiuqiu.getOrderDetail(context, jiuqiuOrderNo);
}

export async function runSposQueryNode(context: BrowserContext, jiuqiuOrderNo: string) {
  return spos.getInvoiceInfo(context, jiuqiuOrderNo);
}

export function runSop1RulesNode(resultForm: ReturnType<typeof buildSop1ResultForm>, jiuqiuDetail: Awaited<ReturnType<typeof runJiuqiuQueryNode>>) {
  const aggregated = buildSop1AggregatedContext(resultForm, jiuqiuDetail);
  return evaluateExtraProcessing(aggregated);
}

export async function runSop1(context: BrowserContext, input: Sop1Input): Promise<Sop1Result> {
  const errors: Sop1Result["errors"] = [];

  try {
    const serviceforceResult = await runServiceforceQueryNode(context, input);
    const jiuqiuOrderNo = serviceforceResult.paid_jiuqiu_order?.orderNo ?? null;

    if (!jiuqiuOrderNo) {
      const resultForm = buildSop1ResultForm(input.work_order_no, serviceforceResult, null, []);
      return {
        result_form: resultForm,
        extra_processing: runSop1RulesNode(resultForm, null),
        run_status: "success",
        errors,
      };
    }

    const jiuqiuDetail = await runJiuqiuQueryNode(context, jiuqiuOrderNo);
    let sposRows: SposInvoiceRow[] = [];
    let runStatus: Sop1Result["run_status"] = "success";
    try {
      sposRows = await runSposQueryNode(context, jiuqiuOrderNo);
    } catch (error) {
      const sopError = toSop1Error(error, "spos.getInvoiceInfo");
      errors.push({
        code: sopError.code,
        platform: sopError.platform,
        step: sopError.step,
        message: sopError.message,
      });
      runStatus = "partial_success";
    }

    const resultForm = buildSop1ResultForm(input.work_order_no, serviceforceResult, jiuqiuDetail, sposRows);

    return {
      result_form: resultForm,
      extra_processing:
        errors.length > 0
          ? {
              route: null,
              name: "平台查询未完成，暂不判断额外处理",
              need_email_draft: false,
              email_draft: null,
            }
          : runSop1RulesNode(resultForm, jiuqiuDetail),
      run_status: runStatus,
      errors,
    };
  } catch (error) {
    const sopError = toSop1Error(error, "runSop1");
    errors.push({
      code: sopError.code,
      platform: sopError.platform,
      step: sopError.step,
      message: sopError.message,
    });

    return {
      result_form: {
        work_order_no: input.work_order_no,
        jiuqiu_order_no: null,
        jiuqiu_order_status: null,
        rows: [],
      },
      extra_processing: {
        route: null,
        name: "执行失败",
        need_email_draft: false,
        email_draft: null,
      },
      run_status: "failed",
      errors,
    };
  }
}
