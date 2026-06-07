<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import AuthBar from '../components/AuthBar.vue'
import {
  ApiError,
  authStart,
  finishRecording,
  generateNodeFromCurl,
  getRecordingStatus,
  invokeDraftNode,
  registerNode,
  startRecording,
} from '../lib/api'
import { navigate, useRoute } from '../lib/router'
import type { NodeDefinition, RecordingSession } from '../lib/types'

type CreateMode = '' | 'record' | 'curl'
type Step = 1 | 2 | 3

const mode = ref<CreateMode>('')
const step = ref<Step>(1)
const errorMsg = ref('')
const generating = ref(false)
const recordingBusy = ref(false)
const trialBusy = ref(false)
const registering = ref(false)

const form = reactive({ name: '', description: '', targetUrl: '' })
const curlForm = reactive({ name: '', description: '', curl: '' })
const session = ref<RecordingSession | null>(null)
const spec = ref<NodeDefinition | null>(null)
const specJson = ref('')
const trialInputs = reactive<Record<string, string>>({})
const trialResult = ref('')
const trialAuthRequired = ref(false)
const trialAuthMessage = ref('')
let statusTimer: number | undefined
const route = useRoute()

const modeTitle = computed(() => {
  if (mode.value === 'record') return '浏览器录制'
  if (mode.value === 'curl') return 'Curl + AI 辅助'
  return '新建节点'
})

function chooseMode(nextMode: CreateMode) {
  mode.value = nextMode
  errorMsg.value = ''
  trialResult.value = ''
  trialAuthRequired.value = false
  trialAuthMessage.value = ''
  spec.value = null
  specJson.value = ''
  resetTrialInputs()
  if (nextMode === 'record') step.value = 1
}

function stopPolling() {
  if (statusTimer) {
    window.clearInterval(statusTimer)
    statusTimer = undefined
  }
}

function startPolling() {
  stopPolling()
  statusTimer = window.setInterval(async () => {
    if (!session.value) return
    try {
      session.value = await getRecordingStatus(session.value.recording_id)
    } catch (error) {
      errorMsg.value = error instanceof Error ? error.message : String(error)
      stopPolling()
    }
  }, 3000)
}

function resetTrialInputs(node?: NodeDefinition) {
  for (const key of Object.keys(trialInputs)) delete trialInputs[key]
  for (const input of node?.inputs ?? []) trialInputs[input.name] = ''
}

function normalizeSpec(node: NodeDefinition): NodeDefinition {
  return {
    ...node,
    category: 'recorded',
    metadata: {
      ...node.metadata,
      source_type: node.metadata?.source_type ?? 'manual',
      visibility: node.metadata?.visibility ?? 'private',
      last_trial_status: node.metadata?.last_trial_status ?? 'untested',
    },
  }
}

function buildTrialInputs(node: NodeDefinition): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}
  for (const input of node.inputs) {
    const value = String(trialInputs[input.name] ?? '')
    if (input.required && !value.trim()) throw new Error(`请填写 ${input.label ?? input.name}`)
    if (input.type === 'number') inputs[input.name] = Number(value)
    else if (input.type === 'boolean') inputs[input.name] = value === 'true'
    else if (input.type === 'object' || input.type === 'array') inputs[input.name] = value.trim() ? JSON.parse(value) : input.type === 'array' ? [] : {}
    else inputs[input.name] = value
  }
  return inputs
}

function endpointSummary(node: NodeDefinition): string {
  const handlerSpec = node.handler.spec
  if (!handlerSpec) return ''
  if ('steps' in handlerSpec) {
    const firstStep = handlerSpec.steps[0]
    return firstStep ? `${handlerSpec.steps.length} steps · ${firstStep.method} ${firstStep.url_template}` : '0 steps'
  }
  return `${handlerSpec.method} ${handlerSpec.url_template}`
}

onUnmounted(stopPolling)

onMounted(() => {
  const modeFromQuery = route.value.query.mode
  if (modeFromQuery === 'curl' || modeFromQuery === 'record') chooseMode(modeFromQuery)
})

function next() {
  errorMsg.value = ''
  if (!form.name.trim() || !form.description.trim()) {
    errorMsg.value = '请填写名称和描述'
    return
  }
  step.value = 2
}

async function openBrowser() {
  if (recordingBusy.value) return
  recordingBusy.value = true
  errorMsg.value = ''
  session.value = null
  spec.value = null
  specJson.value = ''
  resetTrialInputs()
  trialResult.value = ''
  trialAuthRequired.value = false
  trialAuthMessage.value = ''
  stopPolling()
  try {
    session.value = await startRecording({ target_url: form.targetUrl.trim() || undefined })
    startPolling()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    recordingBusy.value = false
  }
}

async function finish() {
  if (recordingBusy.value || !session.value) return
  recordingBusy.value = true
  errorMsg.value = ''
  stopPolling()
  try {
    const node = normalizeSpec(await finishRecording({
      recording_id: session.value.recording_id,
      name: form.name,
      description: form.description,
    }))
    spec.value = node
    specJson.value = JSON.stringify(node, null, 2)
    resetTrialInputs(node)
    step.value = 3
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    recordingBusy.value = false
  }
}

async function generateFromCurl() {
  if (generating.value) return
  if (!curlForm.curl.trim()) {
    errorMsg.value = '请粘贴 curl 命令'
    return
  }
  generating.value = true
  errorMsg.value = ''
  try {
    const node = normalizeSpec(await generateNodeFromCurl({
      curl: curlForm.curl,
      name: curlForm.name,
      description: curlForm.description,
    }))
    spec.value = node
    specJson.value = JSON.stringify(node, null, 2)
    resetTrialInputs(node)
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    generating.value = false
  }
}

function loadSpecFromJson() {
  try {
    const node = normalizeSpec(JSON.parse(specJson.value) as NodeDefinition)
    spec.value = node
    specJson.value = JSON.stringify(node, null, 2)
    resetTrialInputs(node)
    errorMsg.value = ''
  } catch (error) {
    spec.value = null
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

async function trial() {
  if (!spec.value) return
  trialBusy.value = true
  trialResult.value = ''
  trialAuthRequired.value = false
  trialAuthMessage.value = ''
  try {
    const node = normalizeSpec(JSON.parse(specJson.value) as NodeDefinition)
    spec.value = node
    for (const input of node.inputs) {
      if (!(input.name in trialInputs)) trialInputs[input.name] = ''
    }
    const result = await invokeDraftNode(node, buildTrialInputs(node))
    trialResult.value = `✅ 试调用成功：${JSON.stringify(result, null, 2)}`
  } catch (error) {
    if (error instanceof ApiError && error.code === 'AUTH_REQUIRED') {
      trialAuthRequired.value = true
      try {
        const auth = await authStart()
        trialAuthMessage.value = `${auth.message} 登录完成后请保存登录态，再重新试调用。`
      } catch (authError) {
        trialAuthMessage.value = authError instanceof Error ? authError.message : String(authError)
      }
    }
    trialResult.value = `❌ ${error instanceof Error ? error.message : String(error)}`
  } finally {
    trialBusy.value = false
  }
}

async function register() {
  if (!spec.value || registering.value) return
  registering.value = true
  errorMsg.value = ''
  try {
    const node = normalizeSpec(JSON.parse(specJson.value) as NodeDefinition)
    await registerNode(node)
    navigate('/nodes')
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    registering.value = false
  }
}

function cancel() {
  navigate('/nodes')
}
</script>

<template>
  <div class="page node-record-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Node Builder</p>
        <h1>{{ modeTitle }}</h1>
        <p class="page-sub">支持浏览器录制、Curl + AI 辅助生成，生成后可试调和注册到我的节点。</p>
      </div>
      <button type="button" class="text-button" @click="mode ? chooseMode('') : cancel()">
        {{ mode ? '← 返回新建方式' : '← 返回节点配置' }}
      </button>
    </header>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>

    <section v-if="!mode" class="node-create-options">
      <button type="button" class="node-create-card" @click="chooseMode('curl')">
        <strong>Curl + AI 辅助</strong>
        <span>粘贴 Postman/浏览器复制出的 curl，加一段接口说明，AI 自动生成节点 JSON。</span>
      </button>
      <button type="button" class="node-create-card" @click="chooseMode('record')">
        <strong>浏览器录制</strong>
        <span>打开真实浏览器操作一次，由系统捕获请求并用 AI 提取节点规范。</span>
      </button>
    </section>

    <section v-else-if="mode === 'curl'" class="wizard-step">
      <h2>Curl + AI 辅助生成节点</h2>
      <label class="generic-input">
        节点名称
        <input v-model="curlForm.name" placeholder="例如：库存查询" />
      </label>
      <label class="generic-input">
        语言描述（可选）
        <input v-model="curlForm.description" placeholder="例如：根据 SKU 查询门店实时库存" />
      </label>
      <label class="generic-input">
        curl 命令
        <textarea v-model="curlForm.curl" rows="10" spellcheck="false" placeholder="curl 'https://example.com/api' -H 'content-type: application/json' --data-raw '{...}'"></textarea>
      </label>
      <div class="wizard-actions">
        <button type="button" class="primary-button" :disabled="generating" @click="generateFromCurl">
          {{ generating ? 'AI 生成中...' : 'AI 生成节点 JSON' }}
        </button>
      </div>
    </section>

    <template v-else-if="mode === 'record'">
      <ol class="wizard-progress">
        <li :class="{ active: step >= 1, done: step > 1 }">① 描述节点</li>
        <li :class="{ active: step >= 2, done: step > 2 }">② 浏览器录制</li>
        <li :class="{ active: step >= 3 }">③ 规范确认</li>
      </ol>

      <section v-if="step === 1" class="wizard-step">
        <h2>Step 1 · 描述这个节点要做什么</h2>
        <label class="generic-input">
          节点名称
          <input v-model="form.name" placeholder="例如：库存查询" />
        </label>
        <label class="generic-input">
          一句话描述
          <input v-model="form.description" placeholder="例如：根据 SKU 查询门店实时库存" />
        </label>
        <label class="generic-input">
          目标入口 URL（可选）
          <input v-model="form.targetUrl" placeholder="例如：https://serviceforce.lenovo.com.cn/#/home-page" />
        </label>
        <div class="wizard-actions">
          <button type="button" class="primary-button" @click="next">下一步 →</button>
        </div>
      </section>

      <section v-if="step === 2" class="wizard-step">
        <h2>Step 2 · 在浏览器里操作一次</h2>
        <p>系统会拉起带登录态的录制浏览器，请在窗口中执行一次目标操作。</p>
        <div class="record-state">
          <button type="button" class="primary-button" :disabled="recordingBusy" @click="openBrowser">
            {{ session ? '✅ 已启动浏览器' : '🌐 打开录制浏览器' }}
          </button>
          <span v-if="session">
            模式：<b>MCP 真实浏览器</b>
            · 状态：<b>{{ session.status ?? 'recording' }}</b>
            · 已捕获 {{ session.request_count }} 条请求
          </span>
          <span v-else>等待启动...</span>
        </div>
        <ul v-if="session?.recent_requests?.length" class="record-recent">
          <li v-for="request in session.recent_requests" :key="`${request.method}-${request.url}`">
            <code>{{ request.method }}</code>
            <span>{{ request.status ?? '-' }}</span>
            <span>{{ request.url }}</span>
          </li>
        </ul>
        <div class="wizard-actions">
          <button type="button" class="text-button" @click="step = 1">← 上一步</button>
          <button type="button" class="primary-button" :disabled="!session || recordingBusy" @click="finish">
            ✅ 完成录制
          </button>
        </div>
      </section>
    </template>

    <section v-if="spec" class="wizard-step">
      <h2>节点 JSON（可编辑）</h2>
      <div v-if="spec" class="spec-summary">
        <div><b>type:</b> <code>{{ spec.type }}</code></div>
        <div v-if="spec.handler.spec"><b>endpoint:</b> <code>{{ endpointSummary(spec) }}</code></div>
        <div><b>inputs:</b> {{ spec.inputs.map((i) => `${i.name}(${i.type})`).join(', ') }}</div>
        <div><b>outputs:</b> {{ spec.outputs.map((o) => `${o.name}(${o.type})`).join(', ') }}</div>
      </div>
      <label class="generic-input">
        NodeDefinition JSON
        <textarea v-model="specJson" rows="14" spellcheck="false" @blur="loadSpecFromJson"></textarea>
      </label>
      <div v-if="spec" class="trial-panel">
        <h3>试调用</h3>
        <label v-for="input in spec.inputs" :key="input.name" class="generic-input">
          {{ input.label ?? input.name }}
          <textarea
            v-if="input.type === 'object' || input.type === 'array'"
            v-model="trialInputs[input.name]"
            rows="4"
            spellcheck="false"
            :placeholder="input.description ?? input.name"
          ></textarea>
          <select v-else-if="input.type === 'boolean'" v-model="trialInputs[input.name]">
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
          <input
            v-else
            v-model="trialInputs[input.name]"
            :type="input.type === 'number' ? 'number' : 'text'"
            :placeholder="input.description ?? input.name"
          />
        </label>
      </div>
      <div v-if="trialAuthRequired" class="trial-auth-panel">
        <p v-if="trialAuthMessage" class="auth-message">{{ trialAuthMessage }}</p>
        <AuthBar :disabled="trialBusy" />
      </div>
      <p v-if="trialResult" class="alert info">{{ trialResult }}</p>
      <div class="wizard-actions">
        <button type="button" class="text-button" :disabled="trialBusy || !spec" @click="trial">
          {{ trialBusy ? '试调用中...' : '试调用' }}
        </button>
        <button type="button" class="text-button" @click="cancel">取消</button>
        <button type="button" class="primary-button" :disabled="registering || !spec" @click="register">
          {{ registering ? '注册中...' : '注册到我的节点' }}
        </button>
      </div>
    </section>
  </div>
</template>
