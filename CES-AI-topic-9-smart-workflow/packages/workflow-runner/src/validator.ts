import type { FieldSchema, NodeDefinition, Workflow } from "../../shared/src/index.js";
import { validateWorkflow } from "../../llm-orchestrator/src/schema.js";
import type { NodeRegistry } from "./node-registry.js";

export interface WorkflowValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: WorkflowValidationIssue[];
}

interface Reference {
  kind: "input" | "node";
  source: string;
  name: string;
  field?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(issues: WorkflowValidationIssue[], level: "error" | "warning", path: string, message: string): void {
  issues.push({ level, path, message });
}

function firstSegment(path: string): string {
  return path.split(/[.[\]]/).filter(Boolean)[0] ?? "";
}

function extractReference(expression: string): Reference | null {
  const trimmed = expression.trim();
  if (trimmed.startsWith("time.")) return null;
  if (trimmed.startsWith("$inputs.")) {
    const path = trimmed.slice("$inputs.".length);
    return { kind: "input", source: trimmed, name: firstSegment(path) };
  }
  if (trimmed.startsWith("inputs.")) {
    const path = trimmed.slice("inputs.".length);
    return { kind: "input", source: trimmed, name: firstSegment(path) };
  }
  if (trimmed.startsWith("steps.")) {
    const path = trimmed.slice("steps.".length);
    const [name, ...field] = path.split(".");
    return { kind: "node", source: trimmed, name, field: firstSegment(field.join(".")) };
  }
  if (trimmed.startsWith("$")) {
    const [name, ...field] = trimmed.slice(1).split(".");
    return { kind: "node", source: trimmed, name, field: firstSegment(field.join(".")) };
  }
  if (/^[A-Za-z_][\w$-]*\.[A-Za-z_][\w$-]*/.test(trimmed)) {
    const [name, ...field] = trimmed.split(".");
    return { kind: "node", source: trimmed, name, field: firstSegment(field.join(".")) };
  }
  return null;
}

function collectReferences(value: unknown): Reference[] {
  if (typeof value === "string") {
    const refs: Reference[] = [];
    const direct = value.startsWith("$") && !value.includes(" ") ? extractReference(value) : null;
    if (direct) refs.push(direct);
    for (const match of value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      const ref = extractReference(match[1]);
      if (ref) refs.push(ref);
    }
    return refs;
  }
  if (Array.isArray(value)) return value.flatMap(collectReferences);
  if (isObject(value)) return Object.values(value).flatMap(collectReferences);
  return [];
}

function fieldNames(fields: FieldSchema[]): Set<string> {
  return new Set(fields.map((field) => field.name));
}

function describeRef(ref: Reference): string {
  return ref.kind === "input" ? `input "${ref.name}"` : `node "${ref.name}"${ref.field ? ` output "${ref.field}"` : ""}`;
}

function validateReferences(
  issues: WorkflowValidationIssue[],
  refs: Reference[],
  path: string,
  workflowInputs: Set<string>,
  nodeOutputs: Map<string, Set<string>>,
  allowedNodeIds: Set<string>,
  wildcardNodeIds = new Set<string>(),
): void {
  for (const ref of refs) {
    if (ref.kind === "input") {
      if (!workflowInputs.has(ref.name)) addIssue(issues, "error", path, `Unknown ${describeRef(ref)} in ${ref.source}`);
      continue;
    }
    if (!allowedNodeIds.has(ref.name)) {
      addIssue(issues, "error", path, `Reference ${ref.source} must point to a previous node`);
      continue;
    }
    if (ref.field && !wildcardNodeIds.has(ref.name) && !nodeOutputs.get(ref.name)?.has(ref.field)) {
      addIssue(issues, "error", path, `Unknown ${describeRef(ref)} in ${ref.source}`);
    }
  }
}

function resolveNode(registry: NodeRegistry, type: string): NodeDefinition | null {
  try {
    return registry.resolve(type).def;
  } catch {
    return null;
  }
}

export function validateExecutableWorkflow(workflow: Workflow, registry: NodeRegistry): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const base = validateWorkflow(workflow, registry.types());
  for (const error of base.errors) addIssue(issues, "error", "workflow", error);

  const workflowInputs = fieldNames(workflow.inputs ?? []);
  const seenNodeIds = new Set<string>();
  const availableNodeIds = new Set<string>();
  const allNodeOutputs = new Map<string, Set<string>>();
  const wildcardNodeIds = new Set<string>();

  for (const [index, node] of (workflow.nodes ?? []).entries()) {
    const nodePath = `nodes[${index}]`;
    if (!node?.id) continue;
    if (seenNodeIds.has(node.id)) addIssue(issues, "error", `${nodePath}.id`, `Duplicate node id "${node.id}"`);
    seenNodeIds.add(node.id);

    const def = resolveNode(registry, node.type);
    if (!def) continue;
    if (node.dependsOn !== undefined) {
      if (!Array.isArray(node.dependsOn)) {
        addIssue(issues, "error", `${nodePath}.dependsOn`, "dependsOn must be an array of node ids");
      } else {
        for (const dependency of node.dependsOn) {
          if (typeof dependency !== "string" || dependency.length === 0) {
            addIssue(issues, "error", `${nodePath}.dependsOn`, "dependsOn must contain non-empty node ids");
            continue;
          }
          if (!availableNodeIds.has(dependency)) {
            addIssue(issues, "error", `${nodePath}.dependsOn`, `Dependency "${dependency}" must point to a previous node`);
          }
        }
      }
    }
    const acceptedInputs = fieldNames(def.inputs);
    const requiredInputs = def.inputs.filter((input) => input.required).map((input) => input.name);
    const configuredInputs = isObject(node.inputs) ? node.inputs : {};

    if (node.inputs !== undefined && !isObject(node.inputs)) {
      addIssue(issues, "error", `${nodePath}.inputs`, "Node inputs must be an object");
    }
    for (const required of requiredInputs) {
      if (!(required in configuredInputs)) addIssue(issues, "error", `${nodePath}.inputs.${required}`, `Missing required input "${required}" for ${node.type}`);
    }
    for (const key of Object.keys(configuredInputs)) {
      if (!acceptedInputs.has(key)) addIssue(issues, "error", `${nodePath}.inputs.${key}`, `Input "${key}" is not defined by ${node.type}`);
    }

    validateReferences(issues, collectReferences(configuredInputs), `${nodePath}.inputs`, workflowInputs, allNodeOutputs, availableNodeIds, wildcardNodeIds);
    if (node.when) validateReferences(issues, collectReferences(node.when), `${nodePath}.when`, workflowInputs, allNodeOutputs, availableNodeIds, wildcardNodeIds);

    allNodeOutputs.set(node.id, fieldNames(def.outputs));
    if (node.type === "data.compose") wildcardNodeIds.add(node.id);
    availableNodeIds.add(node.id);
  }

  validateReferences(
    issues,
    collectReferences(workflow.outputs ?? {}),
    "outputs",
    workflowInputs,
    allNodeOutputs,
    new Set((workflow.nodes ?? []).map((node) => node.id)),
    wildcardNodeIds,
  );

  const errors = issues.filter((issue) => issue.level === "error").map((issue) => `${issue.path}: ${issue.message}`);
  const warnings = issues.filter((issue) => issue.level === "warning").map((issue) => `${issue.path}: ${issue.message}`);
  return { valid: errors.length === 0, errors, warnings, issues };
}
