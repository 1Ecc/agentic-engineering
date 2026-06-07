import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanup, makeTmpDir, runCli } from './_helpers.js';

test('ingest-mother requires a mother project path', async () => {
  const result = await runCli(['ingest-mother']);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Usage: ae ingest-mother/);
});

test('ingest-mother rejects a missing mother project path', async () => {
  const target = await makeTmpDir();
  try {
    const missing = path.join(target, 'missing');
    const result = await runCli(['ingest-mother', missing], { cwd: target });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /mother project does not exist/);
    assert.match(result.stderr, /missing/);
  } finally {
    await cleanup(target);
  }
});

test('ingest-mother asks user to run ae init when target is not initialized', async () => {
  const root = await makeTmpDir();
  const mother = path.join(root, 'mother');
  const target = path.join(root, 'target');
  try {
    await mkdir(mother);
    await mkdir(target);
    await writeFile(path.join(mother, 'AGENTS.md'), '# Mother\n');

    const result = await runCli(['ingest-mother', mother], { cwd: target });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Run `ae init` first/);
  } finally {
    await cleanup(root);
  }
});

test('ingest-mother succeeds after init and does not modify files', async () => {
  const root = await makeTmpDir();
  const mother = path.join(root, 'mother');
  const target = path.join(root, 'target');
  try {
    await mkdir(mother);
    await mkdir(target);
    await writeFile(path.join(mother, 'AGENTS.md'), '# Mother\n');

    const init = await runCli(['init'], { cwd: target });
    assert.equal(init.code, 0, init.stderr);
    const before = await fileList(target);

    const result = await runCli(['ingest-mother', mother], { cwd: target });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Mother project ready:/);
    assert.match(result.stdout, /run `\/ae-ingest-mother /);

    const after = await fileList(target);
    assert.deepEqual(after, before);
  } finally {
    await cleanup(root);
  }
});

async function fileList(root) {
  const result = [];
  await walk('');
  return result.sort();

  async function walk(relativeDir) {
    const entries = await readdir(path.join(root, relativeDir), { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        await walk(relativePath);
      } else {
        result.push(relativePath.split(path.sep).join('/'));
      }
    }
  }
}
