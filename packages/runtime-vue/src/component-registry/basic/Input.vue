<script setup lang="ts">
withDefaults(
  defineProps<{
    placeholder?: string
    type?: 'text' | 'password'
    value?: string
    disabled?: boolean
  }>(),
  {
    placeholder: '',
    type: 'text',
    value: '',
    disabled: false,
  },
)
</script>

<template>
  <input
    class="vui-input"
    :placeholder="placeholder"
    :type="type"
    :value="value"
    :disabled="disabled"
  />
</template>

<style scoped>
.vui-input {
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font: inherit;
  background: #ffffff;
  color: #111827;
}
</style>
