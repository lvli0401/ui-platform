<script setup lang="ts">
import { ref } from 'vue'
import type { UINode } from '@vui/core'
import { selectNode, selectionRef } from '../editor/editor-instance'
import Icon from './ui/Icon.vue'

defineProps<{
  nodes: UINode[]
  depth?: number
}>()

const collapsed = ref<Set<string>>(new Set())

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

function nodeGlyph(node: UINode): string {
  if (node.type === 'component') return '◈'
  if (node.type === 'text') return 'T'
  if (node.type === 'fragment') return '◇'
  return '▢'
}

function isSelected(nodeId: string): boolean {
  return selectionRef.value.selectedNodeIds.includes(nodeId)
}

function hasChildren(node: UINode): boolean {
  return (node.children?.length ?? 0) > 0
}

function isCollapsed(nodeId: string): boolean {
  return collapsed.value.has(nodeId)
}

function toggle(nodeId: string): void {
  const next = new Set(collapsed.value)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  collapsed.value = next
}
</script>

<template>
  <div class="layer-tree">
    <template v-for="node in nodes" :key="node.id">
      <div
        class="layer-row"
        :class="{ 'is-selected': isSelected(node.id) }"
        :data-testid="`layer-${node.id}`"
        :data-selected="isSelected(node.id) ? 'true' : 'false'"
        :style="{ paddingLeft: `${6 + (depth ?? 0) * 12}px` }"
        @click.stop="selectNode(node.id)"
      >
        <button
          v-if="hasChildren(node)"
          type="button"
          class="layer-arrow"
          :aria-label="isCollapsed(node.id) ? '展开图层' : '折叠图层'"
          @click.stop="toggle(node.id)"
        >
          <Icon
            :name="isCollapsed(node.id) ? 'chevron-right' : 'chevron-down'"
            :size="12"
          />
        </button>
        <span v-else class="layer-arrow layer-arrow--empty"></span>

        <span class="layer-glyph">{{ nodeGlyph(node) }}</span>
        <span class="layer-label">{{ nodeLabel(node) }}</span>
        <span class="layer-id">{{ node.id }}</span>
      </div>

      <LayerTree
        v-if="hasChildren(node) && !isCollapsed(node.id)"
        :nodes="node.children ?? []"
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
  gap: 5px;
  width: 100%;
  height: 24px;
  padding-right: 8px;
  border-radius: var(--radius-sm);
  color: var(--color-muted);
  font-size: var(--text-2xs);
  text-align: left;
  cursor: pointer;
  user-select: none;
}

.layer-row:hover {
  background: var(--color-hover);
  color: var(--color-surface);
}

.layer-row.is-selected {
  background: var(--color-panel-selected);
  color: var(--color-on-accent);
}

.layer-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-faint);
}

.layer-arrow--empty {
  cursor: default;
}

.layer-row.is-selected .layer-arrow {
  color: rgb(255 255 255 / 75%);
}

.layer-glyph {
  width: 12px;
  flex-shrink: 0;
  color: var(--color-faint);
  font-size: var(--text-4xs);
  text-align: center;
}

.layer-row.is-selected .layer-glyph {
  color: rgb(255 255 255 / 75%);
}

.layer-label {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-id {
  flex-shrink: 0;
  overflow: hidden;
  max-width: 72px;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: var(--text-4xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-row.is-selected .layer-id {
  color: rgb(255 255 255 / 65%);
}
</style>
