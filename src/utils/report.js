export function formatSetupReport({ created, skipped, target, dryRun }) {
  const installedLabel = dryRun ? 'Would install' : 'Installed';
  return [
    dryRun ? 'AE setup dry run complete' : 'AE setup complete',
    `- ${installedLabel}: ${created.length} (${summarize(created)})`,
    `- Skipped: ${skipped.length} (${summarize(skipped)})`,
    `- Target: ${target}`,
    `- Next: run \`ae init "<goal>"\`.`,
  ].join('\n');
}

export function formatInitReport({ created, skipped, target, dryRun }) {
  const createdLabel = dryRun ? 'Would create' : 'Created';
  return [
    dryRun ? 'AE init dry run complete' : 'AE init complete',
    `- ${createdLabel}: ${created.length} (${summarize(created)})`,
    `- Skipped: ${skipped.length} (${summarize(skipped)})`,
    `- Target: ${target}`,
  ].join('\n');
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
