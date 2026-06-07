import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createDirectories, renderEntryFiles } from '../skeleton.js';
import { templatesPath } from '../utils/paths.js';
import { formatInitReport } from '../utils/report.js';

const DEFAULT_GOAL = 'TODO: 用一句话说明这个项目要解决什么问题。';

const HELP = `Usage: ae init [goal] [options]

Options:
  --target <path>  Initialize this project directory. Defaults to cwd.
  --dry-run        Show what would be created without writing files.
  -h, --help       Show help`;

export async function run(argv = []) {
  const options = parseArgs(argv);

  if (options.help) {
    console.log(HELP);
    return 0;
  }

  const target = path.resolve(options.target ?? process.cwd());

  try {
    await ensureTargetDirectory(target, options.dryRun);
    if (!(await hasInstalledAssets(target))) {
      console.error(`Error: AE assets not found in ${target}.`);
      console.error('Run `ae setup` first.');
      process.exitCode = 1;
      return 1;
    }

    const projectName = path.basename(target);
    const projectGoal = options.goal ?? DEFAULT_GOAL;
    const created = [];
    const skipped = [];

    const dirs = await createDirectories(target, { dryRun: options.dryRun });
    created.push(...dirs.created);
    skipped.push(...dirs.skipped);

    const entries = await renderEntryFiles(target, templatesPath('entries'), {
      projectName,
      projectGoal,
      dryRun: options.dryRun,
    });
    created.push(...entries.created);
    skipped.push(...entries.skipped);

    console.log(formatInitReport({ created, skipped, target, dryRun: options.dryRun }));
    return 0;
  } catch (error) {
    console.error(`AE init failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return 1;
  }
}

function parseArgs(argv) {
  const options = {
    target: undefined,
    goalParts: [],
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--target') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--target requires a path');
      }
      options.target = value;
      index += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option for init: ${arg}`);
    } else {
      options.goalParts.push(arg);
    }
  }

  return {
    target: options.target,
    dryRun: options.dryRun,
    help: options.help,
    goal: options.goalParts.length > 0 ? options.goalParts.join(' ') : undefined,
  };
}

async function ensureTargetDirectory(target, dryRun) {
  try {
    const current = await stat(target);
    if (!current.isDirectory()) {
      throw new Error(`target exists but is not a directory: ${target}`);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    if (!dryRun) {
      await mkdir(target, { recursive: true });
    }
  }
}

async function hasInstalledAssets(target) {
  return (
    (await isDirectory(path.join(target, '.claude', 'skills'))) ||
    (await isDirectory(path.join(target, '.codex', 'skills')))
  );
}

async function statMaybe(value) {
  try {
    return await stat(value);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function isDirectory(value) {
  const current = await statMaybe(value);
  return Boolean(current?.isDirectory());
}
