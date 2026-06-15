import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDirectories, renderEntryFiles } from '../src/skeleton.js';
import { cleanup, hashFile, makeTmpDir } from './_helpers.js';

test('createDirectories creates the standard skeleton and is idempotent', async () => {
  const target = await makeTmpDir();
  try {
    const first = await createDirectories(target);
    assert.ok(first.created.includes('spec/'));
    assert.ok(first.created.includes('spec/needs/.gitkeep'));
    assert.ok(first.created.includes('spec/ADR/.gitkeep'));
    assert.ok(first.created.includes('reference/.gitkeep'));
    assert.ok(first.created.includes('data/.gitkeep'));
    assert.ok(first.created.includes('scripts/.gitkeep'));

    await assertFile(path.join(target, 'spec', 'needs', '.gitkeep'));
    await assertFile(path.join(target, 'spec', 'ADR', '.gitkeep'));
    await assertFile(path.join(target, 'reference', '.gitkeep'));
    await assertFile(path.join(target, 'data', '.gitkeep'));
    await assertFile(path.join(target, 'scripts', '.gitkeep'));

    const second = await createDirectories(target);
    assert.equal(second.created.length, 0);
    assert.ok(second.skipped.includes('spec/'));
    assert.ok(second.skipped.includes('scripts/.gitkeep'));
  } finally {
    await cleanup(target);
  }
});

test('createDirectories supports dry-run without touching the filesystem', async () => {
  const target = await makeTmpDir();
  try {
    const result = await createDirectories(target, { dryRun: true });
    assert.ok(result.created.includes('spec/'));
    assert.ok(result.created.includes('reference/.gitkeep'));
    await assertMissing(path.join(target, 'spec'));
    await assertMissing(path.join(target, 'reference'));
  } finally {
    await cleanup(target);
  }
});

test('renderEntryFiles renders placeholders, skips existing files, and supports dry-run', async () => {
  const root = await makeTmpDir();
  const target = path.join(root, 'project-alpha');
  const templateRoot = path.join(root, 'templates');
  try {
    await writeTemplates(templateRoot);

    const dry = await renderEntryFiles(target, templateRoot, {
      projectName: 'project-alpha',
      projectGoal: 'Build the thing.',
      dryRun: true,
    });
    assert.ok(dry.created.includes('README.md'));
    await assertMissing(path.join(target, 'README.md'));

    const first = await renderEntryFiles(target, templateRoot, {
      projectName: 'project-alpha',
      projectGoal: 'Build the thing.',
    });
    assert.ok(first.created.includes('AGENTS.md'));
    assert.ok(first.created.includes('spec/INDEX.md'));

    const readme = await readFile(path.join(target, 'README.md'), 'utf8');
    assert.match(readme, /# project-alpha/);
    assert.match(readme, /Build the thing\./);
    assert.doesNotMatch(readme, /{{PROJECT_/);

    const before = await hashFile(path.join(target, 'README.md'));
    const second = await renderEntryFiles(target, templateRoot, {
      projectName: 'project-alpha',
      projectGoal: 'Changed goal.',
    });
    assert.equal(second.created.length, 0);
    assert.ok(second.skipped.includes('README.md'));
    assert.equal(await hashFile(path.join(target, 'README.md')), before);
  } finally {
    await cleanup(root);
  }
});

async function writeTemplates(templateRoot) {
  await mkdir(path.join(templateRoot, 'spec', 'ADR'), { recursive: true });
  await writeFile(path.join(templateRoot, 'README.md'), '# {{PROJECT_NAME}}\n\n{{PROJECT_GOAL}}\n');
  await writeFile(path.join(templateRoot, 'AGENTS.md'), '# Agent\n\n{{PROJECT_GOAL}}\n');
  await writeFile(path.join(templateRoot, 'CLAUDE.md'), '# Claude\n\n{{PROJECT_GOAL}}\n');
  await writeFile(path.join(templateRoot, 'handoff.md'), '{{PROJECT_NAME}}\n');
  await writeFile(path.join(templateRoot, 'spec', 'README.md'), '{{PROJECT_GOAL}}\n');
  await writeFile(path.join(templateRoot, 'spec', 'INDEX.md'), '{{PROJECT_NAME}}\n');
  await writeFile(path.join(templateRoot, 'spec', 'AGENTS.md'), '# spec rules\n');
  await writeFile(path.join(templateRoot, 'spec', 'CLAUDE.md'), '# spec pointer\n');
  await writeFile(path.join(templateRoot, 'spec', 'ADR', 'AGENTS.md'), '# ADR rules\n');
  await writeFile(path.join(templateRoot, 'spec', 'ADR', 'CLAUDE.md'), '# ADR pointer\n');
}

async function assertFile(file) {
  await access(file);
}

async function assertMissing(file) {
  await assert.rejects(access(file), { code: 'ENOENT' });
}
