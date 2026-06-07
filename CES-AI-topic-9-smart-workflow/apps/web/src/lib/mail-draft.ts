export interface EmailDraft {
  ruleId?: string
  title: string
  to: string[]
  cc: string[]
  body: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

export function parseAddressList(value: string): string[] {
  return value
    .split(/[;,，；\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeEmailDraft(value: unknown): EmailDraft | null {
  const candidate = isRecord(value) && isRecord(value.draft) ? value.draft : value
  if (!isRecord(candidate)) return null

  const to = stringList(candidate.to)
  const cc = stringList(candidate.cc)
  const titleValue = candidate.title ?? candidate.subject
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  const body = typeof candidate.body === 'string' ? candidate.body.trim() : ''

  if (!to.length || !title || !body) return null

  const draft: EmailDraft = { title, to, cc, body }
  if (typeof candidate.ruleId === 'string') draft.ruleId = candidate.ruleId
  if (typeof candidate.rule_id === 'string') draft.ruleId = candidate.rule_id
  return draft
}
