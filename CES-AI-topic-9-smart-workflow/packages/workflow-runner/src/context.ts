function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePath(path: string): string[] {
  const segments: string[] = [];
  for (const match of path.matchAll(/[^.[\]]+|\[(\d+)\]/g)) {
    segments.push(match[1] ?? match[0]);
  }
  return segments;
}

function readPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const segment of path) {
    if (!isObject(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function collectWildcardReferences(value: unknown, refs: string[] = []): string[] {
  if (typeof value === "string" && value.startsWith("$") && value.includes("[]")) refs.push(value);
  if (Array.isArray(value)) value.forEach((item) => collectWildcardReferences(item, refs));
  if (isObject(value)) Object.values(value).forEach((item) => collectWildcardReferences(item, refs));
  return refs;
}

function wildcardBaseExpression(expression: string): string {
  return expression.slice(0, expression.indexOf("[]"));
}

function wildcardLength(expression: string, context: InterpolationContext): number {
  const value = resolveReference(wildcardBaseExpression(expression), context);
  return Array.isArray(value) ? value.length : 0;
}

function interpolateWildcardRow(value: unknown, index: number, context: InterpolationContext): unknown {
  if (typeof value === "string") return interpolateValue(value.replace(/\[\]/g, `[${index}]`), context);
  if (Array.isArray(value)) return value.map((item) => interpolateWildcardRow(item, index, context));
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateWildcardRow(item, index, context)]));
  }
  return value;
}

export interface InterpolationContext {
  inputs: Record<string, unknown>;
  nodes: Record<string, unknown>;
  now?: Date;
}

interface TimeValue {
  date: Date;
  kind: "date" | "datetime";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

function formatDateTime(date: Date): string {
  return `${formatDateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${formatOffset(date)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addCalendarMonths(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getDate(), daysInMonth(targetYear, normalizedMonth));
  const result = new Date(date.getTime());
  result.setFullYear(targetYear, normalizedMonth, day);
  return result;
}

function applyDuration(value: TimeValue, duration: string): TimeValue {
  const match = duration.match(/^([+-])?P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) throw new Error(`Unsupported time duration: ${duration}`);

  const sign = match[1] === "-" ? -1 : 1;
  const years = Number(match[2] ?? 0);
  const months = Number(match[3] ?? 0);
  const weeks = Number(match[4] ?? 0);
  const days = Number(match[5] ?? 0);
  const hours = Number(match[6] ?? 0);
  const minutes = Number(match[7] ?? 0);
  const seconds = Number(match[8] ?? 0);

  let date = addCalendarMonths(value.date, sign * (years * 12 + months));
  date = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + sign * (weeks * 7 + days),
    date.getHours() + sign * hours,
    date.getMinutes() + sign * minutes,
    date.getSeconds() + sign * seconds,
    date.getMilliseconds(),
  );
  return { date, kind: value.kind };
}

function splitArguments(value: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      current += char;
      if (char === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim().length > 0) args.push(current.trim());
  return args;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('\\"') && trimmed.endsWith('\\"')) {
    return trimmed.slice(2, -2);
  }
  throw new Error(`Expected quoted string: ${value}`);
}

function parseTimeValue(value: unknown): TimeValue {
  if (value instanceof Date) return { date: new Date(value.getTime()), kind: "datetime" };
  if (typeof value !== "string") throw new Error(`Expected time value, got ${typeof value}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return { date: new Date(year, month - 1, day), kind: "date" };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid time value: ${value}`);
  return { date: parsed, kind: "datetime" };
}

function formatTimeValue(value: TimeValue, format?: string): string {
  if (!format) return value.kind === "date" ? formatDateOnly(value.date) : formatDateTime(value.date);
  return format
    .replace(/YYYY/g, String(value.date.getFullYear()))
    .replace(/MM/g, pad(value.date.getMonth() + 1))
    .replace(/DD/g, pad(value.date.getDate()))
    .replace(/HH/g, pad(value.date.getHours()))
    .replace(/mm/g, pad(value.date.getMinutes()))
    .replace(/ss/g, pad(value.date.getSeconds()))
    .replace(/Z/g, formatOffset(value.date));
}

function evaluateTimeExpression(expression: string, context: InterpolationContext): string {
  const now = context.now ?? new Date();

  function evaluateValue(value: string): TimeValue {
    const trimmed = value.trim();
    if (trimmed === "time.today()") {
      return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), kind: "date" };
    }
    if (trimmed === "time.now()") return { date: new Date(now.getTime()), kind: "datetime" };
    if (trimmed.startsWith("time.add(") && trimmed.endsWith(")")) {
      const args = splitArguments(trimmed.slice("time.add(".length, -1));
      if (args.length !== 2) throw new Error(`time.add expects 2 arguments: ${expression}`);
      return applyDuration(evaluateValue(args[0]), unquote(args[1]));
    }
    if (trimmed.startsWith("inputs.") || trimmed.startsWith("$inputs.")) {
      return parseTimeValue(resolveReference(trimmed, context));
    }
    return parseTimeValue(unquote(trimmed));
  }

  if (expression.startsWith("time.format(") && expression.endsWith(")")) {
    const args = splitArguments(expression.slice("time.format(".length, -1));
    if (args.length !== 2) throw new Error(`time.format expects 2 arguments: ${expression}`);
    return formatTimeValue(evaluateValue(args[0]), unquote(args[1]));
  }

  return formatTimeValue(evaluateValue(expression));
}

export function resolveReference(expression: string, context: InterpolationContext): unknown {
  if (expression.startsWith("time.")) return evaluateTimeExpression(expression, context);

  if (expression.startsWith("$inputs.")) {
    return readPath(context.inputs, parsePath(expression.slice("$inputs.".length)));
  }

  if (expression.startsWith("$")) {
    const [nodeId, ...path] = expression.slice(1).split(".");
    return readPath(context.nodes[nodeId], parsePath(path.join(".")));
  }

  if (expression.startsWith("inputs.")) {
    return readPath(context.inputs, parsePath(expression.slice("inputs.".length)));
  }

  if (expression.startsWith("steps.")) {
    const [nodeId, ...path] = expression.slice("steps.".length).split(".");
    return readPath(context.nodes[nodeId], parsePath(path.join(".")));
  }

  if (/^[A-Za-z_][\w$-]*\./.test(expression)) {
    const [nodeId, ...path] = expression.split(".");
    if (Object.prototype.hasOwnProperty.call(context.nodes, nodeId)) {
      return readPath(context.nodes[nodeId], parsePath(path.join(".")));
    }
  }

  return undefined;
}

export function interpolateTemplate(template: string, context: InterpolationContext, options: { strict?: boolean } = {}): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression: string) => {
    const normalizedExpression = expression.trim();
    const value = resolveReference(normalizedExpression, context);
    if (value == null && options.strict) {
      throw new Error(`Unsupported or unresolved template expression: ${normalizedExpression}`);
    }
    return value == null ? "" : String(value);
  });
}

export function interpolateValue(value: unknown, context: InterpolationContext): unknown {
  if (typeof value === "string") {
    if (value.startsWith("$") && !value.includes(" ")) {
      return resolveReference(value, context);
    }
    return interpolateTemplate(value, context);
  }

  if (Array.isArray(value)) {
    if (value.length === 1 && isObject(value[0])) {
      const refs = collectWildcardReferences(value[0]);
      if (refs.length) {
        const length = Math.max(...refs.map((ref) => wildcardLength(ref, context)));
        return Array.from({ length }, (_item, index) => interpolateWildcardRow(value[0], index, context));
      }
    }
    return value.map((item) => interpolateValue(item, context));
  }

  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateValue(item, context)]));
  }

  return value;
}
