import type { NodeHandlerRunner } from "../../../../shared/src/index.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function preserveEmptyFields(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(preserveEmptyFields);
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, preserveEmptyFields(child)]));
  }
  return value;
}

export function createComposeHandler(): NodeHandlerRunner {
  return {
    async run(inputs) {
      const value = preserveEmptyFields(inputs.value);
      if (isObject(value)) return { ...value, value };
      return { value };
    },
  };
}
