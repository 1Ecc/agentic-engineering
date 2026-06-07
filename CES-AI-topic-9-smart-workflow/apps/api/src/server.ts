import http from "node:http";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { openPersistentBrowser, requestJson, saveAuthState, type BrowserSession } from "../../../packages/connectors/src/browser.js";
import { createLLMAdapter, validateNodeDefinition } from "../../../packages/llm-orchestrator/src/index.js";
import {
  finishRecording,
  getRecordingDebugSnapshot,
  getRecordingStatus,
  invokeConvertedNodeFromRecording,
  invokeRecordedNode,
  registerNode,
  startRecording,
} from "../../../packages/node-recorder/src/index.js";
import type { NodeDefinition, RunRecord, Workflow } from "../../../packages/shared/src/index.js";
import { runSop1 } from "../../../packages/workflow-core/src/sop1.js";
import { NodeRegistry, parseWorkflow, runWorkflow, validateExecutableWorkflow } from "../../../packages/workflow-runner/src/index.js";
import type { Sop1Result } from "../../../packages/shared/src/sop1-types.js";
import { Sop1Error, type Platform } from "../../../packages/shared/src/errors.js";
import { sendMail, type SendMailInput } from "./mail.js";

type RunStatus = "running" | "success" | "failed";

interface Sop1RunRecord {
  run_id: string;
  status: RunStatus;
  result?: Sop1Result;
  error?: string;
}

const runs = new Map<string, Sop1RunRecord>();
let authSession: BrowserSession | null = null;
const webDistDir = path.resolve(process.env.WEB_DIST_DIR ?? "apps/web/dist");
const workflowDataDir = path.resolve(process.env.WORKFLOW_DATA_DIR ?? "data");
const workflowDir = path.join(workflowDataDir, "workflows");
const runDir = path.join(workflowDataDir, "runs");
const genericRuns = new Map<string, RunRecord>();

const LOGIN_URLS = [
  "https://serviceforce.lenovo.com.cn/#/home-page",
  "https://jiuqiu.lenovo.com.cn/#/index",
];

const AUTH_CHECKS = [
  ["serviceforce", "serviceforce.authCheck", "https://serviceforce.lenovo.com.cn/orgauthorityapi/authUser/getUserDetail?_t="],
  ["jiuqiu", "jiuqiu.authCheck", "https://jiuqiu.lenovo.com.cn/base/user?_t="],
  ["spos", "spos.authCheck", "https://spos.lenovo.com.cn/spos-metadata/loginStatus"],
] as const;

const credentialKeyPattern = /^(api[-_]?key|authorization|authapitoken|auth|token|cookie|cookies|set-cookie|password|secret|bearer|credential|credentials|x-xsrf-token|x-csrf-token)$/i;

function stripCredentialFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripCredentialFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !credentialKeyPattern.test(key))
      .map(([key, child]) => [key, stripCredentialFields(child)]),
  );
}

function sanitizeNodeCredentials(node: NodeDefinition): void {
  const spec = node.handler.spec as unknown;
  if (!spec || typeof spec !== "object") return;
  node.handler.spec = stripCredentialFields(spec) as NodeDefinition["handler"]["spec"];
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (pathname.startsWith("/api") || pathname === "/health") return false;

  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const normalized = path.normalize(requested);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return false;

  let filePath = path.join(webDistDir, normalized);
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    filePath = path.join(webDistDir, "index.html");
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    res.writeHead(200, { "content-type": contentType(filePath) });
    if (req.method === "HEAD") return res.end(), true;
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

function safeId(value: string): string {
  if (!/^[A-Za-z0-9_.-]+$/.test(value)) throw new Error(`Invalid id: ${value}`);
  return value;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function workflowPath(id: string): string {
  return path.join(workflowDir, `${safeId(id)}.yaml`);
}

function workflowMetaPath(id: string): string {
  return path.join(workflowDir, `${safeId(id)}.meta.json`);
}

function stripYamlFence(source: string): string {
  const trimmed = source.trim();
  const match = /^```(?:yaml|yml)?\s*\r?\n([\s\S]*?)\r?\n```$/i.exec(trimmed);
  return match ? match[1].trim() : source.trim();
}

function parseJsonArrayFromText(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("LLM response does not contain a JSON array");
  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("LLM response is not a JSON array");
  return parsed;
}

function parseJsonObjectFromText(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("LLM response does not contain a JSON object");
  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("LLM response is not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

async function readWorkflowSource(id: string): Promise<{ yaml: string }> {
  const normalPath = workflowPath(id);
  if (await pathExists(normalPath)) return { yaml: await readFile(normalPath, "utf-8") };

  throw new Error(`workflow not found: ${id}`);
}

function workflowMetaFromYaml(yaml: string): Record<string, unknown> {
  const workflow = parseWorkflow(yaml);
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? "",
    source: "saved",
    favorite: false,
    run_count: 0,
    updated_at: workflow.updated_at ?? workflow.created_at ?? null,
  };
}

async function listWorkflowMetas(): Promise<Array<Record<string, unknown>>> {
  await mkdir(workflowDir, { recursive: true });
  const metas: Array<Record<string, unknown>> = [];

  for (const file of await readdir(workflowDir).catch(() => [])) {
    if (!file.endsWith(".meta.json")) continue;
    metas.push(JSON.parse(await readFile(path.join(workflowDir, file), "utf-8")) as Record<string, unknown>);
  }

  return metas;
}

async function createRegistry(): Promise<NodeRegistry> {
  const registry = new NodeRegistry();
  await registry.loadDynamic(workflowDataDir);
  return registry;
}

function sendSseStart(res: http.ServerResponse): void {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "access-control-allow-origin": "*",
  });
}

function sendSseEvent(res: http.ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function persistRunRecord(record: RunRecord): Promise<void> {
  const dir = path.join(runDir, record.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "record.json"), JSON.stringify(record, null, 2), "utf-8");
}

async function listRunRecords(workflowId: string): Promise<RunRecord[]> {
  const dirs = await readdir(runDir).catch(() => []);
  const records: RunRecord[] = [];
  for (const dir of dirs) {
    const recordFile = path.join(runDir, dir, "record.json");
    if (!(await pathExists(recordFile))) continue;
    const record = JSON.parse(await readFile(recordFile, "utf-8")) as RunRecord;
    if (record.workflow_id === workflowId) records.push(record);
  }
  return records.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 5);
}

async function readRunRecord(runId: string): Promise<RunRecord | null> {
  const cached = genericRuns.get(runId);
  if (cached) return cached;
  const recordFile = path.join(runDir, safeId(runId), "record.json");
  if (!(await pathExists(recordFile))) return null;
  return JSON.parse(await readFile(recordFile, "utf-8")) as RunRecord;
}

async function updateNodeTrialStatus(type: string, status: "success" | "failed"): Promise<void> {
  const filePath = path.join(workflowDataDir, "nodes", `${safeId(type)}.json`);
  if (!(await pathExists(filePath))) return;
  const node = JSON.parse(await readFile(filePath, "utf-8")) as NodeDefinition;
  node.metadata = {
    ...node.metadata,
    last_trial_status: status,
    updated_at: new Date().toISOString(),
  };
  await writeFile(filePath, JSON.stringify(node, null, 2), "utf-8");
}

function validateWorkflowOrThrow(workflow: Workflow, registry: NodeRegistry): void {
  const validation = validateExecutableWorkflow(workflow, registry);
  if (!validation.valid) {
    const error = new Error(validation.errors.join("; "));
    (error as Error & { details?: unknown }).details = validation;
    throw error;
  }
}

function validationErrorBody(error: unknown): { error: string; details?: unknown } {
  if (error instanceof Error) {
    return { error: error.message, details: (error as Error & { details?: unknown }).details };
  }
  return { error: String(error) };
}

async function startGenericWorkflowRun(input: {
  workflow: Workflow;
  inputs: Record<string, unknown>;
  registry: NodeRegistry;
  persist: boolean;
}): Promise<string> {
  const runId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const pending: RunRecord = {
    id: runId,
    workflow_id: input.workflow.id,
    workflow_name: input.workflow.name,
    status: "running",
    started_at: new Date().toISOString(),
    inputs: input.inputs,
  };
  genericRuns.set(runId, pending);

  void (async () => {
    let session: BrowserSession | null = null;
    try {
      session = await openPersistentBrowser({ headless: true });
      const record = await runWorkflow(input.workflow, {
        registry: input.registry,
        inputs: input.inputs,
        browserContext: session?.context,
        dataDir: workflowDataDir,
        persist: input.persist,
        runId,
      });
      genericRuns.set(runId, record);
      if (input.persist) await persistRunRecord(record);
    } catch (error) {
      const failed: RunRecord = {
        ...pending,
        status: "failed",
        finished_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      genericRuns.set(runId, failed);
      if (input.persist) await persistRunRecord(failed);
    } finally {
      await session?.close();
    }
  })();

  return runId;
}

async function startSop1Run(workOrderNo: string, runId: string): Promise<void> {
  const session = await openPersistentBrowser({ headless: true });
  try {
    const result = await runSop1(session.context, { work_order_no: workOrderNo });
    runs.set(runId, { run_id: runId, status: result.run_status === "failed" ? "failed" : "success", result });
  } catch (error) {
    runs.set(runId, { run_id: runId, status: "failed", error: error instanceof Error ? error.message : String(error) });
  } finally {
    await session.close();
  }
}

async function isAuthSessionAlive(): Promise<boolean> {
  if (!authSession) return false;

  try {
    await authSession.page.title();
    return !authSession.page.isClosed();
  } catch {
    await authSession.close().catch(() => undefined);
    authSession = null;
    return false;
  }
}

async function getAuthStatus(): Promise<Array<{ platform: Platform; ok: boolean; message: string }>> {
  const session = await openPersistentBrowser({ headless: true });
  try {
    const results: Array<{ platform: Platform; ok: boolean; message: string }> = [];
    for (const [platform, step, urlPrefix] of AUTH_CHECKS) {
      const url = urlPrefix.endsWith("=") ? `${urlPrefix}${Date.now()}` : urlPrefix;
      try {
        await requestJson<Record<string, unknown>>(session.context, platform, step, url);
        results.push({ platform, ok: true, message: "登录态可用" });
      } catch (error) {
        results.push({
          platform,
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  } finally {
    await session.close();
  }
}

export function createApiServer(): http.Server {
  return http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = requestUrl.pathname.replace(/\/$/, "") || "/";

    if (req.method === "OPTIONS") return json(res, 204, {});

    if (req.method === "GET" && pathname === "/health") {
      return json(res, 200, { ok: true });
    }

    if ((req.method === "POST" || req.method === "GET") && pathname === "/api/auth/browser-login/start") {
      if (await isAuthSessionAlive()) {
        return json(res, 200, { status: "opened", message: "登录浏览器已打开，请在该窗口完成登录" });
      }

      authSession = await openPersistentBrowser({ headless: false });
      for (const url of LOGIN_URLS) {
        const page = await authSession.context.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => undefined);
      }

      return json(res, 200, {
        status: "opened",
        message: "已打开登录浏览器。请登录服务云、九丘，并从服务云进入 SDI/SPOS；完成后点击保存登录态。",
      });
    }

    if (req.method === "POST" && pathname === "/api/auth/browser-login/finish") {
      if (!authSession) {
        return json(res, 400, { error: "登录浏览器未打开" });
      }

      const statePath = await saveAuthState(authSession.context);
      await authSession.close();
      authSession = null;
      return json(res, 200, { status: "saved", state_path: statePath });
    }

    if (req.method === "GET" && pathname === "/api/auth/status") {
      return json(res, 200, { platforms: await getAuthStatus() });
    }

    if (req.method === "POST" && pathname === "/api/mail/send") {
      const body = (await readBody(req)) as Partial<SendMailInput>;
      const to = Array.isArray(body.to) ? body.to.filter(Boolean) : [];
      const cc = Array.isArray(body.cc) ? body.cc.filter(Boolean) : [];
      const subject = typeof body.subject === "string" ? body.subject : "";
      const mailBody = typeof body.body === "string" ? body.body : "";

      const result = await sendMail({ to, cc, subject, body: mailBody });
      return json(res, 200, { status: "sent", ...result });
    }

    if (req.method === "GET" && pathname === "/api/workflows") {
      return json(res, 200, { workflows: await listWorkflowMetas() });
    }

    if (req.method === "POST" && pathname === "/api/workflows/generate") {
      const body = (await readBody(req)) as { prompt?: string; contextYaml?: string };
      const registry = await createRegistry();
      const adapter = createLLMAdapter();
      sendSseStart(res);
      let yaml = "";
      for await (const chunk of adapter.generateWorkflow({
        prompt: body.prompt ?? "",
        availableNodes: registry.list(),
        contextYaml: body.contextYaml,
      })) {
        yaml += chunk;
        sendSseEvent(res, "token", { token: chunk });
      }
      yaml = stripYamlFence(yaml);
      sendSseEvent(res, "done", { yaml });
      return res.end();
    }

    if (req.method === "POST" && pathname === "/api/results/views/generate") {
      const body = (await readBody(req)) as { result?: unknown; existingViews?: unknown };
      if (body.result === undefined) return json(res, 400, { error: "result is required" });
      const adapter = createLLMAdapter();
      const raw = await adapter.generateResultViews({
        result: body.result,
        existingViews: body.existingViews,
      });
      return json(res, 200, { views: parseJsonArrayFromText(raw), raw });
    }

    if (req.method === "POST" && pathname === "/api/workflows/validate") {
      const body = (await readBody(req)) as { yaml?: string };
      if (!body.yaml) return json(res, 400, { error: "yaml is required" });
      const registry = await createRegistry();
      const sourceYaml = stripYamlFence(body.yaml);
      const workflow = parseWorkflow(sourceYaml);
      const validation = validateExecutableWorkflow(workflow, registry);
      return json(res, 200, { validation, workflow });
    }

    if (req.method === "POST" && pathname === "/api/workflows/run-draft") {
      const body = (await readBody(req)) as { yaml?: string; inputs?: Record<string, unknown> };
      if (!body.yaml) return json(res, 400, { error: "yaml is required" });
      const registry = await createRegistry();
      const sourceYaml = stripYamlFence(body.yaml);
      const workflow = parseWorkflow(sourceYaml);
      const validation = validateExecutableWorkflow(workflow, registry);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; "), details: validation });
      const runId = await startGenericWorkflowRun({
        workflow,
        inputs: body.inputs ?? {},
        registry,
        persist: false,
      });
      return json(res, 202, { run_id: runId, workflow_id: workflow.id, status: "running" });
    }

    if (req.method === "POST" && pathname === "/api/workflows") {
      const body = (await readBody(req)) as { yaml?: string; meta?: Record<string, unknown> };
      if (!body.yaml) return json(res, 400, { error: "yaml is required" });
      const sourceYaml = stripYamlFence(body.yaml);
      const workflow = parseWorkflow(sourceYaml);
      const registry = await createRegistry();
      try {
        validateWorkflowOrThrow(workflow, registry);
      } catch (error) {
        return json(res, 400, validationErrorBody(error));
      }
      await mkdir(workflowDir, { recursive: true });
      await writeFile(workflowPath(workflow.id), sourceYaml, "utf-8");
      const meta = {
        ...workflowMetaFromYaml(sourceYaml),
        ...body.meta,
        id: workflow.id,
        name: body.meta?.name ?? workflow.name,
        updated_at: new Date().toISOString(),
      };
      await writeFile(workflowMetaPath(workflow.id), JSON.stringify(meta, null, 2), "utf-8");
      return json(res, 201, { workflow: meta });
    }

    const workflowDetailMatch = pathname.match(/^\/api\/workflows\/([^/]+)$/);
    if (req.method === "GET" && workflowDetailMatch) {
      const id = decodeURIComponent(workflowDetailMatch[1]);
      const source = await readWorkflowSource(id);
      const metaFile = workflowMetaPath(id);
      const meta = (await pathExists(metaFile))
        ? (JSON.parse(await readFile(metaFile, "utf-8")) as Record<string, unknown>)
        : workflowMetaFromYaml(source.yaml);
      return json(res, 200, { yaml: source.yaml, meta });
    }

    if (req.method === "PUT" && workflowDetailMatch) {
      const id = decodeURIComponent(workflowDetailMatch[1]);
      const body = (await readBody(req)) as { yaml?: string; meta?: Record<string, unknown> };
      if (!body.yaml) return json(res, 400, { error: "yaml is required" });
      const sourceYaml = stripYamlFence(body.yaml);
      const workflow = parseWorkflow(sourceYaml);
      if (workflow.id !== id) return json(res, 400, { error: "workflow id cannot be changed" });
      const registry = await createRegistry();
      try {
        validateWorkflowOrThrow(workflow, registry);
      } catch (error) {
        return json(res, 400, validationErrorBody(error));
      }
      await mkdir(workflowDir, { recursive: true });
      await writeFile(workflowPath(id), sourceYaml, "utf-8");
      const meta = {
        ...workflowMetaFromYaml(sourceYaml),
        ...body.meta,
        id,
        updated_at: new Date().toISOString(),
      };
      await writeFile(workflowMetaPath(id), JSON.stringify(meta, null, 2), "utf-8");
      return json(res, 200, { workflow: meta });
    }

    if (req.method === "DELETE" && workflowDetailMatch) {
      const id = decodeURIComponent(workflowDetailMatch[1]);
      await rm(workflowPath(id), { force: true });
      await rm(workflowMetaPath(id), { force: true });
      return json(res, 200, { ok: true });
    }

    const workflowRunMatch = pathname.match(/^\/api\/workflows\/([^/]+)\/run$/);
    if (req.method === "POST" && workflowRunMatch) {
      const id = decodeURIComponent(workflowRunMatch[1]);
      const body = (await readBody(req)) as { inputs?: Record<string, unknown> };
      const source = await readWorkflowSource(id);
      const workflow = parseWorkflow(source.yaml);
      const registry = await createRegistry();
      const validation = validateExecutableWorkflow(workflow, registry);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; "), details: validation });
      const runId = await startGenericWorkflowRun({
        workflow,
        inputs: body.inputs ?? {},
        registry,
        persist: true,
      });

      return json(res, 202, { run_id: runId, status: "running" });
    }

    const workflowRunsMatch = pathname.match(/^\/api\/workflows\/([^/]+)\/runs$/);
    if (req.method === "GET" && workflowRunsMatch) {
      const id = decodeURIComponent(workflowRunsMatch[1]);
      return json(res, 200, { runs: await listRunRecords(id) });
    }

    const workflowRunDetailMatch = pathname.match(/^\/api\/workflows\/([^/]+)\/runs\/([^/]+)$/);
    if (req.method === "GET" && workflowRunDetailMatch) {
      const runId = decodeURIComponent(workflowRunDetailMatch[2]);
      const record = await readRunRecord(runId);
      if (!record) return json(res, 404, { error: "run not found" });
      return json(res, 200, record);
    }

    if (req.method === "GET" && pathname === "/api/nodes") {
      const registry = await createRegistry();
      return json(res, 200, { nodes: registry.list() });
    }

    const nodeDetailMatch = pathname.match(/^\/api\/nodes\/([^/]+)$/);
    if (req.method === "GET" && nodeDetailMatch) {
      const type = decodeURIComponent(nodeDetailMatch[1]);
      const registry = await createRegistry();
      return json(res, 200, { node: registry.resolve(type).def });
    }

    if (req.method === "POST" && pathname === "/api/nodes/record/start") {
      const body = (await readBody(req)) as { target_url?: string };
      return json(res, 200, await startRecording({ target_url: body.target_url }, { dataDir: workflowDataDir }));
    }

    const nodeRecordStatusMatch = pathname.match(/^\/api\/nodes\/record\/([^/]+)\/status$/);
    if (req.method === "GET" && nodeRecordStatusMatch) {
      return json(res, 200, await getRecordingStatus(decodeURIComponent(nodeRecordStatusMatch[1]), { dataDir: workflowDataDir }));
    }

    const nodeRecordDebugMatch = pathname.match(/^\/api\/nodes\/record\/([^/]+)$/);
    if (req.method === "GET" && nodeRecordDebugMatch) {
      return json(res, 200, await getRecordingDebugSnapshot(decodeURIComponent(nodeRecordDebugMatch[1]), { dataDir: workflowDataDir }));
    }

    const nodeRecordInvokeMatch = pathname.match(/^\/api\/nodes\/record\/([^/]+)\/invoke-draft$/);
    if (req.method === "POST" && nodeRecordInvokeMatch) {
      const body = (await readBody(req)) as { inputs?: Record<string, unknown> };
      const recordingId = decodeURIComponent(nodeRecordInvokeMatch[1]);
      const { node, result } = await invokeConvertedNodeFromRecording(recordingId, body.inputs ?? {}, { dataDir: workflowDataDir });
      return json(res, 200, { node, result });
    }

    if (req.method === "POST" && pathname === "/api/nodes/record/finish") {
      const body = (await readBody(req)) as { recording_id?: string; name?: string; description?: string };
      if (!body.recording_id) return json(res, 400, { error: "recording_id is required" });
      const node = await finishRecording(
        {
          recording_id: body.recording_id,
          name: body.name,
          description: body.description ?? "",
        },
        { dataDir: workflowDataDir },
      );
      return json(res, 200, { node });
    }

    if (req.method === "POST" && pathname === "/api/nodes/generate-from-curl") {
      const body = (await readBody(req)) as { curl?: string; description?: string; name?: string; currentNode?: NodeDefinition };
      if (!body.curl?.trim() && !body.currentNode) return json(res, 400, { error: "curl or currentNode is required" });
      const adapter = createLLMAdapter();
      const raw = await adapter.generateNodeFromCurl({
        curl: body.curl,
        description: body.description,
        name: body.name,
        currentNode: body.currentNode,
      });
      const node = parseJsonObjectFromText(raw) as unknown as NodeDefinition;
      if (body.currentNode?.type) node.type = body.currentNode.type;
      sanitizeNodeCredentials(node);
      node.category = "recorded";
      node.metadata = {
        ...body.currentNode?.metadata,
        ...node.metadata,
        source_type: "manual",
        visibility: node.metadata?.visibility ?? "private",
        last_trial_status: node.metadata?.last_trial_status ?? "untested",
        updated_at: new Date().toISOString(),
      };
      const validation = validateNodeDefinition(node);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; "), raw });
      return json(res, 200, { node, raw });
    }

    if (req.method === "POST" && pathname === "/api/nodes") {
      const body = (await readBody(req)) as Record<string, unknown>;
      const spec = (body.spec ?? body) as NodeDefinition;
      if (!spec) return json(res, 400, { error: "spec is required" });
      sanitizeNodeCredentials(spec);
      const validation = validateNodeDefinition(spec);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; ") });
      const saved = await registerNode(spec, { dataDir: workflowDataDir });
      return json(res, 201, saved);
    }

    if (req.method === "PUT" && nodeDetailMatch) {
      const type = decodeURIComponent(nodeDetailMatch[1]);
      const body = (await readBody(req)) as { spec?: NodeDefinition };
      if (!body.spec) return json(res, 400, { error: "spec is required" });
      const registry = await createRegistry();
      const current = registry.resolve(type).def;
      if (current.category !== "recorded") return json(res, 400, { error: "only recorded nodes can be updated" });
      const updated: NodeDefinition = {
        ...body.spec,
        type,
        category: "recorded",
        metadata: {
          ...current.metadata,
          ...body.spec.metadata,
          updated_at: new Date().toISOString(),
        },
      };
      sanitizeNodeCredentials(updated);
      const validation = validateNodeDefinition(updated);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; ") });
      await writeFile(path.join(workflowDataDir, "nodes", `${safeId(type)}.json`), JSON.stringify(updated, null, 2), "utf-8");
      return json(res, 200, { node: updated });
    }

    const nodeVisibilityMatch = pathname.match(/^\/api\/nodes\/([^/]+)\/visibility$/);
    if (req.method === "PATCH" && nodeVisibilityMatch) {
      const type = decodeURIComponent(nodeVisibilityMatch[1]);
      const body = (await readBody(req)) as { visibility?: "public" | "private" };
      if (body.visibility !== "public" && body.visibility !== "private") {
        return json(res, 400, { error: "visibility must be public or private" });
      }

      const registry = await createRegistry();
      const node = registry.resolve(type).def;
      if (node.category !== "recorded") return json(res, 400, { error: "only recorded nodes can be updated" });
      const updated: NodeDefinition = {
        ...node,
        metadata: {
          ...node.metadata,
          visibility: body.visibility,
          updated_at: new Date().toISOString(),
        },
      };
      const validation = validateNodeDefinition(updated);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; ") });

      await writeFile(path.join(workflowDataDir, "nodes", `${safeId(type)}.json`), JSON.stringify(updated, null, 2), "utf-8");
      return json(res, 200, { node: updated });
    }

    if (req.method === "POST" && pathname === "/api/nodes/invoke-draft") {
      const body = (await readBody(req)) as { spec?: NodeDefinition; inputs?: Record<string, unknown> };
      if (!body.spec) return json(res, 400, { error: "spec is required" });
      const validation = validateNodeDefinition(body.spec);
      if (!validation.valid) return json(res, 400, { error: validation.errors.join("; ") });
      const result = await invokeRecordedNode(body.spec, body.inputs ?? {}, { dataDir: workflowDataDir });
      return json(res, 200, { result });
    }

    const nodeInvokeMatch = pathname.match(/^\/api\/nodes\/([^/]+)\/invoke$/);
    if (req.method === "POST" && nodeInvokeMatch) {
      const type = decodeURIComponent(nodeInvokeMatch[1]);
      const body = (await readBody(req)) as { inputs?: Record<string, unknown> };
      const registry = await createRegistry();
      const node = registry.resolve(type).def;
      try {
        const result = await invokeRecordedNode(node, body.inputs ?? {}, { dataDir: workflowDataDir });
        if (node.category === "recorded") await updateNodeTrialStatus(node.type, "success");
        return json(res, 200, { result });
      } catch (error) {
        if (node.category === "recorded") await updateNodeTrialStatus(node.type, "failed").catch(() => undefined);
        throw error;
      }
    }

    if (req.method === "DELETE" && nodeDetailMatch) {
      const type = decodeURIComponent(nodeDetailMatch[1]);
      const registry = await createRegistry();
      const node = registry.resolve(type).def;
      if (node.category !== "recorded") return json(res, 400, { error: "only recorded nodes can be deleted" });
      await rm(path.join(workflowDataDir, "nodes", `${safeId(type)}.json`), { force: true });
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && pathname === "/api/workflows/sop1-direct-order-invoice/run") {
      const body = (await readBody(req)) as { work_order_no?: string };
      if (!body.work_order_no) return json(res, 400, { error: "work_order_no is required" });

      const runId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
      runs.set(runId, { run_id: runId, status: "running" });
      void startSop1Run(body.work_order_no, runId);
      return json(res, 202, { run_id: runId, status: "running" });
    }

    const match = pathname.match(/^\/api\/workflows\/sop1-direct-order-invoice\/runs\/([^/]+)$/);
    if (req.method === "GET" && match) {
      const record = runs.get(match[1]);
      if (!record) return json(res, 404, { error: "run not found" });
      return json(res, 200, record);
    }

    if (await serveStatic(req, res, pathname)) return;

    return json(res, 404, { error: "not found" });
  } catch (error) {
    if (error instanceof Sop1Error) {
      return json(res, error.code === "AUTH_REQUIRED" ? 401 : 500, {
        error: error.message,
        code: error.code,
        platform: error.platform,
        step: error.step,
        details: error.details,
      });
    }
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});
}

export async function startApiServer(port = Number(process.env.PORT ?? 3000)): Promise<http.Server> {
  const server = createApiServer();
  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      console.log(`SOP1 API listening on http://127.0.0.1:${port}`);
      resolve();
    });
  });
  return server;
}

const isDirectRun = process.argv[1] ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) : false;
if (isDirectRun) {
  void startApiServer();
}
