export function formatInitReport({ created, skipped, target, dryRun }) {
  const createdLabel = dryRun ? 'Would create' : 'Created';
  return [
    dryRun ? 'AE init dry run complete' : 'AE init complete',
    `- ${createdLabel}: ${created.length} (${summarize(created)})`,
    `- Skipped: ${skipped.length} (${summarize(skipped)})`,
    `- Target: ${target}`,
    '',
    'Next: open Claude Code in this project and run `/ae-init "<one-line goal>"`',
    'to create the spec/ skeleton and entry files.',
  ].join('\n');
}

export function formatIngestReport({ mother, target, warnings }) {
  const lines = [
    `Mother project ready: ${mother}`,
    `Target: ${target}`,
  ];

  for (const warning of warnings) {
    lines.push(`Warning: ${warning}`);
  }

  lines.push(
    '',
    `Next: open Claude Code in ${target} and run \`/ae-ingest-mother ${mother}\`.`,
    'The slash command will read mother entry files, propose AGENTS.md diffs,',
    'and ask for your confirmation before writing.',
  );

  return lines.join('\n');
}

function summarize(paths) {
  if (paths.length === 0) {
    return 'none';
  }
  if (paths.length <= 8) {
    return paths.join(', ');
  }
  return `${paths.slice(0, 8).join(', ')}, ...`;
}
