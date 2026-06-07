import type { BrowserContext } from "playwright";
import type { NodeHandlerRunner } from "../../../../shared/src/index.js";
import { serviceforce } from "../../../../connectors/src/index.js";

export function createServiceforceHandler(): NodeHandlerRunner {
  return {
    async run(inputs, context) {
      if (!context.browserContext) throw new Error("browserContext is required for serviceforce.query");
      return serviceforce.getPaidJiuqiuOrder(context.browserContext as BrowserContext, String(inputs.work_order_no ?? ""));
    },
  };
}
