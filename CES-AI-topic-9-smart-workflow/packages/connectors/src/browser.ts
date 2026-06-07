import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { Sop1Error, type Platform } from "../../shared/src/errors.js";

export interface BrowserSession {
  context: BrowserContext;
  page: Page;
  close(): Promise<void>;
}

const DEFAULT_PROFILE_DIR = path.resolve(process.env.AUTH_PROFILE_DIR ?? path.join(process.cwd(), "secrets/browser-profile"));
const DEFAULT_STORAGE_STATE = path.resolve(process.env.AUTH_STATE_PATH ?? path.join(process.cwd(), "secrets/auth-state.json"));
const WINDOWS_BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBrowserExecutable(): Promise<string | undefined> {
  const explicitPath = process.env.PLAYWRIGHT_CHROME_PATH;
  if (explicitPath && (await exists(explicitPath))) return explicitPath;

  for (const candidate of WINDOWS_BROWSER_CANDIDATES) {
    if (await exists(candidate)) return candidate;
  }

  return undefined;
}

async function readStorageValue(context: BrowserContext, originUrl: string, key: string): Promise<string | null> {
  const page = await context.newPage();
  try {
    await page.goto(originUrl, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    return await page.evaluate((storageKey) => localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey), key);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function inferAuthHeaders(context: BrowserContext, url: string): Promise<Record<string, string>> {
  const { hostname, origin } = new URL(url);

  if (hostname === "serviceforce.lenovo.com.cn") {
    const token = await readStorageValue(context, origin, "CUBE_TOKEN");
    return token
      ? {
          authapitoken: token,
          app_namespace: "fieldservicefe",
        }
      : {};
  }

  if (hostname === "jiuqiu.lenovo.com.cn") {
    const token =
      (await readStorageValue(context, origin, "ORDERUI:AuthAPIToken")) ??
      (await readStorageValue(context, origin, "AuthAPIToken"));
    return token
      ? {
          authorization: token,
          "tenant-id": "1",
          app_namespace: "orderui",
        }
      : {};
  }

  return {};
}

function getBusinessAuthError(value: unknown): string | null {
  return findBusinessAuthError(value, 0);
}

function findBusinessAuthError(value: unknown, depth: number): string | null {
  if (depth > 4 || typeof value !== "object" || value === null) return null;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 5)) {
      const nestedError = findBusinessAuthError(item, depth + 1);
      if (nestedError) return nestedError;
    }
    return null;
  }

  const body = value as Record<string, unknown>;
  const code = body.code ?? body.statusCode ?? body.status;
  const message = String(body.msg ?? body.message ?? "");

  if (code === 401 || code === 403 || code === "401" || code === "403") {
    return message || "业务接口返回登录态失效";
  }

  if (/token失效|credential\.required|unauthorized|未登录|请登录|登录态|登录过期|登陆/.test(message)) {
    return message;
  }

  const data = body.data;
  if (typeof data === "object" && data !== null && !Array.isArray(data) && (data as Record<string, unknown>).loggedIn === false) {
    return "未登录";
  }

  for (const key of ["data", "result", "body", "payload"]) {
    const nestedError = findBusinessAuthError(body[key], depth + 1);
    if (nestedError) return nestedError;
  }

  return null;
}

function getMissingAuthHeader(platform: Platform, url: string, headers: Record<string, string>): string | null {
  const hostname = new URL(url).hostname;
  if ((platform === "serviceforce" || hostname === "serviceforce.lenovo.com.cn") && !headers.authapitoken) {
    return "authapitoken";
  }
  if ((platform === "jiuqiu" || hostname === "jiuqiu.lenovo.com.cn") && !headers.authorization) {
    return "authorization";
  }
  return null;
}

export async function openPersistentBrowser(options?: { headless?: boolean }): Promise<BrowserSession> {
  await mkdir(DEFAULT_PROFILE_DIR, { recursive: true });
  const executablePath = await resolveBrowserExecutable();

  if (options?.headless) {
    const browser = await chromium.launch({
      executablePath,
      headless: true,
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
      storageState: (await exists(DEFAULT_STORAGE_STATE)) ? DEFAULT_STORAGE_STATE : undefined,
    });
    const page = await context.newPage();
    return {
      context,
      page,
      async close() {
        await context.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      },
    };
  }

  const context = await chromium.launchPersistentContext(DEFAULT_PROFILE_DIR, {
    executablePath,
    headless: false,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const page = context.pages()[0] ?? (await context.newPage());
  return {
    context,
    page,
    close: () => context.close(),
  };
}

export async function saveAuthState(context: BrowserContext): Promise<string> {
  await mkdir(path.dirname(DEFAULT_STORAGE_STATE), { recursive: true });
  await context.storageState({ path: DEFAULT_STORAGE_STATE });
  return DEFAULT_STORAGE_STATE;
}

export async function requestJson<T>(
  context: BrowserContext,
  platform: Platform,
  step: string,
  url: string,
  options?: {
    method?: "GET" | "POST";
    data?: unknown;
    headers?: Record<string, string>;
  },
): Promise<T> {
  const inferredHeaders = await inferAuthHeaders(context, url);
  const missingAuthHeader = getMissingAuthHeader(platform, url, inferredHeaders);
  if (missingAuthHeader) {
    throw new Sop1Error("AUTH_REQUIRED", platform, step, `${platform} 登录态未保存或已失效，请重新登录`, {
      url,
      missing_header: missingAuthHeader,
    });
  }

  const response = await context.request.fetch(url, {
    method: options?.method ?? "GET",
    data: options?.data,
    headers: {
      ...inferredHeaders,
      ...options?.headers,
    },
  });

  if (response.status() === 401 || response.status() === 403) {
    throw new Sop1Error("AUTH_REQUIRED", platform, step, `${platform} 登录态已失效，请重新登录`);
  }

  if (!response.ok()) {
    throw new Sop1Error("PLATFORM_REQUEST_FAILED", platform, step, `${platform} 请求失败：${response.status()}`, {
      url,
      status: response.status(),
      body: await response.text().catch(() => ""),
    });
  }

  const contentType = response.headers()["content-type"] ?? "";
  const text = await response.text();

  if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
    throw new Sop1Error("AUTH_REQUIRED", platform, step, `${platform} 返回登录页或 HTML，请重新登录`, { url });
  }

  if (!contentType.includes("json")) {
    throw new Sop1Error("PLATFORM_RESPONSE_INVALID", platform, step, `${platform} 返回非 JSON 响应`, {
      url,
      contentType,
      preview: text.slice(0, 200),
    });
  }

  try {
    const parsed = JSON.parse(text) as T;
    const businessAuthError = getBusinessAuthError(parsed);
    if (businessAuthError) {
      throw new Sop1Error("AUTH_REQUIRED", platform, step, `${platform} 登录态已失效，请重新登录`, {
        url,
        message: businessAuthError,
      });
    }
    return parsed;
  } catch (error) {
    if (error instanceof Sop1Error) throw error;
    throw new Sop1Error("PLATFORM_RESPONSE_INVALID", platform, step, `${platform} JSON 解析失败`, {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function ensurePage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
}
