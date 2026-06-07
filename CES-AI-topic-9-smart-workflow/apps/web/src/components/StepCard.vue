<script setup lang="ts">
export type StepStatus = 'idle' | 'running' | 'success' | 'warning' | 'error'

defineProps<{
  system: string
  name: string
  description?: string
  status: StepStatus
  progress: number
  detail?: string
}>()
</script>

<template>
  <article class="step-card" :class="status">
    <div class="step-header">
      <div>
        <span class="system-tag">{{ system }}</span>
        <h3>{{ name }}</h3>
      </div>
      <span class="step-dot"></span>
    </div>
    <p>{{ description || '—' }}</p>
    <div class="step-progress">
      <i :style="{ width: `${progress}%` }"></i>
    </div>
    <footer>
      <span>{{ detail || '等待调度' }}</span>
      <b>{{ progress }}%</b>
    </footer>
  </article>
</template>
