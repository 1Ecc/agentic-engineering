import { copyFile, chmod, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function copyTreeIdempotent(srcDir, destDir, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const created = [];
  const skipped = [];

  const source = await stat(srcDir);
  if (!source.isDirectory()) {
    throw new Error(`source is not a directory: ${srcDir}`);
  }

  await walk(srcDir, '');

  return { created, skipped };

  async function walk(currentSourceDir, relativeDir) {
    const entries = await readdir(currentSourceDir, { withFileTypes: true });
    const currentDestDir = path.join(destDir, relativeDir);

    if (!dryRun) {
      await mkdir(currentDestDir, { recursive: true });
    }

    if (entries.length === 0) {
      const marker = normalizeRelative(path.join(relativeDir, '.gitkeep'));
      const markerDest = path.join(currentDestDir, '.gitkeep');
      if (await exists(markerDest)) {
        skipped.push(marker);
      } else {
        created.push(marker);
        if (!dryRun) {
          await writeFile(markerDest, '');
        }
      }
      return;
    }

    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);
      const sourcePath = path.join(currentSourceDir, entry.name);
      const destPath = path.join(destDir, relativePath);

      if (entry.isDirectory()) {
        await walk(sourcePath, relativePath);
      } else if (entry.isFile()) {
        const normalized = normalizeRelative(relativePath);
        if (await exists(destPath)) {
          skipped.push(normalized);
        } else {
          created.push(normalized);
          if (!dryRun) {
            await mkdir(path.dirname(destPath), { recursive: true });
            await copyFile(sourcePath, destPath);
            const mode = (await stat(sourcePath)).mode & 0o777;
            await chmod(destPath, mode);
          }
        }
      }
    }
  }
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
