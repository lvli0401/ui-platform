<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string
    as?: 'span' | 'p' | 'h1' | 'h2'
  }>(),
  {
    as: 'span',
  },
)
</script>

<template>
  <component :is="as">{{ text }}</component>
</template>
