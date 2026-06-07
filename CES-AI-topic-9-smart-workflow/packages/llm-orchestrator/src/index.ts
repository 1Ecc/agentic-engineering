import type { NodeDefinition, Workflow } from "../../shared/src/index.js";
import { createClaudeAdapter } from "./adapters/claude.js";
import { createDeepSeekAdapter } from "./adapters/deepseek.js";
import { createKimiAdapter } from "./adapters/kimi.js";
import type { LLMExtractionResult } from "./api-capture-spec.js";

export interface CapturedRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  status?: number;
}

export interface LLMAdapter {
  generateWorkflow(input: {
    prompt: string;
    availableNodes: NodeDefinition[];
    contextYaml?: string;
  }): AsyncIterable<string>;

  extractApiCaptureSpec(input: {
    description: string;
    capturedRequests: CapturedRequest[];
  }): Promise<LLMExtractionResult>;

  generateResultViews(input: {
    result: unknown;
    existingViews?: unknown;
  }): Promise<string>;

  generateNodeFromCurl(input: {
    curl?: string;
    description?: string;
    name?: string;
    currentNode?: unknown;
  }): Promise<string>;
}

export function createLLMAdapter(provider = process.env.LLM_PROVIDER): LLMAdapter {
  if (!provider) throw new Error("LLM_PROVIDER is required");
  if (provider === "kimi") return createKimiAdapter();
  if (provider === "claude") return createClaudeAdapter();
  if (provider === "deepseek") return createDeepSeekAdapter();
  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export * from "./schema.js";
export * from "./api-capture-spec.js";
export * from "./prompts/workflow-gen.js";
export * from "./prompts/node-extract.js";
export * from "./prompts/result-view.js";
export * from "./prompts/node-from-curl.js";
export * from "./adapters/kimi.js";
export * from "./adapters/claude.js";
export * from "./adapters/deepseek.js";
export type { NodeDefinition, Workflow };
