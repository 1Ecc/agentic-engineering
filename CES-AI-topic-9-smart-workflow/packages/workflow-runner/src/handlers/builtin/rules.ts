import type { NodeHandlerRunner } from "../../../../shared/src/index.js";

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

function readPath(root: Record<string, unknown>, path: string): unknown {
  let current: unknown = root;
  for (const segment of parsePath(path)) {
    if (!isObject(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function parseRightValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, "");
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

function compare(left: unknown, operator: string, rightRaw: string): boolean {
  const right = parseRightValue(rightRaw);
  if (operator === "==") return left === right;
  if (operator === "!=") return left !== right;
  return false;
}

export interface RuleEvaluation {
  passed: boolean;
  expression: string;
  value?: unknown;
}

export function evaluateRuleExpression(expression: string, facts: Record<string, unknown>): { passed: boolean; evaluated: RuleEvaluation[] } {
  const orGroups = expression.split(/\s+\|\|\s+/).filter(Boolean);
  const evaluated: RuleEvaluation[] = [];
  if (orGroups.length === 0) return { passed: false, evaluated };

  for (const group of orGroups) {
    const checks = group.split(/\s+&&\s+/).filter(Boolean);
    const groupEvaluated = checks.map((check) => evaluateCheck(check, facts));
    evaluated.push(...groupEvaluated);
    if (checks.length > 0 && groupEvaluated.every((item) => item.passed)) {
      return { passed: true, evaluated };
    }
  }

  return { passed: false, evaluated };
}

function evaluateCheck(check: string, facts: Record<string, unknown>): RuleEvaluation {
  const trimmed = check.trim();
  const functionMatch = /^(empty|notEmpty)\(([^)]+)\)$/.exec(trimmed);
  if (functionMatch) {
    const [, fn, path] = functionMatch;
    const value = readPath(facts, path.trim());
    const empty = isEmpty(value);
    return { expression: trimmed, passed: fn === "empty" ? empty : !empty, value };
  }

  const match = /^(.+?)\s*(==|!=)\s*(.+)$/.exec(trimmed);
  if (!match) return { expression: trimmed, passed: false };
  const [, leftKey, operator, rightRaw] = match;
  const value = readPath(facts, leftKey.trim());
  return { expression: trimmed, passed: compare(value, operator, rightRaw.trim()), value };
}

export function createRulesHandler(): NodeHandlerRunner {
  return {
    async run(inputs) {
      const expression = typeof inputs.expression === "string" ? inputs.expression : "";
      const facts = isObject(inputs.facts)
        ? inputs.facts
        : Object.fromEntries(Object.entries(inputs).filter(([key]) => key !== "expression" && key !== "value"));
      const result = evaluateRuleExpression(expression, facts);
      const evaluated = result.evaluated;
      const passed = expression.trim().length === 0 ? Boolean(inputs.value) : result.passed;
      const failed = evaluated.find((item) => !item.passed);
      return {
        passed,
        reason: passed ? "All conditions passed" : `Condition failed: ${failed?.expression ?? expression}`,
        evaluated,
      };
    },
  };
}

export function createFirstMatchRulesHandler(): NodeHandlerRunner {
  return {
    async run(inputs) {
      const facts = isObject(inputs.facts) ? inputs.facts : {};
      const rules = Array.isArray(inputs.rules) ? inputs.rules : [];
      const evaluatedRules: unknown[] = [];

      for (const rawRule of rules) {
        if (!isObject(rawRule)) continue;
        const ruleId = String(rawRule.id ?? rawRule.rule_id ?? "");
        const expression = typeof rawRule.expression === "string" ? rawRule.expression : "";
        const result = evaluateRuleExpression(expression, facts);
        const entry = {
          rule_id: ruleId,
          name: typeof rawRule.name === "string" ? rawRule.name : ruleId,
          expression,
          passed: result.passed,
          evaluated: result.evaluated,
        };
        evaluatedRules.push(entry);
        if (!result.passed) continue;

        return {
          matched: true,
          rule_id: ruleId,
          name: typeof rawRule.name === "string" ? rawRule.name : ruleId,
          reason: typeof rawRule.reason === "string" ? rawRule.reason : `Matched ${ruleId}`,
          action: isObject(rawRule.action) ? rawRule.action : { type: "none" },
          evaluated: evaluatedRules,
        };
      }

      return {
        matched: false,
        rule_id: null,
        name: "未命中",
        reason: "No rules matched",
        action: { type: "none" },
        evaluated: evaluatedRules,
      };
    },
  };
}
