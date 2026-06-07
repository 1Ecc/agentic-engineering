import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { copyTreeIdempotent } from '../utils/copy.js';
import { skillsPath } from '../utils/paths.js';
import { formatSetupReport } from '../utils/report.js';

const HELP = `Usage: ae setup [options]

Options:
  --target <path>  Install AE assets into this project directory. Defaults to cwd.
  --dry-run        Show what would be installed without writing files.
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

    const created = [];
    const skipped = [];
    const skillGroups = [
      {
        dest: path.join(target, '.claude', 'skills'),
        prefix: path.join('.claude', 'skills'),
      },
      {
        dest: path.join(target, '.codex', 'skills'),
        prefix: path.join('.codex', 'skills'),
      },
    ];

    for (const group of skillGroups) {
      const result = await copyTreeIdempotent(skillsPath(), group.dest, {
        dryRun: options.dryRun,
      });
      created.push(...result.created.map((item) => toDisplayPath(path.join(group.prefix, item))));
      skipped.push(...result.skipped.map((item) => toDisplayPath(path.join(group.prefix, item))));
    }

    console.log(formatSetupReport({ created, skipped, target, dryRun: options.dryRun }));
    return 0;
  } catch (error) {
    console.error(`AE setup failed: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error(`Unknown option for setup: ${arg}`);
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
