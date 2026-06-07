<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ResultRenderer from '../components/ResultRenderer.vue'
import WorkflowNodeCard, { type WorkflowCardStatus } from '../components/WorkflowNodeCard.vue'
import { generateResultViews, getRun, listNodes, runDraftWorkflow, saveWorkflow, updateWorkflow, validateWorkflowDraft } from '../lib/api'
import { clearWorkflowDraft, loadWorkflowDraft } from '../lib/draft-store'
import { navigate } from '../lib/router'
import type { NodeDefinition, ResultView, RunLog, RunRecord, WorkflowNode, WorkflowValidationResult } from '../lib/types'
import { parseWorkflowYaml } from '../lib/yaml'

const draft = ref(loadWorkflowDraft())
const showYaml = ref(false)
const nodes = ref<NodeDefinition[]>([])
const errorMsg = ref('')
const saving = ref(false)
const editingName = ref(false)
const editedName = ref('')
const validation = ref<WorkflowValidationResult | null>(null)
const runInputs = reactive<Record<string, string>>({})
const isRunning = ref(false)
const runError = ref('')
const runRecord = ref<RunRecord | null>(null)
const aiViews = ref<ResultView[]>([])
const isGeneratingViews = ref(false)
const nodeRunState = ref<Record<string, { status: WorkflowCardStatus; detail?: string; inputs?: unknown; output?: unknown }>>({})

const workflow = computed(() => (draft.value?.yaml ? parseWorkflowYaml(draft.value.yaml) : null))
const contextWorkflow = computed(() =>
  draft.value?.contextYaml ? parseWorkflowYaml(draft.value.contextYaml) : null,
)
const showYamlDiff = computed(() => Boolean(draft.value?.contextYaml && draft.value.contextYaml !== draft.value.yaml && contextWorkflow.value))
const nodeMap = computed(() => {
  const map = new Map<string, NodeDefinition>()
  for (const n of nodes.value) map.set(n.type, n)
  return map
})

const isValid = computed(() => Boolean(workflow.value && workflow.value.id && workflow.value.nodes.length && validation.value?.valid))
const validationIssuesByNode = computed(() => {
  const map = new Map<number, string[]>()
  for (const issue of validation.value?.issues ?? []) {
    const match = issue.path.match(/nodes\[(\d+)\]/)
    if (!match) continue
    const index = Number(match[1])
    const existing = map.get(index) ?? []
    existing.push(issue.message)
    map.set(index, existing)
  }
  return map
})
const executionStages = computed(() => (workflow.value ? buildExecutionStages(workflow.value.nodes) : []))
const finalOutputs = computed(() => runRecord.value?.result ?? null)
const resultViews = computed(() => aiViews.value.length ? aiViews.value : workflow.value?.views ?? [])

onMounted(async () => {
  try {
    nodes.value = await listNodes()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
  if (!draft.value) {
    errorMsg.value = '没有可预览的工作流，请回到新建页面。'
  } else if (workflow.value) {
    editedName.value = workflow.value.name
    for (const input of workflow.value.inputs) {
      runInputs[input.name] = String(input.default ?? '')
    }
    await loadValidation()
  }
})

async function loadValidation() {
  if (!draft.value?.yaml) return
  try {
    const result = await validateWorkflowDraft(draft.value.yaml)
    validation.value = result.validation
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

function backToEdit() {
  navigate('/workflows/manual', draft.value?.contextId ? { contextId: draft.value.contextId } : {})
}

function dependenciesForNode(nodes: WorkflowNode[], index: number): string[] {
  if (nodes[index].dependsOn) return nodes[index].dependsOn ?? []
  return index > 0 ? [nodes[index - 1].id] : []
}

function buildExecutionStages(nodes: WorkflowNode[]): WorkflowNode[][] {
  const remaining = new Map(nodes.map((node, index) => [node.id, { node, index }]))
  const completed = new Set<string>()
  const stages: WorkflowNode[][] = []
  while (remaining.size) {
    const ready: WorkflowNode[] = []
    for (const { node, index } of remaining.values()) {
      if (dependenciesForNode(nodes, index).every((dep) => completed.has(dep))) ready.push(node)
    }
    if (!ready.length) return [nodes]
    stages.push(ready)
    for (const node of ready) {
      remaining.delete(node.id)
      completed.add(node.id)
    }
  }
  return stages
}

function resetRunState() {
  runError.value = ''
  runRecord.value = null
  aiViews.value = []
  nodeRunState.value = Object.fromEntries((workflow.value?.nodes ?? []).map((node) => [node.id, { status: 'idle' as WorkflowCardStatus }]))
}

function applyRunRecord(record: RunRecord) {
  runRecord.value = record
  const next = { ...nodeRunState.value }
  for (const log of record.logs ?? []) {
    if (!log.node_id) continue
    const current = next[log.node_id] ?? { status: 'idle' as WorkflowCardStatus }
    if (log.event === 'node_started') {
      const data = log.data as { inputs?: unknown } | undefined
      next[log.node_id] = { ...current, status: 'running', detail: log.message, inputs: data?.inputs }
    } else if (log.event === 'node_completed') {
      next[log.node_id] = { ...current, status: 'success', detail: log.message, output: log.data }
    } else if (log.event === 'node_skipped') {
      next[log.node_id] = { ...current, status: 'warning', detail: log.message, output: log.data }
    } else if (log.event === 'node_failed') {
      next[log.node_id] = { ...current, status: 'error', detail: log.message }
    }
  }
  nodeRunState.value = next
}

async function trialRun() {
  if (!workflow.value || !draft.value || isRunning.value) return
  resetRunState()
  isRunning.value = true
  try {
    const inputs: Record<string, unknown> = {}
    for (const key of Object.keys(runInputs)) inputs[key] = runInputs[key]
    const created = await runDraftWorkflow(draft.value.yaml, inputs)
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const record = await getRun(created.workflow_id, created.run_id)
      if (record.status === 'running' || record.status === 'pending') continue
      applyRunRecord(record)
      if (record.status === 'failed') runError.value = record.error ?? '试运行失败'
      break
    }
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isRunning.value = false
  }
}

async function saveAndUse() {
  if (!workflow.value || !draft.value || saving.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    let yaml = draft.value.yaml
    if (editedName.value && editedName.value !== workflow.value.name) {
      yaml = yaml.replace(/^name:.*$/m, `name: ${editedName.value}`)
    }
    const meta = draft.value.isModify && draft.value.contextId === workflow.value.id
      ? await updateWorkflow(workflow.value.id, yaml, { name: editedName.value })
      : await saveWorkflow(yaml, { name: editedName.value })
    clearWorkflowDraft()
    navigate(`/workflows/${meta.id}`)
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}

function finishRename() {
  editingName.value = false
}

async function generateViewsWithAi() {
  if (!finalOutputs.value || isGeneratingViews.value) return
  isGeneratingViews.value = true
  try {
    aiViews.value = await generateResultViews({
      result: finalOutputs.value,
      existingViews: resultViews.value,
    })
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isGeneratingViews.value = false
  }
}
</script>

<template>
  <div class="page workflow-preview-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ draft?.isModify ? 'Modified Workflow' : 'New Workflow' }}</p>
        <div class="title-row">
          <input
            v-if="editingName"
            v-model="editedName"
            class="title-input"
            @blur="finishRename"
            @keydown.enter="finishRename"
          />
          <h1 v-else>{{ editedName || workflow?.name || '未命名' }}</h1>
          <button v-if="!editingName" type="button" class="text-button" @click="editingName = true">✎</button>
          <span class="status-pill" :class="isValid ? 'ok' : 'fail'">
            {{ isValid ? '✅ 已校验' : '⚠️ 校验失败' }}
          </span>
        </div>
        <p class="page-sub">{{ workflow?.description || '—' }}</p>
      </div>
      <button type="button" class="text-button" @click="backToEdit">← 返回</button>
    </header>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>

    <section v-if="validation && !validation.valid" class="validation-panel">
      <div class="section-heading">
        <h2>校验问题</h2>
        <span>{{ validation.errors.length }} 条</span>
      </div>
      <ul>
        <li v-for="item in validation.errors" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section v-if="workflow" class="preview-meta">
      <div class="meta-item">
        <span>工作流 ID</span>
        <code>{{ workflow.id }}</code>
      </div>
      <div class="meta-item">
        <span>类型</span>
        <code>真实执行</code>
      </div>
      <div class="meta-item">
        <span>输入参数</span>
        <code>
          {{ workflow.inputs.map((i) => i.name).join(', ') || '—' }}
        </code>
      </div>
      <div class="meta-item">
        <span>节点数</span>
        <code>{{ workflow.nodes.length }}</code>
      </div>
    </section>

    <section v-if="!showYaml && workflow" class="preview-nodes">
      <div class="section-heading">
        <h2>节点流程</h2>
        <button type="button" class="text-button" @click="showYaml = true">👁 看 YAML</button>
      </div>
      <div class="workflow-graph">
        <div v-for="(stage, stageIdx) in executionStages" :key="`stage-${stageIdx}`" class="workflow-stage">
          <div class="stage-label">阶段 {{ stageIdx + 1 }}</div>
          <div class="stage-nodes">
            <WorkflowNodeCard
              v-for="node in stage"
              :key="node.id"
              :index="workflow.nodes.findIndex((item) => item.id === node.id) + 1"
              :node="node"
              :definition="nodeMap.get(node.type) ?? null"
              :issues="validationIssuesByNode.get(workflow.nodes.findIndex((item) => item.id === node.id)) ?? []"
              :status="nodeRunState[node.id]?.status"
              :detail="nodeRunState[node.id]?.detail"
              :resolved-inputs="nodeRunState[node.id]?.inputs"
              :output="nodeRunState[node.id]?.output"
            />
          </div>
        </div>
      </div>
    </section>

    <section v-if="workflow && !showYaml" class="trial-panel">
      <div class="section-heading">
        <h2>试运行</h2>
        <span>{{ runRecord ? `Run ${runRecord.id}` : '草稿不会保存到我的流程' }}</span>
      </div>
      <form class="trial-form" @submit.prevent="trialRun">
        <label v-for="input in workflow.inputs" :key="input.name">
          {{ input.label || input.name }}
          <input v-model="runInputs[input.name]" :placeholder="input.label || input.name" :disabled="isRunning" />
        </label>
        <button type="submit" class="primary-button" :disabled="!isValid || isRunning">
          {{ isRunning ? '试运行中...' : '▶ 试运行' }}
        </button>
      </form>
      <p v-if="runError" class="alert error">{{ runError }}</p>
      <div v-if="finalOutputs" class="trial-result">
        <div class="section-heading compact">
          <h3>最终输出</h3>
          <button type="button" class="text-button" :disabled="isGeneratingViews" @click="generateViewsWithAi">
            {{ isGeneratingViews ? 'AI 生成中...' : 'AI 优化展示' }}
          </button>
        </div>
        <ResultRenderer :result="finalOutputs" :views="resultViews" />
      </div>
    </section>

    <section v-else-if="showYaml" class="preview-yaml">
      <div class="section-heading">
        <h2>YAML 源码</h2>
        <button type="button" class="text-button" @click="showYaml = false">← 回到卡片视图</button>
      </div>
      <div v-if="showYamlDiff" class="yaml-diff">
        <div>
          <h3>旧版本</h3>
          <pre>{{ draft?.contextYaml }}</pre>
        </div>
        <div>
          <h3>新版本</h3>
          <pre>{{ draft?.yaml }}</pre>
        </div>
      </div>
      <pre v-else class="yaml-block">{{ draft?.yaml }}</pre>
    </section>

    <footer class="preview-actions">
      <button type="button" class="primary-button" :disabled="!isValid || saving" @click="saveAndUse">
        {{ saving ? '保存中...' : '💾 保存并使用' }}
      </button>
    </footer>
  </div>
</template>
