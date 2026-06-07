import { existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSET_NAMES = new Set(['commands', 'skills', 'config']);
let cachedPackageRoot;

export async function packageRootAsync() {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }

  let current = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const candidate = path.join(current, 'package.json');
    try {
      await access(candidate);
      cachedPackageRoot = current;
      return cachedPackageRoot;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        throw new Error('Could not find package.json from current module path.');
      }
      current = parent;
    }
  }
}

export function packageRoot() {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }

  let current = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (existsSync(path.join(current, 'package.json'))) {
      cachedPackageRoot = current;
      return cachedPackageRoot;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('Could not find package.json from current module path.');
    }
    current = parent;
  }
}

export function assetPath(name) {
  if (!ASSET_NAMES.has(name)) {
    throw new Error(`Unknown asset: ${name}`);
  }
  return path.join(packageRoot(), name);
}
