import type { NodeHandlerRunner } from "../../../../shared/src/index.js";

export function createLlmRewriteHandler(): NodeHandlerRunner {
  return {
    async run(inputs) {
      return {
        text: String(inputs.text ?? inputs.content ?? ""),
      };
    },
  };
}
