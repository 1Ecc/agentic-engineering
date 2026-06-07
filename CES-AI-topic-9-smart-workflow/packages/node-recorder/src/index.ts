import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CapturedRequest, LLMAdapter, LLMTrace, NodeDefinition } from "../../llm-orchestrator/src/index.js";
import { apiCaptureSpecToNodeDefinition, createLLMAdapter, sanitizeForLlmTrace, validateNodeDefinition } from "../../llm-orchestrator/src/index.js";
import { createHandlerForDefinition } from "../../workflow-runner/src/index.js";
import { filterCapturedRequests } from "./filter.js";
import { createMcpClient, type RecorderDriver, type RecorderSessionInfo } from "./mcp-client.js";

export interface NodeRecorderOptions {
  dataDir?: string;
  authStatePath?: string;
  llm?: LLMAdapter;
  mcp?: RecorderDriver;
  mcpEnabled?: boolean;
}

export interface RecordingSession {
  recording_id: string;
  browser_id?: string;
  page_id?: number;
  mode: "mcp";
  request_count: number;
  message?: string;
  status?: RecorderSessionInfo["status"];
  recent_requests?: CapturedRequest[];
  started_at?: string;
}

export interface FinishRecordingInput {
  recording_id: string;
  name?: string;
  description: string;
}

export interface StartRecordingInput {
  target_url?: string;
}

function dataDir(options?: NodeRecorderOptions): string {
  return options?.dataDir ?? process.env.WORKFLOW_DATA_DIR ?? path.resolve(process.cwd(), "data");
}

function authStatePath(options?: NodeRecorderOptions): string {
  return options?.authStatePath ?? process.env.AUTH_STATE_PATH ?? path.resolve(process.cwd(), "secrets/auth-state.json");
}

function recordingPath(recordingId: string, options?: NodeRecorderOptions): string {
  return path.join(dataDir(options), "recordings", `${recordingId}.json`);
}

export interface RecordingSnapshot {
  id: string;
  browser_id?: string;
  page_id?: number;
  captured_at: string;
  status?: RecorderSessionInfo["status"];
  requests: CapturedRequest[];
  filtered_requests?: CapturedRequest[];
  llm_input_summary?: {
    description: string;
    request_count: number;
    request_urls: string[];
  };
  llm_trace?: LLMTrace;
}

export interface RecordingDebugSnapshot {
  id: string;
  status?: RecorderSessionInfo["status"];
  captured_at: string;
  request_count: number;
  filtered_request_count: number;
  llm_input_summary?: RecordingSnapshot["llm_input_summary"];
  llm_trace?: LLMTrace;
}

const activeRecorders = new Map<string, RecorderDriver>();

async function persistRecording(snapshot: RecordingSnapshot, options?: NodeRecorderOptions): Promise<void> {
  await mkdir(path.join(dataDir(options), "recordings"), { recursive: true });
  await writeFile(recordingPath(snapshot.id, options), JSON.stringify(snapshot, null, 2), "utf-8");
}

export async function startRecording(input: StartRecordingInput = {}, options: NodeRecorderOptions = {}): Promise<RecordingSession> {
  const mcpEnabled = options.mcpEnabled ?? process.env.MCP_ENABLED === "true";
  const recordingId = `rec_${Date.now()}`;

  if (!mcpEnabled) {
    throw new Error("MCP_ENABLED must be true to start real browser recording");
  }

  const mcp = options.mcp ?? createMcpClient();
  const session = await mcp.startSession({
    recordingId,
    targetUrl: input.target_url,
    storageStatePath: authStatePath(options),
  });
  activeRecorders.set(recordingId, mcp);
  await persistRecording(
    {
      id: recordingId,
      browser_id: session.browserId,
      page_id: session.pageId,
      captured_at: session.startedAt,
      status: session.status,
      requests: [],
    },
    options,
  );
  return {
    recording_id: recordingId,
    browser_id: session.browserId,
    page_id: session.pageId,
    mode: "mcp",
    request_count: 0,
    status: session.status,
    message: session.message,
    started_at: session.startedAt,
  };
}

async function readRecording(recordingId: string, options?: NodeRecorderOptions): Promise<RecordingSnapshot> {
  return JSON.parse(await readFile(recordingPath(recordingId, options), "utf-8")) as RecordingSnapshot;
}

export async function getRecordingDebugSnapshot(recordingId: string, options?: NodeRecorderOptions): Promise<RecordingDebugSnapshot> {
  const snapshot = await readRecording(recordingId, options);
  return {
    id: snapshot.id,
    status: snapshot.status,
    captured_at: snapshot.captured_at,
    request_count: snapshot.requests.length,
    filtered_request_count: snapshot.filtered_requests?.length ?? 0,
    llm_input_summary: snapshot.llm_input_summary,
    llm_trace: snapshot.llm_trace,
  };
}

export async function getConvertedNodeFromRecording(recordingId: string, options?: NodeRecorderOptions): Promise<NodeDefinition> {
  const snapshot = await readRecording(recordingId, options);
  const node = snapshot.llm_trace?.converted_node;
  if (!node) {
    throw new Error(`Recording ${recordingId} does not contain a converted NodeDefinition`);
  }

  const validation = validateNodeDefinition(node);
  if (!validation.valid) {
    throw new Error(`Converted NodeDefinition is invalid: ${validation.errors.join("; ")}`);
  }

  return node;
}

export async function getRecordingStatus(recordingId: string, options: NodeRecorderOptions = {}): Promise<RecordingSession> {
  const snapshot = await readRecording(recordingId, options);
  const mcp = options.mcp ?? activeRecorders.get(recordingId);
  if (!mcp) {
    return {
      recording_id: recordingId,
      browser_id: snapshot.browser_id,
      page_id: snapshot.page_id,
      mode: "mcp",
      request_count: snapshot.requests.length,
      status: snapshot.status ?? "closed",
      recent_requests: snapshot.requests.slice(-5),
      started_at: snapshot.captured_at,
      message: "Recording session is not active in this process",
    };
  }

  const status = await mcp.getStatus({ recordingId });
  await persistRecording(
    {
      ...snapshot,
      status: status.status,
      requests: status.recentRequests.length > snapshot.requests.length ? status.recentRequests : snapshot.requests,
    },
    options,
  );
  return {
    recording_id: recordingId,
    browser_id: status.browserId,
    page_id: status.pageId,
    mode: "mcp",
    request_count: status.requestCount,
    status: status.status,
    recent_requests: status.recentRequests,
    message: status.message,
    started_at: status.startedAt,
  };
}

export async function finishRecording(input: FinishRecordingInput, options: NodeRecorderOptions = {}): Promise<NodeDefinition> {
  const snapshot = await readRecording(input.recording_id, options);
  let requests = snapshot.requests;
  const mcpEnabled = options.mcpEnabled ?? process.env.MCP_ENABLED === "true";
  if (mcpEnabled) {
    const mcp = options.mcp ?? activeRecorders.get(input.recording_id);
    if (!mcp) {
      if (!requests.length) throw new Error(`Recording session is not active: ${input.recording_id}`);
      await persistRecording({ ...snapshot, status: "closed", requests }, options);
    } else {
      try {
        requests = await mcp.listCapturedRequests({ recordingId: input.recording_id });
        await persistRecording({ ...snapshot, status: "closed", requests }, options);
      } finally {
        await mcp.cleanupSession({ recordingId: input.recording_id });
        activeRecorders.delete(input.recording_id);
      }
    }
  }
  const filteredRequests = filterCapturedRequests(requests);
  if (!filteredRequests.length) {
    throw new Error("No business API requests were captured");
  }
  const llmInputSummary = {
    description: input.description,
    request_count: filteredRequests.length,
    request_urls: filteredRequests.map((request) => `${request.method} ${request.url}`).slice(0, 50),
  };
  await persistRecording({ ...snapshot, status: "closed", requests, filtered_requests: filteredRequests, llm_input_summary: llmInputSummary }, options);
  const llm = options.llm ?? createLLMAdapter();
  const extraction = await llm.extractApiCaptureSpec({
    description: input.description,
    capturedRequests: filteredRequests,
  });
  let llmTrace = sanitizeForLlmTrace(extraction.trace) as LLMTrace;
  await persistRecording({
    ...snapshot,
    status: "closed",
    requests,
    filtered_requests: filteredRequests,
    llm_input_summary: llmInputSummary,
    llm_trace: llmTrace,
  }, options);

  if (!extraction.apiSpec) {
    throw new Error(`Extracted API capture spec is invalid: ${extraction.trace.validation.errors.join("; ")}`);
  }

  const spec = apiCaptureSpecToNodeDefinition(extraction.apiSpec, {
    name: input.name,
    description: input.description,
    recordingId: input.recording_id,
  });

  const node: NodeDefinition = {
    ...spec,
    name: input.name ?? spec.name,
    description: input.description || spec.description,
    metadata: {
      ...spec.metadata,
      source_recording_id: input.recording_id,
      created_at: spec.metadata?.created_at ?? new Date().toISOString(),
    },
  };

  const validation = validateNodeDefinition(node);
  llmTrace = sanitizeForLlmTrace({ ...llmTrace, converted_node: node, node_validation: validation }) as LLMTrace;
  await persistRecording({
    ...snapshot,
    status: "closed",
    requests,
    filtered_requests: filteredRequests,
    llm_input_summary: llmInputSummary,
    llm_trace: llmTrace,
  }, options);
  if (!validation.valid) {
    throw new Error(`Extracted node definition is invalid: ${validation.errors.join("; ")}`);
  }
  return node;
}

export async function registerNode(spec: NodeDefinition, options: NodeRecorderOptions = {}): Promise<{ type: string; path: string }> {
  const validation = validateNodeDefinition(spec);
  if (!validation.valid) {
    throw new Error(`Node definition is invalid: ${validation.errors.join("; ")}`);
  }
  const platform = spec.platform ?? spec.type.split(".")[0];
  const node = {
    ...spec,
    platform,
    platform_label: spec.platform_label ?? platform,
    metadata: {
      ...spec.metadata,
      visibility: spec.metadata?.visibility ?? "private",
    },
  };
  const nodesDir = path.join(dataDir(options), "nodes");
  await mkdir(nodesDir, { recursive: true });
  const filePath = path.join(nodesDir, `${node.type}.json`);
  await writeFile(filePath, JSON.stringify(node, null, 2), "utf-8");
  return { type: node.type, path: filePath };
}

export async function invokeRecordedNode(
  spec: NodeDefinition,
  inputs: Record<string, unknown>,
  options: NodeRecorderOptions = {},
): Promise<unknown> {
  const mcpEnabled = options.mcpEnabled ?? process.env.MCP_ENABLED === "true";
  if (!mcpEnabled) {
    throw new Error("MCP_ENABLED must be true to invoke recorded nodes");
  }
  return createHandlerForDefinition(spec).run(inputs, { inputs: {}, nodes: {} }, spec);
}

export async function invokeConvertedNodeFromRecording(
  recordingId: string,
  inputs: Record<string, unknown>,
  options: NodeRecorderOptions = {},
): Promise<{ node: NodeDefinition; result: unknown }> {
  const node = await getConvertedNodeFromRecording(recordingId, options);
  const result = await invokeRecordedNode(node, inputs, options);
  return { node, result };
}

export * from "./filter.js";
export * from "./mcp-client.js";
