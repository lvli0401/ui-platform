<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { viewportRef } from '../editor/editor-instance'
import {
  fitToPage,
  zoomIn,
  zoomOut,
  zoomToPercent,
} from '../editor/viewport-controls'
import Icon from './ui/Icon.vue'

const PRESETS = [50, 100, 200]

const rootEl = ref<HTMLElement | null>(null)
const open = ref(false)

const percent = computed(() => Math.round(viewportRef.value.scale * 100))

function toggle(): void {
  open.value = !open.value
}

function run(action: () => void): void {
  action()
  open.value = false
}

function handlePointerDown(event: PointerEvent): void {
  if (!open.value) return
  const root = rootEl.value
  if (root && event.target instanceof Node && root.contains(event.target)) {
    return
  }
  open.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    open.value = false
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="rootEl" class="zoom-control">
    <button
      type="button"
      class="zoom-trigger"
      data-testid="zoom-select"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      title="缩放"
      @click="toggle"
    >
      <Icon name="zoom" :size="12" />
      <span>{{ percent }}%</span>
    </button>

    <div v-if="open" class="zoom-menu" role="menu">
      <button type="button" class="zoom-item" @click="run(zoomIn)">
        <Icon name="plus" :size="12" />
        <span>放大</span>
        <span class="zoom-shortcut">+</span>
      </button>
      <button type="button" class="zoom-item" @click="run(zoomOut)">
        <Icon name="minus" :size="12" />
        <span>缩小</span>
        <span class="zoom-shortcut">-</span>
      </button>
      <button
        type="button"
        class="zoom-item"
        data-testid="zoom-fit-button"
        @click="run(fitToPage)"
      >
        <Icon name="fit" :size="12" />
        <span>适应画布</span>
        <span class="zoom-shortcut">Shift+1</span>
      </button>

      <div class="zoom-divider"></div>

      <button
        v-for="preset in PRESETS"
        :key="preset"
        type="button"
        class="zoom-item"
        :class="{ 'is-active': percent === preset }"
        :data-testid="`zoom-option-${preset}`"
        @click="run(() => zoomToPercent(preset))"
      >
        <Icon
          v-if="percent === preset"
          name="check"
          :size="12"
        />
        <span v-else class="zoom-check-placeholder"></span>
        <span>{{ preset }}%</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.zoom-control {
  position: relative;
}

.zoom-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 6px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  font-size: var(--text-3xs);
  font-variant-numeric: tabular-nums;
}

.zoom-trigger:hover {
  background: var(--color-hover);
  color: var(--color-surface);
}

.zoom-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  width: 190px;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-panel-secondary);
  box-shadow: var(--floating-bar-shadow);
}

.zoom-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 26px;
  padding: 0 6px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  font-size: var(--text-2xs);
  text-align: left;
}

.zoom-item:hover {
  background: var(--color-hover);
  color: var(--color-surface);
}

.zoom-item.is-active {
  color: var(--color-surface);
}

.zoom-shortcut {
  margin-left: auto;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: var(--text-4xs);
}

.zoom-check-placeholder {
  width: 12px;
  flex-shrink: 0;
}

.zoom-divider {
  height: 1px;
  margin: 4px 2px;
  background: var(--color-border);
}
</style>
