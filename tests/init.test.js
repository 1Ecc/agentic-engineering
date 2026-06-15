import test from 'node:test';
import assert from 'node:assert/strict';
import { access, appendFile, readFile } from 'node:fs/promises';
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

test('init creates skeleton, renders entries, keeps config absent, and avoids slash commands', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);

    const result = await runCli(['init', 'Build a v0.3 demo'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /AE init complete/);
    assert.doesNotMatch(result.stdout, /Rules:/);

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
      'spec/AGENTS.md',
      'spec/CLAUDE.md',
      'spec/ADR/AGENTS.md',
      'spec/ADR/CLAUDE.md',
      'spec/needs/.gitkeep',
      'spec/ADR/.gitkeep',
      'reference/.gitkeep',
      'data/.gitkeep',
      'scripts/.gitkeep',
    ]) {
      await assertFile(path.join(target, file));
    }

    await assertMissing(path.join(target, 'config'));
    await assertMissing(path.join(target, '.claude', 'commands'));
    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    const claude = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    assert.doesNotMatch(agents, /## Project-Specific Rules/); // AGENTS.md ships blank: no imposed sections
    assert.doesNotMatch(agents, /<!-- AE:RULES:/);
    assertClaudePointer(claude, path.basename(target));
    assert.notEqual(claude, agents);
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
    const claude = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    assert.match(readme, /# project-beta/);
    assert.match(readme, /My exact goal/);
    assert.match(agents, /# project-beta/);
    assert.match(agents, /My exact goal/);
    assert.match(claude, /# project-beta/);
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
    const beforeClaude = await hashFile(path.join(target, 'CLAUDE.md'));

    const second = await runCli(['init', 'Changed goal'], { cwd: target });
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /Created: 0 \(none\)/);
    assert.match(second.stdout, /Skipped: [1-9][0-9]*/);
    assert.equal(await hashFile(readme), beforeReadme);
    assert.equal(await hashFile(path.join(target, 'AGENTS.md')), beforeAgents);
    assert.equal(await hashFile(path.join(target, 'CLAUDE.md')), beforeClaude);
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
    assert.doesNotMatch(result.stdout, /Rules:/);
    await assertMissing(path.join(target, 'AGENTS.md'));
    await assertMissing(path.join(target, 'spec'));
    await assertMissing(path.join(target, 'config'));
    await assertMissing(path.join(target, '.claude', 'commands'));
  } finally {
    await cleanup(target);
  }
});

test('init renders a blank AGENTS.md with no imposed sections or router pointer', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);

    const result = await runCli(['init', 'Rules live in AGENTS'], { cwd: target });
    assert.equal(result.code, 0, result.stderr);

    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(agents, /## Project-Specific Rules/);
    assert.doesNotMatch(agents, /## Stack/);
    assert.doesNotMatch(agents, /using-agentic-engineering/); // no pointer; the router skill self-triggers
    assert.doesNotMatch(agents, /<!-- AE:RULES:/);
  } finally {
    await cleanup(target);
  }
});

test('init renders CLAUDE.md as a short pointer to AGENTS.md', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);

    const result = await runCli(['init', 'Claude pointer'], { cwd: target });
    assert.equal(result.code, 0, result.stderr);

    const claude = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    assertClaudePointer(claude, path.basename(target));
  } finally {
    await cleanup(target);
  }
});

test('init renders spec/ progressive-disclosure rule files', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);

    const result = await runCli(['init', 'Spec rules'], { cwd: target });
    assert.equal(result.code, 0, result.stderr);

    const specAgents = await readFile(path.join(target, 'spec', 'AGENTS.md'), 'utf8');
    assert.match(specAgents, /INDEX 推导规则/);
    assert.match(specAgents, /当前节点/);
    assert.match(specAgents, /R1.*落盘后同步 INDEX/);
    // Slimmed to the irreducible core: rules that skills already ship were removed.
    assert.doesNotMatch(specAgents, /## frontmatter/);
    assert.doesNotMatch(specAgents, /## 状态机/);
    assert.doesNotMatch(specAgents, /## 边界规则/);
    assert.doesNotMatch(specAgents, /docs\/spec-framework\.md/);

    // README≠INDEX and the global-architecture note relocated to spec/README.md.
    const specReadme = await readFile(path.join(target, 'spec', 'README.md'), 'utf8');
    assert.match(specReadme, /≠ INDEX/);
    assert.match(specReadme, /全局架构总览画在这里/);

    // INDEX column legend lives inline (as a comment) in spec/INDEX.md, not in AGENTS.md.
    const specIndex = await readFile(path.join(target, 'spec', 'INDEX.md'), 'utf8');
    assert.match(specIndex, /各列怎么填/);
    assert.match(specIndex, /<!--/);
    assert.doesNotMatch(specAgents, /各列怎么填/);
    assert.doesNotMatch(specAgents, /## INDEX 表说明/);

    const specClaude = await readFile(path.join(target, 'spec', 'CLAUDE.md'), 'utf8');
    assert.match(specClaude, /Always read/);
    assert.match(specClaude, /\[AGENTS\.md\]\(\.\/AGENTS\.md\)/);

    const adrAgents = await readFile(path.join(target, 'spec', 'ADR', 'AGENTS.md'), 'utf8');
    assert.match(adrAgents, /proposed/);
    assert.match(adrAgents, /accepted/);
    assert.match(adrAgents, /superseded/);
    assert.match(adrAgents, /NNNN-<标题>\.md/);
  } finally {
    await cleanup(target);
  }
});

test('init leaves config absent', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);

    const result = await runCli(['init', 'No config'], { cwd: target });

    assert.equal(result.code, 0, result.stderr);
    await assertMissing(path.join(target, 'config'));
  } finally {
    await cleanup(target);
  }
});

test('init rejects removed --rules option', async () => {
  const target = await makeTmpDir();
  try {
    await setup(target);

    const result = await runCli(['init', '--rules', 'rules.md', 'Goal'], { cwd: target });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unknown option for init: --rules/);
    await assertMissing(path.join(target, 'AGENTS.md'));
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

function assertClaudePointer(content, projectName) {
  const lines = content.trimEnd().split('\n');
  assert.ok(lines.length <= 6, `CLAUDE.md should stay short, got ${lines.length} lines`);
  assert.match(content, new RegExp(`# ${escapeRegExp(projectName)}`));
  assert.match(content, /\[AGENTS\.md\]\(\.\/AGENTS\.md\)/);
  assert.match(content, /Always read/);
  assert.ok(!lines.some((line) => line.startsWith('## ')), 'CLAUDE.md must not have sections');
  assert.doesNotMatch(content, /## Project-Specific Rules/);
  assert.doesNotMatch(content, /## Stack/);
  assert.doesNotMatch(content, /## Structure/);
  assert.doesNotMatch(content, /## Operating Guidelines/);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
