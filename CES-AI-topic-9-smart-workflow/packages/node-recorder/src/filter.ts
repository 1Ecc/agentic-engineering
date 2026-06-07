import type { CapturedRequest } from "../../llm-orchestrator/src/index.js";

const STATIC_EXTENSIONS = /\.(png|jpe?g|gif|svg|ico|css|js|map|woff2?|ttf)(\?|$)/i;
const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "set-cookie", "authapitoken", "token", "x-auth-token"]);
const SYSTEM_QUERY_KEYS = new Set([
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
const NON_BUSINESS_PATTERN =
  /analytics|monitor|metric|collect|telemetry|tracking|heartbeat|polling|sockjs|captcha|login|logout|auth|permission|privacy|config(?:\.json)?|dictionary|dict|messagecenter|message\/unread|static|sound|weather|tianqiapi|paramvalue|module|project\/queryuserproject|public|\/#\/|\/home-page|\/workbench$|\/api\/wb\/|\/fieldserviceportal\/?$/i;

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) => !SENSITIVE_HEADERS.has(key.toLowerCase()))
      .map(([key, value]) => [key, value.length > 500 ? `${value.slice(0, 500)}...` : value]),
  );
}

function isBusinessRequest(request: CapturedRequest): boolean {
  if (!/^https?:\/\//i.test(request.url)) return false;
  if (STATIC_EXTENSIONS.test(request.url)) return false;
  if (NON_BUSINESS_PATTERN.test(request.url)) return false;
  if (isTelemetryBeacon(request.url)) return false;
  return ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase());
}

function isTelemetryBeacon(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const telemetryHost = /analysis|analytics|telemetry|monitor/i.test(url.hostname);
    const beaconPath = /^\/(?:up|collect|track|event|events|log|logs|beacon)$/i.test(url.pathname);
    return telemetryHost && beaconPath;
  } catch {
    return false;
  }
}

function requestPathKey(request: CapturedRequest): string {
  try {
    const url = new URL(request.url);
    return `${request.method.toUpperCase()} ${url.origin}${url.pathname}`.toLowerCase();
  } catch {
    return `${request.method.toUpperCase()} ${request.url}`.toLowerCase();
  }
}

function countNonEmptyBusinessQueryParams(request: CapturedRequest): number {
  try {
    const url = new URL(request.url);
    let count = 0;
    for (const [key, value] of url.searchParams.entries()) {
      if (SYSTEM_QUERY_KEYS.has(key.toLowerCase())) continue;
      if (value.trim().length > 0) count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

function hasResponseBody(request: CapturedRequest): boolean {
  return request.responseBody !== undefined && request.responseBody !== null;
}

function requestRank(request: CapturedRequest): number {
  let score = 0;
  if (request.status && request.status >= 200 && request.status < 300) score += 20;
  score += countNonEmptyBusinessQueryParams(request) * 10;
  if (hasResponseBody(request)) score += 5;
  return score;
}

export function filterCapturedRequests(requests: CapturedRequest[]): CapturedRequest[] {
  const candidates = requests
    .filter(isBusinessRequest)
    .map((request, index) => ({
      request: {
        ...request,
        method: request.method.toUpperCase(),
        headers: sanitizeHeaders(request.headers),
      },
      index,
      key: requestPathKey(request),
    }));
  const groups = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.key);
    if (group) {
      group.push(candidate);
    } else {
      groups.set(candidate.key, [candidate]);
    }
  }

  return Array.from(groups.values()).flatMap((group) =>
    group
      .sort((left, right) => {
        const rankCompare = requestRank(right.request) - requestRank(left.request);
        return rankCompare !== 0 ? rankCompare : left.index - right.index;
      })
      .map(({ request }) => request),
  );
}
