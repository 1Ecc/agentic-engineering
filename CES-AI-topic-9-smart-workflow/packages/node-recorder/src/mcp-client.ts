import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { CapturedRequest } from "../../llm-orchestrator/src/index.js";

export interface RecorderSessionInfo {
  browserId?: string;
  pageId?: number;
  startedAt: string;
  status: "recording" | "failed" | "closed";
  message?: string;
}

export interface RecorderDriver {
  startSession(input: { recordingId: string; targetUrl?: string; storageStatePath?: string }): Promise<RecorderSessionInfo>;
  getStatus(input: { recordingId: string }): Promise<RecorderSessionInfo & { requestCount: number; recentRequests: CapturedRequest[] }>;
  listCapturedRequests(input: { recordingId: string }): Promise<CapturedRequest[]>;
  cleanupSession(input: { recordingId: string }): Promise<void>;
}

export type McpRecordingClient = RecorderDriver;

type ToolResultObject = Record<string, unknown>;
export interface McpPageInfo {
  pageId: number;
  url?: string;
  selected?: boolean;
}

export interface PageRequestSignal {
  requestCount: number;
  businessRequestCount: number;
}

interface McpRequestSummary extends CapturedRequest {
  reqid: number;
}

const REQUIRED_TOOLS = new Set(["new_page", "list_pages", "select_page", "navigate_page", "list_network_requests", "get_network_request"]);
const STATIC_REQUEST_PATTERN = /\.(png|jpe?g|gif|svg|ico|css|js|map|woff2?|ttf)(\?|$)/i;
const NON_BUSINESS_PAGE_REQUEST_PATTERN =
  /analytics|analysis|monitor|metric|collect|telemetry|tracking|heartbeat|polling|sockjs|captcha|login|logout|auth|permission|privacy|config(?:\.json)?|dictionary|dict|messagecenter|message\/unread|static|sound|weather|tianqiapi|paramvalue|module|project\/query|public|\/#\/|\/home-page|\/workbench$|\/api\/wb\/|\/fieldserviceportal\/?$/i;
const MCP_TEXT_ERROR_PATTERNS = [
  /^error:/i,
  /^cause:/i,
  /the browser is already running/i,
  /failed to/i,
  /could not/i,
];
const MCP_CONNECT_TIMEOUT_MS = Number(process.env.MCP_CONNECT_TIMEOUT_MS ?? 30000);
const MCP_TOOL_TIMEOUT_MS = Number(process.env.MCP_TOOL_TIMEOUT_MS ?? 15000);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function maybeParseJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function textFromToolResult(result: CallToolResult): string {
  return result.content
    .map((item) => (item.type === "text" ? item.text : ""))
    .filter(Boolean)
    .join("\n");
}

function firstJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function isMcpTextError(text: string): boolean {
  const normalized = text.trim();
  return normalized.length > 0 && MCP_TEXT_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}

function parsePageIdFromText(text: string): number | undefined {
  const selected = text.match(/^\s*(?:[-*]\s*)?(\d+)\s*[:.)-].*(?:selected|current|active)/im);
  if (selected) return Number(selected[1]);
  const first = text.match(/^\s*(?:[-*]\s*)?(\d+)\s*[:.)-]/m);
  return first ? Number(first[1]) : undefined;
}

function normalizePage(value: unknown): McpPageInfo | null {
  if (!isObject(value)) return null;
  const pageId = pickNumber(value, ["pageId", "page_id", "id"]);
  if (pageId === undefined) return null;
  return {
    pageId,
    url: pickString(value, ["url", "title"]),
    selected: Boolean(value.selected || value.current || value.active),
  };
}

function extractPagesFromText(text: string): McpPageInfo[] {
  const pages: McpPageInfo[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?(\d+)\s*[:.)-]\s*(.*)$/);
    if (!match) continue;
    pages.push({
      pageId: Number(match[1]),
      url: match[2].replace(/\s+\[(?:selected|current|active)\]\s*$/i, "").trim() || undefined,
      selected: /\[(?:selected|current|active)\]/i.test(match[2]),
    });
  }
  return pages;
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isObject(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, typeof child === "string" ? child : JSON.stringify(child)]));
}

function pickString(source: ToolResultObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function pickNumber(source: ToolResultObject, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

function normalizeStatus(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return undefined;
}

function normalizeRequest(value: unknown): CapturedRequest | null {
  if (!isObject(value)) return null;
  const url = pickString(value, ["url", "requestUrl", "request_url"]);
  const method = pickString(value, ["method", "requestMethod", "request_method"]) ?? "GET";
  if (!url) return null;

  return {
    method,
    url,
    status: normalizeStatus(value.status ?? value.statusCode ?? value.status_code),
    headers: asStringRecord(value.headers ?? value.requestHeaders ?? value.request_headers),
    requestBody: value.requestBody ?? value.request_body ?? value.postData ?? value.post_data,
    responseBody: value.responseBody ?? value.response_body ?? value.response,
  };
}

function extractRequestsFromText(text: string): CapturedRequest[] {
  const requests: CapturedRequest[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/\breqid=(\d+)\s+([A-Z]+)\s+(.+?)\s+\[([^\]]+)\]/i);
    if (!match) continue;
    requests.push({
      method: match[2].toUpperCase(),
      url: match[3],
      status: normalizeStatus(match[4]),
    });
  }
  return requests;
}

function extractRequestSummariesFromText(text: string): McpRequestSummary[] {
  const requests: McpRequestSummary[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/\breqid=(\d+)\s+([A-Z]+)\s+(.+?)\s+\[([^\]]+)\]/i);
    if (!match) continue;
    requests.push({
      reqid: Number(match[1]),
      method: match[2].toUpperCase(),
      url: match[3],
      status: normalizeStatus(match[4]),
    });
  }
  return requests;
}

function extractDetailedRequestFromText(text: string): CapturedRequest[] {
  const url = text.match(/^## Request\s+(.+)$/im)?.[1]?.trim();
  if (!url) return [];
  const status = text.match(/^Status:\s+(.+)$/im)?.[1]?.trim();
  const requestBody = text.match(/^### Request Body\s*([\s\S]*?)(?=^### |\s*$)/im)?.[1]?.trim();
  const responseBodyText = text.match(/^### Response Body\s*([\s\S]*?)(?=^### |\s*$)/im)?.[1]?.trim();
  const responseBody = responseBodyText && !/^Saved to\b/i.test(responseBodyText) ? responseBodyText : undefined;
  return [
    {
      method: "GET",
      url,
      status: normalizeStatus(status),
      requestBody: requestBody || undefined,
      responseBody: responseBody || undefined,
    },
  ];
}

function extractRequestsFromPlainText(text: string): CapturedRequest[] {
  const concise = extractRequestsFromText(text);
  return concise.length > 0 ? concise : extractDetailedRequestFromText(text);
}

export function parseCapturedRequestsFromMcpResult(payload: unknown, text = ""): CapturedRequest[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeRequest).filter((item): item is CapturedRequest => Boolean(item));
  }
  if (isObject(payload)) {
    const candidates = [
      payload.requests,
      payload.networkRequests,
      payload.network_requests,
      payload.networkRequest,
      payload.network_request,
      payload.entries,
      payload.data,
    ];
    for (const candidate of candidates) {
      const requests = parseCapturedRequestsFromMcpResult(candidate, text);
      if (requests.length > 0) return requests;
    }
    const single = normalizeRequest(payload);
    if (single) return [single];
  }
  return extractRequestsFromPlainText(text);
}

export function parseCapturedRequestsFromMcpText(text: string): CapturedRequest[] {
  return parseCapturedRequestsFromMcpResult(firstJsonObject(text), text);
}

function extractReqIds(payload: unknown): number[] {
  if (Array.isArray(payload)) {
    return payload.flatMap(extractReqIds);
  }
  if (!isObject(payload)) return [];
  const nested = [payload.requests, payload.networkRequests, payload.network_requests, payload.networkRequest, payload.network_request, payload.entries, payload.data]
    .flatMap(extractReqIds);
  const value = payload.reqid ?? payload.reqId ?? payload.requestId ?? payload.request_id ?? payload.id;
  const reqid = typeof value === "number" ? value : typeof value === "string" && !Number.isNaN(Number(value)) ? Number(value) : undefined;
  return reqid === undefined ? nested : [reqid, ...nested];
}

function extractPages(payload: unknown, text = ""): McpPageInfo[] {
  if (Array.isArray(payload)) return payload.map(normalizePage).filter((page): page is McpPageInfo => Boolean(page));
  if (isObject(payload)) {
    const candidates = [payload.pages, payload.data, payload.entries];
    for (const candidate of candidates) {
      const pages = extractPages(candidate, text);
      if (pages.length > 0) return pages;
    }
    const single = normalizePage(payload);
    if (single) return [single];
  }
  return extractPagesFromText(text);
}

function isBusinessLikeRequest(request: CapturedRequest): boolean {
  if (!/^https?:\/\//i.test(request.url)) return false;
  if (STATIC_REQUEST_PATTERN.test(request.url)) return false;
  if (NON_BUSINESS_PAGE_REQUEST_PATTERN.test(request.url)) return false;
  return ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase());
}

export function chooseRecordingPage(
  pages: McpPageInfo[],
  currentPageId?: number,
  pageSignals: Map<number, PageRequestSignal> = new Map(),
): McpPageInfo | undefined {
  const byBusinessRequests = [...pages]
    .filter((page) => (pageSignals.get(page.pageId)?.businessRequestCount ?? 0) > 0)
    .sort((left, right) => {
      const signalCompare = (pageSignals.get(right.pageId)?.businessRequestCount ?? 0) - (pageSignals.get(left.pageId)?.businessRequestCount ?? 0);
      return signalCompare !== 0 ? signalCompare : right.pageId - left.pageId;
    })[0];
  if (byBusinessRequests) return byBusinessRequests;

  const selected = pages.find((page) => page.selected && page.pageId !== currentPageId);
  if (selected) return selected;

  const current = currentPageId === undefined ? undefined : pages.find((page) => page.pageId === currentPageId);
  return [...pages].sort((left, right) => right.pageId - left.pageId)[0] ?? current;
}

function defaultMcpServerArgs(): string[] {
  const extraArgs = process.env.CHROME_DEVTOOLS_MCP_ARGS?.trim();
  const args = ["-y", "chrome-devtools-mcp@latest"];
  if (process.env.CHROME_DEVTOOLS_BROWSER_URL) {
    args.push(`--browser-url=${process.env.CHROME_DEVTOOLS_BROWSER_URL}`);
  } else if (process.env.CHROME_DEVTOOLS_MCP_ISOLATED !== "false") {
    args.push("--isolated");
  }
  if (extraArgs) args.push(...extraArgs.split(/\s+/));
  return args;
}

function defaultStdioServer() {
  if (process.platform === "win32") {
    return {
      command: "npx.cmd",
      args: defaultMcpServerArgs(),
      stderr: "pipe" as const,
    };
  }

  return {
    command: "npx",
    args: defaultMcpServerArgs(),
    stderr: "pipe" as const,
  };
}

export class ChromeDevToolsMcpRecorderDriver implements RecorderDriver {
  private client?: Client;
  private transport?: StdioClientTransport;
  private session?: RecorderSessionInfo;

  async startSession(input: { recordingId: string; targetUrl?: string }): Promise<RecorderSessionInfo> {
    this.client = new Client({ name: "ces-node-recorder", version: "0.1.0" });
    this.transport = new StdioClientTransport(defaultStdioServer());
    try {
      await withTimeout(this.client.connect(this.transport), MCP_CONNECT_TIMEOUT_MS, "chrome-devtools-mcp connect");

      const tools = await withTimeout(this.client.listTools(), MCP_TOOL_TIMEOUT_MS, "chrome-devtools-mcp listTools");
      const toolNames = new Set(tools.tools.map((tool) => tool.name));
      const missing = [...REQUIRED_TOOLS].filter((tool) => !toolNames.has(tool));
      if (missing.length > 0) {
        await this.cleanupSession({ recordingId: input.recordingId });
        throw new Error(`chrome-devtools-mcp missing required tools: ${missing.join(", ")}`);
      }

      const targetUrl = input.targetUrl || "about:blank";
      let resolvedPageId = await this.resolveSelectedPageId();
      if (resolvedPageId !== undefined) {
        await this.callTool("select_page", { pageId: resolvedPageId, bringToFront: true });
        if (targetUrl !== "about:blank") {
          await this.callTool("navigate_page", { type: "url", url: targetUrl });
        }
      } else {
        const result = await this.callTool("new_page", { url: targetUrl, background: false });
        const resultText = textFromToolResult(result);
        const parsed = firstJsonObject(resultText);
        const pageId = isObject(parsed) ? pickNumber(parsed, ["pageId", "page_id", "id"]) : undefined;
        resolvedPageId = pageId ?? (await this.resolveSelectedPageId(resultText));
      }
      this.session = {
        browserId: "chrome-devtools-mcp",
        pageId: resolvedPageId,
        startedAt: new Date().toISOString(),
        status: "recording",
        message: `Chrome DevTools MCP recording started at ${targetUrl}`,
      };
      await this.selectRecordingPage();
      return this.session;
    } catch (error) {
      await this.cleanupSession({ recordingId: input.recordingId });
      throw error;
    }
  }

  async getStatus(input: { recordingId: string }): Promise<RecorderSessionInfo & { requestCount: number; recentRequests: CapturedRequest[] }> {
    this.assertOpen(input.recordingId);
    const requests = await this.listCapturedRequests(input);
    return {
      ...this.session!,
      requestCount: requests.length,
      recentRequests: requests.slice(-5),
    };
  }

  async listCapturedRequests(input: { recordingId: string }): Promise<CapturedRequest[]> {
    this.assertOpen(input.recordingId);
    await this.selectRecordingPage();
    return this.listRequestsForSelectedPage();
  }

  private async listRequestsForSelectedPage(): Promise<CapturedRequest[]> {
    const result = await this.callTool("list_network_requests", { includePreservedRequests: true, pageSize: 500 });
    const resultText = textFromToolResult(result);
    const payload = result.structuredContent ?? firstJsonObject(resultText);
    let requests = parseCapturedRequestsFromMcpResult(payload, resultText);

    const summaries = extractRequestSummariesFromText(resultText);
    const summaryByReqid = new Map(summaries.map((request) => [request.reqid, request]));
    const reqids = [...new Set([...extractReqIds(payload), ...summaries.map((request) => request.reqid)])].slice(0, 100);
    if (reqids.length > 0) {
      const detailed = await Promise.all(
        reqids.map(async (reqid) => {
          try {
            return await this.getDetailedNetworkRequest(reqid, summaryByReqid.get(reqid));
          } catch {
            return [];
          }
        }),
      );
      const detailedRequests = detailed.flat();
      if (detailedRequests.length > 0) requests = detailedRequests;
    }

    return requests;
  }

  private async listRequestSummariesForSelectedPage(): Promise<CapturedRequest[]> {
    const result = await this.callTool("list_network_requests", { includePreservedRequests: true, pageSize: 500 });
    const resultText = textFromToolResult(result);
    const payload = result.structuredContent ?? firstJsonObject(resultText);
    return parseCapturedRequestsFromMcpResult(payload, resultText);
  }

  private async collectPageSignals(pages: McpPageInfo[]): Promise<Map<number, PageRequestSignal>> {
    const signals = new Map<number, PageRequestSignal>();
    for (const page of pages) {
      try {
        await this.callTool("select_page", { pageId: page.pageId, bringToFront: false });
        const requests = await this.listRequestSummariesForSelectedPage();
        signals.set(page.pageId, {
          requestCount: requests.length,
          businessRequestCount: requests.filter(isBusinessLikeRequest).length,
        });
      } catch {
        signals.set(page.pageId, { requestCount: 0, businessRequestCount: 0 });
      }
    }
    return signals;
  }

  private async getDetailedNetworkRequest(reqid: number, summary?: CapturedRequest): Promise<CapturedRequest[]> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ces-node-recorder-mcp-"));
    const responseFilePath = path.join(tempDir, `${reqid}.network-response`);
    try {
      const detail = await this.callTool("get_network_request", { reqid, responseFilePath });
      const detailText = textFromToolResult(detail);
      const parsedRequests = parseCapturedRequestsFromMcpResult(detail.structuredContent ?? firstJsonObject(detailText), detailText);
      const responseBody = await this.readSavedResponseBody(responseFilePath);
      const baseRequests = parsedRequests.length > 0 ? parsedRequests : summary ? [summary] : [];

      return baseRequests.flatMap((request) => {
        const url = request.url || summary?.url;
        if (!url) return [];
        return [
          {
            ...summary,
            ...request,
            method: summary?.method ?? request.method,
            url,
            status: request.status ?? summary?.status,
            headers: request.headers ?? summary?.headers,
            requestBody: request.requestBody ?? summary?.requestBody,
            responseBody: responseBody ?? request.responseBody ?? summary?.responseBody,
          },
        ];
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async readSavedResponseBody(responseFilePath: string): Promise<unknown> {
    try {
      const responseText = await readFile(responseFilePath, "utf-8");
      return maybeParseJsonText(responseText);
    } catch {
      return undefined;
    }
  }

  async cleanupSession(_input: { recordingId: string }): Promise<void> {
    this.session = this.session ? { ...this.session, status: "closed" } : undefined;
    if (this.client) {
      await withTimeout(this.client.close(), 3000, "MCP client close").catch(() => undefined);
    }
    if (this.transport) {
      await withTimeout(this.transport.close(), 3000, "MCP transport close").catch(() => undefined);
    }
    this.client = undefined;
    this.transport = undefined;
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    if (!this.client) throw new Error("MCP client is not connected");
    const result = (await withTimeout(
      this.client.callTool({ name, arguments: args }) as Promise<CallToolResult>,
      MCP_TOOL_TIMEOUT_MS,
      `chrome-devtools-mcp ${name}`,
    )) as CallToolResult;
    const text = textFromToolResult(result);
    if ("isError" in result && result.isError) {
      throw new Error(`${name} failed: ${text || "unknown MCP tool error"}`);
    }
    if (!result.structuredContent && isMcpTextError(text)) {
      throw new Error(`${name} failed: ${text}`);
    }
    return result;
  }

  private async resolveSelectedPageId(fallbackText?: string): Promise<number | undefined> {
    const fallbackPageId = fallbackText ? parsePageIdFromText(fallbackText) : undefined;
    if (fallbackPageId !== undefined) return fallbackPageId;
    const pages = await this.listPages();
    return chooseRecordingPage(pages)?.pageId;
  }

  private async listPages(): Promise<McpPageInfo[]> {
    const result = await this.callTool("list_pages", {});
    return extractPages(result.structuredContent ?? firstJsonObject(textFromToolResult(result)), textFromToolResult(result));
  }

  private async selectRecordingPage(): Promise<void> {
    const pages = await this.listPages();
    const page = chooseRecordingPage(pages, this.session?.pageId, await this.collectPageSignals(pages));
    if (!page) return;
    await this.callTool("select_page", { pageId: page.pageId, bringToFront: false });
    if (this.session && this.session.pageId !== page.pageId) {
      this.session = { ...this.session, pageId: page.pageId, message: `Recording page switched to page ${page.pageId}` };
    }
  }

  private assertOpen(recordingId: string): void {
    if (!this.client || !this.session || this.session.status !== "recording") {
      throw new Error(`Recording session is not active: ${recordingId}`);
    }
  }
}

export class DisabledMcpClient implements RecorderDriver {
  async startSession(): Promise<RecorderSessionInfo> {
    throw new Error("MCP is disabled");
  }

  async getStatus(): Promise<RecorderSessionInfo & { requestCount: number; recentRequests: CapturedRequest[] }> {
    throw new Error("MCP is disabled");
  }

  async listCapturedRequests(): Promise<CapturedRequest[]> {
    throw new Error("MCP is disabled");
  }

  async cleanupSession(): Promise<void> {
    return undefined;
  }
}

export function createMcpClient(): RecorderDriver {
  return new ChromeDevToolsMcpRecorderDriver();
}
