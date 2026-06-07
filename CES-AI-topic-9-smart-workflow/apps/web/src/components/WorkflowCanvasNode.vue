<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { FieldSchema, NodeCategory } from '../lib/types'

const props = defineProps<{
  id: string
  selected?: boolean
  data: {
    title: string
    workflowType: string
    description?: string
    category?: NodeCategory
    inputs: Record<string, unknown>
    inputPorts: FieldSchema[]
    outputPorts: FieldSchema[]
  }
}>()

function categoryLabel(category?: NodeCategory) {
  if (category === 'builtin') return '逻辑'
  if (category === 'connector') return '平台'
  if (category === 'recorded') return '我的'
  return '节点'
}

function portValue(name: string): string {
  const value = props.data.inputs[name]
  if (value == null || value === '') return '未配置'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}
</script>

<template>
  <div class="workflow-canvas-node-card" :class="[{ selected }, data.category]">
    <header class="canvas-node-head">
      <span class="node-type-icon">{{ data.category === 'builtin' ? '◇' : '⌘' }}</span>
      <div>
        <strong>{{ data.title }}</strong>
        <small>{{ categoryLabel(data.category) }} · {{ id }}</small>
      </div>
    </header>

    <p v-if="data.description" class="canvas-node-desc">{{ data.description }}</p>

    <section class="canvas-node-ports">
      <div class="port-column">
        <span class="port-title">输入</span>
        <div v-if="!data.inputPorts.length" class="port-empty">无输入</div>
        <div v-for="input in data.inputPorts" :key="input.name" class="port-row target-port">
          <Handle
            type="target"
            :id="input.name"
            :position="Position.Left"
            class="canvas-port-handle target"
          />
          <span class="port-name">{{ input.label || input.name }}</span>
          <code>{{ portValue(input.name) }}</code>
        </div>
      </div>

      <div class="port-column output-column">
        <span class="port-title">输出</span>
        <div v-if="!data.outputPorts.length" class="port-empty">无输出</div>
        <div v-for="output in data.outputPorts" :key="output.name" class="port-row source-port">
          <span class="port-name">{{ output.label || output.name }}</span>
          <code>{{ output.name }}</code>
        </div>
      </div>
    </section>
    <Handle
      type="source"
      id="output"
      :position="Position.Right"
      class="canvas-port-handle source node-output-handle"
    />
  </div>
</template>
