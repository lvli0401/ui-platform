<script setup lang="ts">
import type { UINode } from '@vui/core'
import { selectNode, selectionRef } from '../editor/editor-instance'

defineProps<{
  nodes: UINode[]
  depth?: number
}>()

function nodeLabel(node: UINode): string {
  if (node.type === 'text') {
    return `“${String(node.props?.text ?? '')}”`
  }
  if (node.type === 'component') {
    return node.component ?? 'Component'
  }
  if (node.type === 'element') {
    return `<${node.tag ?? '?'}>`
  }
  return 'fragment'
}

function isSelected(nodeId: string): boolean {
  return selectionRef.value.selectedNodeIds.includes(nodeId)
}
</script>

<template>
  <div class="layer-tree">
    <template v-for="node in nodes" :key="node.id">
      <button
        type="button"
        class="layer-row"
        :class="{ 'is-selected': isSelected(node.id) }"
        :data-testid="`layer-${node.id}`"
        :data-selected="isSelected(node.id) ? 'true' : 'false'"
        :style="{ paddingLeft: `${10 + (depth ?? 0) * 14}px` }"
        @click.stop="selectNode(node.id)"
      >
        <span class="layer-label">{{ nodeLabel(node) }}</span>
        <span class="layer-id">{{ node.id }}</span>
      </button>
      <LayerTree
        v-if="node.children && node.children.length > 0"
        :nodes="node.children"
        :depth="(depth ?? 0) + 1"
      />
    </template>
  </div>
</template>

<style scoped>
.layer-tree {
  display: flex;
  flex-direction: column;
}

.layer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #cbd5e1;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.layer-row:hover {
  background: #1e293b;
}

.layer-row.is-selected {
  background: #1d4ed8;
  color: #ffffff;
}

.layer-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-id {
  flex-shrink: 0;
  color: #64748b;
  font-family: ui-monospace, monospace;
  font-size: 10px;
}

.layer-row.is-selected .layer-id {
  color: #bfdbfe;
}
</style>
