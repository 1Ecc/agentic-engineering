import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { formatIngestReport } from '../utils/report.js';

const HELP = `Usage: ae ingest-mother <mother-project-path> [options]

Options:
  --target <path>  Project directory where ae assets are installed. Defaults to cwd.
  -h, --help       Show help`;

export async function run(argv = []) {
  try {
    const options = parseArgs(argv);

    if (options.help) {
      console.log(HELP);
      return 0;
    }

    if (!options.motherPath) {
      console.error(HELP);
      process.exitCode = 1;
      return 1;
    }

    const mother = path.resolve(options.motherPath);
    const target = path.resolve(options.target ?? process.cwd());

    await assertDirectory(mother, 'mother project');
    await assertDirectory(target, 'target project');
    const warnings = await inspectMother(mother);

    const commandPath = path.join(target, '.claude', 'commands', 'ae-ingest-mother.md');
    try {
      const commandFile = await stat(commandPath);
      if (!commandFile.isFile()) {
        throw new Error('not a file');
      }
    } catch {
      console.error(
        `Target does not look initialized: ${toDisplayPath(commandPath)} is missing. Run \`ae init\` first.`,
      );
      process.exitCode = 1;
      return 1;
    }

    console.log(formatIngestReport({ mother, target, warnings }));
    return 0;
  } catch (error) {
    console.error(`AE ingest-mother failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return 1;
  }
}

function parseArgs(argv) {
  const options = {
    motherPath: undefined,
    target: undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--target') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--target requires a path');
      }
      options.target = value;
      index += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option for ingest-mother: ${arg}`);
    } else if (!options.motherPath) {
      options.motherPath = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

async function assertDirectory(value, label) {
  let current;
  try {
    current = await stat(value);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${label} does not exist: ${value}`);
    }
    throw error;
  }

  if (!current.isDirectory()) {
    throw new Error(`${label} is not a directory: ${value}`);
  }
}

async function inspectMother(mother) {
  const files = new Set(await readdir(mother));
  const hasEntry = ['AGENTS.md', 'CLAUDE.md', 'handoff.md'].some((file) => files.has(file));
  if (hasEntry) {
    return [];
  }
  return ['Mother project has no AGENTS.md, CLAUDE.md, or handoff.md at its root.'];
}

function toDisplayPath(value) {
  return value.split(path.sep).join('/');
}
