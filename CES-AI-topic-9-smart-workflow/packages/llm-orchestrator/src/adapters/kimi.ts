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

async function callKimi(messages: Array<{ role: "system" | "user"; content: string }>): Promise<string> {
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.KIMI_MODEL ?? "moonshot-v1-8k",
      messages,
      temperature: 0.1,
    }),
  });
  if (!response.ok) throw new Error(`Kimi request failed: ${response.status}`);
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export function createKimiAdapter(): LLMAdapter {
  if (!process.env.KIMI_API_KEY) throw new Error("KIMI_API_KEY is required when LLM_PROVIDER=kimi");
  return {
    async *generateWorkflow(input) {
      const content = await callKimi([
        { role: "system", content: "你是企业工作流 YAML 编排助手，只输出 YAML。" },
        {
          role: "user",
          content: buildWorkflowGenerationPrompt({
            userPrompt: input.prompt,
            availableNodes: input.availableNodes,
            contextYaml: input.contextYaml,
          }),
        },
      ]);
      yield* singleChunk(content);
    },
    async extractApiCaptureSpec(input): Promise<LLMExtractionResult> {
      const messages: Array<{ role: "system" | "user"; content: string }> = [
        { role: "system", content: buildNodeExtractSystemPrompt() },
        { role: "user", content: buildNodeExtractUserPrompt(input) },
      ];
      const content = await callKimi(messages);
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
          provider: "kimi",
          model: process.env.KIMI_MODEL ?? "moonshot-v1-8k",
          prompt_messages: messages,
          raw_output: content,
          parsed_output: parsedOutput,
          validation,
          created_at: new Date().toISOString(),
        },
      };
    },
    async generateResultViews(input): Promise<string> {
      return callKimi([
        { role: "system", content: "你是企业自动化结果展示配置助手，只输出 JSON 数组。" },
        { role: "user", content: buildResultViewPrompt(input) },
      ]);
    },
    async generateNodeFromCurl(input): Promise<string> {
      return callKimi([
        { role: "system", content: "你是企业 HTTP 节点结构化助手，只输出 JSON 对象。" },
        { role: "user", content: buildNodeFromCurlPrompt(input) },
      ]);
    },
  };
}
