import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DRY_RUN = false;

const SKELETON_DIRS = [
  'spec',
  path.join('spec', 'needs'),
  path.join('spec', 'ADR'),
  'reference',
  'data',
  'scripts',
];

const GITKEEP_DIRS = [
  path.join('spec', 'needs'),
  path.join('spec', 'ADR'),
  'reference',
  'data',
  'scripts',
];

const ENTRY_FILES = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'handoff.md',
  path.join('spec', 'README.md'),
  path.join('spec', 'INDEX.md'),
  path.join('spec', 'AGENTS.md'),
  path.join('spec', 'CLAUDE.md'),
  path.join('spec', 'ADR', 'AGENTS.md'),
  path.join('spec', 'ADR', 'CLAUDE.md'),
];

export async function createDirectories(target, options = {}) {
  const dryRun = Boolean(options.dryRun ?? DEFAULT_DRY_RUN);
  const created = [];
  const skipped = [];
  const updated = [];

  for (const dir of SKELETON_DIRS) {
    const absolute = path.join(target, dir);
    const display = `${normalizeRelative(dir)}/`;

    if (await exists(absolute)) {
      const current = await stat(absolute);
      if (!current.isDirectory()) {
        throw new Error(`expected directory but found file: ${absolute}`);
      }
      skipped.push(display);
    } else {
      created.push(display);
      if (!dryRun) {
        await mkdir(absolute, { recursive: true });
      }
    }
  }

  for (const dir of GITKEEP_DIRS) {
    const file = path.join(target, dir, '.gitkeep');
    const display = normalizeRelative(path.join(dir, '.gitkeep'));

    if (await exists(file)) {
      skipped.push(display);
    } else {
      created.push(display);
      if (!dryRun) {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, '');
      }
    }
  }

  return { created, skipped, updated };
}

export async function renderEntryFiles(target, templateRoot, options = {}) {
  const dryRun = Boolean(options.dryRun ?? DEFAULT_DRY_RUN);
  const projectName = options.projectName ?? path.basename(target);
  const projectGoal = options.projectGoal ?? 'TODO: 用一句话说明这个项目要解决什么问题。';
  const created = [];
  const skipped = [];
  const updated = [];

  for (const file of ENTRY_FILES) {
    const source = path.join(templateRoot, file);
    const dest = path.join(target, file);
    const display = normalizeRelative(file);

    if (await exists(dest)) {
      skipped.push(display);
      continue;
    }

    const template = await readFile(source, 'utf8');
    const rendered = renderTemplate(template, { projectName, projectGoal });
    created.push(display);

    if (!dryRun) {
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, rendered);
    }
  }

  return { created, skipped, updated };
}

function renderTemplate(template, replacements) {
  return template
    .replaceAll('{{PROJECT_NAME}}', replacements.projectName)
    .replaceAll('{{PROJECT_GOAL}}', replacements.projectGoal);
}

async function exists(value) {
  try {
    await stat(value);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function normalizeRelative(value) {
  return value.split(path.sep).join('/');
}
