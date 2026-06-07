import type { BrowserContext } from "playwright";
import type { Platform } from "../../../shared/src/errors.js";
import { Sop1Error } from "../../../shared/src/errors.js";
import type { NodeHandlerRunner, RecordedHttpFlowSpec, RecordedHttpSpec, ResponseMappingValue, WorkflowRunContext } from "../../../shared/src/index.js";
import { openPersistentBrowser, requestJson } from "../../../connectors/src/browser.js";
import { interpolateTemplate, resolveReference } from "../context.js";

function extractJsonPath(root: unknown, path: string): unknown {
  if (path === "$") return root;
  if (!path.startsWith("$.")) return undefined;
  const segments = path
    .slice(2)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".");
  let current: unknown = root;
  for (const segment of segments) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function extractRelativeJsonPath(root: unknown, path: string): unknown {
  return extractJsonPath(root, path.startsWith("$.") ? path : `$.${path}`);
}

function projectObject(root: unknown, mapping: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(mapping).map(([key, path]) => [key, extractRelativeJsonPath(root, path)]),
  );
}

function extractResponseMappingValue(root: unknown, mapping: ResponseMappingValue): unknown {
  if (typeof mapping === "string") return extractJsonPath(root, mapping);

  const base = extractJsonPath(root, mapping.path);
  if (Array.isArray(base) && mapping.item_mapping) {
    return base.map((item) => projectObject(item, mapping.item_mapping!));
  }
  if (base && typeof base === "object" && mapping.mapping) {
    return projectObject(base, mapping.mapping);
  }
  return base;
}

function mappingLabel(mapping: ResponseMappingValue): string {
  return typeof mapping === "string" ? mapping : mapping.path;
}

function withQueryString(urlTemplate: string, queryTemplate: Record<string, string> | undefined, context: WorkflowRunContext): string {
  const url = new URL(interpolateTemplate(urlTemplate, context, { strict: true }));
  for (const [key, valueTemplate] of Object.entries(queryTemplate ?? {})) {
    const value = interpolateTemplate(String(valueTemplate), context, { strict: true });
    if (value.length > 0) url.searchParams.set(key, value);
  }
  return url.toString();
}

function renderSpec(spec: RecordedHttpSpec, context: WorkflowRunContext): { url: string; body?: unknown; headers?: Record<string, string> } {
  const url = withQueryString(spec.url_template, spec.query_template, context);
  const bodyText = spec.body_template ? interpolateTemplate(String(spec.body_template), context, { strict: true }) : undefined;
  let body: unknown = bodyText;
  if (bodyText?.trim().startsWith("{") || bodyText?.trim().startsWith("[")) {
    body = JSON.parse(bodyText);
  }
  return { url, body, headers: spec.headers };
}

function isMissingMappedValue(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function assertMappedValue(value: unknown, key: string, mapping: string, platform: Platform, step: string): void {
  if (!isMissingMappedValue(value)) return;
  throw new Sop1Error("DATA_NOT_FOUND", platform, step, `${step} 未映射到输出字段 ${key}`, {
    output: key,
    mapping,
  });
}

function resolveFlowMapping(template: string, context: WorkflowRunContext): unknown {
  const pureReference = template.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
  if (pureReference) return resolveReference(pureReference[1].trim(), context);
  return interpolateTemplate(template, context);
}

function platformForRecordedRequest(definitionType: string, url: string): Platform {
  const typePrefix = definitionType.split(".")[0];
  if (typePrefix === "serviceforce" || typePrefix === "jiuqiu" || typePrefix === "spos") return typePrefix;

  const hostname = new URL(url).hostname;
  if (hostname === "serviceforce.lenovo.com.cn") return "serviceforce";
  if (hostname === "jiuqiu.lenovo.com.cn") return "jiuqiu";
  if (hostname === "spos.lenovo.com.cn") return "spos";

  return "workflow";
}

async function runRecordedHttpSpec(
  spec: RecordedHttpSpec,
  inputs: Record<string, unknown>,
  context: WorkflowRunContext,
  definitionType: string,
): Promise<Record<string, unknown>> {
  const runContext = { ...context, inputs };
  const rendered = renderSpec(spec, runContext);
  if (!runContext.browserContext) throw new Error("browserContext is required for recorded_http");
  const platform = platformForRecordedRequest(definitionType, rendered.url);
  const response = await requestJson<Record<string, unknown>>(
    runContext.browserContext as BrowserContext,
    platform,
    definitionType,
    rendered.url,
    {
      method: spec.method === "GET" ? "GET" : "POST",
      data: rendered.body,
      headers: rendered.headers,
    },
  );
  const output: Record<string, unknown> = {};
  for (const [key, mapping] of Object.entries(spec.response_mapping)) {
    const value = extractResponseMappingValue(response, mapping);
    assertMappedValue(value, key, mappingLabel(mapping), platform, definitionType);
    output[key] = value;
  }
  return output;
}

export function createRecordedHttpHandler(): NodeHandlerRunner {
  return {
    async run(inputs, context, definition) {
      if (!definition.handler.spec) throw new Error(`${definition.type} is missing recorded_http spec`);
      if (definition.handler.kind !== "recorded_http") throw new Error(`${definition.type} must use recorded_http handler`);
      const spec = definition.handler.spec as RecordedHttpSpec;
      const existingContext = context.browserContext as BrowserContext | undefined;
      const session = existingContext ? null : await openPersistentBrowser({ headless: true });
      const browserContext = existingContext ?? session?.context;
      if (!browserContext) throw new Error("browserContext is required for recorded_http");

      try {
        return await runRecordedHttpSpec(spec, inputs, { ...context, browserContext }, definition.type);
      } finally {
        await session?.close();
      }
    },
  };
}

export function createRecordedHttpFlowHandler(): NodeHandlerRunner {
  return {
    async run(inputs, context, definition) {
      if (!definition.handler.spec) throw new Error(`${definition.type} is missing recorded_http_flow spec`);
      if (definition.handler.kind !== "recorded_http_flow") throw new Error(`${definition.type} must use recorded_http_flow handler`);
      const spec = definition.handler.spec as RecordedHttpFlowSpec;
      const existingContext = context.browserContext as BrowserContext | undefined;
      const session = existingContext ? null : await openPersistentBrowser({ headless: true });
      const browserContext = existingContext ?? session?.context;
      if (!browserContext) throw new Error("browserContext is required for recorded_http_flow");

      const nodes: Record<string, unknown> = { ...context.nodes };
      try {
        for (const step of spec.steps) {
          const output = await runRecordedHttpSpec(step, inputs, { ...context, inputs, nodes, browserContext }, definition.type);
          nodes[step.id] = output;
        }
        const output: Record<string, unknown> = {};
        for (const [key, template] of Object.entries(spec.response_mapping)) {
          const value = resolveFlowMapping(template, { ...context, inputs, nodes });
          assertMappedValue(value, key, template, "workflow", definition.type);
          output[key] = value;
        }
        return output;
      } finally {
        await session?.close();
      }
    },
  };
}
