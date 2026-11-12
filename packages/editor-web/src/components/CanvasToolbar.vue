<script setup lang="ts">
import type { EditorTool } from '@vui/editor-core'
import Icon from './ui/Icon.vue'

defineProps<{
  activeTool: EditorTool
}>()

const emit = defineEmits<{
  'update:activeTool': [tool: EditorTool]
}>()

const TOOLS: Array<{
  id: EditorTool
  icon: string
  label: string
  shortcut: string
}> = [
  { id: 'select', icon: 'cursor', label: '选择', shortcut: 'V' },
  { id: 'hand', icon: 'hand', label: '抓手', shortcut: 'H' },
  { id: 'text', icon: 'type', label: '文本', shortcut: 'T' },
]
</script>

<template>
  <div class="canvas-toolbar" data-testid="canvas-toolbar" role="toolbar">
    <button
      v-for="tool in TOOLS"
      :key="tool.id"
      type="button"
      class="tool-button"
      :class="{ 'is-active': activeTool === tool.id }"
      :data-testid="`tool-${tool.id}`"
      :title="`${tool.label} (${tool.shortcut})`"
      :aria-label="`${tool.label} (${tool.shortcut})`"
      :aria-pressed="activeTool === tool.id ? 'true' : 'false'"
      @click="emit('update:activeTool', tool.id)"
    >
      <Icon :name="tool.icon" />
    </button>
  </div>
</template>

<style scoped>
.canvas-toolbar {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-panel);
  box-shadow: var(--floating-bar-shadow);
  transform: translateX(-50%);
}

.tool-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.tool-button:hover {
  background: var(--color-hover);
  color: var(--color-surface);
}

.tool-button.is-active {
  background: var(--color-accent);
  color: var(--color-on-accent);
}
</style>
