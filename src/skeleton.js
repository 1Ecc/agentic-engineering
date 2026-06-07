import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const RULES_BEGIN = '<!-- AE:RULES:BEGIN -->';
export const RULES_END = '<!-- AE:RULES:END -->';
const RULES_COMMENT = '<!-- 由 ae init 从 config/ae-rules.md 或 --rules 指定文件同步,勿手改 -->';
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
];

export class RulesMarkerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RulesMarkerError';
  }
}

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

export async function syncRulesBlock(targetFile, rulesContent, options = {}) {
  const dryRun = Boolean(options.dryRun ?? DEFAULT_DRY_RUN);
  const content = await readFile(targetFile, 'utf8');
  const ranges = findRulesRanges(content, targetFile);
  const block = buildRulesBlock(rulesContent);
  const created = [];
  const skipped = [];
  const updated = [];
  const display = path.basename(targetFile);

  if (ranges.length === 0) {
    const next = content.endsWith('\n') ? `${content}\n${block}` : `${content}\n\n${block}`;
    if (next === content) {
      skipped.push(display);
      return { created, skipped, updated };
    }
    created.push(`${display}#AE:RULES`);
    if (!dryRun) {
      await writeFile(targetFile, next);
    }
    return { created, skipped, updated };
  }

  const [{ start, end }] = ranges;
  const next = `${content.slice(0, start)}${block}${content.slice(end)}`;

  if (next === content) {
    skipped.push(`${display}#AE:RULES`);
    return { created, skipped, updated };
  }

  updated.push(`${display}#AE:RULES`);
  if (!dryRun) {
    await writeFile(targetFile, next);
  }

  return { created, skipped, updated };
}

export function buildRulesBlock(rulesContent) {
  const normalized = rulesContent.endsWith('\n') ? rulesContent : `${rulesContent}\n`;
  return `${RULES_BEGIN}\n${RULES_COMMENT}\n${normalized}${RULES_END}\n`;
}

function renderTemplate(template, replacements) {
  return template
    .replaceAll('{{PROJECT_NAME}}', replacements.projectName)
    .replaceAll('{{PROJECT_GOAL}}', replacements.projectGoal);
}

function findRulesRanges(content, targetFile) {
  const beginMatches = [...content.matchAll(new RegExp(escapeRegExp(RULES_BEGIN), 'g'))];
  const endMatches = [...content.matchAll(new RegExp(escapeRegExp(RULES_END), 'g'))];

  if (beginMatches.length !== endMatches.length || beginMatches.length > 1) {
    throw new RulesMarkerError(`malformed AE:RULES markers in ${targetFile}`);
  }

  if (beginMatches.length === 0) {
    return [];
  }

  const start = beginMatches[0].index;
  const end = endMatches[0].index + RULES_END.length;
  if (start > endMatches[0].index) {
    throw new RulesMarkerError(`malformed AE:RULES markers in ${targetFile}`);
  }

  let rangeEnd = end;
  if (content.slice(rangeEnd, rangeEnd + 1) === '\n') {
    rangeEnd += 1;
  }

  return [{ start, end: rangeEnd }];
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
