import type { Sop1Error } from "./errors.js";

export interface Sop1Input {
  work_order_no: string;
}

export interface ServiceforceCustomerOrder {
  soId: string;
  orderNo: string;
  orderStatus: string;
  orderStatusName: string;
  systemFlag: string;
}

export interface ServiceforceOrderLookup {
  work_order_no: string;
  pass_key: string | null;
  paid_jiuqiu_order: ServiceforceCustomerOrder | null;
  candidate_orders: ServiceforceCustomerOrder[];
}

export interface JiuqiuOrderItem {
  materialNo: string | null;
  productName: string | null;
  so: string | null;
  pgi: string | null;
  s4ToSscmTime: string | null;
  sscmOrderNo: string | null;
}

export interface JiuqiuOrderDetail {
  id: number;
  orderNo: string;
  orderStatus: number | null;
  orderStatusName: string | null;
  completed: boolean;
  items: JiuqiuOrderItem[];
}

export interface SposInvoiceRow {
  platOrderCode: string | null;
  eccSOCode: string | null;
  invoiceStatus: number | null;
  invoiceStatusName: string | null;
  invoiceType: string | null;
  invoiceTypeName: string | null;
  invoiceDownloadAddress: string | null;
  invoiceDownloadAddressXML: string | null;
  invoiceDownloadAddressOFD: string | null;
  so: string | null;
  pgi: string | null;
  sscmOrderNo: string | null;
  materialName: string | null;
}

export interface Sop1ResultRow {
  work_order_no: string;
  jiuqiu_order_no: string | null;
  jiuqiu_order_status: string | null;
  pgi: string | null;
  s4_order_no: string | null;
  pgi_sscm_success_time: string | null;
  btcp_order_no: string | null;
  invoice_status: string | null;
  invoice_type: string | null;
  invoice_link: string | null;
  invoice_xml_link?: string | null;
  invoice_ofd_link?: string | null;
}

export interface Sop1ResultForm {
  work_order_no: string;
  jiuqiu_order_no: string | null;
  jiuqiu_order_status: string | null;
  rows: Sop1ResultRow[];
}

export type Sop1ExtraProcessingRoute =
  | "NO_EXTRA_NO_JIUQIU_ORDER"
  | "NO_EXTRA_JIUQIU_NOT_COMPLETED"
  | "EMAIL_BTCP_MISSING"
  | "EMAIL_PGI_SSCM_MISSING"
  | "EMAIL_DIGITAL_NORMAL_NOT_INVOICED"
  | "EMAIL_DIGITAL_SPECIAL_NOT_INVOICED"
  | null;

export interface EmailDraft {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}

export interface Sop1ExtraProcessing {
  route: Sop1ExtraProcessingRoute;
  name: string;
  need_email_draft: boolean;
  email_draft: EmailDraft | null;
}

export interface Sop1AggregatedContext {
  work_order_no: string;
  jiuqiu_order_no: string | null;
  jiuqiu_order_status: string | null;
  jiuqiu_completed: boolean;
  pgi_values: string[];
  s4_order_values: string[];
  pgi_sscm_success_time_values: string[];
  btcp_order_values: string[];
  invoice_status_values: string[];
  invoice_type_values: string[];
  invoice_link_values: string[];
  invoice_normalized_status: "INVOICED" | "NOT_INVOICED" | "UNKNOWN";
  invoice_normalized_type: "DIGITAL_NORMAL" | "DIGITAL_SPECIAL" | "UNKNOWN";
}

export interface Sop1Result {
  result_form: Sop1ResultForm;
  extra_processing: Sop1ExtraProcessing;
  run_status: "success" | "partial_success" | "failed";
  errors: Array<Pick<Sop1Error, "code" | "platform" | "step" | "message">>;
}
