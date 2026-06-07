<script setup lang="ts">
import { computed } from 'vue'
import type { ResultView } from '../lib/types'

const props = defineProps<{
  result: unknown
  views?: ResultView[]
}>()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePath(path: string): string[] {
  const segments: string[] = []
  for (const match of path.matchAll(/[^.[\]]+|\[(\d+)\]/g)) {
    segments.push(match[1] ?? match[0])
  }
  return segments
}

function readPath(root: unknown, source: string): unknown {
  const normalized = source.replace(/^\$outputs\.?/, '')
  if (!normalized) return root
  return parsePath(normalized)
    .reduce<unknown>((current, segment) => {
      if (!isObject(current) && !Array.isArray(current)) return undefined
      return (current as Record<string, unknown>)[segment]
    }, root)
}

function titleFromKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function inferFormat(key: string, value: unknown): 'text' | 'status' | 'link' | 'datetime' | 'number' {
  if (typeof value === 'number') return 'number'
  if (/url|link/i.test(key) || (typeof value === 'string' && /^https?:\/\//.test(value))) return 'link'
  if (/time|date|created|updated/i.test(key)) return 'datetime'
  if (/status|state|result/i.test(key)) return 'status'
  return 'text'
}

function inferViews(result: unknown): ResultView[] {
  if (!isObject(result)) return [{ id: 'result', type: 'json', title: '运行结果', source: '$outputs' }]
  if (isObject(result.result) && !Array.isArray(result.result)) {
    return [{
      id: 'result',
      type: 'table',
      title: 'Result',
      source: '$outputs.result',
      columns: Object.keys(result.result).filter((key) => key !== 'value').map((field) => ({
        key: field,
        label: titleFromKey(field),
        format: inferFormat(field, (result.result as Record<string, unknown>)[field]),
      })),
    }]
  }
  const views: ResultView[] = []
  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value) && value.every(isObject)) {
      const first = value[0] as Record<string, unknown> | undefined
      const hasTime = Object.keys(first ?? {}).some((field) => /time|date|created|updated/i.test(field))
      views.push({
        id: key,
        type: hasTime ? 'timeline' : 'table',
        title: titleFromKey(key),
        source: `$outputs.${key}`,
        columns: Object.keys(first ?? {}).map((field) => ({
          key: field,
          label: titleFromKey(field),
          format: inferFormat(field, first?.[field]),
        })),
      })
    } else if (isObject(value) && 'to' in value && 'subject' in value && 'body' in value) {
      views.push({ id: key, type: 'mail_draft', title: titleFromKey(key), source: `$outputs.${key}` })
    } else if (/status|state|result|rule|matched/i.test(key) || (isObject(value) && Object.keys(value).some((field) => /status|state|matched|passed|result/i.test(field)))) {
      views.push({ id: key, type: 'status', title: titleFromKey(key), source: `$outputs.${key}` })
    } else if (isObject(value)) {
      views.push({ id: key, type: 'detail', title: titleFromKey(key), source: `$outputs.${key}` })
    }
  }
  return views.length ? views : [{ id: 'result', type: 'json', title: '运行结果', source: '$outputs' }]
}

const effectiveViews = computed(() => (props.views?.length ? props.views : inferViews(props.result)))

function formatCell(value: unknown, format?: string) {
  if (value == null || value === '') return '-'
  if (format === 'datetime') return new Date(String(value)).toString() === 'Invalid Date' ? String(value) : new Date(String(value)).toLocaleString('zh-CN', { hour12: false })
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function displayColumns(view: ResultView, value: unknown) {
  const rows = tableRows(value)
  const actualKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  if (view.columns?.length && actualKeys.length) {
    const configured = view.columns.filter((column) => actualKeys.includes(column.key))
    const configuredKeys = new Set(configured.map((column) => column.key))
    const missing = actualKeys
      .filter((key) => !configuredKeys.has(key))
      .map((key) => ({ key, label: titleFromKey(key), format: inferFormat(key, rows.find((row) => row[key] !== undefined)?.[key]) }))
    return [...configured, ...missing]
  }
  if (view.columns?.length) return view.columns
  if (Array.isArray(value) && isObject(value[0])) {
    return Object.keys(value[0]).map((key) => ({
      key,
      label: titleFromKey(key),
      format: inferFormat(key, (value[0] as Record<string, unknown>)[key]),
    }))
  }
  if (isObject(value)) {
    return Object.keys(value).map((key) => ({
      key,
      label: titleFromKey(key),
      format: inferFormat(key, value[key]),
    }))
  }
  return []
}

function tableRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isObject)
  if (isObject(value)) return [value]
  return []
}

function firstTextField(row: Record<string, unknown>) {
  const key = Object.keys(row).find((field) => typeof row[field] === 'string' && !/id|no|code/i.test(field)) ?? Object.keys(row)[0]
  return key ? String(row[key] ?? '-') : '-'
}

function statusTone(value: unknown) {
  const text = String(value ?? '').toLowerCase()
  if (/fail|error|异常|失败|否|false/.test(text)) return 'fail'
  if (/warn|pending|等待|部分/.test(text)) return 'warn'
  return 'success'
}
</script>

<template>
  <div class="result-view-stack">
    <section v-for="view in effectiveViews" :key="view.id" class="result-view-card">
      <div class="section-heading compact">
        <h3>{{ view.title || view.id }}</h3>
        <span>{{ view.type }}</span>
      </div>

      <div v-if="view.type === 'table' && tableRows(readPath(result, view.source)).length" class="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th v-for="column in displayColumns(view, readPath(result, view.source))" :key="column.key">{{ column.label || column.key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in tableRows(readPath(result, view.source))" :key="rowIndex">
              <td v-for="column in displayColumns(view, readPath(result, view.source))" :key="column.key">
                <a v-if="column.format === 'link' && row[column.key]" :href="String(row[column.key])" target="_blank" rel="noreferrer">
                  {{ formatCell(row[column.key], column.format) }}
                </a>
                <span v-else-if="column.format === 'status'" class="pill success">{{ formatCell(row[column.key], column.format) }}</span>
                <span v-else>{{ formatCell(row[column.key], column.format) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl v-else-if="view.type === 'detail' && typeof readPath(result, view.source) === 'object'" class="result-detail-grid">
        <template v-for="(value, key) in readPath(result, view.source) as Record<string, unknown>" :key="key">
          <dt>{{ titleFromKey(String(key)) }}</dt>
          <dd>{{ formatCell(value) }}</dd>
        </template>
      </dl>

      <div v-else-if="view.type === 'cards' && Array.isArray(readPath(result, view.source))" class="result-card-grid">
        <article v-for="(row, rowIndex) in readPath(result, view.source) as Record<string, unknown>[]" :key="rowIndex" class="result-data-card">
          <strong>{{ firstTextField(row) }}</strong>
          <dl>
            <template v-for="column in displayColumns(view, readPath(result, view.source))" :key="column.key">
              <dt>{{ column.label || column.key }}</dt>
              <dd>
                <span v-if="column.format === 'status'" class="pill" :class="statusTone(row[column.key])">{{ formatCell(row[column.key], column.format) }}</span>
                <span v-else>{{ formatCell(row[column.key], column.format) }}</span>
              </dd>
            </template>
          </dl>
        </article>
      </div>

      <ol v-else-if="view.type === 'timeline' && Array.isArray(readPath(result, view.source))" class="result-timeline">
        <li v-for="(row, rowIndex) in readPath(result, view.source) as Record<string, unknown>[]" :key="rowIndex">
          <span class="timeline-dot"></span>
          <div>
            <strong>{{ firstTextField(row) }}</strong>
            <small>{{ displayColumns(view, [row]).map((column) => `${column.label || column.key}: ${formatCell(row[column.key], column.format)}`).join(' · ') }}</small>
          </div>
        </li>
      </ol>

      <div v-else-if="view.type === 'status'" class="result-status-grid">
        <template v-if="typeof readPath(result, view.source) === 'object'">
          <div v-for="(value, key) in readPath(result, view.source) as Record<string, unknown>" :key="key" class="result-status-item">
            <span>{{ titleFromKey(String(key)) }}</span>
            <strong :class="statusTone(value)">{{ formatCell(value, inferFormat(String(key), value)) }}</strong>
          </div>
        </template>
        <div v-else class="result-status-item">
          <span>{{ view.title || view.id }}</span>
          <strong :class="statusTone(readPath(result, view.source))">{{ formatCell(readPath(result, view.source), 'status') }}</strong>
        </div>
      </div>

      <div v-else-if="view.type === 'mail_draft' && typeof readPath(result, view.source) === 'object'" class="result-mail-card">
        <strong>{{ (readPath(result, view.source) as Record<string, unknown>).subject }}</strong>
        <span>收件人：{{ ((readPath(result, view.source) as Record<string, unknown>).to as unknown[])?.join?.('; ') || '-' }}</span>
        <pre>{{ (readPath(result, view.source) as Record<string, unknown>).body }}</pre>
      </div>

      <pre v-else class="result-json-block">{{ JSON.stringify(readPath(result, view.source), null, 2) }}</pre>
    </section>

    <details class="raw-json-fallback">
      <summary>原始 JSON</summary>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
    </details>
  </div>
</template>
