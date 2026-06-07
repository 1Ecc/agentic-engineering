import type { BrowserContext } from "playwright";
import { Sop1Error } from "../../shared/src/errors.js";
import type { ServiceforceCustomerOrder, ServiceforceOrderLookup } from "../../shared/src/sop1-types.js";
import { requestJson } from "./browser.js";

interface ServiceOrderHisResponse {
  rows?: Array<{ soid?: string; passKey?: string; application_name?: string }>;
  code?: number;
  msg?: string;
}

interface CustomerOrderResponse {
  code?: number;
  msg?: string;
  data?: Array<{
    soId?: string;
    orderNo?: string;
    orderStatus?: string;
    orderStatusName?: string;
    systemFlag?: string;
  }>;
}

const SERVICEFORCE_BASE = "https://serviceforce.lenovo.com.cn";

export async function getPaidJiuqiuOrder(
  context: BrowserContext,
  workOrderNo: string,
): Promise<ServiceforceOrderLookup> {
  const historyUrl = new URL("/fieldserviceapi/api/ServiceOrderHis/GetServiceOrderHisList", SERVICEFORCE_BASE);
  const historyParams: Record<string, string> = {
    isDesc: "true",
    orderByCol: "",
    pageIndex: "1",
    pageSize: "10",
    projectNO: "",
    soid: workOrderNo,
    rawNO: "",
    serviceTypeId: "",
    serviceChildTypeID: "",
    actualServiceMode: "",
    custName: "",
    custPhone: "",
    vendorCode: "",
    vendorName: "",
    responsibleEngineer: "",
    productSN: "",
    createBy: "",
    createStartTime: "",
    createEndTime: "",
    closeStartTime: "",
    closeEndTime: "",
    orderSource: "",
    sourceFlag: "",
    orderStatus: "",
    _t: String(Date.now()),
  };
  Object.entries(historyParams).forEach(([key, value]) => historyUrl.searchParams.set(key, value));

  const history = await requestJson<ServiceOrderHisResponse>(
    context,
    "serviceforce",
    "serviceforce.getHistoryOrder",
    historyUrl.toString(),
  );

  const passKey = history.rows?.[0]?.passKey ?? null;

  const customerOrderUrl = new URL("/fieldservicejapi/customerOrder/list", SERVICEFORCE_BASE);
  customerOrderUrl.searchParams.set("soId", workOrderNo);
  customerOrderUrl.searchParams.set("_t", String(Date.now()));

  const orders = await requestJson<CustomerOrderResponse>(
    context,
    "serviceforce",
    "serviceforce.getCustomerOrders",
    customerOrderUrl.toString(),
  );

  if (!Array.isArray(orders.data)) {
    throw new Sop1Error(
      "PLATFORM_RESPONSE_INVALID",
      "serviceforce",
      "serviceforce.getCustomerOrders",
      `服务云客户订单响应缺少 data[]，请先检查服务云登录态或工单权限。code=${orders.code ?? "unknown"} msg=${orders.msg ?? "unknown"}`,
      orders,
    );
  }

  const candidateOrders: ServiceforceCustomerOrder[] = orders.data
    .filter((order) => order.systemFlag === "jiuqiu")
    .map((order) => ({
      soId: order.soId ?? workOrderNo,
      orderNo: order.orderNo ?? "",
      orderStatus: order.orderStatus ?? "",
      orderStatusName: order.orderStatusName ?? "",
      systemFlag: order.systemFlag ?? "",
    }))
    .filter((order) => order.orderNo);

  const paid = candidateOrders.find((order) => order.orderStatus === "PAID" || order.orderStatusName === "已支付") ?? null;

  return {
    work_order_no: workOrderNo,
    pass_key: passKey,
    paid_jiuqiu_order: paid,
    candidate_orders: candidateOrders,
  };
}
