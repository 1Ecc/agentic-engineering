<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteWorkflow, listWorkflows } from '../lib/api'
import { navigate } from '../lib/router'
import type { WorkflowMeta } from '../lib/types'

const workflows = ref<WorkflowMeta[]>([])
const loading = ref(false)
const errorMsg = ref('')

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    workflows.value = await listWorkflows()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openNew() {
  navigate('/workflows/new')
}

function openManual() {
  navigate('/workflows/manual')
}

function openDetail(meta: WorkflowMeta) {
  navigate(`/workflows/${meta.id}`)
}

function openEdit(meta: WorkflowMeta) {
  navigate('/workflows/manual', { contextId: meta.id })
}

async function removeWorkflow(meta: WorkflowMeta) {
  if (!confirm(`确认删除「${meta.name}」？`)) return
  try {
    await deleteWorkflow(meta.id)
    await load()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : String(error)
  }
}

function badgeText(meta: WorkflowMeta): string {
  return '可执行'
}
</script>

<template>
  <div class="page workflow-list-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">My Workflows</p>
        <h1>我的工作流</h1>
        <p class="page-sub">已保存的工作流，支持运行、编辑和删除。</p>
      </div>
      <div class="header-actions">
        <button type="button" class="text-button" @click="openManual">手动搭建</button>
        <button type="button" class="primary-button" @click="openNew">+ AI 生成工作流</button>
      </div>
    </header>

    <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>

    <div v-if="loading" class="empty-state large">
      <strong>加载中...</strong>
    </div>

    <div v-else-if="!workflows.length" class="empty-state large">
      <strong>还没有工作流</strong>
      <span>点击右上角"新建工作流"开始</span>
    </div>

    <div v-else class="card-grid">
      <article
        v-for="meta in workflows"
        :key="meta.id"
        class="workflow-card"
      >
        <header>
          <h3>📌 {{ meta.name }}</h3>
          <span class="badge">{{ badgeText(meta) }}</span>
        </header>
        <p>{{ meta.description || '—' }}</p>
        <footer>
          <small>
            {{ meta.run_count ? `跑过 ${meta.run_count} 次` : '未运行' }}
            <span v-if="meta.updated_at"> · {{ new Date(meta.updated_at).toLocaleString('zh-CN', { hour12: false }) }}</span>
          </small>
          <div class="card-actions">
            <button type="button" class="primary-button" @click="openDetail(meta)">打开</button>
            <button type="button" class="text-button" @click="openEdit(meta)">✎ 编辑</button>
            <button type="button" class="text-button danger" @click="removeWorkflow(meta)">
              删除
            </button>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>
