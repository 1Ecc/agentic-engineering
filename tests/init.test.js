import test from 'node:test';
import assert from 'node:assert/strict';
import { access, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanup, hashFile, makeTmpDir, runCli } from './_helpers.js';

test('init installs commands, skills, and config into an empty directory', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['init'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE init complete/);
    assert.match(result.stdout, /Next: open Claude Code/);

    await assertFile(path.join(target, '.claude', 'commands', 'ae-init.md'));
    await assertFile(path.join(target, '.claude', 'commands', 'ae-init.templates', 'README.md'));
    await assertFile(path.join(target, '.claude', 'skills', 'diagnose', 'SKILL.md'));
    await assertFile(path.join(target, '.claude', 'skills', 'tdd', 'SKILL.md'));
    await assertFile(path.join(target, '.claude', 'skills', 'improve-codebase-architecture', 'LANGUAGE.md'));
    await assertFile(path.join(target, 'config', 'ae-rules.md.example'));
  } finally {
    await cleanup(target);
  }
});

test('init is idempotent and does not overwrite existing files', async () => {
  const target = await makeTmpDir();
  try {
    const first = await runCli(['init'], { cwd: target });
    assert.equal(first.code, 0, first.stderr);

    const commandFile = path.join(target, '.claude', 'commands', 'ae-init.md');
    await appendFile(commandFile, '\n<!-- local edit preserved -->\n');
    const before = await hashFile(commandFile);

    const second = await runCli(['init'], { cwd: target });
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /Created: 0 \(none\)/);
    assert.match(second.stdout, /Skipped: [1-9][0-9]*/);

    const after = await hashFile(commandFile);
    assert.equal(after, before);
  } finally {
    await cleanup(target);
  }
});

test('init dry-run reports planned writes without touching the filesystem', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['init', '--dry-run'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE init dry run complete/);
    assert.match(result.stdout, /Would create: [1-9][0-9]*/);

    await assertMissing(path.join(target, '.claude'));
    await assertMissing(path.join(target, 'config'));
  } finally {
    await cleanup(target);
  }
});

test('init --target installs into the specified directory', async () => {
  const root = await makeTmpDir();
  const target = path.join(root, 'project');
  try {
    const result = await runCli(['init', '--target', target]);

    assert.equal(result.code, 0, result.stderr);
    await assertFile(path.join(target, '.claude', 'commands', 'ae-init.md'));
    await assertFile(path.join(target, '.claude', 'skills', 'zoom-out', 'SKILL.md'));
  } finally {
    await cleanup(root);
  }
});

async function assertFile(file) {
  await access(file);
}

async function assertMissing(file) {
  await assert.rejects(access(file), { code: 'ENOENT' });
}
