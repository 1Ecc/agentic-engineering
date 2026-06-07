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

async function callDeepSeek(messages: Array<{ role: "system" | "user"; content: string }>): Promise<string> {
  const response = await fetch(process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages,
      temperature: 0.1,
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek request failed: ${response.status}`);
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export function createDeepSeekAdapter(): LLMAdapter {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek");
  return {
    async *generateWorkflow(input) {
      const content = await callDeepSeek([
        { role: "system", content: "You are an enterprise workflow YAML orchestration assistant. Output YAML only." },
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
      const content = await callDeepSeek(messages);
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
          provider: "deepseek",
          model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
          prompt_messages: messages,
          raw_output: content,
          parsed_output: parsedOutput,
          validation,
          created_at: new Date().toISOString(),
        },
      };
    },
    async generateResultViews(input): Promise<string> {
      return callDeepSeek([
        { role: "system", content: "You are an enterprise result visualization schema assistant. Output JSON array only." },
        { role: "user", content: buildResultViewPrompt(input) },
      ]);
    },
    async generateNodeFromCurl(input): Promise<string> {
      return callDeepSeek([
        { role: "system", content: "You are an enterprise HTTP node schema assistant. Output JSON object only." },
        { role: "user", content: buildNodeFromCurlPrompt(input) },
      ]);
    },
  };
}
