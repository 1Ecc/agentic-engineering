import type { LLMAdapter } from "../index.js";
import { buildWorkflowGenerationPrompt } from "../prompts/workflow-gen.js";
import { buildNodeExtractSystemPrompt, buildNodeExtractUserPrompt } from "../prompts/node-extract.js";
import { buildResultViewPrompt } from "../prompts/result-view.js";
import { buildNodeFromCurlPrompt } from "../prompts/node-from-curl.js";
import { validateApiCaptureSpec, type ApiCaptureSpec, type LLMExtractionResult } from "../api-capture-spec.js";

async function* singleChunk(text: string): AsyncIterable<string> {
  yield text;
}

function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model response does not contain JSON");
  return JSON.parse(text.slice(start, end + 1));
}

async function callClaude(system: string, user: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) throw new Error(`Claude request failed: ${response.status}`);
  const json = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  return json.content?.find((part) => part.type === "text")?.text ?? "";
}

export function createClaudeAdapter(): LLMAdapter {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=claude");
  return {
    async *generateWorkflow(input) {
      const content = await callClaude(
        "你是企业工作流 YAML 编排助手，只输出 YAML。",
        buildWorkflowGenerationPrompt({
          userPrompt: input.prompt,
          availableNodes: input.availableNodes,
          contextYaml: input.contextYaml,
        }),
      );
      yield* singleChunk(content);
    },
    async extractApiCaptureSpec(input): Promise<LLMExtractionResult> {
      const system = buildNodeExtractSystemPrompt();
      const user = buildNodeExtractUserPrompt(input);
      const content = await callClaude(system, user);
      let parsedOutput: unknown;
      let validation = { valid: false, errors: ["Model response does not contain JSON"] };
      try {
        parsedOutput = parseJsonObject(content);
        validation = validateApiCaptureSpec(parsedOutput, { capturedRequests: input.capturedRequests });
      } catch (error) {
        validation = { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
      }
      return {
        apiSpec: validation.valid ? (parsedOutput as ApiCaptureSpec) : undefined,
        trace: {
          provider: "claude",
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
          prompt_messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          raw_output: content,
          parsed_output: parsedOutput,
          validation,
          created_at: new Date().toISOString(),
        },
      };
    },
    async generateResultViews(input): Promise<string> {
      return callClaude(
        "你是企业自动化结果展示配置助手，只输出 JSON 数组。",
        buildResultViewPrompt(input),
      );
    },
    async generateNodeFromCurl(input): Promise<string> {
      return callClaude(
        "你是企业 HTTP 节点结构化助手，只输出 JSON 对象。",
        buildNodeFromCurlPrompt(input),
      );
    },
  };
}
