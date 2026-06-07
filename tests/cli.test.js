import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot, runCli } from './_helpers.js';

test('help prints top-level usage', async () => {
  const result = await runCli(['--help']);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Usage: ae <command>/);
  assert.match(result.stdout, /setup/);
  assert.match(result.stdout, /init/);
  assert.doesNotMatch(result.stdout, /ingest-mother/);
  assert.match(result.stdout, /Typical workflow/);
});

test('no args prints top-level usage', async () => {
  const result = await runCli([]);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Usage: ae <command>/);
});

test('version reads package.json', async () => {
  const result = await runCli(['--version']);
  const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
});

test('unknown command exits with usage', async () => {
  const result = await runCli(['unknown']);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown command: unknown/);
  assert.match(result.stderr, /Usage: ae <command>/);
});
