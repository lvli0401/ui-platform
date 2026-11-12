<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  {
    size: 16,
  },
)

const ICONS: Record<string, string[]> = {
  cursor: ['M3 2.5 12.5 9l-4.2.9L6.2 14 3 2.5Z'],
  hand: [
    'M5 7V4.5a1 1 0 0 1 2 0V7m0-3.5a1 1 0 0 1 2 0V7m0-2.5a1 1 0 0 1 2 0V9a4 4 0 0 1-4 4H6a3 3 0 0 1-3-3V7a1 1 0 0 1 2 0',
  ],
  type: ['M4 3.5h8M8 3.5v9M6 12.5h4'],
  undo: ['M5.5 4 3 6.5 5.5 9', 'M3 6.5h5.5a4 4 0 0 1 0 8H6'],
  redo: ['M10.5 4 13 6.5 10.5 9', 'M13 6.5H7.5a4 4 0 0 0 0 8H10'],
  import: ['M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13h10'],
  export: ['M8 10.5v-8M4.5 5.5 8 2l3.5 3.5M3 13h10'],
  zoom: ['M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM10 10l3.5 3.5'],
  'chevron-down': ['m5.5 6.5 2.5 2.5 2.5-2.5'],
  'chevron-right': ['m6.5 4.5 3 3-3 3'],
  layers: ['m8 2 6 3-6 3-6-3 6-3ZM2 8l6 3 6-3M2 11l6 3 6-3'],
  trash: [
    'M3 4.5h10M6 4.5V3h4v1.5M5 4.5l.5 9h5l.5-9M6.5 7v4M9.5 7v4',
  ],
  'arrow-up': ['M8 13V3M4.5 6.5 8 3l3.5 3.5'],
  'arrow-down': ['M8 3v10M4.5 9.5 8 13l3.5-3.5'],
  'arrow-out': ['M9 3h4v4M13 3 8 8M12 9.5V13H3V4h3.5'],
  close: ['m4 4 8 8M12 4l-8 8'],
  fit: ['M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3'],
  plus: ['M8 3v10M3 8h10'],
  minus: ['M3 8h10'],
  check: ['m3.5 8.5 3 3 6-6'],
}

const paths = computed(() => ICONS[props.name] ?? [])
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 16 16"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>

<style scoped>
.icon {
  display: block;
  flex-shrink: 0;
}
</style>
