import type { FieldSchema, NodeDefinition, RecordedHttpSpec } from "../../shared/src/index.js";
import type { ValidationResult } from "./schema.js";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ParameterDecision = "input" | "ignored" | "optional_filter" | "constant" | "derived";

export interface ApiCaptureSelectedRequest {
  method: HttpMethod;
  url: string;
  status?: number;
  query?: Record<string, string>;
  body_summary?: unknown;
}

export interface ApiCaptureQueryParameter {
  name: string;
  example?: string;
  meaning?: string;
  source?: "user_action" | "page_default" | "system" | "auth" | "derived" | "unknown";
  decision: ParameterDecision;
  input_name?: string;
  reason?: string;
}

export interface ApiCaptureIgnoredParameter {
  name: string;
  reason: string;
}

export interface ApiCaptureResponseSummary {
  status?: number;
  body_available?: boolean;
  response_shapes?: Array<{
    step_id?: string;
    status?: number;
    body_available?: boolean;
    top_level_fields?: string[];
    list_fields?: Array<{
      path: string;
      item_fields?: string[];
    }>;
    important_fields?: Array<{
      path: string;
      meaning?: string;
      usage?: "intermediate" | "final_output" | "business_evidence" | "ignored";
    }>;
    notes?: string[];
  }>;
  // Backward-compatible with historical recordings. New prompts should use body_available/response_shapes.
  missing_response_body?: boolean;
  body_mapping_evidence?: "response_body" | "missing_response_body" | "low_confidence" | "unknown";
  summary?: string;
}

export interface ApiCaptureNodeMapping {
  inputs?: FieldSchema[];
  outputs?: FieldSchema[];
  query_template?: Record<string, string>;
  body_template?: string;
  response_mapping?: Record<string, ResponseMappingValue>;
}

export interface ApiCaptureStep {
  id: string;
  name?: string;
  description?: string;
  method: HttpMethod;
  url_template: string;
  query_template?: Record<string, string>;
  body_template?: string;
  response_mapping: Record<string, ResponseMappingValue>;
  depends_on?: string[];
  evidence_request_urls?: string[];
}

export interface ApiCaptureSpec {
  type_suggestion: string;
  name: string;
  description: string;
  platform?: string;
  platform_label?: string;
  trigger_action: string;
  business_meaning: string;
  selected_request: ApiCaptureSelectedRequest;
  query_parameters: ApiCaptureQueryParameter[];
  ignored_parameters: ApiCaptureIgnoredParameter[];
  optional_filters: string[];
  response_summary: ApiCaptureResponseSummary;
  node_mapping?: ApiCaptureNodeMapping;
  inputs: FieldSchema[];
  outputs: FieldSchema[];
  steps: ApiCaptureStep[];
  response_mapping?: Record<string, string>;
  confidence?: number;
  notes?: string[];
}

export interface LLMTrace {
  provider?: string;
  model?: string;
  prompt_messages: Array<{ role: "system" | "user"; content: string }>;
  raw_output: string;
  parsed_output?: unknown;
  validation: ValidationResult;
  converted_node?: NodeDefinition;
  node_validation?: ValidationResult;
  created_at: string;
}

export interface LLMExtractionResult {
  apiSpec?: ApiCaptureSpec;
  trace: LLMTrace;
}

const sensitiveKeyPattern = /^(api[-_]?key|authorization|authapitoken|auth|token|cookie|cookies|set-cookie|password|secret|bearer|credential|credentials|x-xsrf-token)$/i;
const sensitiveTextPattern = /(api[-_]?key|authorization|authapitoken|token|cookie|password|secret|x-xsrf-token)/gi;
const systemParameterNames = new Set([
  "_t",
  "timestamp",
  "ts",
  "cachebuster",
  "cache_buster",
  "callback",
  "pageindex",
  "pagenum",
  "pagesize",
  "offset",
  "limit",
  "isdesc",
  "orderby",
  "orderbycol",
  "sort",
]);

type ResponseMappingValue =
  | string
  | {
      path: string;
      item_mapping?: Record<string, string>;
      mapping?: Record<string, string>;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeText(value: string): string {
  return value
    .replace(/("(?:api[-_]?key|authorization|authapitoken|auth|token|cookie|cookies|set-cookie|password|secret|bearer|credential|credentials|x-xsrf-token)"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/((?:api[-_]?key|authorization|authapitoken|token|cookie|password|secret|x-xsrf-token)\s*[=:]\s*)[^\s,;&"]+/gi, "$1[REDACTED]");
}

export function sanitizeForLlmTrace(value: unknown): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeForLlmTrace(item));
  if (!isObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      sensitiveKeyPattern.test(key) || sensitiveTextPattern.test(key) ? "[REDACTED]" : sanitizeForLlmTrace(child),
    ]),
  );
}

function validateFields(fields: unknown, path: string): string[] {
  if (!Array.isArray(fields)) return [`${path} must be an array`];
  return fields.flatMap((field, index) => {
    if (!isObject(field)) return [`${path}[${index}] must be an object`];
    const errors: string[] = [];
    if (typeof field.name !== "string" || field.name.length === 0) errors.push(`${path}[${index}].name must be a non-empty string`);
    if (!["string", "text", "number", "boolean", "object", "array"].includes(String(field.type))) {
      errors.push(`${path}[${index}].type is invalid`);
    }
    return errors;
  });
}

function validateStringRecord(value: unknown, path: string): string[] {
  if (!isObject(value)) return [`${path} must be an object`];
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "string" ? [] : [`${path}.${key} must be a string`],
  );
}

function splitTemplateArguments(value: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      current += char;
      if (char === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim().length > 0) args.push(current.trim());
  return args;
}

function isQuoted(value: string): boolean {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('\\"') && trimmed.endsWith('\\"'))
  );
}

function unquoteTemplateString(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('\\"') ? trimmed.slice(2, -2) : trimmed.slice(1, -1);
}

function isIsoDuration(value: string): boolean {
  return /^[+-]?P(?=.*\d)(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/.test(value);
}

function isInputReference(expression: string): boolean {
  return /^(?:inputs|\$inputs)\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[\d+\])*$/.test(expression);
}

function isStepReference(expression: string): boolean {
  return /^steps\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[\d+\])+$/.test(expression);
}

function isAllowedTimeValue(expression: string): boolean {
  const trimmed = expression.trim();
  return trimmed === "time.today()" || trimmed === "time.now()" || isInputReference(trimmed) || isQuoted(trimmed);
}

function isAllowedTimeExpression(expression: string): boolean {
  const trimmed = expression.trim();
  if (isAllowedTimeValue(trimmed)) return trimmed.startsWith("time.");
  if (trimmed.startsWith("time.add(") && trimmed.endsWith(")")) {
    const args = splitTemplateArguments(trimmed.slice("time.add(".length, -1));
    return args.length === 2 && isAllowedTimeValue(args[0]) && isQuoted(args[1]) && isIsoDuration(unquoteTemplateString(args[1]));
  }
  if (trimmed.startsWith("time.format(") && trimmed.endsWith(")")) {
    const args = splitTemplateArguments(trimmed.slice("time.format(".length, -1));
    return args.length === 2 && (isAllowedTimeValue(args[0]) || isAllowedTimeExpression(args[0])) && isQuoted(args[1]);
  }
  return false;
}

function isAllowedTemplateExpression(expression: string): boolean {
  const trimmed = expression.trim();
  return isInputReference(trimmed) || isStepReference(trimmed) || isAllowedTimeExpression(trimmed);
}

function validateTemplateString(value: unknown, path: string): string[] {
  if (typeof value !== "string") return [];
  const errors: string[] = [];
  for (const match of value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const expression = match[1].trim();
    if (!isAllowedTemplateExpression(expression)) {
      errors.push(`${path} contains unsupported template expression: ${expression}`);
    }
  }
  return errors;
}

function validateTemplateRecord(value: unknown, path: string): string[] {
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => validateTemplateString(child, `${path}.${key}`));
}

function validateSimpleJsonPath(mapping: string, path: string): string[] {
  const errors: string[] = [];
  if (mapping.includes("[*]")) {
    errors.push(`${path} uses wildcard JSONPath, which is not supported by the recorded_http runner`);
  }
  if (mapping.startsWith("$.") && !/^\$(?:\.[A-Za-z_$][\w$]*|\[\d+\])+$/.test(mapping)) {
    errors.push(`${path} must use a simple JSONPath like $.data[0].field`);
  }
  return errors;
}

function validateProjectionMapping(value: Record<string, unknown>, path: string): string[] {
  const errors: string[] = [];
  if (typeof value.path !== "string" || value.path.length === 0) {
    errors.push(`${path}.path must be a non-empty string`);
  } else {
    errors.push(...validateSimpleJsonPath(value.path, `${path}.path`));
  }
  if (value.item_mapping !== undefined) errors.push(...validateStringRecord(value.item_mapping, `${path}.item_mapping`));
  if (value.mapping !== undefined) errors.push(...validateStringRecord(value.mapping, `${path}.mapping`));
  if (isObject(value.item_mapping)) {
    for (const [key, mapping] of Object.entries(value.item_mapping)) {
      if (typeof mapping === "string") errors.push(...validateSimpleJsonPath(mapping, `${path}.item_mapping.${key}`));
    }
  }
  if (isObject(value.mapping)) {
    for (const [key, mapping] of Object.entries(value.mapping)) {
      if (typeof mapping === "string") errors.push(...validateSimpleJsonPath(mapping, `${path}.mapping.${key}`));
    }
  }
  return errors;
}

function validateResponseMapping(value: unknown, path: string): string[] {
  if (!isObject(value)) return [`${path} must be an object`];
  const errors: string[] = [];
  for (const [key, mapping] of Object.entries(value)) {
    if (typeof mapping === "string") {
      errors.push(...validateSimpleJsonPath(mapping, `${path}.${key}`));
      continue;
    }
    if (isObject(mapping)) {
      errors.push(...validateProjectionMapping(mapping, `${path}.${key}`));
      continue;
    }
    errors.push(`${path}.${key} must be a string or projection object`);
  }
  return errors;
}

function validateStepResponseMapping(value: unknown, path: string): string[] {
  return validateResponseMapping(value, path);
}

function validateResponseSummary(value: unknown): string[] {
  if (!isObject(value)) return ["response_summary must be an object"];
  const errors: string[] = [];
  if (value.response_shapes !== undefined && !Array.isArray(value.response_shapes)) {
    errors.push("response_summary.response_shapes must be an array");
  }
  return errors;
}

function normalizeParamName(value: string): string {
  return value.trim().toLowerCase();
}

function isSystemParameter(name: string): boolean {
  return systemParameterNames.has(normalizeParamName(name));
}

function parseUrlQuery(url: string): Record<string, string> {
  try {
    return Object.fromEntries(new URL(url).searchParams.entries());
  } catch {
    return {};
  }
}

function requestKey(method: string, url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return `${method.toUpperCase()} ${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return undefined;
  }
}

function countNonEmptyBusinessQuery(query: Record<string, string>): number {
  return Object.entries(query).filter(([key, value]) => !isSystemParameter(key) && value.trim().length > 0).length;
}

function collectQuery(value: Record<string, unknown>): Record<string, string> {
  if (isObject(value.selected_request) && isObject(value.selected_request.query)) {
    return Object.fromEntries(Object.entries(value.selected_request.query).map(([key, child]) => [key, String(child ?? "")]));
  }
  if (isObject(value.selected_request) && typeof value.selected_request.url === "string") {
    return parseUrlQuery(value.selected_request.url);
  }
  return {};
}

function validateParameterEvidence(value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const inputs = new Set(
    (Array.isArray(value.inputs) ? value.inputs : [])
      .filter(isObject)
      .map((field) => String(field.name ?? "").toLowerCase())
      .filter(Boolean),
  );
  const nodeMapping = isObject(value.node_mapping) ? value.node_mapping : {};
  const mappedQueryKeys = new Set(
    isObject(nodeMapping.query_template) ? Object.keys(nodeMapping.query_template).map((key) => key.toLowerCase()) : [],
  );
  const ignored = new Set(
    (Array.isArray(value.ignored_parameters) ? value.ignored_parameters : [])
      .filter(isObject)
      .map((parameter) => String(parameter.name ?? "").toLowerCase())
      .filter(Boolean),
  );
  const queryParameters = Array.isArray(value.query_parameters) ? value.query_parameters.filter(isObject) : [];
  const selectedQuery = collectQuery(value);

  for (const [name, example] of Object.entries(selectedQuery)) {
    if (example.trim().length === 0 || isSystemParameter(name)) continue;
    const parameter = queryParameters.find((item) => normalizeParamName(String(item.name ?? "")) === normalizeParamName(name));
    const inputName = isObject(parameter) && typeof parameter.input_name === "string" ? parameter.input_name.toLowerCase() : name.toLowerCase();
    const decision = isObject(parameter) ? String(parameter.decision ?? "") : "";
    const isMapped = inputs.has(inputName) || inputs.has(name.toLowerCase()) || mappedQueryKeys.has(name.toLowerCase());
    if (!isMapped && !ignored.has(name.toLowerCase()) && decision !== "ignored") {
      errors.push(`selected_request.query.${name} is a non-empty business parameter and must be mapped to inputs/node_mapping.query_template or explained in ignored_parameters`);
    }
  }

  for (const parameter of queryParameters) {
    const decision = String(parameter.decision ?? "");
    if (decision !== "input") continue;
    const name = String(parameter.name ?? "");
    const inputName = typeof parameter.input_name === "string" ? parameter.input_name : name;
    if (!inputs.has(inputName.toLowerCase()) && !mappedQueryKeys.has(name.toLowerCase())) {
      errors.push(`query_parameters.${name} is marked as input but is missing from inputs or node_mapping.query_template`);
    }
  }

  return errors;
}

export function validateApiCaptureSpec(
  value: unknown,
  context: { capturedRequests?: Array<{ method: string; url: string; status?: number; responseBody?: unknown }> } = {},
): ValidationResult {
  if (!isObject(value)) return { valid: false, errors: ["api capture spec must be an object"] };
  const errors: string[] = [];
  for (const key of ["type_suggestion", "name", "description", "trigger_action", "business_meaning"] as const) {
    if (typeof value[key] !== "string" || value[key].length === 0) errors.push(`${key} must be a non-empty string`);
  }
  errors.push(...validateFields(value.inputs, "inputs"));
  errors.push(...validateFields(value.outputs, "outputs"));
  if (!isObject(value.selected_request)) {
    errors.push("selected_request must be an object");
  } else {
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(String(value.selected_request.method))) {
      errors.push("selected_request.method is invalid");
    }
    if (typeof value.selected_request.url !== "string" || value.selected_request.url.length === 0) {
      errors.push("selected_request.url must be a non-empty string");
    }
    if (value.selected_request.query !== undefined) errors.push(...validateStringRecord(value.selected_request.query, "selected_request.query"));
  }
  if (!Array.isArray(value.query_parameters)) {
    errors.push("query_parameters must be an array");
  } else {
    value.query_parameters.forEach((parameter, index) => {
      const path = `query_parameters[${index}]`;
      if (!isObject(parameter)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (typeof parameter.name !== "string" || parameter.name.length === 0) errors.push(`${path}.name must be a non-empty string`);
      if (!["input", "ignored", "optional_filter", "constant", "derived"].includes(String(parameter.decision))) {
        errors.push(`${path}.decision is invalid`);
      }
    });
  }
  if (!Array.isArray(value.ignored_parameters)) {
    errors.push("ignored_parameters must be an array");
  } else {
    value.ignored_parameters.forEach((parameter, index) => {
      const path = `ignored_parameters[${index}]`;
      if (!isObject(parameter)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (typeof parameter.name !== "string" || parameter.name.length === 0) errors.push(`${path}.name must be a non-empty string`);
      if (typeof parameter.reason !== "string" || parameter.reason.length === 0) errors.push(`${path}.reason must be a non-empty string`);
    });
  }
  if (!Array.isArray(value.optional_filters)) errors.push("optional_filters must be an array");
  errors.push(...validateResponseSummary(value.response_summary));
  if (value.node_mapping !== undefined) {
    if (!isObject(value.node_mapping)) {
      errors.push("node_mapping must be an object");
    } else {
      if (value.node_mapping.inputs !== undefined) errors.push(...validateFields(value.node_mapping.inputs, "node_mapping.inputs"));
      if (value.node_mapping.outputs !== undefined) errors.push(...validateFields(value.node_mapping.outputs, "node_mapping.outputs"));
      if (value.node_mapping.query_template !== undefined) errors.push(...validateStringRecord(value.node_mapping.query_template, "node_mapping.query_template"));
      if (value.node_mapping.query_template !== undefined) errors.push(...validateTemplateRecord(value.node_mapping.query_template, "node_mapping.query_template"));
      if (value.node_mapping.body_template !== undefined) errors.push(...validateTemplateString(value.node_mapping.body_template, "node_mapping.body_template"));
      if (value.node_mapping.response_mapping !== undefined) errors.push(...validateResponseMapping(value.node_mapping.response_mapping, "node_mapping.response_mapping"));
    }
  }

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    errors.push("steps must be a non-empty array");
  } else {
    value.steps.forEach((step, index) => {
      const path = `steps[${index}]`;
      if (!isObject(step)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (typeof step.id !== "string" || step.id.length === 0) errors.push(`${path}.id must be a non-empty string`);
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(String(step.method))) errors.push(`${path}.method is invalid`);
      if (typeof step.url_template !== "string" || step.url_template.length === 0) {
        errors.push(`${path}.url_template must be a non-empty string`);
      }
      errors.push(...validateTemplateString(step.url_template, `${path}.url_template`));
      if (step.query_template !== undefined) errors.push(...validateTemplateRecord(step.query_template, `${path}.query_template`));
      if (step.body_template !== undefined) errors.push(...validateTemplateString(step.body_template, `${path}.body_template`));
      errors.push(...validateStepResponseMapping(step.response_mapping, `${path}.response_mapping`));
    });
  }
  errors.push(...validateParameterEvidence(value));
  if (isObject(value.response_mapping)) {
    errors.push(...validateTemplateRecord(value.response_mapping, "response_mapping"));
  }

  if (isObject(value.selected_request) && typeof value.selected_request.url === "string" && typeof value.selected_request.method === "string") {
    const selectedKey = requestKey(value.selected_request.method, value.selected_request.url);
    const selectedQuery = collectQuery(value);
    const selectedCount = countNonEmptyBusinessQuery(selectedQuery);
    const betterRequest = context.capturedRequests?.find((request) => {
      if (requestKey(request.method, request.url) !== selectedKey) return false;
      return countNonEmptyBusinessQuery(parseUrlQuery(request.url)) > selectedCount;
    });
    if (betterRequest) {
      errors.push("selected_request chose a request with fewer non-empty business query parameters than another captured request on the same path");
    }
  }

  return { valid: errors.length === 0, errors };
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toRecordedHttpSpec(step: ApiCaptureStep): RecordedHttpSpec {
  return {
    method: step.method,
    url_template: step.url_template,
    query_template: step.query_template,
    body_template: step.body_template,
    response_mapping: step.response_mapping,
  };
}

function defaultFlowResponseMapping(spec: ApiCaptureSpec): Record<string, string> {
  const lastStep = spec.steps[spec.steps.length - 1];
  return Object.fromEntries(spec.outputs.map((output) => [output.name, `{{ steps.${lastStep.id}.${output.name} }}`]));
}

export function apiCaptureSpecToNodeDefinition(
  spec: ApiCaptureSpec,
  options: { name?: string; description?: string; recordingId?: string } = {},
): NodeDefinition {
  const mapping = spec.node_mapping ?? {};
  const steps = spec.steps.map((step) => ({
    ...toRecordedHttpSpec(step),
    id: step.id,
    name: step.name,
    description: step.description,
    depends_on: step.depends_on,
  }));
  const type = slug(spec.type_suggestion.includes(".") ? spec.type_suggestion : `recorded.${spec.type_suggestion}`) || "recorded.captured_api";
  const handler =
    steps.length === 1
      ? { kind: "recorded_http" as const, spec: toRecordedHttpSpec({
          ...spec.steps[0],
          query_template: mapping.query_template ?? spec.steps[0].query_template,
          body_template: mapping.body_template ?? spec.steps[0].body_template,
          response_mapping: mapping.response_mapping ?? spec.steps[0].response_mapping,
        }) }
      : {
          kind: "recorded_http_flow" as const,
          spec: {
            steps,
            response_mapping: spec.response_mapping ?? defaultFlowResponseMapping(spec),
          },
        };

  return {
    type,
    category: "recorded",
    platform: spec.platform,
    platform_label: spec.platform_label,
    name: options.name ?? spec.name,
    description: options.description || spec.description,
    inputs: mapping.inputs?.length ? mapping.inputs : spec.inputs,
    outputs: mapping.outputs?.length ? mapping.outputs : spec.outputs,
    handler,
    metadata: {
      source_recording_id: options.recordingId,
    },
  };
}
