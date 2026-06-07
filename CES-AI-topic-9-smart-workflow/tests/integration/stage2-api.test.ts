import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "ces-api-"));
process.env.WORKFLOW_DATA_DIR = tempDir;
process.env.MCP_ENABLED = "false";
process.env.LLM_PROVIDER = "";

await mkdir(tempDir, { recursive: true });
await cp("data/workflows", path.join(tempDir, "workflows"), { recursive: true });
await cp("data/nodes", path.join(tempDir, "nodes"), { recursive: true });
await cp("data/recordings", path.join(tempDir, "recordings"), { recursive: true });
await mkdir(path.join(tempDir, "runs"), { recursive: true });

const { createApiServer } = await import("../../apps/api/src/server.js");
const server = createApiServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

async function request(pathname: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

async function requestJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await request(pathname, init);
  if (!response.ok) {
    const text = await response.text();
    assert.fail(`${pathname} returned ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

try {
  const workflows = await requestJson<{ workflows: Array<{ id: string }> }>("/api/workflows");
  assert.equal(workflows.workflows.length, 0);

  const nodes = await requestJson<{ nodes: Array<{ type: string }> }>("/api/nodes");
  assert.ok(nodes.nodes.some((node) => node.type === "mail.draft"));

  const generateResponse = await request("/api/workflows/generate", {
    method: "POST",
    body: JSON.stringify({ prompt: "查 SKU 库存，发邮件提醒补货" }),
  });
  assert.equal(generateResponse.status, 500);
  assert.match(await generateResponse.text(), /LLM_PROVIDER is required|API_KEY is required/);

  const recordStart = await request("/api/nodes/record/start", { method: "POST" });
  assert.equal(recordStart.status, 500);
  assert.match(await recordStart.text(), /MCP_ENABLED must be true/);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(tempDir, { recursive: true, force: true });
}

console.log("stage2 API tests passed");
