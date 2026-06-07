import type { BrowserContext } from "playwright";
import type { NodeHandlerRunner } from "../../../../shared/src/index.js";
import { spos } from "../../../../connectors/src/index.js";

export function createSposHandler(): NodeHandlerRunner {
  return {
    async run(inputs, context) {
      if (!context.browserContext) throw new Error("browserContext is required for spos.query");
      return {
        rows: await spos.getInvoiceInfo(context.browserContext as BrowserContext, String(inputs.jiuqiu_order_no ?? "")),
      };
    },
  };
}
