import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = process.cwd();
const webDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)), "apps/web");
const node = process.execPath;

const processes = [
  {
    name: "api",
    command: node,
    args: ["node_modules/tsx/dist/cli.mjs", "apps/api/src/server.ts"],
    cwd: rootDir,
  },
  {
    name: "web",
    command: node,
    args: ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"],
    cwd: webDir,
  },
];

const children = processes.map((entry) => {
  const child = spawn(entry.command, entry.args, {
    cwd: entry.cwd,
    stdio: "inherit",
    shell: false,
  });

  child.on("error", (error) => {
    console.error(`[${entry.name}] failed to start:`, error);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${entry.name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
