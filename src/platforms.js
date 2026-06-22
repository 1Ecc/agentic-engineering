import { stat } from 'node:fs/promises';
import path from 'node:path';

export const PLATFORMS = [
  { id: 'claude', name: 'Claude Code', skillsDir: '.claude', aliases: ['claude-code'] },
  { id: 'codex', name: 'Codex', skillsDir: '.codex' },
  { id: 'windsurf', name: 'Windsurf', skillsDir: '.windsurf' },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github',
    aliases: ['copilot', 'github'],
    detectionPaths: [
      '.github/copilot-instructions.md',
      '.github/instructions',
      '.github/prompts',
      '.github/skills',
    ],
  },
  { id: 'kilocode', name: 'Kilo Code', skillsDir: '.kilocode', aliases: ['kilo-code'] },
  { id: 'kimicode', name: 'Kimi Code', skillsDir: '.kimi-code', aliases: ['kimi', 'kimi-code'] },
  { id: 'codebuddy', name: 'CodeBuddy', skillsDir: '.codebuddy', aliases: ['codebuddy-code'] },
  { id: 'qoder', name: 'Qoder', skillsDir: '.qoder' },
  { id: 'trae', name: 'Trae', skillsDir: '.trae' },
  { id: 'cursor', name: 'Cursor', skillsDir: '.cursor' },
  { id: 'opencode', name: 'OpenCode', skillsDir: '.opencode', aliases: ['open-code'] },
  { id: 'antigravity', name: 'Antigravity', skillsDir: '.agents' },
  { id: 'gemini', name: 'Gemini CLI', skillsDir: '.gemini', aliases: ['gemini-cli'] },
  { id: 'qwen', name: 'Qwen Code', skillsDir: '.qwen', aliases: ['qwen-code'] },
  { id: 'kiro', name: 'Kiro', skillsDir: '.kiro' },
];

const PLATFORM_BY_ID_OR_ALIAS = new Map(
  PLATFORMS.flatMap((platform) => [
    [platform.id, platform],
    ...(platform.aliases ?? []).map((alias) => [alias, platform]),
  ]),
);

export function listPlatformIds() {
  return PLATFORMS.map((platform) => platform.id);
}

export function resolvePlatforms(ids) {
  const resolved = [];
  const seen = new Set();
  const unknown = [];

  for (const rawId of ids) {
    const id = rawId.trim().toLowerCase();
    if (!id) {
      continue;
    }

    const platform = PLATFORM_BY_ID_OR_ALIAS.get(id);
    if (!platform) {
      unknown.push(rawId);
      continue;
    }

    if (!seen.has(platform.id)) {
      resolved.push(platform);
      seen.add(platform.id);
    }
  }

  if (unknown.length > 0) {
    throw new Error(`Unknown platform(s): ${unknown.join(', ')}. Available: ${listPlatformIds().join(', ')}`);
  }

  if (resolved.length === 0) {
    throw new Error(`No platforms selected. Available: ${listPlatformIds().join(', ')}`);
  }

  return resolved;
}

export function parsePlatformList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getPlatformSkillsDir(platform) {
  return path.join(platform.skillsDir, 'skills');
}

export async function detectPlatforms(target) {
  const detected = [];

  for (const platform of PLATFORMS) {
    if (platform.detectionPaths?.length > 0) {
      for (const detectionPath of platform.detectionPaths) {
        if (await pathExists(path.join(target, detectionPath))) {
          detected.push(platform);
          break;
        }
      }
      continue;
    }

    if (await isDirectory(path.join(target, platform.skillsDir))) {
      detected.push(platform);
    }
  }

  return detected;
}

async function pathExists(value) {
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

async function isDirectory(value) {
  try {
    return (await stat(value)).isDirectory();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
