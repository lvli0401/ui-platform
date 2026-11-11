<script setup lang="ts">
import { computed } from 'vue'
import type { UINode } from '@vui/core'
import {
  canNodeAcceptChildren,
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

const selectedNode = computed<UINode | null>(() => {
  void revisionRef.value
  const id = selectedId.value
  if (!id) return null
  return getDocumentIndex().nodeMap.get(id) ?? null
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

function findInsertionTarget(): string | null {
  const index = getDocumentIndex()
  const selected = selectedNode.value

  if (selected && canNodeAcceptChildren(selected)) return selected.id

  let ancestorId = selectedId.value
    ? (index.parentMap.get(selectedId.value) ?? null)
    : null
  while (ancestorId) {
    const ancestor = index.nodeMap.get(ancestorId)
    if (ancestor && canNodeAcceptChildren(ancestor)) return ancestor.id
    ancestorId = index.parentMap.get(ancestorId) ?? null
  }

  return page.value?.root.id ?? null
}

function insertPaletteNode(componentName: string): void {
  const targetId = findInsertionTarget()
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
    <header class="layers-header">
      <span class="layers-title">Layers</span>
      <span class="layers-page">{{ page?.name ?? 'No page' }}</span>
    </header>

    <div class="layers-actions">
      <button
        type="button"
        class="layer-action"
        title="Move selected node up"
        data-testid="move-up-button"
        :disabled="!canMoveUp"
        @click="handleMoveUp"
      >
        ↑
      </button>
      <button
        type="button"
        class="layer-action"
        title="Move selected node down"
        data-testid="move-down-button"
        :disabled="!canMoveDown"
        @click="handleMoveDown"
      >
        ↓
      </button>
      <button
        type="button"
        class="layer-action layer-action-wide"
        title="Move selected node one level out"
        data-testid="move-out-button"
        :disabled="!canMoveOut"
        @click="handleMoveOut"
      >
        Out
      </button>
      <button
        type="button"
        class="layer-action layer-action-wide"
        title="Delete selected node"
        data-testid="delete-button"
        :disabled="!canDelete"
        @click="handleDelete"
      >
        Delete
      </button>
    </div>

    <div class="layers-body">
      <LayerTree
        v-if="rootNodes.length > 0"
        :key="revisionRef"
        :nodes="rootNodes"
        :depth="0"
      />
      <p v-else class="layers-empty">Document has no pages.</p>
    </div>

    <footer class="palette">
      <p class="palette-title">Insert into selection</p>
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
  border-right: 1px solid #1e293b;
  background: #0f172a;
}

.layers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid #1e293b;
  color: #e2e8f0;
  font-size: 12px;
}

.layers-title {
  font-weight: 600;
}

.layers-page {
  color: #64748b;
}

.layers-actions {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid #1e293b;
}

.layer-action {
  min-width: 26px;
  padding: 3px 5px;
  border: 1px solid #334155;
  border-radius: 4px;
  background: #1e293b;
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

.layer-action-wide {
  flex: 1;
}

.layer-action:hover:not(:disabled) {
  border-color: #475569;
  background: #334155;
}

.layer-action:disabled {
  color: #475569;
  cursor: not-allowed;
}

.layers-body {
  flex: 1;
  min-height: 0;
  padding: 8px 6px;
  overflow: auto;
}

.layers-empty {
  margin: 8px 10px;
  color: #64748b;
  font-size: 12px;
}

.palette {
  padding: 8px;
  border-top: 1px solid #1e293b;
}

.palette-title {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 10px;
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
  border: 1px solid #334155;
  border-radius: 5px;
  background: #1e293b;
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

.palette-button:hover {
  border-color: #475569;
  background: #334155;
}
</style>
