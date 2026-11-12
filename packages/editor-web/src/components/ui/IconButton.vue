<script setup lang="ts">
import Icon from './Icon.vue'

withDefaults(
  defineProps<{
    icon: string
    label: string
    active?: boolean
    disabled?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    active: false,
    disabled: false,
    size: 'sm',
  },
)
</script>

<template>
  <button
    type="button"
    class="icon-button"
    :class="[`icon-button--${size}`, { 'is-active': active }]"
    :title="label"
    :aria-label="label"
    :aria-pressed="active ? 'true' : undefined"
    :disabled="disabled"
  >
    <Icon :name="icon" />
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.icon-button--sm {
  width: 26px;
  height: 26px;
}

.icon-button--md {
  width: 28px;
  height: 28px;
}

.icon-button--lg {
  width: 32px;
  height: 32px;
}

.icon-button:hover:not(:disabled) {
  background: var(--color-hover);
  color: var(--color-surface);
}

.icon-button.is-active {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.icon-button:disabled {
  color: var(--color-faint);
  opacity: 0.6;
}
</style>
