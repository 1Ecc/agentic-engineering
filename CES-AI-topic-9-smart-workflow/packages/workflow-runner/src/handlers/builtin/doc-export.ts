import type { NodeHandlerRunner } from "../../../../shared/src/index.js";

export function createDocExportHandler(): NodeHandlerRunner {
  return {
    async run(inputs) {
      if (!inputs.download_url) {
        throw new Error("doc.export requires download_url from a real export service");
      }
      return {
        download_url: String(inputs.download_url),
      };
    },
  };
}
