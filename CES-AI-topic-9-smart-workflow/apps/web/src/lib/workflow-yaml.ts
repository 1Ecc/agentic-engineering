import type { Workflow } from './types.js'

type Scalar = string | number | boolean | null

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function scalar(value: Scalar): string {
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value) return '""'
  if (/^[A-Za-z0-9_.$/-]+$/.test(value)) return value
  return JSON.stringify(value)
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize).filter((item) => item !== undefined)
  if (isObject(value)) {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, sanitize(child)] as const)
      .filter(([, child]) => child !== undefined)
    return Object.fromEntries(entries)
  }
  if (value === undefined) return undefined
  return value
}

function yamlValue(value: unknown, indent = 0): string[] {
  const cleaned = sanitize(value)
  if (cleaned === undefined) return []
  const pad = ' '.repeat(indent)
  if (Array.isArray(cleaned)) {
    if (!cleaned.length) return [`${pad}[]`]
    return cleaned.flatMap((item) => {
      if (isObject(item)) {
        const lines = yamlValue(item, indent + 2)
        const [first, ...rest] = lines
        return [`${pad}- ${first.trimStart()}`, ...rest]
      }
      return [`${pad}- ${scalar(item as Scalar)}`]
    })
  }
  if (isObject(cleaned)) {
    const entries = Object.entries(cleaned)
    if (!entries.length) return [`${pad}{}`]
    return entries.flatMap(([key, child]) => {
      if (isObject(child) || Array.isArray(child)) return [`${pad}${key}:`, ...yamlValue(child, indent + 2)]
      return [`${pad}${key}: ${scalar(child as Scalar)}`]
    })
  }
  return [`${pad}${scalar(cleaned as Scalar)}`]
}

export function workflowToYaml(workflow: Workflow): string {
  const lines: string[] = [
    `id: ${scalar(workflow.id)}`,
    `name: ${scalar(workflow.name)}`,
  ]
  if (workflow.description) lines.push(`description: ${scalar(workflow.description)}`)
  lines.push('inputs:', ...yamlValue(workflow.inputs, 2))
  lines.push('nodes:', ...yamlValue(workflow.nodes, 2))
  if (workflow.outputs) lines.push('outputs:', ...yamlValue(workflow.outputs, 2))
  if (workflow.views?.length) lines.push('views:', ...yamlValue(workflow.views, 2))
  return `${lines.join('\n')}\n`
}
