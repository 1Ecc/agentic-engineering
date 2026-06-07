<script setup lang="ts">
import type { NodeDefinition } from '../lib/types'

defineProps<{ node: NodeDefinition; clickable?: boolean }>()
defineEmits<{ (event: 'click', node: NodeDefinition): void }>()
</script>

<template>
  <button
    type="button"
    class="node-chip"
    :class="{ 'is-clickable': clickable }"
    @click="$emit('click', node)"
  >
    <span class="node-chip-icon">{{ node.icon || (node.category === 'recorded' ? '📹' : node.category === 'connector' ? '🏢' : '🧩') }}</span>
    <span class="node-chip-text">{{ node.name }}</span>
  </button>
</template>
