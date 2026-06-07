import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { assetPath } from '../utils/paths.js';
import { copyTreeIdempotent } from '../utils/copy.js';
import { formatInitReport } from '../utils/report.js';

const HELP = `Usage: ae init [options]

Options:
  --target <path>  Install assets into this project directory. Defaults to cwd.
  --dry-run        Show what would be copied without writing files.
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

    const groups = [
      {
        source: assetPath('commands'),
        dest: path.join(target, '.claude', 'commands'),
        prefix: path.join('.claude', 'commands'),
      },
      {
        source: assetPath('skills'),
        dest: path.join(target, '.claude', 'skills'),
        prefix: path.join('.claude', 'skills'),
      },
      {
        source: assetPath('config'),
        dest: path.join(target, 'config'),
        prefix: 'config',
      },
    ];

    const created = [];
    const skipped = [];

    for (const group of groups) {
      const result = await copyTreeIdempotent(group.source, group.dest, {
        dryRun: options.dryRun,
      });
      created.push(...result.created.map((item) => toDisplayPath(path.join(group.prefix, item))));
      skipped.push(...result.skipped.map((item) => toDisplayPath(path.join(group.prefix, item))));
    }

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
    } else {
      throw new Error(`Unknown option for init: ${arg}`);
    }
  }

  return options;
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

function toDisplayPath(value) {
  return value.split(path.sep).join('/');
}
