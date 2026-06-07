import type { Sop1Result } from "./sop1-types.js";

export type FieldType = "string" | "text" | "number" | "boolean" | "object" | "array";

export interface FieldSchema {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  description?: string;
}

export type NodeCategory = "builtin" | "connector" | "recorded";

export type HandlerKind = "connector" | "builtin" | "recorded_http" | "recorded_http_flow";

export interface RecordedHttpSpec {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url_template: string;
  headers?: Record<string, string>;
  query_template?: Record<string, string>;
  body_template?: string;
  response_mapping: Record<string, ResponseMappingValue>;
}

export type ResponseMappingValue =
  | string
  | {
      path: string;
      item_mapping?: Record<string, string>;
      mapping?: Record<string, string>;
    };

export interface RecordedHttpFlowStep extends RecordedHttpSpec {
  id: string;
  name?: string;
  description?: string;
  depends_on?: string[];
}

export interface RecordedHttpFlowSpec {
  steps: RecordedHttpFlowStep[];
  response_mapping: Record<string, string>;
}

export interface NodeHandler {
  kind: HandlerKind;
  name?: string;
  spec?: RecordedHttpSpec | RecordedHttpFlowSpec;
}

export interface NodeMetadata {
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  source_recording_id?: string;
  source_type?: "recorded" | "manual";
  last_trial_status?: "success" | "failed" | "untested";
  reference_count?: number;
  visibility?: "public" | "private";
}

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  platform?: string;
  platform_label?: string;
  name: string;
  description: string;
  icon?: string;
  inputs: FieldSchema[];
  outputs: FieldSchema[];
  handler: NodeHandler;
  metadata?: NodeMetadata;
}

export interface WorkflowRunContext {
  inputs: Record<string, unknown>;
  nodes: Record<string, unknown>;
  browserContext?: unknown;
  now?: Date;
  emit?(log: Omit<RunLog, "run_id" | "workflow_id" | "timestamp">): void | Promise<void>;
}

export interface NodeHandlerRunner {
  run(inputs: Record<string, unknown>, context: WorkflowRunContext, definition: NodeDefinition): Promise<unknown>;
}

export interface WorkflowInput extends FieldSchema {
  default?: unknown;
}

export interface WorkflowNode {
  id: string;
  type: string;
  inputs?: Record<string, unknown>;
  dependsOn?: string[];
  when?: string;
  then?: string;
}

export interface WorkflowOutputs {
  [name: string]: unknown;
}

export interface ResultViewColumn {
  key: string;
  label?: string;
  format?: "text" | "status" | "link" | "datetime" | "number";
}

export interface ResultView {
  id: string;
  type: "table" | "detail" | "cards" | "timeline" | "status" | "mail_draft" | "json";
  title?: string;
  source: string;
  columns?: ResultViewColumn[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  inputs: WorkflowInput[];
  nodes: WorkflowNode[];
  outputs?: WorkflowOutputs;
  views?: ResultView[];
}

export type RunStatus = "pending" | "running" | "success" | "partial_success" | "failed";

export interface RunLog {
  run_id: string;
  workflow_id: string;
  node_id?: string;
  node_type?: string;
  level: "info" | "warn" | "error";
  event: "run_started" | "node_started" | "node_completed" | "node_failed" | "node_skipped" | "run_completed";
  message: string;
  timestamp: string;
  data?: unknown;
}

export interface RunRecord {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: RunStatus;
  started_at: string;
  finished_at?: string;
  inputs: Record<string, unknown>;
  result?: Record<string, unknown> | Sop1Result;
  logs?: RunLog[];
  error?: string;
}
