import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanup, hashFile, makeTmpDir, runCli } from './_helpers.js';

test('setup requires platforms in non-interactive mode', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup'], { cwd: target });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /No platforms selected/);
    assert.match(result.stderr, /--platform <ids>/);
    await assertMissing(path.join(target, '.claude'));
    await assertMissing(path.join(target, '.codex'));
  } finally {
    await cleanup(target);
  }
});

test('setup installs skills for selected Claude Code and Codex platforms without creating config', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup', '--platform', 'claude,codex'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE setup complete/);
    assert.match(result.stdout, /Next: run `ae init "<goal>"`/);
    assert.doesNotMatch(result.stdout, /ae-rules\.md/);

    await assertFile(path.join(target, '.claude', 'skills', 'diagnose', 'SKILL.md'));
    await assertFile(path.join(target, '.codex', 'skills', 'diagnose', 'SKILL.md'));
    await assertFile(path.join(target, '.claude', 'skills', 'tdd', 'SKILL.md'));
    await assertFile(path.join(target, '.codex', 'skills', 'tdd', 'SKILL.md'));
    await assertFile(path.join(target, '.claude', 'skills', 'using-agentic-engineering', 'SKILL.md'));
    await assertFile(path.join(target, '.codex', 'skills', 'using-agentic-engineering', 'SKILL.md'));
    await assertMissing(path.join(target, 'config'));
    await assertMissing(path.join(target, '.claude', 'commands'));

    const claudeEntries = await readdir(path.join(target, '.claude'));
    assert.deepEqual(claudeEntries.sort(), ['skills']);
  } finally {
    await cleanup(target);
  }
});

test('setup copies complete skill directories', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup', '--platform', 'claude,codex'], { cwd: target });
    assert.equal(result.code, 0, result.stderr);

    for (const root of ['.claude', '.codex']) {
      await assertFile(path.join(target, root, 'skills', 'diagnose', 'assets', 'issue-7-sections.md'));
      await assertFile(path.join(target, root, 'skills', 'diagnose', 'scripts', 'hitl-loop.template.sh'));
      await assertFile(path.join(target, root, 'skills', 'improve-codebase-architecture', 'LANGUAGE.md'));
      await assertFile(path.join(target, root, 'skills', 'to-issues', 'todo-template.md'));
    }
  } finally {
    await cleanup(target);
  }
});

test('setup is idempotent', async () => {
  const target = await makeTmpDir();
  try {
    const first = await runCli(['setup', '--platform', 'claude,codex'], { cwd: target });
    assert.equal(first.code, 0, first.stderr);

    const second = await runCli(['setup', '--platform', 'claude,codex'], { cwd: target });
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /Installed: 0 \(none\)/);
    assert.match(second.stdout, /Skipped: [1-9][0-9]*/);
    await assertMissing(path.join(target, 'config'));
  } finally {
    await cleanup(target);
  }
});

test('setup dry-run reports planned installs without touching the filesystem', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup', '--platform', 'cursor', '--dry-run'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE setup dry run complete/);
    assert.match(result.stdout, /Would install: [1-9][0-9]*/);
    await assertMissing(path.join(target, '.claude'));
    await assertMissing(path.join(target, '.codex'));
    await assertMissing(path.join(target, '.cursor'));
    await assertMissing(path.join(target, 'config'));
  } finally {
    await cleanup(target);
  }
});

test('setup installs skills for a single selected platform', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup', '--platform', 'cursor'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    await assertFile(path.join(target, '.cursor', 'skills', 'diagnose', 'SKILL.md'));
    await assertFile(path.join(target, '.cursor', 'skills', 'using-agentic-engineering', 'SKILL.md'));
    await assertMissing(path.join(target, '.claude'));
    await assertMissing(path.join(target, '.codex'));
  } finally {
    await cleanup(target);
  }
});

test('setup installs skills for multiple selected platforms', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup', '--platform', 'cursor,trae,github-copilot'], {
      cwd: target,
    });

    assert.equal(result.code, 0, result.stderr);
    await assertFile(path.join(target, '.cursor', 'skills', 'diagnose', 'SKILL.md'));
    await assertFile(path.join(target, '.trae', 'skills', 'diagnose', 'SKILL.md'));
    await assertFile(path.join(target, '.github', 'skills', 'diagnose', 'SKILL.md'));
    await assertMissing(path.join(target, '.claude'));
  } finally {
    await cleanup(target);
  }
});

test('setup rejects unknown platforms before writing skills', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['setup', '--platform', 'cursor,nope'], { cwd: target });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unknown platform/);
    assert.match(result.stderr, /nope/);
    await assertMissing(path.join(target, '.cursor'));
  } finally {
    await cleanup(target);
  }
});

test('setup leaves pre-existing config files untouched during v0.2 upgrades', async () => {
  const target = await makeTmpDir();
  try {
    await mkdir(path.join(target, 'config'), { recursive: true });
    const rules = path.join(target, 'config', 'ae-rules.md');
    await writeFile(rules, 'custom rules\n');
    const beforeContent = await readFile(rules, 'utf8');
    const beforeHash = await hashFile(rules);

    const result = await runCli(['setup', '--platform', 'claude,codex'], { cwd: target });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await readFile(rules, 'utf8'), beforeContent);
    assert.equal(await hashFile(rules), beforeHash);
  } finally {
    await cleanup(target);
  }
});

async function assertFile(file) {
  await access(file);
}

async function assertMissing(file) {
  await assert.rejects(access(file), { code: 'ENOENT' });
}
