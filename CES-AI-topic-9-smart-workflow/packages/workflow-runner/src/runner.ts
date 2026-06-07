import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "playwright";
import type { RunLog, RunRecord, Workflow, WorkflowNode, WorkflowRunContext } from "../../shared/src/index.js";
import { validateWorkflow } from "../../llm-orchestrator/src/schema.js";
import { interpolateValue } from "./context.js";
import { NodeRegistry } from "./node-registry.js";
import { parseYaml } from "./yaml.js";

export interface RunWorkflowOptions {
  registry: NodeRegistry;
  inputs: Record<string, unknown>;
  browserContext?: BrowserContext;
  dataDir?: string;
  persist?: boolean;
  runId?: string;
  onLog?(log: RunLog): void | Promise<void>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringRecord(value: unknown): Record<string, unknown> | undefined {
  return isObject(value) ? value : undefined;
}

export function parseWorkflow(source: Workflow | string): Workflow {
  if (typeof source !== "string") return source;
  const trimmed = source.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as Workflow;

  const parsed = parseYaml(source);
  if (!isObject(parsed)) return { id: "", name: "", inputs: [], nodes: [] };
  return {
    id: String(parsed.id ?? ""),
    name: String(parsed.name ?? ""),
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    created_at: typeof parsed.created_at === "string" ? parsed.created_at : undefined,
    updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : undefined,
    inputs: Array.isArray(parsed.inputs) ? (parsed.inputs as unknown as Workflow["inputs"]) : [],
    nodes: Array.isArray(parsed.nodes) ? (parsed.nodes as unknown as Workflow["nodes"]) : [],
    outputs: toStringRecord(parsed.outputs),
    views: Array.isArray(parsed.views) ? (parsed.views as unknown as Workflow["views"]) : undefined,
  };
}

function renderOutputs(outputs: Workflow["outputs"], context: WorkflowRunContext): Record<string, unknown> {
  if (!outputs) return context.nodes;
  return interpolateValue(outputs, { inputs: context.inputs, nodes: context.nodes }) as Record<string, unknown>;
}

function shouldRunNode(when: string | undefined, context: WorkflowRunContext): boolean {
  if (!when) return true;
  const value = interpolateValue(when, context);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim() !== "" && value.trim() !== "false";
  return Boolean(value);
}

function dependenciesForNode(nodes: WorkflowNode[], index: number): string[] {
  const node = nodes[index];
  if (node.dependsOn) return node.dependsOn;
  return index > 0 ? [nodes[index - 1].id] : [];
}

function buildExecutionBatches(nodes: WorkflowNode[]): WorkflowNode[][] {
  const remaining = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const completed = new Set<string>();
  const batches: WorkflowNode[][] = [];

  while (remaining.size > 0) {
    const ready: WorkflowNode[] = [];
    for (const { node, index } of remaining.values()) {
      const deps = dependenciesForNode(nodes, index);
      if (deps.every((dep) => completed.has(dep))) ready.push(node);
    }

    if (ready.length === 0) {
      throw new Error("Invalid workflow dependencies: cycle or missing dependency");
    }

    batches.push(ready);
    for (const node of ready) {
      remaining.delete(node.id);
      completed.add(node.id);
    }
  }

  return batches;
}

export async function runWorkflow(source: Workflow | string, options: RunWorkflowOptions): Promise<RunRecord> {
  const workflow = parseWorkflow(source);
  const validation = validateWorkflow(workflow, options.registry.types());
  if (!validation.valid) throw new Error(`Invalid workflow: ${validation.errors.join("; ")}`);

  const runId = options.runId ?? `run_${Date.now()}`;
  const logs: RunLog[] = [];
  const startedAt = new Date().toISOString();
  const context: WorkflowRunContext = {
    inputs: options.inputs,
    nodes: {},
    browserContext: options.browserContext,
  };

  const emit = async (log: Omit<RunLog, "run_id" | "workflow_id" | "timestamp">) => {
    const fullLog: RunLog = {
      ...log,
      run_id: runId,
      workflow_id: workflow.id,
      timestamp: new Date().toISOString(),
    };
    logs.push(fullLog);
    await options.onLog?.(fullLog);
  };
  context.emit = emit;

  await emit({ level: "info", event: "run_started", message: `Workflow ${workflow.name} started` });

  try {
    const batches = buildExecutionBatches(workflow.nodes);
    let batchIndex = 0;
    for (const batch of batches) {
      batchIndex += 1;
      await Promise.all(batch.map(async (node) => {
      const { def, handler } = options.registry.resolve(node.type);
      if (!shouldRunNode(node.when, context)) {
        const skipped = { skipped: true, reason: node.when, batch: batchIndex };
        context.nodes[node.id] = skipped;
        await emit({
          level: "info",
          event: "node_skipped",
          node_id: node.id,
          node_type: node.type,
          message: `${node.id} skipped`,
          data: skipped,
        });
        return;
      }
      const resolvedInputs = interpolateValue(node.inputs ?? {}, context) as Record<string, unknown>;
      await emit({
        level: "info",
        event: "node_started",
        node_id: node.id,
        node_type: node.type,
        message: `${node.id} started`,
        data: { inputs: resolvedInputs, batch: batchIndex },
      });
      try {
        const output = await handler.run(resolvedInputs, context, def);
        context.nodes[node.id] = output;
        await emit({
          level: "info",
          event: "node_completed",
          node_id: node.id,
          node_type: node.type,
          message: `${node.id} completed`,
          data: output,
        });
      } catch (error) {
        await emit({
          level: "error",
          event: "node_failed",
          node_id: node.id,
          node_type: node.type,
          message: `${node.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        throw error;
      }
      }));
    }

    const result = renderOutputs(workflow.outputs, context);
    const record: RunRecord = {
      id: runId,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      inputs: options.inputs,
      result,
      logs,
    };
    await emit({ level: "info", event: "run_completed", message: `Workflow ${workflow.name} completed`, data: result });
    await persistRun(record, options);
    return record;
  } catch (error) {
    const record: RunRecord = {
      id: runId,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      status: "failed",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      inputs: options.inputs,
      logs,
      error: error instanceof Error ? error.message : String(error),
    };
    await persistRun(record, options);
    throw error;
  }
}

async function persistRun(record: RunRecord, options: RunWorkflowOptions): Promise<void> {
  if (options.persist === false) return;
  const dataDir = options.dataDir ?? process.env.WORKFLOW_DATA_DIR ?? path.resolve(process.cwd(), "data");
  const runDir = path.join(dataDir, "runs", record.id);
  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, "result.json"), JSON.stringify(record.result ?? null, null, 2), "utf-8");
  await writeFile(path.join(runDir, "log.ndjson"), record.logs?.map((log) => JSON.stringify(log)).join("\n") ?? "", "utf-8");
}
