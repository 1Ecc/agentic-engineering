<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AuthBar from '../components/AuthBar.vue'
import { ApiError, authStart, deleteNode, generateNodeFromCurl, invokeNode, listNodes, updateNode, updateNodeVisibility } from '../lib/api'
import { navigate } from '../lib/router'
import type { NodeDefinition } from '../lib/types'

const nodes = ref<NodeDefinition[]>([])
const loading = ref(false)
const errorMsg = ref('')
const inspecting = ref<NodeDefinition | null>(null)
const trialResult = ref<string>('')
const trialBusy = ref(false)
const trialInputs = reactive<Record<string, string>>({})
const trialAuthRequired = ref(false)
const trialAuthMessage = ref('')
const selectedPlatformKey = ref('')
const syncBusyType = ref('')
const editingNode = ref<NodeDefinition | null>(null)
const editJson = ref('')
const editCurl = ref('')
const editDescription = ref('')
const editBusy = ref(false)
const createDialogOpen = ref(false)

const PLATFORM_THEMES: Record<string, { hue: string; emoji: string }> = {
  serviceforce: { hue: '#1f6feb', emoji: '☁️' },
  jiuqiu: { hue: '#6f4cf0', emoji: '🪐' },
  spos: { hue: '#18a058', emoji: '🧾' },
  lenovo_stock: { hue: '#dd8d00', emoji: '📦' },
  other: { hue: '#475569', emoji: '🧩' },
}

function platformTheme(key: string) {
  return PLATFORM_THEMES[key] ?? PLATFORM_THEMES.other
}

function categoryAccent(category: NodeDefinition['category']): string {
  if (category === 'builtin') return '#1f6feb'
  if (category === 'connector') return '#18a058'
  if (category === 'recorded') return '#6f4cf0'
  return '#475569'
}

function nodeIconChar(node: NodeDefinition): string {
  if (node.icon) return node.icon
  const platformKey = node.platform || node.type.split('.')[0]
  if (platformKey && PLATFORM_THEMES[platformKey]) return PLATFORM_THEMES[platformKey].emoji
  if (node.category === 'builtin') return '⚙️'
  if (node.category === 'recorded') return '🎬'
  return '🧩'
}

const groups = computed(() => ({
  builtin: nodes.value.filter((n) => n.category === 'builtin'),
  connector: nodes.value.filter((n) => n.category === 'connector'),
  recorded: nodes.value.filter((n) => n.category === 'recorded'),
}))

const marketPlatforms = computed(() => {
  const map = new Map<string, { key: string; label: string; nodes: NodeDefinition[] }>()
  for (const node of syncedRecorded.value) {
    const key = node.platform || node.type.split('.')[0] || 'other'
    const label = node.platform_label || platformLabel(key)
    const group = map.get(key) ?? { key, label, nodes: [] }
    group.nodes.push(node)
    map.set(key, group)
  }
  return [...map.values()]
})

const syncedRecorded = computed(() => groups.value.recorded.filter(isSyncedToMarket))
const platformStats = computed(() => ({
  platforms: marketPlatforms.value.length,
  nodes: syncedRecorded.value.length,
  interfaces: syncedRecorded.value.reduce((total, node) => total + interfaceCount(node), 0),
}))
const selectedPlatform = computed(() => marketPlatforms.value.find((platform) => platform.key === selectedPlatformKey.value) ?? null)

function platformLabel(key: string): string {
  const labels: Record<string, string> = {
    serviceforce: 'ServiceForce',
    jiuqiu: 'Jiuqiu',
    spos: 'SPOS',
    lenovo_stock: 'Stock',
  }
  return labels[key] ?? key
}

function isSyncedToMarket(node: NodeDefinition): boolean {
  return node.metadata?.visibility !== 'private'
}

function nodeSourceLabel(node: NodeDefinition): string {
  if (node.metadata?.source_type === 'manual') return '手动导入'
  return node.metadata?.source_recording_id ? '录制' : '手动导入'
}

function visibilityLabel(node: NodeDefinition): string {
  return isSyncedToMarket(node) ? '公开' : '私有'
}

function trialStatusLabel(node: NodeDefinition): string {
  const status = node.metadata?.last_trial_status ?? 'untested'
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  return '未调试'
}

function referenceCount(node: NodeDefinition): number {
  return node.metadata?.reference_count ?? 0
}

function interfaceCount(node: NodeDefinition): number {
  const spec = node.handler.spec
  if (!spec) return 0
  if ('steps' in spec && Array.isArray(spec.steps)) return spec.steps.length
  return 1
}

function platformInterfaceCount(platform: { nodes: NodeDefinition[] }): number {
  return platform.nodes.reduce((total, node) => total + interfaceCount(node), 0)
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    nodes.value = await listNodes()
    if (selectedPlatformKey.value && !marketPlatforms.value.some((platform) => platform.key === selectedPlatformKey.value)) {
      selectedPlatformKey.value = ''
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function inspect(node: NodeDefinition) {
  inspecting.value = node
  selectedPlatformKey.value = ''
  trialResult.value = ''
  trialAuthRequired.value = false
  trialAuthMessage.value = ''
  resetTrialInputs(node)
}

function openPlatform(key: string) {
  selectedPlatformKey.value = key
  inspecting.value = null
}

function closeDrawer() {
  inspecting.value = null
  selectedPlatformKey.value = ''
  editingNode.value = null
}

function resetTrialInputs(node: NodeDefinition) {
  for (const key of Object.keys(trialInputs)) delete trialInputs[key]
  for (const input of node.inputs) {
    trialInputs[input.name] = ''
  }
}

function buildTrialInputs(node: NodeDefinition): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}
  for (const input of node.inputs) {
    const value = String(trialInputs[input.name] ?? '')
    if (input.required && !value.trim()) {
      throw new Error(`请填写${input.label ?? input.name}`)
    }
    if (input.type === 'number') {
      inputs[input.name] = Number(value)
    } else if (input.type === 'boolean') {
      inputs[input.name] = value === 'true'
    } else if (input.type === 'object' || input.type === 'array') {
      inputs[input.name] = value.trim() ? JSON.parse(value) : input.type === 'array' ? [] : {}
    } else {
      inputs[input.name] = value
    }
  }
  return inputs
}

async function trial(node: NodeDefinition) {
  trialBusy.value = true
  trialResult.value = ''
  trialAuthRequired.value = false
  trialAuthMessage.value = ''
  try {
    const result = await invokeNode(node.type, buildTrialInputs(node))
    trialResult.value = JSON.stringify(result, null, 2)
  } catch (error) {
    if (error instanceof ApiError && error.code === 'AUTH_REQUIRED') {
      trialAuthRequired.value = true
      try {
        const auth = await authStart()
        trialAuthMessage.value = `${auth.message} 登录完成后请保存登录态，再重新试运行。`
      } catch (authError) {
        trialAuthMessage.value = authError instanceof Error ? authError.message : String(authError)
      }
    }
    trialResult.value = error instanceof Error ? error.message : String(error)
  } finally {
    trialBusy.value = false
  }
}

async function removeNode(node: NodeDefinition) {
  if (node.category !== 'recorded') {
    errorMsg.value = '只能删除录制节点'
    return
  }
  if (referenceCount(node) > 0) {
    errorMsg.value = `该节点已被 ${referenceCount(node)} 个工作流引用，请先解除引用后再删除`
    return
  }
  if (!confirm(`确认删除节点「${node.name}」？`)) return
  try {
    await deleteNode(node.type)
    if (inspecting.value?.type === node.type) inspecting.value = null
    await load()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

async function toggleMarketSync(node: NodeDefinition) {
  if (node.category !== 'recorded') return
  syncBusyType.value = node.type
  errorMsg.value = ''
  try {
    const visibility = isSyncedToMarket(node) ? 'private' : 'public'
    const updated = await updateNodeVisibility(node.type, visibility)
    nodes.value = nodes.value.map((item) => (item.type === updated.type ? updated : item))
    if (selectedPlatformKey.value && !marketPlatforms.value.some((platform) => platform.key === selectedPlatformKey.value)) {
      selectedPlatformKey.value = ''
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    syncBusyType.value = ''
  }
}

function useInWorkflow(node: NodeDefinition) {
  navigate('/workflows/new', { hint: node.type })
}

function openCreateDialog() {
  createDialogOpen.value = true
}

function closeCreateDialog() {
  createDialogOpen.value = false
}

function chooseCreateMode(mode: 'curl' | 'record') {
  createDialogOpen.value = false
  navigate('/nodes/new', { mode })
}

function startEdit(node: NodeDefinition) {
  inspecting.value = node
  selectedPlatformKey.value = ''
  editingNode.value = node
  editJson.value = JSON.stringify(node, null, 2)
  editCurl.value = ''
  editDescription.value = node.description ?? ''
}

function parseEditNode(): NodeDefinition {
  const parsed = JSON.parse(editJson.value) as NodeDefinition
  if (!editingNode.value) return parsed
  return {
    ...parsed,
    type: editingNode.value.type,
    category: 'recorded',
    metadata: {
      ...editingNode.value.metadata,
      ...parsed.metadata,
    },
  }
}

async function saveEdit() {
  if (!editingNode.value || editBusy.value) return
  editBusy.value = true
  errorMsg.value = ''
  try {
    const updated = await updateNode(editingNode.value.type, parseEditNode())
    nodes.value = nodes.value.map((node) => (node.type === updated.type ? updated : node))
    inspecting.value = updated
    editingNode.value = updated
    editJson.value = JSON.stringify(updated, null, 2)
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    editBusy.value = false
  }
}

async function regenerateEditWithAi() {
  if (!editingNode.value || editBusy.value) return
  editBusy.value = true
  errorMsg.value = ''
  try {
    const currentNode = parseEditNode()
    const generated = await generateNodeFromCurl({
      curl: editCurl.value,
      description: editDescription.value,
      name: currentNode.name,
      currentNode,
    })
    editJson.value = JSON.stringify(generated, null, 2)
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    editBusy.value = false
  }
}
</script>

<template>
  <div class="page node-market-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Node Configuration</p>
        <h1>节点配置</h1>
        <p class="page-sub">节点市场与我的节点并列管理；我的节点仍可同步到节点市场供工作流使用。</p>
      </div>
      <button type="button" class="primary-button" @click="openCreateDialog">新建节点</button>
    </header>

    <Teleport to="body">
      <div v-if="createDialogOpen" class="modal-backdrop" @click.self="closeCreateDialog">
        <section class="create-node-dialog">
          <header>
            <div>
              <h2>新建节点</h2>
              <p>选择创建方式</p>
            </div>
            <button type="button" class="text-button" @click="closeCreateDialog">×</button>
          </header>
          <div class="node-create-options modal-options">
            <button type="button" class="node-create-card" @click="chooseCreateMode('curl')">
              <strong>Curl + AI 辅助</strong>
              <span>粘贴 Postman/浏览器复制出的 curl，加一段接口说明，AI 自动生成节点 JSON。</span>
            </button>
            <button type="button" class="node-create-card" @click="chooseCreateMode('record')">
              <strong>浏览器录制</strong>
              <span>打开真实浏览器操作一次，由系统捕获请求并用 AI 提取节点规范。</span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>

    <div v-if="loading" class="empty-state large"><strong>加载中...</strong></div>

    <div class="market-layout">
      <div class="market-groups">
        <section class="market-group">
          <header class="market-group-head">
            <div>
              <h2>我的节点</h2>
              <p>用户自己录制或手动创建的节点，可选择是否同步到节点市场。</p>
            </div>
            <span class="market-count">{{ groups.recorded.length }}</span>
          </header>
          <div v-if="!groups.recorded.length" class="empty-state">
            <strong>还没有我的节点</strong>
            <span>点击右上角"新建节点"开始</span>
          </div>
          <div v-else class="node-grid">
            <article v-for="node in groups.recorded" :key="node.type" class="node-card recorded" :class="{ active: inspecting?.type === node.type }" @click="inspect(node)">
              <header>
                <span class="node-icon" :style="{ background: categoryAccent(node.category) + '22', color: categoryAccent(node.category) }">{{ nodeIconChar(node) }}</span>
                <div class="node-title">
                  <h3>{{ node.name }}</h3>
                  <small>{{ node.type }}</small>
                </div>
              </header>
              <p>{{ node.description || '-' }}</p>
              <div class="node-meta">
                <span>输入 {{ node.inputs.length }}</span>
                <span>输出 {{ node.outputs.length }}</span>
                <span>来源 {{ nodeSourceLabel(node) }}</span>
                <span>可见性 {{ visibilityLabel(node) }}</span>
                <span :class="`trial-${node.metadata?.last_trial_status ?? 'untested'}`">调试 {{ trialStatusLabel(node) }}</span>
                <span>引用 {{ referenceCount(node) }}</span>
                <span v-if="node.metadata?.created_by">@{{ node.metadata.created_by }}</span>
              </div>
              <footer class="node-foot">
                <button type="button" class="text-button compact" @click.stop="startEdit(node)">编辑</button>
                <button
                  type="button"
                  class="sync-pill"
                  :class="{ synced: isSyncedToMarket(node) }"
                  :disabled="syncBusyType === node.type"
                  @click.stop="toggleMarketSync(node)"
                >
                  <span class="dot"></span>
                  {{ isSyncedToMarket(node) ? '已同步到节点市场' : '同步到节点市场' }}
                </button>
              </footer>
            </article>
          </div>
        </section>

        <section class="market-group">
          <header class="market-group-head">
            <div>
              <h2>节点市场</h2>
              <p>{{ platformStats.platforms }} 个平台 · {{ platformStats.nodes }} 个节点 · {{ platformStats.interfaces }} 个接口</p>
            </div>
          </header>
          <div v-if="!marketPlatforms.length" class="empty-state">
            <strong>还没有同步到节点市场的节点</strong>
            <span>可在「我的节点」中选择节点同步</span>
          </div>
          <div v-else class="platform-list">
            <button
              v-for="platform in marketPlatforms"
              :key="platform.key"
              type="button"
              class="platform-card"
              :class="{ active: selectedPlatformKey === platform.key }"
              :style="{ '--platform-hue': platformTheme(platform.key).hue }"
              @click="openPlatform(platform.key)"
            >
              <span class="platform-logo" :style="{ background: platformTheme(platform.key).hue + '1a', color: platformTheme(platform.key).hue }">
                {{ platformTheme(platform.key).emoji }}
              </span>
              <div class="platform-body">
                <strong>{{ platform.label }}</strong>
                <span>{{ platform.nodes.length }} 个节点 · {{ platformInterfaceCount(platform) }} 个接口</span>
              </div>
              <span class="platform-cta">查看节点 →</span>
            </button>
          </div>
        </section>

        <section class="market-group">
          <header class="market-group-head">
            <div>
              <h2>内置通用能力</h2>
              <p>开箱即用的基础能力节点</p>
            </div>
            <span class="market-count">{{ groups.builtin.length }}</span>
          </header>
          <div class="node-grid">
            <article v-for="node in groups.builtin" :key="node.type" class="node-card" :class="{ active: inspecting?.type === node.type }" @click="inspect(node)">
              <header>
                <span class="node-icon" :style="{ background: categoryAccent(node.category) + '22', color: categoryAccent(node.category) }">{{ nodeIconChar(node) }}</span>
                <div class="node-title">
                  <h3>{{ node.name }}</h3>
                  <small>{{ node.type }}</small>
                </div>
              </header>
              <p>{{ node.description || '-' }}</p>
            </article>
          </div>
        </section>
      </div>

      <aside v-if="selectedPlatform && !inspecting" class="node-detail platform-drawer">
        <header>
          <h2>
            <span class="drawer-logo" :style="{ background: platformTheme(selectedPlatform.key).hue + '1a', color: platformTheme(selectedPlatform.key).hue }">
              {{ platformTheme(selectedPlatform.key).emoji }}
            </span>
            {{ selectedPlatform.label }}
          </h2>
          <button type="button" class="text-button" @click="closeDrawer">×</button>
        </header>
        <p class="drawer-sub">{{ selectedPlatform.nodes.length }} 个节点 · {{ platformInterfaceCount(selectedPlatform) }} 个接口</p>
        <div class="drawer-nodes">
          <article v-for="node in selectedPlatform.nodes" :key="node.type" class="drawer-node" @click="inspect(node)">
            <header>
              <span class="node-icon small" :style="{ background: categoryAccent(node.category) + '22', color: categoryAccent(node.category) }">{{ nodeIconChar(node) }}</span>
              <div>
                <strong>{{ node.name }}</strong>
                <small>{{ interfaceCount(node) }} 个接口 · {{ node.type }}</small>
              </div>
            </header>
            <p v-if="node.description">{{ node.description }}</p>
          </article>
        </div>
      </aside>

      <aside v-else-if="inspecting" class="node-detail">
        <header>
          <h2>
            <span class="drawer-logo" :style="{ background: categoryAccent(inspecting.category) + '22', color: categoryAccent(inspecting.category) }">{{ nodeIconChar(inspecting) }}</span>
            {{ inspecting.name }}
          </h2>
          <button type="button" class="text-button" @click="closeDrawer">×</button>
        </header>
        <p>{{ inspecting.description }}</p>
        <div class="detail-block">
          <b>类型：</b><code>{{ inspecting.type }}</code>
        </div>
        <div class="detail-block">
          <b>分类：</b>{{ inspecting.category }}
        </div>
        <div class="detail-block">
          <b>Handler：</b><code>{{ inspecting.handler.kind }}</code>
        </div>
        <div class="detail-block">
          <b>输入</b>
          <ul>
            <li v-for="input in inspecting.inputs" :key="input.name">
              <code>{{ input.name }}</code> · {{ input.type }}{{ input.required ? ' · 必填' : '' }}
              <span v-if="input.label"> - {{ input.label }}</span>
            </li>
          </ul>
        </div>
        <div class="detail-block">
          <b>输出</b>
          <ul>
            <li v-for="out in inspecting.outputs" :key="out.name">
              <code>{{ out.name }}</code> · {{ out.type }}
              <span v-if="out.label"> - {{ out.label }}</span>
            </li>
          </ul>
        </div>
        <div v-if="inspecting.handler.spec" class="detail-block">
          <b>HTTP Spec</b>
          <pre>{{ JSON.stringify(inspecting.handler.spec, null, 2) }}</pre>
        </div>
        <div class="detail-block">
          <b>试运行输入</b>
          <div v-if="inspecting.inputs.length" class="node-trial-inputs">
            <label v-for="input in inspecting.inputs" :key="input.name" class="generic-input">
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
          <p v-else class="detail-muted">该节点不需要输入。</p>
        </div>
        <div class="detail-actions">
          <button type="button" class="text-button" :disabled="trialBusy" @click="trial(inspecting)">
            {{ trialBusy ? '试运行中...' : '试运行' }}
          </button>
          <button type="button" class="text-button" @click="useInWorkflow(inspecting)">在新流程中使用</button>
          <button v-if="inspecting.category === 'recorded'" type="button" class="text-button" @click="startEdit(inspecting)">编辑</button>
          <button v-if="inspecting.category === 'recorded'" type="button" class="text-button danger" @click="removeNode(inspecting)">删除</button>
        </div>
        <div v-if="editingNode?.type === inspecting.type" class="node-edit-panel">
          <div class="section-heading compact">
            <h3>编辑节点</h3>
            <button type="button" class="text-button" :disabled="editBusy" @click="saveEdit">
              {{ editBusy ? '处理中...' : '保存' }}
            </button>
          </div>
          <label class="generic-input">
            AI 修改描述
            <textarea v-model="editDescription" rows="3" placeholder="描述你希望这个节点如何修改，例如：把输出字段改成订单号、状态和明细"></textarea>
          </label>
          <label class="generic-input">
            curl 命令
            <textarea v-model="editCurl" rows="5" spellcheck="false" placeholder="可选。粘贴新的 curl 可同步调整接口；不填则基于当前节点和描述重生成，type 会保持不变"></textarea>
          </label>
          <button type="button" class="text-button" :disabled="editBusy" @click="regenerateEditWithAi">AI 按描述重生成</button>
          <label class="generic-input">
            节点 JSON
            <textarea v-model="editJson" rows="14" spellcheck="false"></textarea>
          </label>
        </div>
        <div v-if="trialAuthRequired" class="trial-auth-panel">
          <p v-if="trialAuthMessage" class="auth-message">{{ trialAuthMessage }}</p>
          <AuthBar :disabled="trialBusy" />
        </div>
        <div v-if="trialResult" class="detail-block">
          <b>试运行结果</b>
          <pre>{{ trialResult }}</pre>
        </div>
      </aside>
    </div>
  </div>
</template>
