<script setup lang="ts">
import { ref } from 'vue'
import Icon from './ui/Icon.vue'

const props = withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
  }>(),
  {
    defaultOpen: true,
  },
)

const open = ref(props.defaultOpen)
</script>

<template>
  <section class="property-section">
    <button
      type="button"
      class="property-section-header"
      :aria-expanded="open ? 'true' : 'false'"
      @click="open = !open"
    >
      <Icon :name="open ? 'chevron-down' : 'chevron-right'" :size="12" />
      <span>{{ title }}</span>
    </button>
    <div v-if="open" class="property-section-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.property-section {
  border-bottom: 1px solid var(--color-border);
}

.property-section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  height: 28px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--color-surface);
  font-size: var(--text-2xs);
  font-weight: 600;
  text-align: left;
}

.property-section-header:hover {
  color: var(--color-surface);
}

.property-section-header :deep(.icon) {
  color: var(--color-faint);
}

.property-section-body {
  padding: 0 2px 8px;
}
</style>
