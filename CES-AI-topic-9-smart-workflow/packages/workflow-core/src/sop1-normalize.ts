import type {
  JiuqiuOrderDetail,
  ServiceforceOrderLookup,
  Sop1AggregatedContext,
  Sop1ResultForm,
  Sop1ResultRow,
  SposInvoiceRow,
} from "../../shared/src/sop1-types.js";
import { compactStrings, firstNonEmpty } from "../../shared/src/utils.js";

function normalizeInvoiceStatus(values: string[]): "INVOICED" | "NOT_INVOICED" | "UNKNOWN" {
  if (values.some((value) => value === "已开票")) return "INVOICED";
  if (values.some((value) => value === "未开票")) return "NOT_INVOICED";
  return "UNKNOWN";
}

function normalizeInvoiceType(values: string[]): "DIGITAL_NORMAL" | "DIGITAL_SPECIAL" | "UNKNOWN" {
  if (values.some((value) => value === "数电发票")) return "DIGITAL_NORMAL";
  if (values.some((value) => value === "数电专票")) return "DIGITAL_SPECIAL";
  return "UNKNOWN";
}

export function buildSop1ResultForm(
  workOrderNo: string,
  serviceforce: ServiceforceOrderLookup,
  jiuqiu: JiuqiuOrderDetail | null,
  sposRows: SposInvoiceRow[],
): Sop1ResultForm {
  const jiuqiuOrderNo = serviceforce.paid_jiuqiu_order?.orderNo ?? null;
  const jiuqiuItems = jiuqiu?.items.length ? jiuqiu.items : [null];
  const invoiceRows = sposRows.length ? sposRows : [null];

  const rows: Sop1ResultRow[] = [];
  const max = Math.max(jiuqiuItems.length, invoiceRows.length, 1);
  for (let index = 0; index < max; index += 1) {
    const item = jiuqiuItems[index] ?? jiuqiuItems[0];
    const invoice = invoiceRows[index] ?? invoiceRows[0];
    rows.push({
      work_order_no: workOrderNo,
      jiuqiu_order_no: jiuqiuOrderNo,
      jiuqiu_order_status: jiuqiu?.orderStatusName ?? null,
      pgi: firstNonEmpty(invoice?.pgi, item?.pgi),
      s4_order_no: firstNonEmpty(invoice?.so, item?.so),
      pgi_sscm_success_time: item?.s4ToSscmTime ?? null,
      btcp_order_no: invoice?.eccSOCode ?? null,
      invoice_status: invoice?.invoiceStatusName ?? null,
      invoice_type: invoice?.invoiceTypeName ?? null,
      invoice_link: invoice?.invoiceDownloadAddress ?? null,
      invoice_xml_link: invoice?.invoiceDownloadAddressXML ?? null,
      invoice_ofd_link: invoice?.invoiceDownloadAddressOFD ?? null,
    });
  }

  return {
    work_order_no: workOrderNo,
    jiuqiu_order_no: jiuqiuOrderNo,
    jiuqiu_order_status: jiuqiu?.orderStatusName ?? null,
    rows,
  };
}

export function buildSop1AggregatedContext(resultForm: Sop1ResultForm, jiuqiu: JiuqiuOrderDetail | null): Sop1AggregatedContext {
  const rows = resultForm.rows;
  const invoiceStatusValues = compactStrings(rows.map((row) => row.invoice_status));
  const invoiceTypeValues = compactStrings(rows.map((row) => row.invoice_type));

  return {
    work_order_no: resultForm.work_order_no,
    jiuqiu_order_no: resultForm.jiuqiu_order_no,
    jiuqiu_order_status: resultForm.jiuqiu_order_status,
    jiuqiu_completed: jiuqiu?.completed ?? false,
    pgi_values: compactStrings(rows.map((row) => row.pgi)),
    s4_order_values: compactStrings(rows.map((row) => row.s4_order_no)),
    pgi_sscm_success_time_values: compactStrings(rows.map((row) => row.pgi_sscm_success_time)),
    btcp_order_values: compactStrings(rows.map((row) => row.btcp_order_no)),
    invoice_status_values: invoiceStatusValues,
    invoice_type_values: invoiceTypeValues,
    invoice_link_values: compactStrings(rows.map((row) => row.invoice_link)),
    invoice_normalized_status: normalizeInvoiceStatus(invoiceStatusValues),
    invoice_normalized_type: normalizeInvoiceType(invoiceTypeValues),
  };
}
