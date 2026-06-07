<script setup lang="ts">
import { computed, ref } from 'vue'
import { sendMail } from '../lib/api'
import { normalizeEmailDraft } from '../lib/mail-draft'
import type { NodeDefinition, WorkflowNode } from '../lib/types'

export type WorkflowCardStatus = 'idle' | 'running' | 'success' | 'warning' | 'error'

const props = defineProps<{
  index: number
  node: WorkflowNode
  definition?: NodeDefinition | null
  issues?: string[]
  status?: WorkflowCardStatus
  detail?: string
  resolvedInputs?: unknown
  output?: unknown
}>()

const detailOpen = ref(false)
const isSendingDraft = ref(false)
const draftMessage = ref('')

const inputsList = computed(() => {
  const entries = Object.entries(props.node.inputs ?? {})
  return entries.map(([key, value]) => ({ key, value: summarizeValue(value) }))
})

const hasDetails = computed(
  () =>
    Object.keys(props.node.inputs ?? {}).length > 0 ||
    props.resolvedInputs !== undefined ||
    props.output !== undefined ||
    Boolean(props.detail),
)

function summarizeValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') {
    if (value.startsWith('$')) return `来自 ${value.slice(1)}`
    if (value.includes('{{')) return '模板引用上游数据'
    return value.length > 48 ? `${value.slice(0, 48)}...` : value
  }
  if (Array.isArray(value)) return `数组（${value.length} 项）`
  if (typeof value === 'object') return `对象（${Object.keys(value as Record<string, unknown>).length} 个字段）`
  return String(value)
}

const icon = computed(() => props.definition?.icon ?? '🧩')
const displayName = computed(() => props.definition?.name ?? props.node.type)
const category = computed(() => props.definition?.category ?? 'recorded')
const mailDraft = computed(() => (props.node.type === 'mail.draft' ? normalizeEmailDraft(props.output) : null))
const statusLabel = computed(() => {
  if (props.status === 'running') return '运行中'
  if (props.status === 'success') return '成功'
  if (props.status === 'warning') return '跳过'
  if (props.status === 'error') return '失败'
  return '待运行'
})

async function sendDraft() {
  const draft = mailDraft.value
  if (!draft || isSendingDraft.value) return
  isSendingDraft.value = true
  draftMessage.value = ''
  try {
    const result = await sendMail({
      to: draft.to,
      cc: draft.cc,
      subject: draft.title,
      body: draft.body,
    })
    draftMessage.value = `发送成功：${result.message_id}`
  } catch (error) {
    draftMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    isSendingDraft.value = false
  }
}
</script>

<template>
  <article class="workflow-node-card" :class="`wnc-${status || 'idle'}`">
    <header class="wnc-header">
      <span class="wnc-index">{{ index }}</span>
      <span class="wnc-icon">{{ icon }}</span>
      <div class="wnc-titles">
        <h3>{{ displayName }}</h3>
        <small>{{ node.type }} · {{ category }}</small>
      </div>
      <span class="wnc-status">{{ statusLabel }}</span>
    </header>

    <div v-if="node.dependsOn?.length" class="wnc-condition">
      <b>依赖：</b><code>{{ node.dependsOn.join(', ') }}</code>
    </div>

    <div v-if="node.when" class="wnc-condition">
      <b>条件：</b><code>{{ node.when }}</code>
      <span v-if="node.then">→ {{ node.then }}</span>
    </div>

    <div v-if="inputsList.length" class="wnc-fields">
      <div v-for="item in inputsList" :key="item.key" class="wnc-field">
        <span>{{ item.key }}</span>
        <code>{{ item.value }}</code>
      </div>
    </div>

    <div v-if="definition?.outputs?.length" class="wnc-outputs">
      <b>输出：</b>
      <span v-for="out in definition.outputs" :key="out.name" class="wnc-output-tag">
        {{ out.label || out.name }}
      </span>
    </div>

    <div v-if="mailDraft" class="wnc-mail-action">
      <button type="button" :disabled="isSendingDraft" @click.stop="sendDraft">
        {{ isSendingDraft ? '发送中' : '发送邮件' }}
      </button>
      <span v-if="draftMessage">{{ draftMessage }}</span>
    </div>

    <div v-if="issues?.length" class="wnc-issues">
      <b>校验问题：</b>
      <span v-for="issue in issues" :key="issue">{{ issue }}</span>
    </div>

    <div v-if="detail" class="wnc-detail">{{ detail }}</div>

    <button v-if="hasDetails" type="button" class="wnc-detail-button" @click="detailOpen = true">
      查看详情
    </button>

    <Teleport to="body">
      <div v-if="detailOpen" class="node-detail-popover" @click.self="detailOpen = false">
        <section class="node-detail-dialog">
          <header>
            <div>
              <span>{{ node.id }}</span>
              <h3>{{ displayName }}</h3>
            </div>
            <button type="button" class="text-button" @click="detailOpen = false">关闭</button>
          </header>
          <div v-if="detail" class="detail-block">
            <b>运行状态</b>
            <p>{{ detail }}</p>
          </div>
          <div class="detail-block">
            <b>配置输入</b>
            <pre>{{ JSON.stringify(node.inputs ?? {}, null, 2) }}</pre>
          </div>
          <div v-if="resolvedInputs !== undefined" class="detail-block">
            <b>Resolved Inputs</b>
            <pre>{{ JSON.stringify(resolvedInputs, null, 2) }}</pre>
          </div>
          <div v-if="output !== undefined" class="detail-block">
            <b>Outputs</b>
            <pre>{{ JSON.stringify(output, null, 2) }}</pre>
          </div>
        </section>
      </div>
    </Teleport>
  </article>
</template>
