<script setup lang="ts">
import DocumentActions from './DocumentActions.vue'
import IconButton from './ui/IconButton.vue'
import {
  canRedoRef,
  canUndoRef,
  documentRef,
  redo,
  revisionRef,
  undo,
} from '../editor/editor-instance'
</script>

<template>
  <header class="app-tab-bar">
    <div class="app-brand">
      <span class="brand-mark">V</span>
      <span class="brand-name">虚拟 UI</span>
    </div>

    <div class="app-tabs">
      <div class="app-tab is-active" data-testid="document-tab">
        <span class="tab-title" data-testid="document-name">
          {{ documentRef.name }}
        </span>
        <span
          v-if="revisionRef > 0"
          class="tab-dirty"
          data-testid="document-dirty"
          title="有未保存的更改"
        ></span>
        <span class="tab-revision" data-testid="revision">
          修订 {{ revisionRef }}
        </span>
      </div>
    </div>

    <div class="app-actions">
      <IconButton
        icon="undo"
        label="撤销"
        data-testid="undo-button"
        :disabled="!canUndoRef"
        @click="undo"
      />
      <IconButton
        icon="redo"
        label="重做"
        data-testid="redo-button"
        :disabled="!canRedoRef"
        @click="redo"
      />
      <span class="app-divider"></span>
      <DocumentActions />
    </div>
  </header>
</template>

<style scoped>
.app-tab-bar {
  display: flex;
  align-items: stretch;
  height: var(--header-height);
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-canvas);
  user-select: none;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-right: 1px solid var(--color-border);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-xs);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 10px;
  font-weight: 700;
}

.brand-name {
  color: var(--color-muted);
  font-size: var(--text-2xs);
  font-weight: 600;
  white-space: nowrap;
}

.app-tabs {
  display: flex;
  align-items: flex-end;
  min-width: 0;
  padding-left: 6px;
}

.app-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  max-width: 320px;
  padding: 0 12px;
  border-right: 1px solid var(--color-border);
  background: var(--color-panel);
  color: var(--color-surface);
}

.app-tab.is-active {
  box-shadow: inset 0 -1px 0 var(--color-panel);
}

.tab-title {
  overflow: hidden;
  color: var(--color-surface);
  font-size: var(--text-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-dirty {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
}

.tab-revision {
  flex-shrink: 0;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: var(--text-4xs);
}

.app-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 0 8px;
}

.app-divider {
  width: 1px;
  height: 16px;
  margin: 0 6px;
  background: var(--color-border);
}
</style>
