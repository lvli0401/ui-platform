<script setup lang="ts">
import { computed } from 'vue'
import type { JsonValue, UINode, UIStyle } from '@vui/core'
import { buildDocumentIndex } from '@vui/core'
import {
  componentRegistry,
  documentRef,
  revisionRef,
  selectionRef,
  updateNodeProps,
  updateNodeStyle,
} from '../editor/editor-instance'
import PropertyControl from './PropertyControl.vue'

interface StyleField {
  key: keyof UIStyle
  label: string
  type: 'string' | 'number' | 'enum'
  options?: Array<{ value: string; label: string }>
  step?: number
}

const STYLE_FIELDS: StyleField[] = [
  {
    key: 'position',
    label: 'Position',
    type: 'enum',
    options: [
      { value: 'static', label: 'static' },
      { value: 'relative', label: 'relative' },
      { value: 'absolute', label: 'absolute' },
    ],
  },
  { key: 'left', label: 'Left', type: 'number' },
  { key: 'top', label: 'Top', type: 'number' },
  {
    key: 'display',
    label: 'Display',
    type: 'enum',
    options: [
      { value: 'block', label: 'block' },
      { value: 'flex', label: 'flex' },
      { value: 'none', label: 'none' },
    ],
  },
  {
    key: 'flexDirection',
    label: 'Flex direction',
    type: 'enum',
    options: [
      { value: 'row', label: 'row' },
      { value: 'column', label: 'column' },
    ],
  },
  {
    key: 'justifyContent',
    label: 'Justify',
    type: 'enum',
    options: [
      { value: 'flex-start', label: 'flex-start' },
      { value: 'center', label: 'center' },
      { value: 'flex-end', label: 'flex-end' },
      { value: 'space-between', label: 'space-between' },
      { value: 'space-around', label: 'space-around' },
    ],
  },
  {
    key: 'alignItems',
    label: 'Align items',
    type: 'enum',
    options: [
      { value: 'stretch', label: 'stretch' },
      { value: 'flex-start', label: 'flex-start' },
      { value: 'center', label: 'center' },
      { value: 'flex-end', label: 'flex-end' },
    ],
  },
  { key: 'gap', label: 'Gap', type: 'number' },
  { key: 'padding', label: 'Padding', type: 'number' },
  { key: 'width', label: 'Width', type: 'string' },
  { key: 'height', label: 'Height', type: 'string' },
  { key: 'fontSize', label: 'Font size', type: 'number' },
  { key: 'fontWeight', label: 'Font weight', type: 'string' },
  { key: 'color', label: 'Text color', type: 'string' },
  { key: 'backgroundColor', label: 'Background', type: 'string' },
  { key: 'borderColor', label: 'Border color', type: 'string' },
  { key: 'borderWidth', label: 'Border width', type: 'number' },
  { key: 'borderRadius', label: 'Radius', type: 'number' },
  { key: 'opacity', label: 'Opacity', type: 'number', step: 0.1 },
]

interface PropField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'enum'
  value: JsonValue | undefined
  options?: Array<{ value: string; label: string }>
}

const selectedNode = computed<UINode | null>(() => {
  // Depend on revisions so edits re-read the index.
  void revisionRef.value
  const nodeId = selectionRef.value.selectedNodeIds[0]
  if (!nodeId) return null
  return buildDocumentIndex(documentRef.value).nodeMap.get(nodeId) ?? null
})

const definition = computed(() => {
  const node = selectedNode.value
  if (!node || node.type !== 'component' || !node.component) return undefined
  return componentRegistry.get(node.component)
})

const nodeLabel = computed(() => {
  const node = selectedNode.value
  if (!node) return ''
  if (node.type === 'component') {
    return definition.value?.editor?.label ?? node.component ?? 'Component'
  }
  if (node.type === 'element') return `<${node.tag ?? '?'}>`
  if (node.type === 'text') return `“${String(node.props?.text ?? '')}”`
  return 'Fragment'
})

const propFields = computed<PropField[]>(() => {
  const node = selectedNode.value
  const componentDefinition = definition.value
  if (!node || !componentDefinition) return []

  const schema = componentDefinition.propsSchema
  const keys =
    componentDefinition.editor?.propOrder ?? Object.keys(schema.properties)

  const fields: PropField[] = []
  for (const key of keys) {
    const property = schema.properties[key]
    if (!property) continue

    const type =
      property.enum && property.enum.length > 0
        ? 'enum'
        : property.type === 'number' || property.type === 'boolean'
          ? property.type
          : 'string'

    fields.push({
      key,
      label: property.title ?? key,
      type,
      value: node.props?.[key] ?? property.default,
      options: property.enum?.map((value, index) => ({
        value,
        label: property.enumNames?.[index] ?? value,
      })),
    })
  }
  return fields
})

function handlePropChange(key: string, value: JsonValue): void {
  const node = selectedNode.value
  if (!node) return
  updateNodeProps(node.id, { [key]: value })
}

function handleStyleChange(key: keyof UIStyle, value: JsonValue): void {
  const node = selectedNode.value
  if (!node) return
  updateNodeStyle(node.id, { [key]: value } as Partial<UIStyle>)
}
</script>

<template>
  <aside class="properties-panel">
    <header class="properties-header">Properties</header>

    <p
      v-if="!selectedNode"
      class="properties-empty"
      data-testid="properties-empty"
    >
      Select a node to edit its properties.
    </p>

    <div
      v-else
      class="properties-body"
      :data-revision="revisionRef"
    >
      <section class="node-summary">
        <div class="node-summary-row">
          <span class="node-type">{{ selectedNode.type }}</span>
          <code class="node-id" data-testid="properties-node-id">
            {{ selectedNode.id }}
          </code>
        </div>
        <p class="node-label">{{ nodeLabel }}</p>
      </section>

      <section v-if="propFields.length > 0" class="property-section">
        <h3 class="property-section-title">Props</h3>
        <PropertyControl
          v-for="field in propFields"
          :key="`${selectedNode.id}:${field.key}`"
          :label="field.label"
          :type="field.type"
          :value="field.value"
          :options="field.options"
          :test-id="`prop-${field.key}`"
          @change="handlePropChange(field.key, $event)"
        />
      </section>

      <section class="property-section">
        <h3 class="property-section-title">Style</h3>
        <PropertyControl
          v-for="field in STYLE_FIELDS"
          :key="`${selectedNode.id}:style:${field.key}`"
          :label="field.label"
          :type="field.type"
          :value="selectedNode.style?.[field.key]"
          :options="field.options"
          :step="field.step"
          :test-id="`style-${field.key}`"
          @change="handleStyleChange(field.key, $event)"
        />
      </section>
    </div>
  </aside>
</template>

<style scoped>
.properties-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid #e2e8f0;
  background: #f8fafc;
}

.properties-header {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.properties-empty {
  margin: 12px;
  color: #64748b;
  font-size: 12px;
}

.properties-body {
  flex: 1;
  min-height: 0;
  padding: 10px 12px 24px;
  overflow: auto;
}

.node-summary {
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.node-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-type {
  padding: 1px 6px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 10px;
  text-transform: uppercase;
}

.node-id {
  overflow: hidden;
  color: #334155;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
}

.node-label {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}

.property-section {
  padding-top: 12px;
}

.property-section-title {
  margin: 0 0 6px;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
