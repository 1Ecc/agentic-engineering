import { existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  return path.join(packageRoot(), name);
}

export function skillsPath() {
  return path.join(packageRoot(), 'skills');
}

export function templatesPath(subdir = '') {
  return path.join(packageRoot(), 'templates', subdir);
}
