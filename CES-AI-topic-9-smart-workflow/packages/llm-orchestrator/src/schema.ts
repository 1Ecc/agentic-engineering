import type { NodeDefinition, Workflow } from "../../shared/src/index.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type JsonSchema = Record<string, unknown>;

const fieldSchema: JsonSchema = {
  type: "object",
  required: ["name", "type"],
  additionalProperties: true,
  properties: {
    name: { type: "string" },
    type: { enum: ["string", "text", "number", "boolean", "object", "array"] },
    label: { type: "string" },
    required: { type: "boolean" },
    description: { type: "string" }
  }
};

export const workflowJsonSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Workflow",
  type: "object",
  required: ["id", "name", "inputs", "nodes"],
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    inputs: { type: "array", items: fieldSchema },
    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "type"],
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          inputs: { type: "object" },
          dependsOn: { type: "array", items: { type: "string" } },
          when: { type: "string" },
          then: { type: "string" }
        }
      }
    },
    outputs: { type: "object" }
  }
};

export const nodeJsonSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "NodeDefinition",
  type: "object",
  required: ["type", "category", "name", "description", "inputs", "outputs", "handler"],
  additionalProperties: false,
  properties: {
    type: { type: "string" },
    category: { enum: ["builtin", "connector", "recorded"] },
    name: { type: "string" },
    description: { type: "string" },
    icon: { type: "string" },
    inputs: { type: "array", items: fieldSchema },
    outputs: { type: "array", items: fieldSchema },
    handler: {
      type: "object",
      required: ["kind"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["connector", "builtin", "recorded_http", "recorded_http_flow"] },
        name: { type: "string" },
        spec: {
          type: "object",
          additionalProperties: false,
          properties: {
            method: { enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            url_template: { type: "string" },
            headers: { type: "object" },
            query_template: { type: "object" },
            body_template: { type: "string" },
            response_mapping: { type: "object" },
            steps: { type: "array" }
          }
        }
      }
    },
    metadata: { type: "object" }
  }
};

const forbiddenAuthKeys = new Set([
  "auth",
  "authorization",
  "auth_token",
  "token",
  "cookie",
  "cookies",
  "bearer",
  "credential",
  "credentials",
  "secret",
  "password"
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasForbiddenAuthField(value: unknown, path = "$"): string[] {
  if (!isObject(value) && !Array.isArray(value)) {
    return [];
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);

  const errors: string[] = [];
  for (const [key, child] of entries) {
    const normalized = key.toLowerCase();
    if (forbiddenAuthKeys.has(normalized)) {
      errors.push(`${path}.${key} must not declare auth or credential fields`);
    }
    errors.push(...hasForbiddenAuthField(child, `${path}.${key}`));
  }
  return errors;
}

function validateFields(fields: unknown, path: string): string[] {
  if (!Array.isArray(fields)) {
    return [`${path} must be an array`];
  }

  return fields.flatMap((field, index) => {
    const currentPath = `${path}[${index}]`;
    if (!isObject(field)) {
      return [`${currentPath} must be an object`];
    }

    const errors: string[] = [];
    if (typeof field.name !== "string" || field.name.length === 0) {
      errors.push(`${currentPath}.name must be a non-empty string`);
    }
    if (!["string", "text", "number", "boolean", "object", "array"].includes(String(field.type))) {
      errors.push(`${currentPath}.type is invalid`);
    }
    return errors;
  });
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

function unquote(value: string): string {
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
  if (trimmed === "time.today()" || trimmed === "time.now()") return true;
  if (trimmed.startsWith("time.add(") && trimmed.endsWith(")")) {
    const args = splitTemplateArguments(trimmed.slice("time.add(".length, -1));
    return args.length === 2 && isAllowedTimeValue(args[0]) && isQuoted(args[1]) && isIsoDuration(unquote(args[1]));
  }
  if (trimmed.startsWith("time.format(") && trimmed.endsWith(")")) {
    const args = splitTemplateArguments(trimmed.slice("time.format(".length, -1));
    return args.length === 2 && (isAllowedTimeValue(args[0]) || isAllowedTimeExpression(args[0])) && isQuoted(args[1]);
  }
  return false;
}

function validateTemplateString(value: unknown, path: string): string[] {
  if (typeof value !== "string") return [];
  const errors: string[] = [];
  for (const match of value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const expression = match[1].trim();
    if (!isInputReference(expression) && !isStepReference(expression) && !isAllowedTimeExpression(expression)) {
      errors.push(`${path} contains unsupported template expression: ${expression}`);
    }
  }
  return errors;
}

function validateTemplateRecord(value: unknown, path: string): string[] {
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => validateTemplateString(child, `${path}.${key}`));
}

function validateRecordedHttpSpec(spec: unknown, path: string): string[] {
  if (!isObject(spec)) return [`${path} must be an object`];
  const errors: string[] = [];
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(String(spec.method))) {
    errors.push(`${path}.method is invalid`);
  }
  if (typeof spec.url_template !== "string" || spec.url_template.length === 0) {
    errors.push(`${path}.url_template must be a non-empty string`);
  }
  errors.push(...validateTemplateString(spec.url_template, `${path}.url_template`));
  if (spec.query_template !== undefined) errors.push(...validateTemplateRecord(spec.query_template, `${path}.query_template`));
  if (spec.body_template !== undefined) errors.push(...validateTemplateString(spec.body_template, `${path}.body_template`));
  if (!isObject(spec.response_mapping)) {
    errors.push(`${path}.response_mapping must be an object`);
  } else {
    errors.push(...validateTemplateRecord(spec.response_mapping, `${path}.response_mapping`));
  }
  return errors;
}

function validateRecordedHttpFlowSpec(spec: unknown, path: string): string[] {
  if (!isObject(spec)) return [`${path} must be an object`];
  const errors: string[] = [];
  if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
    errors.push(`${path}.steps must be a non-empty array`);
  } else {
    spec.steps.forEach((step, index) => {
      const stepPath = `${path}.steps[${index}]`;
      if (!isObject(step)) {
        errors.push(`${stepPath} must be an object`);
        return;
      }
      if (typeof step.id !== "string" || step.id.length === 0) {
        errors.push(`${stepPath}.id must be a non-empty string`);
      }
      errors.push(...validateRecordedHttpSpec(step, stepPath));
    });
  }
  if (!isObject(spec.response_mapping)) {
    errors.push(`${path}.response_mapping must be an object`);
  } else {
    errors.push(...validateTemplateRecord(spec.response_mapping, `${path}.response_mapping`));
  }
  return errors;
}

export function validateWorkflow(workflow: unknown, availableNodeTypes: Iterable<string>): ValidationResult {
  const errors: string[] = [];
  const nodeTypes = new Set(availableNodeTypes);

  if (!isObject(workflow)) {
    return { valid: false, errors: ["workflow must be an object"] };
  }

  if (typeof workflow.id !== "string" || workflow.id.length === 0) {
    errors.push("workflow.id must be a non-empty string");
  }
  if (typeof workflow.name !== "string" || workflow.name.length === 0) {
    errors.push("workflow.name must be a non-empty string");
  }

  errors.push(...validateFields(workflow.inputs, "workflow.inputs"));

  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    errors.push("workflow.nodes must be a non-empty array");
  } else {
    for (const [index, node] of workflow.nodes.entries()) {
      const path = `workflow.nodes[${index}]`;
      if (!isObject(node)) {
        errors.push(`${path} must be an object`);
        continue;
      }
      if (typeof node.id !== "string" || node.id.length === 0) {
        errors.push(`${path}.id must be a non-empty string`);
      }
      if (typeof node.type !== "string" || node.type.length === 0) {
        errors.push(`${path}.type must be a non-empty string`);
      } else if (!nodeTypes.has(node.type)) {
        errors.push(`${path}.type "${node.type}" is not registered`);
      }
      if (node.dependsOn !== undefined && (!Array.isArray(node.dependsOn) || node.dependsOn.some((item) => typeof item !== "string" || item.length === 0))) {
        errors.push(`${path}.dependsOn must be an array of non-empty strings`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateNodeDefinition(node: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(node)) {
    return { valid: false, errors: ["node definition must be an object"] };
  }

  for (const key of ["type", "category", "name", "description"] as const) {
    if (typeof node[key] !== "string" || node[key].length === 0) {
      errors.push(`node.${key} must be a non-empty string`);
    }
  }

  if (!["builtin", "connector", "recorded"].includes(String(node.category))) {
    errors.push("node.category is invalid");
  }

  errors.push(...validateFields(node.inputs, "node.inputs"));
  errors.push(...validateFields(node.outputs, "node.outputs"));

  if (!isObject(node.handler)) {
    errors.push("node.handler must be an object");
  } else {
    const kind = String(node.handler.kind);
    if (!["connector", "builtin", "recorded_http", "recorded_http_flow"].includes(kind)) {
      errors.push("node.handler.kind is invalid");
    }
    if (kind === "recorded_http") {
      errors.push(...validateRecordedHttpSpec(node.handler.spec, "node.handler.spec"));
    }
    if (kind === "recorded_http_flow") {
      errors.push(...validateRecordedHttpFlowSpec(node.handler.spec, "node.handler.spec"));
    }
  }

  errors.push(...hasForbiddenAuthField(node));

  return { valid: errors.length === 0, errors };
}

export function assertValidWorkflow(workflow: Workflow, availableNodeTypes: Iterable<string>): void {
  const result = validateWorkflow(workflow, availableNodeTypes);
  if (!result.valid) {
    throw new Error(`Invalid workflow: ${result.errors.join("; ")}`);
  }
}

export function assertValidNodeDefinition(node: NodeDefinition): void {
  const result = validateNodeDefinition(node);
  if (!result.valid) {
    throw new Error(`Invalid node definition: ${result.errors.join("; ")}`);
  }
}
