<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NodeChip from '../components/NodeChip.vue'
import { generateWorkflow, getWorkflow, listNodes } from '../lib/api'
import { setWorkflowDraft } from '../lib/draft-store'
import { navigate, useRoute } from '../lib/router'
import type { NodeDefinition } from '../lib/types'

const route = useRoute()

const prompt = ref('')
const isGenerating = ref(false)
const streamedYaml = ref('')
const errorMsg = ref('')
const availableNodes = ref<NodeDefinition[]>([])
const contextId = ref<string>('')
const contextYaml = ref<string>('')
const contextName = ref<string>('')

async function loadNodes() {
  try {
    availableNodes.value = await listNodes()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

async function loadContext() {
  const id = route.value.query.contextId
  if (!id) return
  try {
    const data = await getWorkflow(id)
    contextId.value = data.meta.id
    contextYaml.value = data.yaml
    contextName.value = data.meta.name
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

onMounted(async () => {
  await Promise.all([loadNodes(), loadContext()])
})

async function submit() {
  const text = prompt.value.trim()
  if (!text || isGenerating.value) return
  isGenerating.value = true
  errorMsg.value = ''
  streamedYaml.value = ''
  try {
    const yaml = await generateWorkflow({
      prompt: text,
      contextYaml: contextYaml.value || undefined,
      onToken: (token) => {
        streamedYaml.value += token
      },
    })
    setWorkflowDraft({
      yaml,
      prompt: text,
      contextId: contextId.value || undefined,
      contextYaml: contextYaml.value || undefined,
      isModify: Boolean(contextId.value),
    })
    navigate('/workflows/preview')
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    isGenerating.value = false
  }
}

function openNodeMarket() {
  navigate('/nodes')
}
</script>

<template>
  <div class="page new-workflow-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ contextId ? 'Modify Workflow' : 'New Workflow' }}</p>
        <h1>{{ contextId ? `修改：${contextName}` : '告诉我你想做什么，我来帮你搭工作流' }}</h1>
        <p v-if="contextId" class="page-sub">在原工作流基础上输入增量指令（如："把收件人改成 XXX"）。</p>
      </div>
      <div class="header-actions">
        <button v-if="!contextId" type="button" class="text-button" @click="navigate('/workflows/manual')">手动搭建</button>
        <button type="button" class="text-button" @click="navigate('/workflows')">← 返回列表</button>
      </div>
    </header>

    <section class="prompt-card">
      <label class="prompt-label" for="prompt">你的需求</label>
      <textarea
        id="prompt"
        v-model="prompt"
        rows="5"
        placeholder="Describe the workflow to create: inputs, node steps, conditions, and expected outputs."
        :disabled="isGenerating"
      ></textarea>

      <div class="prompt-actions">
        <button type="button" class="primary-button" :disabled="!prompt.trim() || isGenerating" @click="submit">
          {{ isGenerating ? '生成中...' : '生成工作流 ✨' }}
        </button>
        <span v-if="errorMsg" class="alert error inline">{{ errorMsg }}</span>
      </div>
    </section>

    <section v-if="streamedYaml || isGenerating" class="stream-card">
      <div class="section-heading">
        <h2>{{ isGenerating ? '生成中（流式输出）...' : '生成完成' }}</h2>
        <span v-if="isGenerating" class="status-running">●</span>
      </div>
      <pre class="yaml-stream">{{ streamedYaml || '等待 LLM 响应...' }}</pre>
    </section>

    <section class="node-bar">
      <div class="section-heading">
        <h2>💡 当前可用节点（共 {{ availableNodes.length }} 个）</h2>
        <button type="button" class="text-button" @click="openNodeMarket">查看完整节点市场 →</button>
      </div>
      <div class="node-chip-row">
        <NodeChip v-for="node in availableNodes" :key="node.type" :node="node" />
      </div>
    </section>
  </div>
</template>
