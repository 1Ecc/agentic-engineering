export function compactStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? null;
}

export function isNonEmptyArray<T>(value: T[]): boolean {
  return value.length > 0;
}

