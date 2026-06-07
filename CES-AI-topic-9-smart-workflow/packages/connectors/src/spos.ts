import type { BrowserContext } from "playwright";
import type { SposInvoiceRow } from "../../shared/src/sop1-types.js";
import { lastYearRange } from "../../shared/src/dates.js";
import { requestJson } from "./browser.js";

const SPOS_BASE = "https://spos.lenovo.com.cn";

interface SposQueryPageResponse {
  success?: boolean;
  data?: {
    totalNumber?: number;
    dataList?: Array<{
      platOrderCode?: string | null;
      eccSOCode?: string | null;
      invoiceStatus?: number | null;
      invoiceStatusName?: string | null;
      invoiceType?: string | null;
      invoiceTypeName?: string | null;
      invoiceDownloadAddress?: string | null;
      invoiceDownloadAddressXML?: string | null;
      invoiceDownloadAddressOFD?: string | null;
      so?: string | null;
      pgi?: string | null;
      sscmOrderNo?: string | null;
      materialName?: string | null;
    }>;
  };
}

export async function getInvoiceInfo(context: BrowserContext, jiuqiuOrderNo: string): Promise<SposInvoiceRow[]> {
  const normalizedOrderNo = jiuqiuOrderNo.trim();
  if (!normalizedOrderNo) {
    throw new Error("SPOS 查询缺少九丘订单号，已停止空条件查询");
  }
  const range = lastYearRange();
  const payload = {
    createEndTime: range.end,
    createStartTime: range.start,
    paymentTimeBegin: "",
    paymentTimeEnd: "",
    eccSOCode: "",
    itemAmountStart: "",
    itemAmountEnd: "",
    legalCode: "0001",
    offset: 0,
    platformCode: "",
    orderStatus: "",
    platOrderCode: normalizedOrderNo,
    serviceID: "",
    isSepcialOrder: "",
    isReturn: "",
    pageIndex: 1,
    pageSize: 50,
    invoiceStatus: "",
    so: "",
    sscmOrderNo: "",
    shop: "",
  };

  const data = await requestJson<SposQueryPageResponse>(
    context,
    "spos",
    "spos.queryInvoiceInfo",
    `${SPOS_BASE}/spos-sales/b2cSales/order/queryPage`,
    {
      method: "POST",
      data: payload,
      headers: { "content-type": "application/json;charset=UTF-8" },
    },
  );

  return (data.data?.dataList ?? [])
    .filter((row) => row.platOrderCode === normalizedOrderNo)
    .map((row) => ({
    platOrderCode: row.platOrderCode ?? null,
    eccSOCode: row.eccSOCode ?? null,
    invoiceStatus: row.invoiceStatus ?? null,
    invoiceStatusName: row.invoiceStatusName ?? null,
    invoiceType: row.invoiceType ?? null,
    invoiceTypeName: row.invoiceTypeName ?? null,
    invoiceDownloadAddress: row.invoiceDownloadAddress ?? null,
    invoiceDownloadAddressXML: row.invoiceDownloadAddressXML ?? null,
    invoiceDownloadAddressOFD: row.invoiceDownloadAddressOFD ?? null,
    so: row.so ?? null,
    pgi: row.pgi ?? null,
    sscmOrderNo: row.sscmOrderNo ?? null,
    materialName: row.materialName ?? null,
  }));
}
