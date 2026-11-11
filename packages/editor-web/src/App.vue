<script setup lang="ts">
import CanvasView from './components/CanvasView.vue'
import DocumentActions from './components/DocumentActions.vue'
import LayersPanel from './components/LayersPanel.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import {
  canRedoRef,
  canUndoRef,
  documentRef,
  redo,
  revisionRef,
  undo,
} from './editor/editor-instance'
</script>

<template>
  <div class="editor-shell">
    <header class="app-header">
      <span class="app-brand">Virtual UI Editor</span>
      <span class="app-document" data-testid="document-name">
        {{ documentRef.name }}
      </span>

      <div class="history-controls">
        <button
          type="button"
          class="history-button"
          data-testid="undo-button"
          :disabled="!canUndoRef"
          @click="undo"
        >
          Undo
        </button>
        <button
          type="button"
          class="history-button"
          data-testid="redo-button"
          :disabled="!canRedoRef"
          @click="redo"
        >
          Redo
        </button>
      </div>

      <DocumentActions />

      <span class="app-revision" data-testid="revision">
        revision {{ revisionRef }}
      </span>
    </header>

    <main class="app-main">
      <LayersPanel />
      <CanvasView />
      <PropertiesPanel />
    </main>
  </div>
</template>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid #1e293b;
  background: #020617;
  color: #e2e8f0;
  font-size: 13px;
}

.app-brand {
  font-weight: 600;
}

.app-document {
  color: #94a3b8;
}

.history-controls {
  display: flex;
  gap: 6px;
  margin-left: 16px;
}

.history-button {
  padding: 3px 9px;
  border: 1px solid #334155;
  border-radius: 5px;
  background: #0f172a;
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

.history-button:hover:not(:disabled) {
  border-color: #475569;
  background: #1e293b;
}

.history-button:disabled {
  color: #475569;
  cursor: not-allowed;
}

.app-revision {
  margin-left: auto;
  color: #64748b;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}

.app-main {
  display: grid;
  flex: 1;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  min-height: 0;
}
</style>
