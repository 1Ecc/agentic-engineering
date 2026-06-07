<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { VueFlow, type Connection } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import DeletableWorkflowEdge from '../components/DeletableWorkflowEdge.vue'
import WorkflowCanvasNode from '../components/WorkflowCanvasNode.vue'
import { generateWorkflow, getRun, getWorkflow, listNodes, runDraftWorkflow, validateWorkflowDraft } from '../lib/api'
import { loadWorkflowDraft, setWorkflowDraft } from '../lib/draft-store'
import { navigate, useRoute } from '../lib/router'
import type { FieldSchema, NodeDefinition, ResultView, Workflow, WorkflowNode } from '../lib/types'
import { workflowToYaml } from '../lib/workflow-yaml'
import { parseWorkflowYaml } from '../lib/yaml'

interface FlowData {
  workflowType: string
  title: string
  description?: string
  category?: NodeDefinition['category']
  inputs: Record<string, unknown>
  inputPorts: FieldSchema[]
  outputPorts: FieldSchema[]
}

interface WorkflowFlowNode {
  id: string
  type: 'workflow'
  label: string
  position: { x: number; y: number }
  data: FlowData
  style: Record<string, string>
}

interface WorkflowFlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type: 'deletable'
  animated: boolean
  data: {
    onDelete: (id: string) => void
  }
}

const nodes = ref<NodeDefinition[]>([])
const route = useRoute()
const contextId = computed(() => route.value.query.contextId ?? '')
const errorMsg = ref('')
const aiBusy = ref(false)
const structureBusy = ref(false)
const validationMsg = ref('')
const draftMsg = ref('')
const structureRequirement = ref('')
const draggedType = ref('')
const selectedId = ref('')
const showWorkflowSettings = ref(false)
const nodeTrialBusy = ref(false)
const nodeTrialError = ref('')
const nodeTrialInputs = reactive<Record<string, string>>({})
const nodeTrialResolvedInputs = ref<unknown>()
const nodeTrialOutput = ref<unknown>()
const workflowInfo = reactive({
  id: `wf_manual_${Date.now()}`,
  name: '手动搭建工作流',
  description: '',
})
const workflowInputs = ref<FieldSchema[]>([
  { name: 'input_text', type: 'string', label: '输入参数', required: true },
])
const workflowOutputs = ref<Record<string, unknown> | undefined>()
const workflowViews = ref<ResultView[]>([])
const originalContextYaml = ref<string | undefined>()
const flowNodes = ref<WorkflowFlowNode[]>([])
const flowEdges = ref<WorkflowFlowEdge[]>([])

const nodeMap = computed(() => new Map(nodes.value.map((node) => [node.type, node])))
const selectedNode = computed(() => flowNodes.value.find((node) => node.id === selectedId.value) ?? null)
const selectedDef = computed(() => (selectedNode.value ? nodeMap.value.get(selectedNode.value.data.workflowType) ?? null : null))
const yaml = computed(() => workflowToYaml(buildWorkflow()))
const businessNodes = computed(() => nodes.value.filter((node) => node.category !== 'builtin'))
const logicNodes = computed(() => nodes.value.filter((node) => node.category === 'builtin'))
const selectedInbound = computed(() => flowEdges.value.filter((edge) => edge.target === selectedId.value).map((edge) => edge.source))
const selectedOutbound = computed(() => flowEdges.value.filter((edge) => edge.source === selectedId.value).map((edge) => edge.target))
const selectedComposeValue = computed(() => {
  if (!selectedNode.value || selectedNode.value.data.workflowType !== 'data.compose') return {}
  const value = selectedNode.value.data.inputs.value
  if (Array.isArray(value) && value[0] && typeof value[0] === 'object' && !Array.isArray(value[0])) return value[0] as Record<string, unknown>
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
})
const selectedComposeMode = computed(() => {
  if (!selectedNode.value || selectedNode.value.data.workflowType !== 'data.compose') return 'object'
  return Array.isArray(selectedNode.value.data.inputs.value) ? 'rows' : 'object'
})

onMounted(async () => {
  try {
    nodes.value = await listNodes()
    await loadInitialWorkflow()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
})

async function loadInitialWorkflow() {
  const draft = loadWorkflowDraft()
  const shouldRestoreDraft = Boolean(
    draft?.yaml
    && (draft.prompt === 'manual-draft' || draft.prompt === 'manual')
    && (!contextId.value || draft.contextId === contextId.value),
  )
  if (shouldRestoreDraft && draft?.yaml) {
    const workflow = parseWorkflowYaml(draft.yaml)
    if (workflow) {
      applyWorkflow(workflow, { preserveSelectedId: true, preferredSelectedId: draft.selectedNodeId })
      draftMsg.value = draft.savedAt ? `已恢复草稿：${new Date(draft.savedAt).toLocaleString('zh-CN', { hour12: false })}` : '已恢复当前编辑内容'
      showWorkflowSettings.value = false
      return
    }
  }
  if (contextId.value) {
    const data = await getWorkflow(contextId.value)
    originalContextYaml.value = data.yaml
    const workflow = parseWorkflowYaml(data.yaml)
    if (!workflow) throw new Error('工作流 YAML 解析失败')
    applyWorkflow(workflow)
    showWorkflowSettings.value = false
    return
  }
  if (draft?.yaml && draft.prompt === 'manual-draft') {
    const workflow = parseWorkflowYaml(draft.yaml)
    if (workflow) {
      applyWorkflow(workflow, { preserveSelectedId: true, preferredSelectedId: draft.selectedNodeId })
      draftMsg.value = draft.savedAt ? `已恢复草稿：${new Date(draft.savedAt).toLocaleString('zh-CN', { hour12: false })}` : '已恢复草稿'
    }
  }
}

function makeNodeId(type: string) {
  const parts = type.split('.')
  const base = (parts[parts.length - 1] || 'node').replace(/[^A-Za-z0-9_]/g, '_')
  let index = flowNodes.value.length + 1
  let id = `${base}_${index}`
  while (flowNodes.value.some((node) => node.id === id)) {
    index += 1
    id = `${base}_${index}`
  }
  return id
}

function defaultInputValue(input: FieldSchema, upstreamId?: string): unknown {
  const upstream = upstreamId ? flowNodes.value.find((node) => node.id === upstreamId) : null
  const upstreamDef = upstream ? nodeMap.value.get(upstream.data.workflowType) : null
  const matchingOutput = upstreamDef?.outputs.find((output) => output.name === input.name || output.type === input.type)
  if (upstream && matchingOutput) return `$${upstream.id}.${matchingOutput.name}`

  const firstWorkflowInput = workflowInputs.value.find((item) => item.type === input.type) ?? workflowInputs.value[0]
  return firstWorkflowInput ? `$inputs.${firstWorkflowInput.name}` : ''
}

function addFlowNode(type: string, position?: { x: number; y: number }) {
  const def = nodeMap.value.get(type)
  if (!def) return
  const upstreamId = selectedId.value || flowNodes.value[flowNodes.value.length - 1]?.id
  const id = makeNodeId(type)
  const inputs = Object.fromEntries(def.inputs.map((input) => [input.name, defaultInputValue(input, upstreamId)]))
  const upstreamNode = upstreamId ? flowNodes.value.find((node) => node.id === upstreamId) : null
  const fallbackPosition = upstreamNode
    ? { x: upstreamNode.position.x + 360, y: upstreamNode.position.y + Math.max(0, selectedOutbound.value.length - 1) * 150 }
    : { x: 80 + flowNodes.value.length * 40, y: 80 + flowNodes.value.length * 35 }

  flowNodes.value = [
    ...flowNodes.value,
    {
      id,
      type: 'workflow',
      label: def.name,
      position: position ?? fallbackPosition,
      data: {
        workflowType: def.type,
        title: def.name,
        description: def.description,
        category: def.category,
        inputs,
        inputPorts: def.inputs,
        outputPorts: def.outputs,
      },
      style: {},
    },
  ]
  if (upstreamId) connectNodes(upstreamId, id, 'output')
  selectedId.value = id
  showWorkflowSettings.value = false
}

function connectNodes(source: string, target: string, sourceHandle?: string | null, targetHandle?: string | null) {
  if (!source || !target || source === target) return
  if (flowEdges.value.some((edge) =>
    edge.source === source
    && edge.target === target
    && edge.sourceHandle === sourceHandle
    && edge.targetHandle === targetHandle,
  )) return
  flowEdges.value = [
    ...flowEdges.value,
    {
      id: `${source}-${sourceHandle ?? 'out'}-${target}-${targetHandle ?? 'in'}-${Date.now()}`,
      source,
      target,
      sourceHandle: sourceHandle ?? 'output',
      targetHandle,
      type: 'deletable',
      animated: true,
      data: { onDelete: removeEdge },
    },
  ]
  layoutOutgoing(source)
}

function onConnect(connection: Connection) {
  if (!connection.source || !connection.target) return
  connectNodes(connection.source, connection.target, connection.sourceHandle, connection.targetHandle)
}

function onFlowNodeClick(event: { node: { id: string } }) {
  selectedId.value = event.node.id
  showWorkflowSettings.value = false
  resetNodeTrial()
}

function removeEdge(id: string) {
  flowEdges.value = flowEdges.value.filter((edge) => edge.id !== id)
}

function closeConfigPanel() {
  selectedId.value = ''
  showWorkflowSettings.value = false
}

function openWorkflowSettings() {
  selectedId.value = ''
  showWorkflowSettings.value = true
}

function layoutOutgoing(sourceId: string) {
  const source = flowNodes.value.find((node) => node.id === sourceId)
  if (!source) return
  const targets = flowEdges.value
    .filter((edge) => edge.source === sourceId)
    .map((edge) => flowNodes.value.find((node) => node.id === edge.target))
    .filter((node): node is WorkflowFlowNode => Boolean(node))
  const gap = 170
  const startY = source.position.y - ((targets.length - 1) * gap) / 2
  flowNodes.value = flowNodes.value.map((node) => {
    const index = targets.findIndex((target) => target.id === node.id)
    if (index < 0) return node
    return {
      ...node,
      position: {
        x: Math.max(node.position.x, source.position.x + 380),
        y: startY + index * gap,
      },
    }
  })
}

function removeSelectedNode() {
  if (!selectedId.value) return
  const id = selectedId.value
  flowNodes.value = flowNodes.value.filter((node) => node.id !== id)
  flowEdges.value = flowEdges.value.filter((edge) => edge.source !== id && edge.target !== id)
  selectedId.value = flowNodes.value[0]?.id ?? ''
}

function addWorkflowInput() {
  workflowInputs.value.push({
    name: `input_${workflowInputs.value.length + 1}`,
    type: 'string',
    label: `输入 ${workflowInputs.value.length + 1}`,
    required: false,
  })
}

function formatInputValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function setNodeInput(node: WorkflowFlowNode, name: string, value: string, type?: string) {
  if (type === 'object' || type === 'array') {
    const trimmed = value.trim()
    if (!trimmed) {
      node.data.inputs[name] = type === 'array' ? [] : {}
      return
    }
    try {
      node.data.inputs[name] = JSON.parse(trimmed)
    } catch {
      node.data.inputs[name] = value
    }
    return
  }
  node.data.inputs[name] = value
}

function ensureComposeValue(mode = selectedComposeMode.value) {
  if (!selectedNode.value || selectedNode.value.data.workflowType !== 'data.compose') return
  const value = selectedNode.value.data.inputs.value
  if (mode === 'rows') {
    if (!Array.isArray(value) || !value[0] || typeof value[0] !== 'object' || Array.isArray(value[0])) selectedNode.value.data.inputs.value = [{}]
    return
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) selectedNode.value.data.inputs.value = {}
}

function composeRecord(): Record<string, unknown> {
  ensureComposeValue()
  const value = selectedNode.value?.data.inputs.value
  if (Array.isArray(value)) return value[0] as Record<string, unknown>
  return value as Record<string, unknown>
}

function setComposeMode(mode: 'object' | 'rows') {
  if (!selectedNode.value) return
  const current = selectedComposeValue.value
  selectedNode.value.data.inputs.value = mode === 'rows' ? [{ ...current }] : { ...current }
  workflowOutputs.value = { result: outputReferenceForNode(selectedNode.value.id) }
  syncComposeResultView()
}

function syncComposeResultView() {
  if (!selectedNode.value || selectedNode.value.data.workflowType !== 'data.compose') return
  const current = workflowViews.value.find((view) => view.id === 'result' && view.type === 'table')
  workflowOutputs.value = { result: outputReferenceForNode(selectedNode.value.id) }
  workflowViews.value = [
    {
      id: 'result',
      type: 'table',
      title: current?.title ?? 'Result',
      source: '$outputs.result',
    },
    ...workflowViews.value.filter((view) => !(view.id === 'result' && view.type === 'table')),
  ]
}

function addComposeField() {
  if (!selectedNode.value) return
  ensureComposeValue()
  const value = composeRecord()
  let index = Object.keys(value).length + 1
  let key = `field_${index}`
  while (key in value) {
    index += 1
    key = `field_${index}`
  }
  value[key] = ''
  syncComposeResultView()
}

function removeComposeField(key: string) {
  if (!selectedNode.value) return
  ensureComposeValue()
  const value = { ...composeRecord() }
  delete value[key]
  selectedNode.value.data.inputs.value = selectedComposeMode.value === 'rows' ? [value] : value
  syncComposeResultView()
}

function renameComposeField(oldKey: string, newKey: string) {
  if (!selectedNode.value) return
  const key = newKey.trim()
  if (!key || key === oldKey) return
  ensureComposeValue()
  const value = { ...composeRecord() }
  if (key in value) return
  value[key] = value[oldKey]
  delete value[oldKey]
  selectedNode.value.data.inputs.value = selectedComposeMode.value === 'rows' ? [value] : value
  syncComposeResultView()
}

function setComposeField(key: string, value: string) {
  if (!selectedNode.value) return
  ensureComposeValue()
  const next = { ...composeRecord(), [key]: value }
  selectedNode.value.data.inputs.value = selectedComposeMode.value === 'rows' ? [next] : next
  syncComposeResultView()
}

function autoComposeFields() {
  if (!selectedNode.value) return
  const deps = incomingFor(selectedNode.value.id)
  const value: Record<string, unknown> = {}
  for (const dep of deps) {
    const depNode = flowNodes.value.find((node) => node.id === dep)
    const depDef = depNode ? nodeMap.value.get(depNode.data.workflowType) : null
    if (!depDef) continue
    for (const output of depDef.outputs) {
      const key = `${dep.replace(/_\d+$/, '')}_${output.name}`.replace(/[^\w]/g, '_')
      value[key] = `$${dep}.${output.name}`
    }
  }
  if (!Object.keys(value).length) value.input = `$inputs.${workflowInputs.value[0]?.name ?? 'input_text'}`
  selectedNode.value.data.inputs.value = selectedComposeMode.value === 'rows' ? [value] : value
  syncComposeResultView()
}

function removeWorkflowInput(index: number) {
  if (workflowInputs.value.length <= 1) return
  workflowInputs.value.splice(index, 1)
}

function onDrop(event: DragEvent) {
  if (!draggedType.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  addFlowNode(draggedType.value, {
    x: event.clientX - rect.left - 90,
    y: event.clientY - rect.top - 30,
  })
  draggedType.value = ''
}

function incomingFor(nodeId: string) {
  return flowEdges.value
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source)
    .filter((source) => typeof source === 'string' && source.trim().length > 0)
}

function outgoingFor(nodeId: string) {
  return flowEdges.value.filter((edge) => edge.source === nodeId).map((edge) => edge.target)
}

function outputReferenceForNode(nodeId: string) {
  const node = flowNodes.value.find((item) => item.id === nodeId)
  return node?.data.workflowType === 'data.compose' ? `$${nodeId}.value` : `$${nodeId}`
}

function normalizeWorkflowOutputs(outputs: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(outputs).map(([key, value]) => {
    if (typeof value !== 'string') return [key, value]
    const matchedCompose = flowNodes.value.find((node) => node.data.workflowType === 'data.compose' && value === `$${node.id}`)
    return [key, matchedCompose ? `$${matchedCompose.id}.value` : value]
  }))
}

function buildWorkflow(): Workflow {
  const workflowNodes: WorkflowNode[] = flowNodes.value.map((node) => {
    const deps = incomingFor(node.id)
    const workflowNode: WorkflowNode = {
      id: node.id,
      type: node.data.workflowType,
      inputs: node.data.inputs,
    }
    if (deps.length) workflowNode.dependsOn = deps
    return workflowNode
  })
  const sinkNodes = flowNodes.value.filter((node) => !outgoingFor(node.id).length)
  const inferredOutputs = sinkNodes.length === 1
    ? { result: outputReferenceForNode(sinkNodes[0].id) }
    : Object.fromEntries(sinkNodes.map((node) => [node.id, outputReferenceForNode(node.id)]))

  const composeResultView = deriveComposeResultView()
  const views = composeResultView
    ? [composeResultView, ...workflowViews.value.filter((view) => !(view.id === composeResultView.id && view.type === composeResultView.type))]
    : workflowViews.value

  const workflow: Workflow = {
    id: workflowInfo.id.trim() || `wf_manual_${Date.now()}`,
    name: workflowInfo.name.trim() || '手动搭建工作流',
    description: workflowInfo.description,
    inputs: workflowInputs.value,
    nodes: workflowNodes,
    outputs: normalizeWorkflowOutputs(workflowOutputs.value ?? inferredOutputs),
  }
  if (views.length) workflow.views = views
  return workflow
}

function deriveComposeResultView(): ResultView | null {
  const resultRef = normalizeWorkflowOutputs(workflowOutputs.value ?? {}).result
  if (typeof resultRef !== 'string') return null
  const match = /^\$(.+)\.value$/.exec(resultRef)
  if (!match) return null
  const composeNode = flowNodes.value.find((node) => node.id === match[1] && node.data.workflowType === 'data.compose')
  if (!composeNode) return null
  const value = composeNode.data.inputs.value
  const record = Array.isArray(value) && value[0] && typeof value[0] === 'object' && !Array.isArray(value[0])
    ? value[0] as Record<string, unknown>
    : value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null
  if (!record) return null
  const current = workflowViews.value.find((view) => view.id === 'result' && view.type === 'table')
  return {
    id: 'result',
    type: 'table',
    title: current?.title ?? 'Result',
    source: '$outputs.result',
  }
}

function applyWorkflow(workflow: Workflow, options: { preserveSelectedId?: boolean; preferredSelectedId?: string } = {}) {
  const previousSelectedId = options.preferredSelectedId ?? selectedId.value
  workflowInfo.id = workflow.id
  workflowInfo.name = workflow.name
  workflowInfo.description = workflow.description ?? ''
  workflowInputs.value = workflow.inputs.length ? workflow.inputs : workflowInputs.value
  workflowOutputs.value = workflow.outputs
  workflowViews.value = workflow.views ?? []
  flowNodes.value = workflow.nodes.map((node, index) => {
    const def = nodeMap.value.get(node.type)
    const level = node.dependsOn?.length ? Math.max(...node.dependsOn.map((dep) => workflow.nodes.findIndex((item) => item.id === dep)).filter((item) => item >= 0)) + 1 : index
    return {
      id: node.id,
      type: 'workflow',
      label: def?.name ?? node.type,
      position: { x: 80 + level * 250, y: 80 + index * 95 },
      data: {
        workflowType: node.type,
        title: def?.name ?? node.type,
        description: def?.description,
        category: def?.category,
        inputs: node.inputs ?? {},
        inputPorts: def?.inputs ?? [],
        outputPorts: def?.outputs ?? [],
      },
      style: {},
    }
  })
  flowEdges.value = workflow.nodes.flatMap((node) => {
    const deps = node.dependsOn?.length ? node.dependsOn : []
    return deps.map((source) => ({
      id: `${source}-${node.id}`,
      source,
      target: node.id,
      sourceHandle: 'output',
      type: 'deletable',
      animated: true,
      data: { onDelete: removeEdge },
    }))
  })
  if (options.preserveSelectedId) {
    selectedId.value = flowNodes.value.some((node) => node.id === previousSelectedId)
      ? previousSelectedId
      : flowNodes.value.find((node) => node.data.workflowType === 'data.compose')?.id ?? flowNodes.value[0]?.id ?? ''
    showWorkflowSettings.value = false
  } else {
    selectedId.value = flowNodes.value[0]?.id ?? ''
  }
}

async function validateCurrent() {
  validationMsg.value = ''
  errorMsg.value = ''
  try {
    const result = await validateWorkflowDraft(yaml.value)
    validationMsg.value = result.validation.valid ? '校验通过' : result.validation.errors.join('\n')
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

function resetNodeTrial() {
  nodeTrialError.value = ''
  nodeTrialResolvedInputs.value = undefined
  nodeTrialOutput.value = undefined
}

function ancestorIdsFor(nodeId: string, visited = new Set<string>()): Set<string> {
  for (const source of incomingFor(nodeId)) {
    if (visited.has(source)) continue
    visited.add(source)
    ancestorIdsFor(source, visited)
  }
  return visited
}

function buildTrialWorkflow(nodeId: string): Workflow {
  const requiredIds = ancestorIdsFor(nodeId)
  requiredIds.add(nodeId)
  const nodesForTrial = buildWorkflow().nodes.filter((node) => requiredIds.has(node.id))
  return {
    id: `${workflowInfo.id || 'manual'}_${nodeId}_trial`,
    name: `${workflowInfo.name || '手动搭建工作流'} - ${nodeId} 试运行`,
    inputs: workflowInputs.value,
    nodes: nodesForTrial,
    outputs: { result: outputReferenceForNode(nodeId) },
  }
}

async function trialSelectedNode() {
  if (!selectedNode.value || nodeTrialBusy.value) return
  resetNodeTrial()
  nodeTrialBusy.value = true
  try {
    const inputs = Object.fromEntries(workflowInputs.value.map((input) => [input.name, nodeTrialInputs[input.name] ?? '']))
    const trialWorkflow = buildTrialWorkflow(selectedNode.value.id)
    const created = await runDraftWorkflow(workflowToYaml(trialWorkflow), inputs)
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const record = await getRun(created.workflow_id, created.run_id)
      if (record.status === 'running' || record.status === 'pending') continue
      if (record.status === 'failed') throw new Error(record.error ?? '节点试运行失败')
      const startedLog = record.logs?.find((log) => log.node_id === selectedNode.value?.id && log.event === 'node_started')
      const completedLog = record.logs?.find((log) => log.node_id === selectedNode.value?.id && log.event === 'node_completed')
      nodeTrialResolvedInputs.value = (startedLog?.data as { inputs?: unknown } | undefined)?.inputs
      nodeTrialOutput.value = completedLog?.data ?? record.result?.result
      break
    }
  } catch (error) {
    nodeTrialError.value = error instanceof Error ? error.message : String(error)
  } finally {
    nodeTrialBusy.value = false
  }
}

function preview() {
  setWorkflowDraft({
    yaml: yaml.value,
    prompt: 'manual',
    contextId: contextId.value || undefined,
    contextYaml: contextId.value ? originalContextYaml.value : undefined,
    isModify: Boolean(contextId.value),
    selectedNodeId: selectedId.value || undefined,
  })
  navigate('/workflows/preview')
}

function saveDraft() {
  setWorkflowDraft({
    yaml: yaml.value,
    prompt: 'manual-draft',
    contextId: contextId.value || undefined,
    contextYaml: contextId.value ? originalContextYaml.value : undefined,
    isModify: Boolean(contextId.value),
    savedAt: new Date().toISOString(),
    selectedNodeId: selectedId.value || undefined,
  })
  draftMsg.value = `草稿已保存：${new Date().toLocaleString('zh-CN', { hour12: false })}`
}

async function aiComplete() {
  aiBusy.value = true
  errorMsg.value = ''
  validationMsg.value = ''
  try {
    const prompt = [
      '请基于当前白板工作流 YAML 优化工作流。',
      '要求：补全节点依赖、输入绑定、必要的逻辑节点、结果展示 views；保持用户已经选择的业务节点，只有在需要规则判断、数据组装、邮件草稿或结果整理时才新增通用节点。',
      '返回完整 YAML，不要解释。',
      `当前 YAML:\n${yaml.value}`,
    ].join('\n')
    const generated = await generateWorkflow({ prompt, contextYaml: yaml.value })
    const parsed = parseWorkflowYaml(generated)
    if (!parsed) throw new Error('AI 返回的 YAML 无法解析')
    applyWorkflow(parsed, { preserveSelectedId: true, preferredSelectedId: selectedId.value })
    validationMsg.value = 'AI 已更新当前白板，可继续拖动或连线微调。'
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    aiBusy.value = false
  }
}

async function aiOptimizeStructure() {
  if (structureBusy.value || !flowNodes.value.length) return
  structureBusy.value = true
  errorMsg.value = ''
  validationMsg.value = ''
  try {
    const requirement = structureRequirement.value.trim() || '请根据当前节点输出生成清晰的结构化 result，并补充适合的 views 展示配置。'
    const prompt = [
      '请基于当前白板工作流 YAML 优化结构化输出和展示配置。',
      '重点只处理 data.compose 节点、outputs 和 views；除非必要，不要修改用户已经连好的业务节点。',
      '如果当前没有 data.compose 节点，可以新增一个 data.compose 节点作为最终结构化输出节点。',
      'outputs.result 必须指向结构化后的对象或数组。',
      '如果最终结果来自 data.compose，请优先让 outputs.result 指向 $compose_x.value，而不是 $compose_x，避免输出里出现额外的 value 包装层。',
      '服务云 serviceforce.query 的已支付九丘订单号字段是 paid_jiuqiu_order.orderNo；不要使用 paid_jiuqiu_order.jiuqiu_order_no、paid_jiuqiu_order.pgi、paid_jiuqiu_order.s4_order_no 这类不存在字段。',
      '九丘 jiuqiu.query 的订单状态字段是 orderStatusName，明细数组是 items；SPOS spos.query 的发票数组是 rows。',
      '必须优先复用当前 YAML 中已有节点输出字段，字段引用必须来自已有节点真实 outputs 或其返回对象字段；不要臆造字段名。',
      '用户要求的每一列必须只体现在 data.compose.value 字段中；不要在 views.table.columns 里重复维护固定列，表格列会由 data.compose.value 的运行结果自动推导。',
      '如果某个上游输出是数组且用户要求表格逐行展示，data.compose.value 必须使用单元素数组作为行模板，并用 [] 表示展开数组，例如 value: [{ invoice_status: $query_3.rows[].invoiceStatusName }]；outputs.result 指向 $compose_x.value，views 只需使用 table 指向 $outputs.result，不要写 columns。',
      '如果多个字段来自同一个数组，使用同一个 [] 行模板，让 runner 按数组下标展开成多行；公共字段如工单号、九丘订单号可在每一行重复引用。',
      '如果用户要求表格但只有一条结果，可以让 data.compose.value 保持对象，并生成 table view 指向 $outputs.result。',
      'views 必须描述最终展示方案，支持 table、detail、cards、timeline、status、mail_draft、json。',
      '用户展示要求：',
      requirement,
      '当前 YAML:',
      yaml.value,
      '只返回完整 YAML，不要解释。',
    ].join('\n')
    const generated = await generateWorkflow({ prompt, contextYaml: yaml.value })
    const parsed = parseWorkflowYaml(generated)
    if (!parsed) throw new Error('AI 返回的 YAML 无法解析')
    applyWorkflow(parsed, { preserveSelectedId: true, preferredSelectedId: selectedId.value })
    validationMsg.value = 'AI 已按展示要求优化结构化输出和 views。'
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    structureBusy.value = false
  }
}
</script>

<template>
  <div class="page manual-workflow-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Manual Workflow Canvas</p>
        <h1>手动搭建工作流</h1>
        <p class="page-sub">从节点库拖到白板，自由连线表示依赖关系；逻辑节点、业务节点和结果节点可以组合成多分支流程。</p>
      </div>
      <div class="header-actions">
        <button type="button" class="text-button" @click="navigate('/nodes/new')">新建节点</button>
        <button type="button" class="text-button" @click="openWorkflowSettings">工作流设置</button>
        <button type="button" class="text-button" :disabled="!flowNodes.length" @click="saveDraft">存草稿</button>
        <button type="button" class="text-button" :disabled="aiBusy || !flowNodes.length" @click="aiComplete">
          {{ aiBusy ? 'AI 编排中...' : 'AI 辅助编排' }}
        </button>
        <button type="button" class="primary-button" :disabled="!flowNodes.length" @click="preview">预览工作流</button>
      </div>
    </header>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>
    <p v-if="validationMsg" class="alert info">{{ validationMsg }}</p>
    <p v-if="draftMsg" class="alert info">{{ draftMsg }}</p>

    <section class="flow-builder-shell">
      <aside class="flow-node-library">
        <div class="section-heading compact">
          <h2>节点库</h2>
          <span>{{ nodes.length }}</span>
        </div>
        <button type="button" class="mini-create-node" @click="navigate('/nodes/new')">+ 创建新节点</button>

        <div class="flow-library-group">
          <h3>业务节点</h3>
          <button
            v-for="node in businessNodes"
            :key="node.type"
            type="button"
            draggable="true"
            class="flow-node-item"
            @dragstart="draggedType = node.type"
            @click="addFlowNode(node.type)"
          >
            <strong>{{ node.name }}</strong>
            <small>{{ node.type }}</small>
          </button>
        </div>

        <div class="flow-library-group">
          <h3>逻辑节点</h3>
          <button
            v-for="node in logicNodes"
            :key="node.type"
            type="button"
            draggable="true"
            class="flow-node-item logic"
            @dragstart="draggedType = node.type"
            @click="addFlowNode(node.type)"
          >
            <strong>{{ node.name }}</strong>
            <small>{{ node.type }}</small>
          </button>
        </div>
      </aside>

      <main class="flow-canvas-panel" @dragover.prevent @drop.prevent="onDrop">
        <VueFlow
          v-model:nodes="flowNodes"
          v-model:edges="flowEdges"
          class="workflow-flow"
          :fit-view-on-init="true"
          @connect="onConnect"
          @node-click="onFlowNodeClick"
        >
          <template #node-workflow="nodeProps">
            <WorkflowCanvasNode v-bind="nodeProps" />
          </template>
          <template #edge-deletable="edgeProps">
            <DeletableWorkflowEdge v-bind="edgeProps" />
          </template>
        </VueFlow>
        <div v-if="!flowNodes.length" class="flow-empty-hint">
          <strong>拖动节点到白板</strong>
          <span>也可以点击左侧节点直接加入。节点之间拖出连线即可形成依赖。</span>
        </div>
      </main>

      <aside v-if="showWorkflowSettings || (selectedNode && selectedDef)" class="flow-config-panel floating">
        <div class="section-heading compact">
          <h2>{{ selectedNode ? '节点配置' : '工作流配置' }}</h2>
          <div class="config-panel-actions">
            <button type="button" class="text-button" @click="validateCurrent">校验</button>
            <button type="button" class="text-button" @click="closeConfigPanel">×</button>
          </div>
        </div>

        <details v-if="showWorkflowSettings" open class="flow-config-section">
          <summary>工作流信息</summary>
          <label class="generic-input">
            工作流 ID
            <input v-model="workflowInfo.id" />
          </label>
          <label class="generic-input">
            名称
            <input v-model="workflowInfo.name" />
          </label>
          <label class="generic-input">
            描述
            <input v-model="workflowInfo.description" />
          </label>
        </details>

        <details v-if="showWorkflowSettings" open class="flow-config-section">
          <summary>工作流输入</summary>
          <article v-for="(input, index) in workflowInputs" :key="index" class="flow-input-row">
            <input v-model="input.name" placeholder="name" />
            <input v-model="input.label" placeholder="label" />
            <select v-model="input.type">
              <option value="string">string</option>
              <option value="text">text</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="object">object</option>
              <option value="array">array</option>
            </select>
            <button type="button" class="text-button danger" @click="removeWorkflowInput(index)">删除</button>
          </article>
          <button type="button" class="text-button" @click="addWorkflowInput">添加输入</button>
        </details>

        <section v-if="selectedNode && selectedDef" class="flow-config-section selected-flow-node">
          <header>
            <div>
              <strong>{{ selectedDef.name }}</strong>
              <small>{{ selectedNode.id }} · {{ selectedDef.type }}</small>
            </div>
            <button type="button" class="text-button danger" @click="removeSelectedNode">删除</button>
          </header>
          <p class="detail-muted">
            入线：{{ selectedInbound.join(', ') || '无' }} · 出线：{{ selectedOutbound.join(', ') || '无' }}
          </p>
          <details open class="node-trial-panel">
            <summary>节点试运行</summary>
            <label v-for="input in workflowInputs" :key="input.name" class="generic-input">
              {{ input.label || input.name }}
              <input v-model="nodeTrialInputs[input.name]" :placeholder="input.label || input.name" :disabled="nodeTrialBusy" />
            </label>
            <button type="button" class="text-button compact" :disabled="nodeTrialBusy" @click="trialSelectedNode">
              {{ nodeTrialBusy ? '试运行中...' : '试运行到此节点' }}
            </button>
            <p v-if="nodeTrialError" class="alert error">{{ nodeTrialError }}</p>
            <div v-if="nodeTrialResolvedInputs !== undefined" class="trial-json-block">
              <strong>Resolved Inputs</strong>
              <pre>{{ JSON.stringify(nodeTrialResolvedInputs, null, 2) }}</pre>
            </div>
            <div v-if="nodeTrialOutput !== undefined" class="trial-json-block">
              <strong>Output</strong>
              <pre>{{ JSON.stringify(nodeTrialOutput, null, 2) }}</pre>
            </div>
          </details>
          <div v-if="selectedDef.type === 'data.compose'" class="node-io-editor compose-editor">
            <div class="node-io-head compose-head">
              <strong>结构化输出</strong>
              <select :value="selectedComposeMode" @change="setComposeMode(($event.target as HTMLSelectElement).value as 'object' | 'rows')">
                <option value="object">单行对象</option>
                <option value="rows">多行表格</option>
              </select>
              <button type="button" class="text-button compact" @click="autoComposeFields">按入线生成</button>
              <button type="button" class="text-button compact" @click="addComposeField">添加字段</button>
            </div>
            <p v-if="selectedComposeMode === 'rows'" class="detail-muted">
              多行表格模式会把包含 <code>[]</code> 的数组引用按行展开，例如 <code>$query_3.rows[].invoiceStatusName</code>。
            </p>
            <div class="ai-structure-panel embedded">
              <div class="section-heading compact">
                <h3>AI 优化结构化输出</h3>
                <button type="button" class="text-button compact" :disabled="structureBusy || !flowNodes.length" @click="aiOptimizeStructure">
                  {{ structureBusy ? '优化中...' : '生成结构与展示' }}
                </button>
              </div>
              <label class="generic-input">
                输出/展示要求
                <textarea
                  v-model="structureRequirement"
                  rows="5"
                  placeholder="例如：我要表格，字段是：工单号、九丘订单号、九丘状态、PGI、S4 订单号、PGI 抛送 sscm 成功时间、BTCP 订单号、开票状态、发票类型、发票链接。请从服务云、九丘、SPOS 输出里拆解这些字段。"
                ></textarea>
              </label>
            </div>
            <div v-if="!Object.keys(selectedComposeValue).length" class="node-io-empty">还没有结构化字段，可点击“按入线生成”或手动添加。</div>
            <div v-for="(value, key) in selectedComposeValue" :key="key" class="compose-field-row">
              <input :value="key" placeholder="输出字段名" @change="renameComposeField(String(key), ($event.target as HTMLInputElement).value)" />
              <input :value="formatInputValue(value)" placeholder="例如 $query_1.order_no" @input="setComposeField(String(key), ($event.target as HTMLInputElement).value)" />
              <button type="button" class="text-button danger compact" @click="removeComposeField(String(key))">删除</button>
            </div>
            <details class="compose-json-preview">
              <summary>JSON 预览</summary>
              <pre>{{ JSON.stringify(selectedNode.data.inputs.value, null, 2) }}</pre>
            </details>
          </div>

          <div v-else class="node-io-editor">
            <div class="node-io-head">
              <strong>输入</strong>
              <span>变量名</span>
              <span>绑定值</span>
            </div>
            <div v-if="!selectedDef.inputs.length" class="node-io-empty">该节点无输入</div>
            <label v-for="input in selectedDef.inputs" :key="input.name" class="node-io-row">
              <span>{{ input.label || input.name }}</span>
              <code>{{ input.name }}</code>
              <textarea
                v-if="input.type === 'object' || input.type === 'array'"
                :value="formatInputValue(selectedNode.data.inputs[input.name])"
                rows="5"
                spellcheck="false"
                :placeholder="input.type === 'array' ? '[]' : '{}'"
                @input="setNodeInput(selectedNode, input.name, ($event.target as HTMLTextAreaElement).value, input.type)"
              ></textarea>
              <input
                v-else
                :value="formatInputValue(selectedNode.data.inputs[input.name])"
                :placeholder="`例如 $inputs.${workflowInputs[0]?.name || 'input'}`"
                @input="setNodeInput(selectedNode, input.name, ($event.target as HTMLInputElement).value, input.type)"
              />
            </label>
          </div>
          <div class="node-io-editor">
            <div class="node-io-head">
              <strong>输出</strong>
              <span>变量名</span>
              <span>类型</span>
            </div>
            <div v-if="!selectedDef.outputs.length" class="node-io-empty">该节点无输出</div>
            <div v-for="output in selectedDef.outputs" :key="output.name" class="node-io-row readonly">
              <span>{{ output.label || output.name }}</span>
              <code>{{ output.name }}</code>
              <span>{{ output.type }}</span>
            </div>
          </div>
        </section>

        <details class="manual-yaml-panel">
          <summary>YAML 预览</summary>
          <pre>{{ yaml }}</pre>
        </details>
      </aside>
    </section>
  </div>
</template>
