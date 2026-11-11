<script setup lang="ts">
import type { JsonValue } from '@vui/core'

interface EnumOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    label: string
    type: 'string' | 'number' | 'boolean' | 'enum'
    value?: JsonValue
    options?: EnumOption[]
    testId: string
    step?: number
    allowUnset?: boolean
  }>(),
  {
    value: undefined,
    options: () => [],
    step: 1,
    allowUnset: false,
  },
)

const emit = defineEmits<{
  change: [value: JsonValue]
}>()

function textValue(): string {
  return props.value == null ? '' : String(props.value)
}

function numberValue(): number | string {
  return typeof props.value === 'number' ? props.value : ''
}

function onTextInput(event: Event): void {
  emit('change', (event.target as HTMLInputElement).value)
}

function onNumberInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '') {
    if (props.allowUnset) emit('change', '')
    return
  }
  const parsed = Number(raw)
  if (Number.isFinite(parsed)) emit('change', parsed)
}

function onCheckboxChange(event: Event): void {
  emit('change', (event.target as HTMLInputElement).checked)
}

function onSelectChange(event: Event): void {
  emit('change', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <label class="property-control">
    <span class="property-label">{{ label }}</span>

    <select
      v-if="type === 'enum'"
      class="property-input"
      :data-testid="testId"
      :value="textValue()"
      @change="onSelectChange"
    >
      <option v-if="allowUnset" value="">Unset</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <span v-else-if="type === 'boolean'" class="property-checkbox-wrap">
      <input
        class="property-checkbox"
        type="checkbox"
        :data-testid="testId"
        :checked="Boolean(value)"
        @change="onCheckboxChange"
      />
      <span class="property-checkbox-label">{{ value ? 'true' : 'false' }}</span>
    </span>

    <input
      v-else-if="type === 'number'"
      class="property-input"
      type="number"
      :step="step"
      :data-testid="testId"
      :value="numberValue()"
      @input="onNumberInput"
    />

    <input
      v-else
      class="property-input"
      type="text"
      :data-testid="testId"
      :value="textValue()"
      @input="onTextInput"
    />
  </label>
</template>

<style scoped>
.property-control {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.property-label {
  overflow: hidden;
  color: #475569;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-input {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
}

.property-input:focus {
  border-color: #2563eb;
  outline: none;
}

.property-checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.property-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
}

.property-checkbox-label {
  color: #64748b;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
</style>
