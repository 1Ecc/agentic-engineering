import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { copyTreeIdempotent } from '../utils/copy.js';
import { skillsPath } from '../utils/paths.js';
import { formatSetupReport } from '../utils/report.js';
import {
  PLATFORMS,
  detectPlatforms,
  getPlatformSkillsDir,
  listPlatformIds,
  parsePlatformList,
  resolvePlatforms,
} from '../platforms.js';

const HELP = `Usage: ae setup [options]

Options:
  --target <path>  Install AE assets into this project directory. Defaults to cwd.
  --platform <ids> Install for comma-separated platforms, e.g. claude,codex,cursor.
  --dry-run        Show what would be installed without writing files.
  -h, --help       Show help

Platforms:
  ${listPlatformIds().join(', ')}`;

export async function run(argv = []) {
  const options = parseArgs(argv);

  if (options.help) {
    console.log(HELP);
    return 0;
  }

  const target = path.resolve(options.target ?? process.cwd());

  try {
    const explicitPlatforms =
      options.platformIds.length > 0 ? resolvePlatforms(options.platformIds) : undefined;
    await ensureTargetDirectory(target, options.dryRun);
    const selectedPlatforms = explicitPlatforms ?? (await selectPlatforms(target));

    const created = [];
    const skipped = [];
    const skillGroups = selectedPlatforms.map((platform) => {
      const skillsDir = getPlatformSkillsDir(platform);
      return {
        dest: path.join(target, skillsDir),
        prefix: skillsDir,
      };
    });

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
    platformIds: [],
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--platform') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--platform requires a comma-separated platform list');
      }
      options.platformIds.push(...parsePlatformList(value));
      index += 1;
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

async function selectPlatforms(target) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `No platforms selected. In non-interactive mode, pass --platform <ids>. Available: ${listPlatformIds().join(', ')}`,
    );
  }

  const detected = await detectPlatforms(target);
  const detectedIds = detected.map((platform) => platform.id);
  const defaultIds = detectedIds;

  console.log('Select target platforms for AE skills:');
  for (const [index, platform] of PLATFORMS.entries()) {
    const marker = defaultIds.includes(platform.id) ? '*' : ' ';
    console.log(`  ${index + 1}. [${marker}] ${platform.name} (${platform.id}) -> ${getPlatformSkillsDir(platform)}/`);
  }

  const defaultPrompt = defaultIds.length > 0 ? ` [${defaultIds.join(',')}]` : '';
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`Platform ids or numbers, comma-separated${defaultPrompt}: `);
    const selected = answer.trim() ? parseInteractivePlatformAnswer(answer) : defaultIds;
    return resolvePlatforms(selected);
  } finally {
    rl.close();
  }
}

function parseInteractivePlatformAnswer(answer) {
  return parsePlatformList(answer).map((item) => {
    const number = Number(item);
    if (Number.isInteger(number) && number >= 1 && number <= PLATFORMS.length) {
      return PLATFORMS[number - 1].id;
    }
    return item;
  });
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
