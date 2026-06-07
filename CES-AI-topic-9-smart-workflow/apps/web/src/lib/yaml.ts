import type { Workflow, WorkflowInput, WorkflowNode } from './types.js'

// Minimal YAML parser tailored to workflow definitions.
// Supports: scalars (string/number/bool/null), arrays (inline + block), maps (block), nested.
// Not a general-purpose parser — sufficient for backend-generated workflow YAML.

type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue }

interface Line {
  indent: number
  text: string
  raw: string
}

function preprocess(source: string): Line[] {
  const out: Line[] = []
  for (const raw of source.split(/\r?\n/)) {
    const stripped = raw.replace(/\s+#.*$/, '')
    if (!stripped.trim()) continue
    const match = stripped.match(/^(\s*)(.*)$/)
    if (!match) continue
    out.push({ indent: match[1].length, text: match[2], raw: stripped })
  }
  return out
}

function parseScalar(text: string): YamlValue {
  if (text === '' || text === '~' || text === 'null') return null
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^-?\d+$/.test(text)) return Number(text)
  if (/^-?\d+\.\d+$/.test(text)) return Number(text)
  if (/^".*"$/.test(text)) return JSON.parse(text)
  if (/^'.*'$/.test(text)) return text.slice(1, -1)
  return text
}

function parseInlineArray(text: string): YamlValue[] {
  const trimmed = text.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [trimmed]
  const inner = trimmed.slice(1, -1).trim()
  if (!inner) return []
  const parts: string[] = []
  let depth = 0
  let buf = ''
  let inStr: string | null = null
  for (const ch of inner) {
    if (inStr) {
      buf += ch
      if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = ch
      buf += ch
      continue
    }
    if (ch === '[' || ch === '{') depth += 1
    else if (ch === ']' || ch === '}') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts.map(parseScalar)
}

function parseBlock(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  // Decide if this block is an array (starts with '- ') or a map.
  if (start >= lines.length || lines[start].indent < indent) {
    return { value: null, next: start }
  }
  const first = lines[start]
  if (first.text.startsWith('- ')) return parseArray(lines, start, first.indent)
  return parseMap(lines, start, first.indent)
}

function parseMap(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  const obj: { [key: string]: YamlValue } = {}
  let i = start
  while (i < lines.length && lines[i].indent === indent) {
    const line = lines[i]
    const colonIdx = findKeyColon(line.text)
    if (colonIdx < 0) {
      i += 1
      continue
    }
    const key = line.text.slice(0, colonIdx).trim().replace(/^["'](.*)["']$/, '$1')
    const rest = line.text.slice(colonIdx + 1).trim()
    if (rest === '|' || rest === '>') {
      const block = readLiteralBlock(lines, i + 1, indent, rest === '|')
      obj[key] = block.text
      i = block.next
      continue
    }
    if (rest === '') {
      const child = parseBlock(lines, i + 1, indent + 1)
      obj[key] = child.value
      i = child.next
    } else if (rest.startsWith('[')) {
      obj[key] = parseInlineArray(rest)
      i += 1
    } else if (rest.startsWith('{')) {
      obj[key] = parseInlineObject(rest)
      i += 1
    } else {
      obj[key] = parseScalar(rest)
      i += 1
    }
  }
  return { value: obj, next: i }
}

function findKeyColon(text: string): number {
  let inStr: string | null = null
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inStr) {
      if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'") inStr = ch
    else if (ch === ':' && (i + 1 === text.length || text[i + 1] === ' ' || text[i + 1] === '\t')) {
      return i
    }
  }
  // No trailing space — accept colon at end of line
  const idx = text.lastIndexOf(':')
  return idx
}

function parseInlineObject(text: string): { [key: string]: YamlValue } {
  // Very limited inline object support — not needed for workflow YAML normally.
  try {
    return JSON.parse(text.replace(/([{,]\s*)([A-Za-z_][\w.-]*)(\s*:)/g, '$1"$2"$3'))
  } catch {
    return {}
  }
}

function parseArray(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  const arr: YamlValue[] = []
  let i = start
  while (i < lines.length && lines[i].indent === indent && lines[i].text.startsWith('- ')) {
    const line = lines[i]
    const after = line.text.slice(2)
    if (after.includes(':') && findKeyColon(after) >= 0) {
      // Item is itself a map — first key is on the same line, additional keys indented further
      const keyColon = findKeyColon(after)
      const itemMap: { [key: string]: YamlValue } = {}
      const itemIndent = indent + 2
      const firstKey = after.slice(0, keyColon).trim()
      const firstRest = after.slice(keyColon + 1).trim()
      if (firstRest === '') {
        const child = parseBlock(lines, i + 1, itemIndent + 1)
        itemMap[firstKey] = child.value
        i = child.next
      } else if (firstRest.startsWith('[')) {
        itemMap[firstKey] = parseInlineArray(firstRest)
        i += 1
      } else {
        itemMap[firstKey] = parseScalar(firstRest)
        i += 1
      }
      while (i < lines.length && lines[i].indent === itemIndent && !lines[i].text.startsWith('- ')) {
        const subLine = lines[i]
        const subColon = findKeyColon(subLine.text)
        const subKey = subLine.text.slice(0, subColon).trim()
        const subRest = subLine.text.slice(subColon + 1).trim()
        if (subRest === '|' || subRest === '>') {
          const block = readLiteralBlock(lines, i + 1, itemIndent, subRest === '|')
          itemMap[subKey] = block.text
          i = block.next
        } else if (subRest === '') {
          const child = parseBlock(lines, i + 1, itemIndent + 1)
          itemMap[subKey] = child.value
          i = child.next
        } else if (subRest.startsWith('[')) {
          itemMap[subKey] = parseInlineArray(subRest)
          i += 1
        } else if (subRest.startsWith('{')) {
          itemMap[subKey] = parseInlineObject(subRest)
          i += 1
        } else {
          itemMap[subKey] = parseScalar(subRest)
          i += 1
        }
      }
      arr.push(itemMap)
    } else {
      arr.push(parseScalar(after))
      i += 1
    }
  }
  return { value: arr, next: i }
}

function readLiteralBlock(
  lines: Line[],
  start: number,
  parentIndent: number,
  preserveNewlines: boolean,
): { text: string; next: number } {
  const collected: string[] = []
  let i = start
  let blockIndent = -1
  while (i < lines.length && lines[i].indent > parentIndent) {
    if (blockIndent < 0) blockIndent = lines[i].indent
    collected.push(lines[i].raw.slice(blockIndent))
    i += 1
  }
  return { text: preserveNewlines ? collected.join('\n') : collected.join(' '), next: i }
}

export function parseYaml(source: string): YamlValue {
  const lines = preprocess(source)
  if (!lines.length) return null
  const { value } = parseBlock(lines, 0, lines[0].indent)
  return value
}

export function parseWorkflowYaml(source: string): Workflow | null {
  try {
    const parsed = parseYaml(source) as { [key: string]: YamlValue } | null
    if (!parsed || typeof parsed !== 'object') return null
    const inputs = ((parsed.inputs as YamlValue[]) ?? []).map((v) => v as unknown as WorkflowInput)
    const nodes = ((parsed.nodes as YamlValue[]) ?? []).map((v) => {
      const node = v as unknown as WorkflowNode
      if (!Array.isArray(node.dependsOn)) delete node.dependsOn
      else node.dependsOn = node.dependsOn.filter((item) => typeof item === 'string' && item.trim().length > 0)
      if (Array.isArray(node.dependsOn) && !node.dependsOn.length) delete node.dependsOn
      return node
    })
    const views = Array.isArray(parsed.views) ? (parsed.views as unknown as Workflow['views']) : undefined
    return {
      id: String(parsed.id ?? ''),
      name: String(parsed.name ?? ''),
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      created_at: typeof parsed.created_at === 'string' ? parsed.created_at : undefined,
      updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : undefined,
      inputs,
      nodes,
      outputs: (parsed.outputs as Record<string, unknown>) ?? undefined,
      views,
    }
  } catch {
    return null
  }
}
