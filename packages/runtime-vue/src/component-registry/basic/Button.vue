<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    variant?: 'primary' | 'secondary'
    disabled?: boolean
  }>(),
  {
    label: 'Button',
    variant: 'primary',
    disabled: false,
  },
)
</script>

<template>
  <button
    class="vui-button"
    type="button"
    :data-variant="variant"
    :disabled="disabled"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.vui-button {
  box-sizing: border-box;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
  background: #2563eb;
  color: #ffffff;
}

.vui-button[data-variant='secondary'] {
  background: #ffffff;
  color: #111827;
  border-color: #d1d5db;
}

.vui-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
