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
    color?: boolean
  }>(),
  {
    value: undefined,
    options: () => [],
    step: 1,
    allowUnset: false,
    color: false,
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

function colorValue(): string {
  const raw = textValue()
  return /^#[0-9a-f]{6}$/i.test(raw)
    ? raw
    : /^#[0-9a-f]{3}$/i.test(raw)
      ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
      : '#ffffff'
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
      <option v-if="allowUnset" value="">未设置</option>
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

    <span v-else-if="color" class="property-color-row">
      <input
        class="property-swatch"
        type="color"
        :value="colorValue()"
        aria-label="选择颜色"
        @input="emit('change', ($event.target as HTMLInputElement).value)"
      />
      <input
        class="property-input"
        type="text"
        :data-testid="testId"
        :value="textValue()"
        @input="onTextInput"
      />
    </span>

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
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.property-label {
  overflow: hidden;
  color: var(--color-muted);
  font-size: var(--text-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-input {
  width: 100%;
  min-width: 0;
  height: var(--control-height);
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-panel-field);
  color: var(--color-surface);
  font-size: var(--text-2xs);
}

.property-input:hover {
  background: var(--color-panel-field-hover);
}

.property-input:focus {
  border-color: var(--color-panel-focus);
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
  accent-color: var(--color-accent);
}

.property-checkbox-label {
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: var(--text-3xs);
}

.property-color-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.property-swatch {
  width: 22px;
  height: var(--control-height);
  flex-shrink: 0;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-panel-field);
  cursor: pointer;
}
</style>
