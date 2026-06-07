export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function lastYearRange(now = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);
  return { start: formatDate(start), end: formatDate(now) };
}
