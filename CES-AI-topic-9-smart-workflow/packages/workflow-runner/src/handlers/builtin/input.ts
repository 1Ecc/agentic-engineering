import type { NodeHandlerRunner } from "../../../../shared/src/index.js";

export function createInputHandler(): NodeHandlerRunner {
  return {
    async run(inputs) {
      return inputs;
    },
  };
}
