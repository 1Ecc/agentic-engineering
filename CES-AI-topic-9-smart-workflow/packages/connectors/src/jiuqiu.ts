import type { BrowserContext } from "playwright";
import { Sop1Error } from "../../shared/src/errors.js";
import type { JiuqiuOrderDetail, JiuqiuOrderItem } from "../../shared/src/sop1-types.js";
import { requestJson } from "./browser.js";

const JIUQIU_BASE = "https://jiuqiu.lenovo.com.cn";

interface JiuqiuListResponse {
  total?: number;
  rows?: Array<{ id?: number; orderNo?: string; orderStatus?: number; orderStatusName?: string }>;
  code?: number;
  msg?: string;
}

interface JiuqiuDetailResponse {
  code?: number;
  msg?: string;
  data?: {
    order?: {
      id?: number;
      orderNo?: string;
      orderStatus?: number;
      orderStatusName?: string;
    };
    orderItem?: Array<{
      materialNo?: string | null;
      productName?: string | null;
      so?: string | null;
      pgi?: string | null;
      s4ToSscmTime?: string | null;
      sscmOrderNo?: string | null;
    }>;
  };
}

export async function getOrderDetail(context: BrowserContext, jiuqiuOrderNo: string): Promise<JiuqiuOrderDetail | null> {
  const normalizedOrderNo = jiuqiuOrderNo.trim();
  if (!normalizedOrderNo) {
    throw new Error("九丘查询缺少九丘订单号，已停止空条件查询");
  }
  const listUrl = new URL("/order/list", JIUQIU_BASE);
  const params: Record<string, string> = {
    materialNo: "",
    productClassify: "",
    productSubclass: "",
    productDeliverCategory: "",
    hostNo: "",
    customerPhone: "",
    customerName: "",
    dealPrice: "",
    seriesUpgrade: "",
    orderNo: normalizedOrderNo,
    routeCode: "",
    agentCode: "",
    organizationName: "",
    serviceStationNo: "",
    serviceStationName: "",
    serviceConsultantAccount: "",
    serviceConsultantName: "",
    orderType: "",
    orderStatus: "",
    registerStatus: "",
    settlementStatus: "",
    returnStatus: "",
    thirdPartyOrderNo: "",
    clientType: "",
    customerMode: "",
    clientOrderNo: "",
    batchNo: "",
    repairNo: "",
    settlementNo: "",
    isSupportOrderDelivery: "",
    isUseCoupon: "",
    orderDeliveryLabel: "",
    startDealDate: "",
    endDealDate: "",
    startCreateDate: "",
    endCreateDate: "",
    remark: "",
    packageNo: "",
    skuNo: "",
    skuName: "",
    hardware: "",
    orderByColumn: "",
    isAsc: "",
    pageNum: "1",
    pageSize: "10",
    _t: String(Date.now()),
  };
  Object.entries(params).forEach(([key, value]) => listUrl.searchParams.set(key, value));

  const list = await requestJson<JiuqiuListResponse>(context, "jiuqiu", "jiuqiu.getOrderList", listUrl.toString());
  const matchedOrder = list.rows?.find((row) => row.orderNo === normalizedOrderNo);
  const orderId = matchedOrder?.id;
  if (!orderId) return null;

  const detailUrl = new URL(`/order/detail/${orderId}`, JIUQIU_BASE);
  detailUrl.searchParams.set("_t", String(Date.now()));
  const detail = await requestJson<JiuqiuDetailResponse>(context, "jiuqiu", "jiuqiu.getOrderDetail", detailUrl.toString());

  const order = detail.data?.order;
  if (!order?.id || !order.orderNo) {
    throw new Sop1Error("PLATFORM_RESPONSE_INVALID", "jiuqiu", "jiuqiu.getOrderDetail", "九丘订单详情缺少 order");
  }

  const items: JiuqiuOrderItem[] = (detail.data?.orderItem ?? []).map((item) => ({
    materialNo: item.materialNo ?? null,
    productName: item.productName ?? null,
    so: item.so ?? null,
    pgi: item.pgi ?? null,
    s4ToSscmTime: item.s4ToSscmTime ?? null,
    sscmOrderNo: item.sscmOrderNo ?? null,
  }));

  return {
    id: order.id,
    orderNo: order.orderNo,
    orderStatus: order.orderStatus ?? null,
    orderStatusName: order.orderStatusName ?? null,
    completed: order.orderStatus === 3 || order.orderStatusName === "已成交",
    items,
  };
}
