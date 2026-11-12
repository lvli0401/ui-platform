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
import PropertySection from './PropertySection.vue'
import ZoomControl from './ZoomControl.vue'

interface StyleField {
  key: keyof UIStyle
  label: string
  type: 'string' | 'number' | 'enum'
  options?: Array<{ value: string; label: string }>
  step?: number
  color?: boolean
}

interface StyleGroup {
  id: string
  title: string
  fields: StyleField[]
}

const positionFields: StyleField[] = [
  {
    key: 'position',
    label: '定位',
    type: 'enum',
    options: [
      { value: 'static', label: 'static' },
      { value: 'relative', label: 'relative' },
      { value: 'absolute', label: 'absolute' },
    ],
  },
  { key: 'left', label: '左', type: 'number' },
  { key: 'top', label: '上', type: 'number' },
  { key: 'width', label: '宽度', type: 'string' },
  { key: 'height', label: '高度', type: 'string' },
]

const layoutFields: StyleField[] = [
  {
    key: 'display',
    label: '显示',
    type: 'enum',
    options: [
      { value: 'block', label: 'block' },
      { value: 'flex', label: 'flex' },
      { value: 'none', label: 'none' },
    ],
  },
  {
    key: 'flexDirection',
    label: '主轴方向',
    type: 'enum',
    options: [
      { value: 'row', label: 'row' },
      { value: 'column', label: 'column' },
    ],
  },
  {
    key: 'justifyContent',
    label: '主轴对齐',
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
    label: '交叉轴对齐',
    type: 'enum',
    options: [
      { value: 'stretch', label: 'stretch' },
      { value: 'flex-start', label: 'flex-start' },
      { value: 'center', label: 'center' },
      { value: 'flex-end', label: 'flex-end' },
    ],
  },
  { key: 'gap', label: '间距', type: 'number' },
  { key: 'padding', label: '内边距', type: 'number' },
]

const appearanceFields: StyleField[] = [
  { key: 'backgroundColor', label: '背景色', type: 'string', color: true },
  { key: 'borderColor', label: '边框颜色', type: 'string', color: true },
  { key: 'borderWidth', label: '边框宽度', type: 'number' },
  { key: 'borderRadius', label: '圆角', type: 'number' },
  { key: 'opacity', label: '不透明度', type: 'number', step: 0.1 },
]

const typographyFields: StyleField[] = [
  { key: 'fontSize', label: '字号', type: 'number' },
  { key: 'fontWeight', label: '字重', type: 'string' },
  { key: 'color', label: '文字颜色', type: 'string', color: true },
]

const STYLE_GROUPS: StyleGroup[] = [
  { id: 'position', title: '位置与尺寸', fields: positionFields },
  { id: 'layout', title: '布局', fields: layoutFields },
  { id: 'appearance', title: '外观', fields: appearanceFields },
  { id: 'typography', title: '文字', fields: typographyFields },
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
    <header class="panel-header">
      <span class="panel-title">属性</span>
      <ZoomControl />
    </header>

    <p
      v-if="!selectedNode"
      class="properties-empty"
      data-testid="properties-empty"
    >
      选择一个节点以编辑属性。
    </p>

    <div v-else class="properties-body" :data-revision="revisionRef">
      <section class="node-summary">
        <div class="node-summary-row">
          <span class="node-type">{{ selectedNode.type }}</span>
          <code class="node-id" data-testid="properties-node-id">
            {{ selectedNode.id }}
          </code>
        </div>
        <p class="node-label">{{ nodeLabel }}</p>
      </section>

      <PropertySection v-if="propFields.length > 0" title="组件属性">
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
      </PropertySection>

      <PropertySection
        v-for="group in STYLE_GROUPS"
        :key="group.id"
        :title="group.title"
      >
        <PropertyControl
          v-for="field in group.fields"
          :key="`${selectedNode.id}:style:${field.key}`"
          :label="field.label"
          :type="field.type"
          :value="selectedNode.style?.[field.key]"
          :options="field.options"
          :step="field.step"
          :color="field.color"
          :test-id="`style-${field.key}`"
          @change="handleStyleChange(field.key, $event)"
        />
      </PropertySection>
    </div>
  </aside>
</template>

<style scoped>
.properties-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--color-border);
  background: var(--color-panel);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--panel-header-height);
  flex-shrink: 0;
  padding: 0 6px 0 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-panel-secondary);
}

.panel-title {
  color: var(--color-surface);
  font-size: var(--text-2xs);
  font-weight: 600;
}

.properties-empty {
  margin: 12px;
  color: var(--color-faint);
  font-size: var(--text-2xs);
}

.properties-body {
  flex: 1;
  min-height: 0;
  padding: 8px 8px 24px;
  overflow: auto;
}

.node-summary {
  padding: 2px 2px 8px;
  border-bottom: 1px solid var(--color-border);
}

.node-summary-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-type {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--color-panel-field);
  color: var(--color-muted);
  font-size: var(--text-4xs);
  text-transform: uppercase;
}

.node-id {
  overflow: hidden;
  color: var(--color-surface);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-overflow: ellipsis;
}

.node-label {
  margin: 6px 0 0;
  color: var(--color-faint);
  font-size: var(--text-2xs);
}
</style>
