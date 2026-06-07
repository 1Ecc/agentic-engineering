<script setup lang="ts">
import { computed } from 'vue'
import NodeMarket from './pages/NodeMarket.vue'
import NodeRecord from './pages/NodeRecord.vue'
import SkillsHub from './pages/SkillsHub.vue'
import ManualWorkflow from './pages/ManualWorkflow.vue'
import NewWorkflow from './pages/NewWorkflow.vue'
import WorkflowList from './pages/WorkflowList.vue'
import WorkflowPreview from './pages/WorkflowPreview.vue'
import WorkflowRun from './pages/WorkflowRun.vue'
import { matchRoute, navigate, useRoute } from './lib/router'

const route = useRoute()

const navItems = [
  { id: 'workflows', label: '💾 我的流程', path: '/workflows', activePrefix: '/workflows' },
  { id: 'nodes', label: '🧩 节点配置', path: '/nodes', activePrefix: '/nodes', exact: false },
  { id: 'skills', label: '🧠 Skills Hub', path: '/skills', activePrefix: '/skills' },
  { id: 'new', label: '+ 新建工作流', path: '/workflows/new', activePrefix: '/workflows/new' },
]

const activeNav = computed(() => {
  const path = route.value.path
  if (path.startsWith('/skills')) return 'skills'
  if (path.startsWith('/nodes')) return 'nodes'
  if (path === '/workflows/new') return 'new'
  if (path.startsWith('/workflows')) return 'workflows'
  return 'workflows'
})

const currentView = computed(() => {
  const path = route.value.path
  if (path === '/' || path === '/workflows') return { component: WorkflowList, params: {} }
  if (path === '/workflows/new') return { component: NewWorkflow, params: {} }
  if (path === '/workflows/manual') return { component: ManualWorkflow, params: {} }
  if (path === '/workflows/preview') return { component: WorkflowPreview, params: {} }
  if (path === '/nodes') return { component: NodeMarket, params: {} }
  if (path === '/nodes/new') return { component: NodeRecord, params: {} }
  if (path === '/nodes/record') return { component: NodeRecord, params: {} }
  if (path === '/skills') return { component: SkillsHub, params: {} }
  const detailMatch = matchRoute(path, '/workflows/:id')
  if (detailMatch) return { component: WorkflowRun, params: detailMatch }
  const runMatch = matchRoute(path, '/workflows/:id/run')
  if (runMatch) return { component: WorkflowRun, params: runMatch }
  return { component: WorkflowList, params: {} }
})

function go(path: string) {
  navigate(path)
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
            <circle cx="9" cy="16" r="4.2" fill="currentColor" />
            <circle cx="23" cy="16" r="4.2" fill="currentColor" />
          </svg>
        </div>
        <div>
          <strong>连连看</strong>
          <span>AI 驱动的企业 SOP 自动化平台</span>
        </div>
      </div>

      <nav class="sop-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="sop-item"
          :class="{ active: activeNav === item.id }"
          @click="go(item.path)"
        >
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <small>verlenoren@lenovo.com</small>
      </div>
    </aside>

    <main class="workspace">
      <component :is="currentView.component" />
    </main>
  </div>
</template>
