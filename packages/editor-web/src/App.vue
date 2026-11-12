<script setup lang="ts">
import AppTabBar from './components/AppTabBar.vue'
import CanvasView from './components/CanvasView.vue'
import LayersPanel from './components/LayersPanel.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import { useEditorShortcuts } from './editor/use-editor-shortcuts'

useEditorShortcuts()
</script>

<template>
  <div class="editor-shell">
    <AppTabBar />
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

.app-main {
  display: grid;
  flex: 1;
  grid-template-columns: var(--left-panel-width) minmax(0, 1fr)
    var(--right-panel-width);
  min-height: 0;
}
</style>
