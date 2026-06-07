import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const binPath = path.join(repoRoot, 'bin', 'ae.js');

export async function makeTmpDir(prefix = 'ae-test-') {
  return await mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function cleanup(dir) {
  await rm(dir, { recursive: true, force: true });
}

export function runCli(argv, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [binPath, ...argv], {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

export async function hashFile(file) {
  const content = await readFile(file);
  return createHash('sha256').update(content).digest('hex');
}
