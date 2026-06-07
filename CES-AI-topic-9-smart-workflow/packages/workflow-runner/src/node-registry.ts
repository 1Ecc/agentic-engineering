import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { NodeDefinition, NodeHandlerRunner } from "../../shared/src/index.js";
import { validateNodeDefinition } from "../../llm-orchestrator/src/schema.js";
import { createRecordedHttpFlowHandler, createRecordedHttpHandler } from "./handlers/generic-http.js";
import { createInputHandler } from "./handlers/builtin/input.js";
import { createFirstMatchRulesHandler, createRulesHandler } from "./handlers/builtin/rules.js";
import { createMailDraftHandler } from "./handlers/builtin/mail.js";
import { createLlmRewriteHandler } from "./handlers/builtin/llm-rewrite.js";
import { createDocExportHandler } from "./handlers/builtin/doc-export.js";
import { createComposeHandler } from "./handlers/builtin/compose.js";
import { createServiceforceHandler } from "./handlers/connectors/serviceforce.js";
import { createJiuqiuHandler } from "./handlers/connectors/jiuqiu.js";
import { createSposHandler } from "./handlers/connectors/spos.js";

export class NodeRegistry {
  private readonly entries = new Map<string, { def: NodeDefinition; handler: NodeHandlerRunner }>();

  register(def: NodeDefinition, handler: NodeHandlerRunner): void {
    const validation = validateNodeDefinition(def);
    if (!validation.valid) {
      throw new Error(`Invalid node definition ${def.type}: ${validation.errors.join("; ")}`);
    }
    this.entries.set(def.type, { def, handler });
  }

  resolve(type: string): { def: NodeDefinition; handler: NodeHandlerRunner } {
    const entry = this.entries.get(type);
    if (!entry) throw new Error(`Node type is not registered: ${type}`);
    return entry;
  }

  list(): NodeDefinition[] {
    return [...this.entries.values()].map((entry) => entry.def);
  }

  types(): string[] {
    return [...this.entries.keys()];
  }

  async loadDynamic(dataDir = process.env.WORKFLOW_DATA_DIR ?? path.resolve(process.cwd(), "data")): Promise<void> {
    const nodeDir = path.resolve(dataDir, "nodes");
    await this.loadNodeDirectory(nodeDir);
    await this.loadNodeDirectory(path.join(nodeDir, "builtin"));
    await this.loadNodeDirectory(path.join(nodeDir, "connectors"));
  }

  private async loadNodeDirectory(directory: string): Promise<void> {
    let files: string[];
    try {
      files = await readdir(directory);
    } catch {
      return;
    }

    for (const file of files.filter((item) => item.endsWith(".json"))) {
      const fullPath = path.join(directory, file);
      const def = JSON.parse(await readFile(fullPath, "utf-8")) as NodeDefinition;
      this.register(def, createHandlerForDefinition(def));
    }
  }
}

export function createHandlerForDefinition(def: NodeDefinition): NodeHandlerRunner {
  if (def.handler.kind === "recorded_http") return createRecordedHttpHandler();
  if (def.handler.kind === "recorded_http_flow") return createRecordedHttpFlowHandler();
  if (def.type === "input.text" || def.type === "input.upload") return createInputHandler();
  if (def.type === "data.compose") return createComposeHandler();
  if (def.type === "rules.evaluate") return createRulesHandler();
  if (def.type === "rules.first_match" || def.type === "rules.route") return createFirstMatchRulesHandler();
  if (def.type === "mail.draft") return createMailDraftHandler();
  if (def.type === "llm.rewrite") return createLlmRewriteHandler();
  if (def.type === "doc.export") return createDocExportHandler();
  if (def.type === "serviceforce.query") return createServiceforceHandler();
  if (def.type === "jiuqiu.query") return createJiuqiuHandler();
  if (def.type === "spos.query") return createSposHandler();
  throw new Error(`No handler registered for node type: ${def.type}`);
}

export const globalNodeRegistry = new NodeRegistry();
