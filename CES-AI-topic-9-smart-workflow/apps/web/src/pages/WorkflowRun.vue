<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import EmailDraftPanel from '../components/EmailDraftPanel.vue'
import ResultRenderer from '../components/ResultRenderer.vue'
import Sop1ResultTable, { type Sop1Row } from '../components/Sop1ResultTable.vue'
import StepCard, { type StepStatus } from '../components/StepCard.vue'
import WorkflowNodeCard from '../components/WorkflowNodeCard.vue'
import {
  getRun,
  getSop1Run,
  getWorkflow,
  generateResultViews,
  listNodes,
  listRuns,
  runDraftWorkflow,
  runSop1,
  runWorkflow,
} from '../lib/api'
import { loadWorkflowDraft } from '../lib/draft-store'
import type { EmailDraft } from '../lib/mail-draft'
import { navigate, useRoute } from '../lib/router'
import type { NodeDefinition, ResultView, RunRecord, Workflow, WorkflowNode } from '../lib/types'
import { parseWorkflowYaml } from '../lib/yaml'

interface StepView {
  id: string
  name: string
  system: string
  description: string
  status: StepStatus
  progress: number
  detail?: string
}

interface ApiResultRow {
  work_order_no: string
  jiuqiu_order_no: string | null
  jiuqiu_order_status: string | null
  pgi: string | null
  s4_order_no: string | null
  pgi_sscm_success_time: string | null
  btcp_order_no: string | null
  invoice_status: string | null
  invoice_type: string | null
  invoice_link: string | null
}

interface Sop1ApiResult {
  result_form: {
    work_order_no: string
    jiuqiu_order_no: string | null
    jiuqiu_order_status: string | null
    rows: ApiResultRow[]
  }
  extra_processing: {
    route: string | null
    name: string
    need_email_draft: boolean
    email_draft: { to: string[]; cc: string[]; subject: string; body: string } | null
  }
  run_status: 'success' | 'partial_success' | 'failed'
  errors: Array<{ code: string; platform: string; step: string; message: string }>
}

const route = useRoute()
const workflowId = computed(() => route.value.path.split('/')[2] ?? '')
const isDraftTrial = computed(() => route.value.query.trial === '1')
const isSop1Workflow = computed(
  () => !isDraftTrial.value && (workflowId.value === 'sop1-direct-order-invoice' || workflowId.value === 'wf_direct_order_invoice'),
)

const workflow = ref<Workflow | null>(null)
const yaml = ref<string>('')
const meta = ref<{ name: string; description?: string } | null>(null)
const nodes = ref<NodeDefinition[]>([])
const errorMsg = ref('')

const inputValues = reactive<Record<string, string>>({})
const isRunning = ref(false)
const hasRun = ref(false)
const runError = ref('')
const startedAt = ref('')
const finishedAt = ref('')
const currentRunId = ref('')
const steps = ref<StepView[]>([])
const logs = ref<string[]>([])
const resultRows = ref<Sop1Row[]>([])
const emailDraft = ref<EmailDraft | null>(null)
const genericResult = ref<Record<string, unknown> | null>(null)
const aiViews = ref<ResultView[]>([])
const isGeneratingViews = ref(false)
const nodeResolvedInputs = ref<Record<string, unknown>>({})
const nodeOutputs = ref<Record<string, unknown>>({})
const history = ref<RunRecord[]>([])
const runDrawerOpen = ref(false)
const activeRunTab = ref<'inputs' | 'output' | 'details' | 'logs'>('inputs')

const totalProgress = computed(() =>
  steps.value.length
    ? Math.round(steps.value.reduce((sum, step) => sum + step.progress, 0) / steps.value.length)
    : 0,
)
const completedSteps = computed(() => steps.value.filter((s) => s.status === 'success' || s.status === 'warning').length)
const runStateText = computed(() => {
  if (isRunning.value) return '执行中'
  if (runError.value) return '执行失败'
  if (hasRun.value) return emailDraft.value ? '需人工确认' : '已完成'
  return '待执行'
})
const runStateClass = computed(() => {
  if (isRunning.value) return 'status-running'
  if (runError.value) return 'status-error'
  if (hasRun.value && emailDraft.value) return 'status-warning'
  if (hasRun.value) return 'status-success'
  return 'status-idle'
})
const currentWorkflowId = computed(() => workflow.value?.id || workflowId.value)
const workflowNodeCount = computed(() => (isSop1Workflow.value ? steps.value.length : workflow.value?.nodes.length ?? 0))
const workflowInputCount = computed(() => (isSop1Workflow.value ? 1 : workflow.value?.inputs.length ?? 0))
const nodeMap = computed(() => {
  const map = new Map<string, NodeDefinition>()
  for (const node of nodes.value) map.set(node.type, node)
  return map
})
const executionStages = computed(() => (workflow.value ? buildExecutionStages(workflow.value.nodes) : []))
const runTabs = [
  { id: 'inputs', label: '输入' },
  { id: 'output', label: '输出' },
  { id: 'details', label: '输出详情' },
  { id: 'logs', label: '日志' },
] as const
const nodeRunDetails = computed(() => {
  if (!workflow.value) return []
  return steps.value.map((step) => {
    const node = workflow.value?.nodes.find((item) => item.id === step.id)
    return {
      step,
      node,
      definition: node ? nodeMap.value.get(node.type) ?? null : null,
      configuredInputs: node?.inputs ?? {},
      resolvedInputs: nodeResolvedInputs.value[step.id],
      output: nodeOutputs.value[step.id],
    }
  })
})
const resultViews = computed(() => aiViews.value.length ? aiViews.value : workflow.value?.views ?? [])

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function openRunDrawer() {
  runDrawerOpen.value = true
  activeRunTab.value = 'inputs'
}

function closeRunDrawer() {
  if (isRunning.value) return
  runDrawerOpen.value = false
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '--'
}

function formatJson(value: unknown) {
  if (value === undefined) return '暂无数据'
  return JSON.stringify(value, null, 2)
}

function runStatusLabel(status: RunRecord['status']) {
  if (status === 'success') return '成功'
  if (status === 'partial_success') return '部分成功'
  if (status === 'failed') return '失败'
  if (status === 'running') return '运行中'
  return '等待中'
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

function buildStepsFromYaml(wf: Workflow) {
  const nodeMap = new Map(nodes.value.map((n) => [n.type, n]))
  steps.value = wf.nodes.map((node) => {
    const def = nodeMap.get(node.type)
    return {
      id: node.id,
      name: def?.name ?? node.type,
      system: def?.category === 'connector' ? '平台' : def?.category === 'builtin' ? '内置' : def?.category === 'recorded' ? '录制' : '节点',
      description: def?.description ?? '',
      status: 'idle',
      progress: 0,
    }
  })
}

function buildSop1Steps() {
  steps.value = [
    { id: 'serviceforce', name: '服务云查询', system: 'ServiceForce', description: '按工单号查询历史工单，筛选已支付的九丘订单号。', status: 'idle', progress: 0 },
    { id: 'jiuqiu', name: '九丘订单详情', system: 'Jiuqiu', description: '查询订单状态、PGI、S4 订单号与抛送 SSCM 时间。', status: 'idle', progress: 0 },
    { id: 'spos', name: 'SPOS 发票链路', system: 'SPOS / BTCP', description: '按九丘订单号查询 BTCP、开票状态、发票类型和发票链接。', status: 'idle', progress: 0 },
    { id: 'rules', name: '异常规则判断', system: 'Rules', description: '执行 R1-R6 规则，只在命中异常时生成一份邮件草稿。', status: 'idle', progress: 0 },
    { id: 'email', name: '邮件草稿', system: 'Mail', description: '展示待确认邮件草稿；当前阶段不自动发送。', status: 'idle', progress: 0 },
  ]
}

async function load() {
  errorMsg.value = ''
  try {
    nodes.value = await listNodes()
    if (isSop1Workflow.value) {
      buildSop1Steps()
      meta.value = { name: '直客订单查询及发票处理', description: '输入工单号，跨服务云/九丘/SPOS 查询订单与发票' }
      inputValues.work_order_no = '202604273400100002'
    } else {
      const draft = isDraftTrial.value ? loadWorkflowDraft() : null
      const sourceYaml = draft?.yaml ?? ''
      const data = isDraftTrial.value ? null : await getWorkflow(workflowId.value)
      yaml.value = data?.yaml ?? sourceYaml
      const wf = parseWorkflowYaml(yaml.value)
      if (!wf) throw new Error('工作流 YAML 解析失败')
      workflow.value = wf
      meta.value = data ? { name: data.meta.name, description: data.meta.description } : { name: wf.name, description: wf.description }
      buildStepsFromYaml(wf)
      for (const input of wf.inputs) {
        inputValues[input.name] = String(input.default ?? '')
      }
      history.value = isDraftTrial.value ? [] : await listRuns(workflowId.value).catch(() => [])
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

onMounted(load)

function reset() {
  steps.value.forEach((step) => {
    step.status = 'idle'
    step.progress = 0
    step.detail = undefined
  })
  logs.value = ['等待启动工作流。']
  hasRun.value = false
  startedAt.value = ''
  finishedAt.value = ''
  currentRunId.value = ''
  runError.value = ''
  resultRows.value = []
  emailDraft.value = null
  genericResult.value = null
  aiViews.value = []
  nodeResolvedInputs.value = {}
  nodeOutputs.value = {}
}

function setStepRunning(index: number, detail: string) {
  const step = steps.value[index]
  if (!step || step.status !== 'idle') return
  step.status = 'running'
  step.progress = Math.max(step.progress, 12)
  step.detail = detail
  logs.value.unshift(`${now()} ${step.name} 开始执行。`)
}

function advanceEstimatedProgress() {
  const runningIdx = steps.value.findIndex((s) => s.status === 'running')
  const idx = runningIdx >= 0 ? runningIdx : steps.value.findIndex((s) => s.status === 'idle')
  if (idx < 0) return
  setStepRunning(idx, '后端执行中，等待返回...')
  const step = steps.value[idx]
  step.progress = Math.min(step.progress + 10, 88)
  if (step.progress >= 88 && idx < steps.value.length - 1) {
    step.status = 'success'
    step.progress = 100
    step.detail = '已提交后端执行。'
    setStepRunning(idx + 1, '后端执行中，等待返回...')
  }
}

function applySop1Result(result: Sop1ApiResult) {
  resultRows.value = result.result_form.rows.map((row) => ({
    workOrderNo: toDisplay(row.work_order_no),
    jiuqiuOrderNo: toDisplay(row.jiuqiu_order_no),
    orderStatus: toDisplay(row.jiuqiu_order_status),
    pgi: toDisplay(row.pgi),
    s4OrderNo: toDisplay(row.s4_order_no),
    pgiSscmTime: toDisplay(row.pgi_sscm_success_time),
    btcpOrderNo: toDisplay(row.btcp_order_no),
    invoiceStatus: toDisplay(row.invoice_status),
    invoiceType: toDisplay(row.invoice_type),
    invoiceLink: toDisplay(row.invoice_link),
  }))
  const draft = result.extra_processing.email_draft
  emailDraft.value = draft
    ? {
        ruleId: result.extra_processing.route ?? 'EMAIL',
        title: draft.subject,
        to: draft.to,
        cc: draft.cc,
        body: draft.body,
      }
    : null

  const stepDetails = [
    result.result_form.jiuqiu_order_no ? `找到九丘订单 ${result.result_form.jiuqiu_order_no}。` : '未找到已支付九丘订单。',
    result.result_form.jiuqiu_order_status ? `九丘状态 ${result.result_form.jiuqiu_order_status}。` : '无九丘订单详情。',
    resultRows.value.length ? `返回 ${resultRows.value.length} 条 SPOS/BTCP 明细。` : '未返回 SPOS/BTCP 明细。',
    result.extra_processing.name,
    emailDraft.value ? '邮件草稿等待业务人员确认。' : '无异常草稿，流程闭环。',
  ]

  steps.value.forEach((step, idx) => {
    step.progress = 100
    step.detail = stepDetails[idx] ?? ''
    step.status = result.run_status === 'failed' ? 'error' : idx === 4 && emailDraft.value ? 'warning' : 'success'
  })

  result.errors.forEach((e) => logs.value.unshift(`${now()} ${e.platform}/${e.step}：${e.message}`))
}

function toDisplay(v: string | null | undefined) {
  return v && v.trim() ? v : '/'
}

function applyGenericRecord(record: RunRecord) {
  genericResult.value = (record.result ?? null) as Record<string, unknown> | null
  if (record.logs?.length) {
    for (const log of record.logs) {
      const stepIdx = steps.value.findIndex((s) => s.id === log.node_id)
      if (stepIdx >= 0) {
        const step = steps.value[stepIdx]
        if (log.event === 'node_started') {
          step.status = 'running'
          step.detail = log.message
          const data = log.data as { inputs?: unknown } | undefined
          if (log.node_id && data?.inputs !== undefined) nodeResolvedInputs.value[log.node_id] = data.inputs
        } else if (log.event === 'node_completed') {
          step.status = 'success'
          step.progress = 100
          step.detail = log.message
          if (log.node_id && log.data !== undefined) nodeOutputs.value[log.node_id] = log.data
        } else if (log.event === 'node_failed') {
          step.status = 'error'
          step.detail = log.message
        } else if (log.event === 'node_skipped') {
          step.status = 'warning'
          step.progress = 100
          step.detail = log.message
          if (log.node_id && log.data !== undefined) nodeOutputs.value[log.node_id] = log.data
        }
      }
      logs.value.unshift(`${new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })} ${log.message}`)
    }
  } else {
    steps.value.forEach((step) => {
      step.status = record.status === 'failed' ? 'error' : 'success'
      step.progress = 100
      step.detail = '后端执行完成'
    })
  }
}

async function pollSop1(runId: string) {
  while (true) {
    await new Promise((r) => setTimeout(r, 1200))
    advanceEstimatedProgress()
    const record = await getSop1Run(runId)
    if (record.status !== 'running') return record
  }
}

async function pollGeneric(runId: string) {
  while (true) {
    await new Promise((r) => setTimeout(r, 1200))
    advanceEstimatedProgress()
    const record = await getRun(currentWorkflowId.value, runId)
    if (record.status === 'running' || record.status === 'pending') continue
    return record
  }
}

async function start() {
  if (isRunning.value) return
  reset()
  isRunning.value = true
  startedAt.value = now()
  logs.value.unshift(`${startedAt.value} 启动工作流 ${meta.value?.name ?? ''}。`)

  try {
    if (isSop1Workflow.value) {
      const orderNo = (inputValues.work_order_no || '').trim()
      if (!orderNo) throw new Error('请输入工单号')
      setStepRunning(0, '创建后端任务...')
      const created = await runSop1(orderNo)
      currentRunId.value = created.run_id
      logs.value.unshift(`${now()} 后端任务已创建：${created.run_id}`)
      const record = await pollSop1(created.run_id)
      if (record.result) applySop1Result(record.result as unknown as Sop1ApiResult)
      if (record.status === 'failed') {
        runError.value = record.error ?? '后端执行失败'
        logs.value.unshift(`${now()} 执行失败：${runError.value}`)
      } else {
        logs.value.unshift(`${now()} 执行成功。`)
      }
    } else {
      setStepRunning(0, '创建后端任务...')
      const inputs: Record<string, unknown> = {}
      for (const k of Object.keys(inputValues)) inputs[k] = inputValues[k]
      const created = isDraftTrial.value ? await runDraftWorkflow(yaml.value, inputs) : await runWorkflow(workflowId.value, inputs)
      currentRunId.value = created.run_id
      logs.value.unshift(`${now()} 后端任务已创建：${created.run_id}`)
      const record = await pollGeneric(created.run_id)
      applyGenericRecord(record)
      if (record.status === 'failed') {
        runError.value = record.error ?? '后端执行失败'
        logs.value.unshift(`${now()} 执行失败：${runError.value}`)
      } else {
        logs.value.unshift(`${now()} 执行成功。`)
      }
      history.value = isDraftTrial.value ? history.value : await listRuns(workflowId.value).catch(() => history.value)
    }
    hasRun.value = true
    activeRunTab.value = 'output'
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error)
    steps.value.forEach((s) => {
      if (s.status === 'running' || s.status === 'idle') {
        s.status = 'error'
        s.detail = runError.value
      }
    })
    logs.value.unshift(`${now()} 调用失败：${runError.value}`)
    activeRunTab.value = 'logs'
  } finally {
    finishedAt.value = now()
    isRunning.value = false
  }
}

async function generateViewsWithAi() {
  if (!genericResult.value || isGeneratingViews.value) return
  isGeneratingViews.value = true
  try {
    aiViews.value = await generateResultViews({
      result: genericResult.value,
      existingViews: resultViews.value,
    })
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isGeneratingViews.value = false
  }
}

function letAiModify() {
  if (isDraftTrial.value) {
    navigate('/workflows/preview')
  } else {
    navigate('/workflows/manual', { contextId: workflowId.value })
  }
}
</script>

<template>
  <div class="page workflow-run-page workflow-detail-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ isDraftTrial ? 'Draft Workflow' : 'Workflow Detail' }}</p>
        <h1>{{ meta?.name || workflowId }}</h1>
        <p class="page-sub">{{ meta?.description || '—' }}</p>
      </div>
      <div class="header-actions">
        <span class="run-badge" :class="runStateClass">
          <span></span>{{ runStateText }}
        </span>
        <button type="button" class="primary-button" @click="openRunDrawer">
          <span class="play-icon"></span>
          运行
        </button>
        <button type="button" class="text-button" @click="letAiModify">{{ isDraftTrial ? '← 回到预览' : '✎ 编辑流程' }}</button>
        <button type="button" class="text-button" @click="navigate('/workflows')">← 列表</button>
      </div>
    </header>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>

    <section class="workflow-detail-hero">
      <div>
        <p class="eyebrow">Workflow</p>
        <h2>工作流</h2>
        <p>{{ currentWorkflowId }}</p>
      </div>
      <div class="workflow-detail-stats">
        <div class="detail-stat">
          <span>输入</span>
          <strong>{{ workflowInputCount }}</strong>
        </div>
        <div class="detail-stat">
          <span>节点</span>
          <strong>{{ workflowNodeCount }}</strong>
        </div>
        <div class="detail-stat">
          <span>历史运行</span>
          <strong>{{ history.length }}</strong>
        </div>
        <div class="detail-stat">
          <span>总进度</span>
          <strong>{{ totalProgress }}%</strong>
        </div>
      </div>
    </section>

    <section v-if="isSop1Workflow" class="flow-panel workflow-canvas-section">
      <div class="section-heading">
        <h2>当前节点流程</h2>
        <span>{{ steps.length }} 个模块</span>
      </div>
      <div class="step-track" :style="`grid-template-columns: repeat(${Math.max(steps.length, 1)}, minmax(180px, 1fr))`">
        <StepCard
          v-for="step in steps"
          :key="step.id"
          :system="step.system"
          :name="step.name"
          :description="step.description"
          :status="step.status"
          :progress="step.progress"
          :detail="step.detail"
        />
      </div>
    </section>

    <section v-else class="preview-nodes workflow-run-nodes workflow-canvas-section">
      <div class="section-heading">
        <h2>当前节点流程</h2>
        <span>{{ workflow?.nodes.length ?? 0 }} 个节点</span>
      </div>
      <div class="workflow-graph">
        <div v-for="(stage, stageIdx) in executionStages" :key="`stage-${stageIdx}`" class="workflow-stage">
          <div class="stage-label">阶段 {{ stageIdx + 1 }}</div>
          <div class="stage-nodes">
            <WorkflowNodeCard
              v-for="node in stage"
              :key="node.id"
              :index="(workflow?.nodes.findIndex((item) => item.id === node.id) ?? 0) + 1"
              :node="node"
              :definition="nodeMap.get(node.type) ?? null"
              :status="steps.find((step) => step.id === node.id)?.status ?? 'idle'"
              :detail="steps.find((step) => step.id === node.id)?.detail"
              :resolved-inputs="nodeResolvedInputs[node.id]"
              :output="nodeOutputs[node.id]"
            />
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="runDrawerOpen" class="run-drawer-backdrop" @click.self="closeRunDrawer">
        <aside class="run-drawer" aria-label="运行工作流">
          <header class="run-drawer-head">
            <div>
              <p class="eyebrow">Run</p>
              <h2>{{ meta?.name || workflowId }}</h2>
              <span>{{ currentRunId || '尚未创建运行任务' }}</span>
            </div>
            <button type="button" class="text-button" :disabled="isRunning" @click="closeRunDrawer">关闭</button>
          </header>

          <div class="run-drawer-tabs">
            <button
              v-for="tab in runTabs"
              :key="tab.id"
              type="button"
              :class="{ active: activeRunTab === tab.id }"
              @click="activeRunTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="run-drawer-body">
            <section v-if="activeRunTab === 'inputs'" class="drawer-tab-panel">
              <form v-if="isSop1Workflow" class="run-form drawer-run-form" @submit.prevent="start">
                <label for="drawer-work-order">工单号</label>
                <div class="input-row">
                  <input
                    id="drawer-work-order"
                    v-model="inputValues.work_order_no"
                    inputmode="numeric"
                    placeholder="请输入工单号"
                    :disabled="isRunning"
                  />
                  <button type="submit" :disabled="isRunning || !inputValues.work_order_no?.trim()">
                    <span class="play-icon"></span>
                    {{ isRunning ? '执行中' : '运行' }}
                  </button>
                </div>
              </form>

              <form v-else class="run-form generic drawer-run-form" @submit.prevent="start">
                <div v-if="(workflow?.inputs ?? []).length" class="drawer-input-stack">
                  <label v-for="input in workflow?.inputs ?? []" :key="input.name" class="generic-input">
                    {{ input.label || input.name }}
                    <input v-model="inputValues[input.name]" :placeholder="input.label || input.name" :disabled="isRunning" />
                  </label>
                </div>
                <div v-else class="empty-state">
                  <strong>无需输入参数</strong>
                </div>
                <button type="submit" class="primary-button" :disabled="isRunning">
                  <span class="play-icon"></span>
                  {{ isRunning ? '执行中' : '运行' }}
                </button>
              </form>
            </section>

            <section v-else-if="activeRunTab === 'output'" class="drawer-tab-panel">
              <div class="section-heading">
                <h3>最终输出</h3>
                <button
                  v-if="!isSop1Workflow && genericResult"
                  type="button"
                  class="text-button"
                  :disabled="isGeneratingViews"
                  @click="generateViewsWithAi"
                >
                  {{ isGeneratingViews ? 'AI 生成中...' : 'AI 优化展示' }}
                </button>
                <span v-else>{{ finishedAt ? `${finishedAt} 完成` : '等待执行' }}</span>
              </div>
              <Sop1ResultTable v-if="isSop1Workflow && resultRows.length" :rows="resultRows" />
              <ResultRenderer v-else-if="!isSop1Workflow && genericResult" :result="genericResult" :views="resultViews" />
              <div v-else class="output-waiting-state">
                <span class="loading-spinner" aria-hidden="true"></span>
                <strong>{{ isRunning ? '结果生成中' : '等待运行生成输出' }}</strong>
              </div>
              <EmailDraftPanel v-if="isSop1Workflow || emailDraft" :draft="emailDraft" />
            </section>

            <section v-else-if="activeRunTab === 'details'" class="drawer-tab-panel">
              <div class="section-heading">
                <h3>节点输入输出</h3>
                <span>{{ nodeRunDetails.length || steps.length }} 个节点</span>
              </div>
              <div v-if="!isSop1Workflow && nodeRunDetails.length" class="run-node-detail-list">
                <article v-for="item in nodeRunDetails" :key="item.step.id" class="run-node-detail">
                  <header>
                    <div>
                      <strong>{{ item.step.name }}</strong>
                      <code>{{ item.step.id }}</code>
                    </div>
                    <span class="wnc-status">{{ item.step.status }}</span>
                  </header>
                  <div class="detail-block">
                    <b>输入</b>
                    <pre>{{ formatJson(item.resolvedInputs ?? item.configuredInputs) }}</pre>
                  </div>
                  <div class="detail-block">
                    <b>输出</b>
                    <pre>{{ formatJson(item.output) }}</pre>
                  </div>
                </article>
              </div>
              <div v-else class="run-node-detail-list">
                <article v-for="step in steps" :key="step.id" class="run-node-detail">
                  <header>
                    <div>
                      <strong>{{ step.name }}</strong>
                      <code>{{ step.id }}</code>
                    </div>
                    <span class="wnc-status">{{ step.status }}</span>
                  </header>
                  <p>{{ step.detail || '等待运行' }}</p>
                </article>
              </div>
            </section>

            <section v-else class="drawer-tab-panel">
              <div class="section-heading">
                <h3>历史运行</h3>
                <span>{{ history.length }} 条</span>
              </div>
              <div v-if="!isSop1Workflow && history.length" class="history-run-list">
                <article v-for="item in history" :key="item.id" class="history-run-card">
                  <header>
                    <div>
                      <strong>{{ runStatusLabel(item.status) }}</strong>
                      <span>{{ formatDateTime(item.started_at) }}</span>
                    </div>
                    <code>{{ item.id }}</code>
                  </header>
                  <p v-if="item.error" class="alert error">{{ item.error }}</p>
                  <details v-if="item.logs?.length" class="history-log-detail">
                    <summary>运行日志 {{ item.logs.length }} 条</summary>
                    <ul>
                      <li v-for="log in item.logs ?? []" :key="`${item.id}-${log.timestamp}-${log.message}`">
                        {{ formatDateTime(log.timestamp) }} · {{ log.message }}
                      </li>
                    </ul>
                  </details>
                </article>
              </div>
              <div v-else class="empty-state large">
                <strong>{{ isSop1Workflow ? '专用流程暂未接入历史运行列表' : '暂无历史运行记录' }}</strong>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
