import test from 'node:test';
import assert from 'node:assert/strict';
import { access, appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanup, hashFile, makeTmpDir, runCli } from './_helpers.js';

test('init fails when setup has not installed AE assets', async () => {
  const target = await makeTmpDir();
  try {
    const result = await runCli(['init', 'No setup yet'], { cwd: target });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /AE assets not found/);
    assert.match(result.stderr, /Run `ae setup` first/);
    await assertMissing(path.join(target, 'AGENTS.md'));
    await assertMissing(path.join(target, 'spec'));
  } finally {
    await cleanup(target);
  }
});

test('init creates skeleton, renders entries, syncs rules, and avoids slash commands', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);
    await appendFile(path.join(target, 'config', 'ae-rules.md'), '\n- Project rule from config\n');

    const result = await runCli(['init', 'Build a v0.2 demo'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE init complete/);
    assert.match(result.stdout, /Rules: synced/);

    for (const dir of ['spec', 'spec/needs', 'spec/ADR', 'reference', 'data', 'scripts']) {
      await assertDirectory(path.join(target, dir));
    }
    for (const file of [
      'README.md',
      'AGENTS.md',
      'CLAUDE.md',
      'handoff.md',
      'spec/README.md',
      'spec/INDEX.md',
      'spec/needs/.gitkeep',
      'spec/ADR/.gitkeep',
      'reference/.gitkeep',
      'data/.gitkeep',
      'scripts/.gitkeep',
    ]) {
      await assertFile(path.join(target, file));
    }

    await assertMissing(path.join(target, '.claude', 'commands'));
    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    const claude = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    assert.equal(count(agents, '<!-- AE:RULES:BEGIN -->'), 1);
    assert.equal(count(agents, '<!-- AE:RULES:END -->'), 1);
    assert.equal(count(claude, '<!-- AE:RULES:BEGIN -->'), 1);
    assert.match(agents, /- Project rule from config/);
    assert.match(claude, /- Project rule from config/);
  } finally {
    await cleanup(target);
  }
});

test('init replaces project placeholders with target basename and goal', async () => {
  const root = await makeTmpDir();
  const target = path.join(root, 'project-beta');
  try {
    await setup(target);
    const result = await runCli(['init', '--target', target, 'My exact goal']);

    assert.equal(result.code, 0, result.stderr);
    const readme = await readFile(path.join(target, 'README.md'), 'utf8');
    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(readme, /# project-beta/);
    assert.match(readme, /My exact goal/);
    assert.match(agents, /My exact goal/);
    assert.doesNotMatch(readme, /{{PROJECT_/);
  } finally {
    await cleanup(root);
  }
});

test('init is idempotent and does not overwrite user files', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);
    const first = await runCli(['init', 'Stable goal'], { cwd: target });
    assert.equal(first.code, 0, first.stderr);

    const readme = path.join(target, 'README.md');
    await appendFile(readme, '\nManual edit.\n');
    const beforeReadme = await hashFile(readme);
    const beforeAgents = await hashFile(path.join(target, 'AGENTS.md'));

    const second = await runCli(['init', 'Changed goal'], { cwd: target });
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /Created: 0 \(none\)/);
    assert.match(second.stdout, /Skipped: [1-9][0-9]*/);
    assert.equal(await hashFile(readme), beforeReadme);
    assert.equal(await hashFile(path.join(target, 'AGENTS.md')), beforeAgents);
  } finally {
    await cleanup(target);
  }
});

test('init dry-run reports planned skeleton writes without touching files', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);
    const result = await runCli(['init', '--dry-run', 'Dry goal'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE init dry run complete/);
    assert.match(result.stdout, /Would create: [1-9][0-9]*/);
    assert.match(result.stdout, /Rules: would sync/);
    await assertMissing(path.join(target, 'AGENTS.md'));
    await assertMissing(path.join(target, 'spec'));
    await assertMissing(path.join(target, '.claude', 'commands'));
  } finally {
    await cleanup(target);
  }
});

test('init --rules uses an explicit rules file instead of config/ae-rules.md', async () => {
  const root = await makeTmpDir();
  const target = path.join(root, 'project');
  const explicit = path.join(root, 'explicit-rules.md');
  try {
    await setup(target);
    await writeFile(path.join(target, 'config', 'ae-rules.md'), '- Config-only rule\n');
    await writeFile(explicit, '- Explicit rule\n');

    const result = await runCli(['init', '--target', target, '--rules', explicit, 'Explicit rules']);
    assert.equal(result.code, 0, result.stderr);

    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    const claude = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    assert.match(agents, /- Explicit rule/);
    assert.match(claude, /- Explicit rule/);
    assert.doesNotMatch(agents, /Config-only rule/);
  } finally {
    await cleanup(root);
  }
});

test('init --rules reports missing paths and directories clearly', async () => {
  const root = await makeTmpDir();
  const target = path.join(root, 'project');
  const missing = path.join(root, 'missing-rules.md');
  const dir = path.join(root, 'rules-dir');
  try {
    await setup(target);
    await mkdir(dir);

    const missingResult = await runCli(['init', '--target', target, '--rules', missing, 'Goal']);
    assert.equal(missingResult.code, 1);
    assert.match(missingResult.stderr, /rules file does not exist/);
    assert.match(missingResult.stderr, new RegExp(escapeRegExp(missing)));

    const dirResult = await runCli(['init', '--target', target, '--rules', dir, 'Goal']);
    assert.equal(dirResult.code, 1);
    assert.match(dirResult.stderr, /expected a file, got directory/);
  } finally {
    await cleanup(root);
  }
});

test('init skips rules when config/ae-rules.md is missing', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);
    await rm(path.join(target, 'config', 'ae-rules.md'));

    const result = await runCli(['init', 'No rules'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Rules: skipped \(no rules file\)/);
    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(agents, /AE:RULES:BEGIN/);
  } finally {
    await cleanup(target);
  }
});

test('init stops on malformed AE:RULES markers without changing the file', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);
    await mkdir(path.join(target, 'spec'), { recursive: true });
    await writeFile(
      path.join(target, 'AGENTS.md'),
      [
        '# Agent',
        '<!-- AE:RULES:BEGIN -->',
        'old',
        '<!-- AE:RULES:END -->',
        '<!-- AE:RULES:BEGIN -->',
        'old',
        '<!-- AE:RULES:END -->',
        '',
      ].join('\n'),
    );
    const before = await hashFile(path.join(target, 'AGENTS.md'));

    const result = await runCli(['init', 'Malformed'], { cwd: target });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /malformed AE:RULES markers/);
    assert.equal(await hashFile(path.join(target, 'AGENTS.md')), before);
  } finally {
    await cleanup(target);
  }
});

async function setup(target) {
  const result = await runCli(['setup', '--target', target]);
  assert.equal(result.code, 0, result.stderr);
}

async function assertFile(file) {
  await access(file);
}

async function assertDirectory(file) {
  const current = await import('node:fs/promises').then(({ stat }) => stat(file));
  assert.ok(current.isDirectory(), `${file} should be a directory`);
}

async function assertMissing(file) {
  await assert.rejects(access(file), { code: 'ENOENT' });
}

function count(content, needle) {
  return content.split(needle).length - 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
