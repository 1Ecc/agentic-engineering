<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: Parameters<typeof getBezierPath>[0]['sourcePosition']
  targetPosition?: Parameters<typeof getBezierPath>[0]['targetPosition']
  markerEnd?: string
  style?: CSSProperties
  data?: {
    onDelete?: (id: string) => void
  }
}>()

const edgePath = computed(() => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })
  return { path, labelX, labelY }
})

function removeEdge() {
  props.data?.onDelete?.(props.id)
}
</script>

<template>
  <BaseEdge :id="id" :path="edgePath.path" :marker-end="markerEnd" :style="style" />
  <EdgeLabelRenderer>
    <button
      type="button"
      class="edge-delete-button"
      :style="{ transform: `translate(-50%, -50%) translate(${edgePath.labelX}px, ${edgePath.labelY}px)` }"
      @click.stop="removeEdge"
    >
      ×
    </button>
  </EdgeLabelRenderer>
</template>
