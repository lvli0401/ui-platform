<script setup lang="ts">
import { computed } from 'vue'
import {
  componentRegistry,
  deleteNode,
  documentRef,
  getDocumentIndex,
  insertNode,
  moveNode,
  revisionRef,
  selectNode,
  selectionRef,
} from '../editor/editor-instance'
import { findInsertionTargetId } from '../editor/insertion-target'
import IconButton from './ui/IconButton.vue'
import LayerTree from './LayerTree.vue'

const page = computed(() => documentRef.value.pages[0])
const rootNodes = computed(() => {
  const root = page.value?.root
  return root ? [root] : []
})

const palette = componentRegistry.list()

const selectedId = computed(() => {
  void revisionRef.value
  return selectionRef.value.selectedNodeIds[0] ?? null
})

const parentId = computed(() => {
  void revisionRef.value
  const id = selectedId.value
  if (!id) return null
  return getDocumentIndex().parentMap.get(id) ?? null
})

const grandParentId = computed(() => {
  void revisionRef.value
  const parent = parentId.value
  if (!parent) return null
  return getDocumentIndex().parentMap.get(parent) ?? null
})

const siblings = computed(() => {
  void revisionRef.value
  const parent = parentId.value
  if (!parent) return []
  return getDocumentIndex().childrenMap.get(parent) ?? []
})

const selectedIndex = computed(() => {
  const id = selectedId.value
  return id ? siblings.value.indexOf(id) : -1
})

const canDelete = computed(
  () => selectedId.value !== null && parentId.value !== null,
)
const canMoveUp = computed(() => selectedIndex.value > 0)
const canMoveDown = computed(
  () =>
    selectedIndex.value !== -1 &&
    selectedIndex.value < siblings.value.length - 1,
)
const canMoveOut = computed(
  () =>
    selectedId.value !== null &&
    parentId.value !== null &&
    grandParentId.value !== null,
)

function insertPaletteNode(componentName: string): void {
  const targetId = findInsertionTargetId()
  if (!targetId) return

  const node = componentRegistry.createNode(componentName)
  insertNode(targetId, node)
  selectNode(node.id)
}

function handleDelete(): void {
  const id = selectedId.value
  if (!id || !canDelete.value) return
  deleteNode(id)
}

function handleMoveUp(): void {
  const id = selectedId.value
  const parent = parentId.value
  if (!id || !parent || !canMoveUp.value) return
  moveNode(id, parent, selectedIndex.value - 1)
}

function handleMoveDown(): void {
  const id = selectedId.value
  const parent = parentId.value
  if (!id || !parent || !canMoveDown.value) return
  // MoveNodeCommand expects the index in the original sibling list: moving
  // down one slot means inserting after the next sibling's boundary.
  moveNode(id, parent, selectedIndex.value + 2)
}

function handleMoveOut(): void {
  const id = selectedId.value
  const grandParent = grandParentId.value
  if (!id || !grandParent || !canMoveOut.value) return
  const targetIndex =
    getDocumentIndex().childrenMap.get(grandParent)?.length ?? 0
  moveNode(id, grandParent, targetIndex)
}
</script>

<template>
  <aside class="layers-panel">
    <header class="panel-header">
      <span class="panel-title">图层</span>
      <span class="panel-meta">{{ page?.name ?? '无页面' }}</span>
    </header>

    <div class="layers-actions">
      <IconButton
        icon="arrow-up"
        label="上移一层"
        data-testid="move-up-button"
        :disabled="!canMoveUp"
        @click="handleMoveUp"
      />
      <IconButton
        icon="arrow-down"
        label="下移一层"
        data-testid="move-down-button"
        :disabled="!canMoveDown"
        @click="handleMoveDown"
      />
      <IconButton
        icon="arrow-out"
        label="移出当前容器"
        data-testid="move-out-button"
        :disabled="!canMoveOut"
        @click="handleMoveOut"
      />
      <span class="layers-actions-spacer"></span>
      <IconButton
        icon="trash"
        label="删除节点"
        data-testid="delete-button"
        :disabled="!canDelete"
        @click="handleDelete"
      />
    </div>

    <div class="layers-body">
      <LayerTree v-if="rootNodes.length > 0" :nodes="rootNodes" :depth="0" />
      <p v-else class="layers-empty">文档中没有页面。</p>
    </div>

    <footer class="palette">
      <p class="palette-title">插入到选中容器</p>
      <div class="palette-grid">
        <button
          v-for="definition in palette"
          :key="definition.name"
          type="button"
          class="palette-button"
          :data-testid="`palette-${definition.name}`"
          @click="insertPaletteNode(definition.name)"
        >
          {{ definition.editor?.label ?? definition.name }}
        </button>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
.layers-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-panel);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--panel-header-height);
  flex-shrink: 0;
  padding: 0 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-panel-secondary);
}

.panel-title {
  color: var(--color-surface);
  font-size: var(--text-2xs);
  font-weight: 600;
}

.panel-meta {
  overflow: hidden;
  color: var(--color-faint);
  font-size: var(--text-3xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layers-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--color-border);
}

.layers-actions-spacer {
  flex: 1;
}

.layers-body {
  flex: 1;
  min-height: 0;
  padding: 4px;
  overflow: auto;
}

.layers-empty {
  margin: 8px 10px;
  color: var(--color-faint);
  font-size: var(--text-2xs);
}

.palette {
  padding: 8px;
  border-top: 1px solid var(--color-border);
}

.palette-title {
  margin: 0 0 6px;
  color: var(--color-faint);
  font-size: var(--text-4xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.palette-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.palette-button {
  padding: 5px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-panel-field);
  color: var(--color-muted);
  font-size: var(--text-2xs);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.palette-button:hover {
  background: var(--color-panel-field-hover);
  color: var(--color-surface);
}
</style>
