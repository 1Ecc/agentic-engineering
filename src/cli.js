import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { packageRoot } from './utils/paths.js';

const HELP = `Usage: ae <command> [options]

Commands:
  setup                Install skills to selected AI coding platforms.
  init [goal]          Create spec/ skeleton and render entry files.
                       Requires \`ae setup\` to have run.

Options:
  -h, --help     Show help
  -v, --version  Show version

Typical workflow:
  ae setup
  ae init "<one-line project goal>"`;

export async function run(argv = []) {
  try {
    const [command, ...rest] = argv;

    if (!command || command === '--help' || command === '-h') {
      console.log(HELP);
      return 0;
    }

    if (command === '--version' || command === '-v') {
      console.log(await readVersion());
      return 0;
    }

    if (command === 'setup') {
      const mod = await import('./commands/setup.js');
      return await mod.run(rest);
    }

    if (command === 'init') {
      const mod = await import('./commands/init.js');
      return await mod.run(rest);
    }

    console.error(`Unknown command: ${command}`);
    console.error('');
    console.error(HELP);
    process.exitCode = 1;
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return 1;
  }
}

async function readVersion() {
  const packageJson = JSON.parse(
    await readFile(path.join(packageRoot(), 'package.json'), 'utf8'),
  );
  return packageJson.version;
}
