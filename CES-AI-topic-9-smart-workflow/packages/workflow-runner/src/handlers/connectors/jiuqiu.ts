import type { BrowserContext } from "playwright";
import type { NodeHandlerRunner } from "../../../../shared/src/index.js";
import { jiuqiu } from "../../../../connectors/src/index.js";

export function createJiuqiuHandler(): NodeHandlerRunner {
  return {
    async run(inputs, context) {
      if (!context.browserContext) throw new Error("browserContext is required for jiuqiu.query");
      return jiuqiu.getOrderDetail(context.browserContext as BrowserContext, String(inputs.jiuqiu_order_no ?? ""));
    },
  };
}
