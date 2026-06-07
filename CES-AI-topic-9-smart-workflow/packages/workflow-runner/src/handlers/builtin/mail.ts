import type { EmailDraft, NodeHandlerRunner } from "../../../../shared/src/index.js";
import { interpolateTemplate } from "../../context.js";

export function createMailDraftHandler(): NodeHandlerRunner {
  return {
    async run(inputs, context) {
      const draft: EmailDraft = {
        to: Array.isArray(inputs.to) ? inputs.to.map(String) : [String(inputs.to ?? "")].filter(Boolean),
        cc: Array.isArray(inputs.cc) ? inputs.cc.map(String) : [],
        subject: String(inputs.subject ?? "工作流提醒"),
        body: interpolateTemplate(String(inputs.template ?? inputs.body ?? ""), context),
      };
      return { draft };
    },
  };
}
