import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { packageRoot } from './utils/paths.js';

const HELP = `Usage: ae <command> [options]

Commands:
  init                 Install commands/, skills/, config/ into the current project's .claude/.
  ingest-mother <path> Pre-check a mother project before running \`/ae-ingest-mother\`.

Options:
  -h, --help     Show help
  -v, --version  Show version

After \`ae init\`, open Claude Code in the project and run \`/ae-init\` to
create the spec/ skeleton.`;

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

    if (command === 'init') {
      const mod = await import('./commands/init.js');
      return await mod.run(rest);
    }

    if (command === 'ingest-mother') {
      const mod = await import('./commands/ingest-mother.js');
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
