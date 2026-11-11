<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { PageDefinition } from '@vui/core'
import type { DragCommit, DragDropTarget, Point } from '@vui/editor-core'
import { resolveNodeIdFromTarget } from '@vui/editor-core'
import { VirtualUIRuntime } from '@vui/runtime-vue'
import {
  beginDrag,
  canNodeAcceptChildren,
  cancelDrag,
  commitDrag,
  componentRegistry,
  documentRef,
  dragRef,
  getDocumentIndex,
  hoverNode,
  revisionRef,
  selectNode,
  selectionRef,
  updateDrag,
} from '../editor/editor-instance'

interface OverlayBox {
  left: number
  top: number
  width: number
  height: number
}

interface DragStart {
  nodeId: string
  pointerId: number
  startPoint: Point
  startBox: OverlayBox
  absoluteLeft: number
  absoluteTop: number
}

interface ResolvedDrop {
  target: DragDropTarget
  marker: OverlayBox
}

const DRAG_THRESHOLD = 4

const registry = componentRegistry
const stageEl = ref<HTMLElement | null>(null)
const selectionBox = ref<OverlayBox | null>(null)
const hoverBox = ref<OverlayBox | null>(null)
const dragBox = ref<OverlayBox | null>(null)
const dropMarker = ref<OverlayBox | null>(null)
const dragStart = ref<DragStart | null>(null)

const nodeElements = new Map<string, HTMLElement>()
let dragPointer: Point | null = null
let frameRequest: number | null = null
let suppressClick = false

const page = computed<PageDefinition>(() => documentRef.value.pages[0]!)
const selectedNodeId = computed(
  () => selectionRef.value.selectedNodeIds[0] ?? null,
)
const dragMode = computed(() => dragRef.value?.mode ?? null)
const dropTarget = computed(() => dragRef.value?.dropTarget ?? null)
const isDragging = computed(() => dragBox.value !== null)

function rebuildNodeElements(): void {
  nodeElements.clear()
  const stage = stageEl.value
  if (!stage) return

  for (const element of stage.querySelectorAll('[data-node-id]')) {
    const id = element.getAttribute('data-node-id')
    if (id && element instanceof HTMLElement && !nodeElements.has(id)) {
      nodeElements.set(id, element)
    }
  }
}

function findNodeElement(id: string): HTMLElement | null {
  return nodeElements.get(id) ?? null
}

function overlayBoxFor(element: HTMLElement): OverlayBox | null {
  const stage = stageEl.value
  if (!stage) return null

  const stageRect = stage.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left - stageRect.left,
    top: rect.top - stageRect.top,
    width: rect.width,
    height: rect.height,
  }
}

function boxFor(id: string | null): OverlayBox | null {
  if (!id) return null
  const element = findNodeElement(id)
  return element ? overlayBoxFor(element) : null
}

function offsetBox(box: OverlayBox, delta: Point): OverlayBox {
  return {
    left: box.left + delta.x,
    top: box.top + delta.y,
    width: box.width,
    height: box.height,
  }
}

function numericLength(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function measure(): void {
  const selected = selectedNodeId.value
  selectionBox.value = boxFor(selected)

  const hovered = selectionRef.value.hoveredNodeId
  hoverBox.value =
    hovered && hovered !== selected ? boxFor(hovered) : null
}

function boxStyle(box: OverlayBox): CSSProperties {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  }
}

function handleClick(event: MouseEvent): void {
  if (suppressClick) {
    suppressClick = false
    return
  }

  const stage = stageEl.value
  if (!stage) return
  selectNode(resolveNodeIdFromTarget(event.target, stage))
}

function handlePointerOver(event: PointerEvent): void {
  if (dragStart.value) return
  const stage = stageEl.value
  if (!stage) return
  hoverNode(resolveNodeIdFromTarget(event.target, stage))
}

function handlePointerLeave(): void {
  if (dragStart.value) return
  hoverNode(null)
}

function handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  const stage = stageEl.value
  if (!stage) return

  const nodeId = resolveNodeIdFromTarget(event.target, stage)
  if (!nodeId) return

  const node = getDocumentIndex().nodeMap.get(nodeId)
  if (!node || node.type === 'text' || node.type === 'fragment') return

  const startBox = boxFor(nodeId)
  if (!startBox) return

  selectNode(nodeId)
  const startPoint: Point = { x: event.clientX, y: event.clientY }
  beginDrag(nodeId, startPoint)

  dragStart.value = {
    nodeId,
    pointerId: event.pointerId,
    startPoint,
    startBox,
    absoluteLeft: numericLength(node.style?.left),
    absoluteTop: numericLength(node.style?.top),
  }
  dragPointer = startPoint
  dragBox.value = { ...startBox }
  dropMarker.value = null
  suppressClick = false

  if (stage.setPointerCapture) {
    stage.setPointerCapture(event.pointerId)
  }
  event.preventDefault()
}

function buildDrop(
  containerId: string,
  containerElement: HTMLElement,
  draggedId: string,
  point: Point,
): ResolvedDrop | null {
  const index = getDocumentIndex()
  const style = getComputedStyle(containerElement)
  if (style.display !== 'flex' && style.display !== 'inline-flex') return null

  const stage = stageEl.value
  if (!stage) return null
  const stageRect = stage.getBoundingClientRect()
  const stagePoint: Point = {
    x: point.x - stageRect.left,
    y: point.y - stageRect.top,
  }

  const isRow = style.flexDirection.startsWith('row')
  const pointerMain = isRow ? stagePoint.x : stagePoint.y
  const childIds = index.childrenMap.get(containerId) ?? []

  const visible: OverlayBox[] = []
  for (const childId of childIds) {
    if (childId === draggedId) continue
    const childElement = findNodeElement(childId)
    if (!childElement) continue
    const box = overlayBoxFor(childElement)
    if (box) visible.push(box)
  }

  let insertion = 0
  for (const box of visible) {
    const middle = isRow ? box.left + box.width / 2 : box.top + box.height / 2
    if (pointerMain > middle) {
      insertion += 1
    } else {
      break
    }
  }

  const containerBox = overlayBoxFor(containerElement)
  if (!containerBox) return null

  let marker: OverlayBox
  if (isRow) {
    const x =
      insertion < visible.length
        ? visible[insertion].left
        : visible.length > 0
          ? visible[visible.length - 1].left + visible[visible.length - 1].width
          : containerBox.left
    marker = {
      left: x - 1,
      top: containerBox.top,
      width: 2,
      height: containerBox.height,
    }
  } else {
    const y =
      insertion < visible.length
        ? visible[insertion].top
        : visible.length > 0
          ? visible[visible.length - 1].top + visible[visible.length - 1].height
          : containerBox.top
    marker = {
      left: containerBox.left,
      top: y - 1,
      width: containerBox.width,
      height: 2,
    }
  }

  return {
    target: { parentId: containerId, index: insertion },
    marker,
  }
}

function resolveDrop(point: Point, draggedId: string): ResolvedDrop | null {
  const stage = stageEl.value
  if (!stage) return null

  const hit = globalThis.document.elementFromPoint(point.x, point.y)
  const hitNodeId = resolveNodeIdFromTarget(hit, stage)
  if (!hitNodeId) return null

  const index = getDocumentIndex()
  let cursor: string | null | undefined = hitNodeId
  while (cursor) {
    if (cursor !== draggedId) {
      const node = index.nodeMap.get(cursor)
      if (node && canNodeAcceptChildren(node)) {
        const element = findNodeElement(cursor)
        if (element) {
          const drop = buildDrop(cursor, element, draggedId, point)
          if (drop) return drop
        }
      }
    }
    cursor = index.parentMap.get(cursor) ?? null
  }

  return null
}

function processDragMove(): void {
  const start = dragStart.value
  const point = dragPointer
  const drag = dragRef.value
  if (!start || !point || !drag) return

  const delta = {
    x: point.x - start.startPoint.x,
    y: point.y - start.startPoint.y,
  }
  dragBox.value = offsetBox(start.startBox, delta)

  if (drag.mode === 'absolute') {
    dropMarker.value = null
    updateDrag(point, null)
    return
  }

  const drop = resolveDrop(point, start.nodeId)
  dropMarker.value = drop?.marker ?? null
  updateDrag(point, drop?.target ?? null)
}

function handlePointerMove(event: PointerEvent): void {
  if (!dragStart.value) return
  dragPointer = { x: event.clientX, y: event.clientY }
  if (frameRequest !== null) return

  frameRequest = requestAnimationFrame(() => {
    frameRequest = null
    processDragMove()
  })
}

function releasePointer(pointerId: number): void {
  const stage = stageEl.value
  if (stage?.hasPointerCapture(pointerId)) {
    stage.releasePointerCapture(pointerId)
  }
}

function resetDrag(): void {
  dragStart.value = null
  dragBox.value = null
  dropMarker.value = null
  dragPointer = null
  if (frameRequest !== null) {
    cancelAnimationFrame(frameRequest)
    frameRequest = null
  }
}

function handlePointerUp(event: PointerEvent): void {
  const start = dragStart.value
  if (!start) return

  dragPointer = { x: event.clientX, y: event.clientY }
  if (frameRequest !== null) {
    cancelAnimationFrame(frameRequest)
    frameRequest = null
  }
  processDragMove()

  const drag = dragRef.value
  const delta = drag?.delta ?? { x: 0, y: 0 }
  const moved = Math.hypot(delta.x, delta.y) >= DRAG_THRESHOLD

  let commit: DragCommit | null = null
  if (moved && drag) {
    if (drag.mode === 'absolute') {
      commit = {
        mode: 'absolute',
        left: Math.round(start.absoluteLeft + delta.x),
        top: Math.round(start.absoluteTop + delta.y),
      }
    } else if (drag.dropTarget) {
      const index = getDocumentIndex()
      const currentParentId = index.parentMap.get(start.nodeId) ?? null
      const currentIndex = currentParentId
        ? (index.childrenMap.get(currentParentId) ?? []).indexOf(start.nodeId)
        : -1
      const target = drag.dropTarget

      if (
        currentParentId !== target.parentId ||
        currentIndex !== target.index
      ) {
        const commandIndex =
          currentParentId === target.parentId && currentIndex < target.index
            ? target.index + 1
            : target.index
        commit = {
          mode: 'flex',
          parentId: target.parentId,
          index: commandIndex,
        }
      }
    }
  }

  releasePointer(start.pointerId)
  commitDrag(commit)
  resetDrag()

  suppressClick = true
  setTimeout(() => {
    suppressClick = false
  }, 0)
}

function handlePointerCancel(): void {
  const start = dragStart.value
  if (!start) return
  releasePointer(start.pointerId)
  cancelDrag()
  resetDrag()
}

watch(
  [documentRef, revisionRef],
  async () => {
    await nextTick()
    rebuildNodeElements()
    measure()
  },
  { flush: 'post' },
)

watch(
  [selectionRef, () => selectionRef.value.hoveredNodeId],
  async () => {
    await nextTick()
    measure()
  },
  { flush: 'post' },
)

let resizeObserver: ResizeObserver | undefined

function handleWindowResize(): void {
  measure()
}

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
  if (typeof ResizeObserver !== 'undefined' && stageEl.value) {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(stageEl.value)
  }
  rebuildNodeElements()
  measure()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
  resizeObserver?.disconnect()
  if (frameRequest !== null) cancelAnimationFrame(frameRequest)
})
</script>

<template>
  <section class="canvas-panel">
    <div class="canvas-toolbar">
      <span class="canvas-toolbar-title">Canvas</span>
      <span class="canvas-toolbar-selection" data-testid="selection-label">
        {{ selectedNodeId ?? 'No selection' }}
      </span>
    </div>

    <div class="canvas-scroll" @pointerleave="handlePointerLeave">
      <div
        ref="stageEl"
        class="canvas-stage"
        data-testid="canvas-stage"
        @click="handleClick"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
        @pointerover="handlePointerOver"
      >
        <VirtualUIRuntime
          :page="page"
          :registry="registry"
          :revision="revisionRef"
        />

        <div
          v-if="hoverBox && !isDragging"
          class="hover-box"
          data-testid="hover-box"
          :data-hovered-node="selectionRef.hoveredNodeId"
          :style="boxStyle(hoverBox)"
        ></div>
        <div
          v-if="selectionBox && !isDragging"
          class="selection-box"
          data-testid="selection-box"
          :data-selected-node="selectedNodeId"
          :style="boxStyle(selectionBox)"
        ></div>
        <div
          v-if="dragBox"
          class="drag-preview"
          data-testid="drag-preview"
          :data-drag-mode="dragMode"
          :data-drop-parent="dropTarget?.parentId"
          :data-drop-index="dropTarget?.index"
          :style="boxStyle(dragBox)"
        ></div>
        <div
          v-if="dropMarker"
          class="drop-marker"
          data-testid="drop-marker"
          :style="boxStyle(dropMarker)"
        ></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.canvas-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #e2e8f0;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 14px;
  border-bottom: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
}

.canvas-toolbar-title {
  font-weight: 600;
}

.canvas-toolbar-selection {
  font-family: ui-monospace, monospace;
  color: #64748b;
}

.canvas-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.canvas-stage {
  position: relative;
  width: 100%;
  min-width: 640px;
  min-height: 100%;
  background: #ffffff;
}

.selection-box,
.hover-box,
.drag-preview,
.drop-marker {
  position: absolute;
  z-index: 10;
  pointer-events: none;
}

.selection-box {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
  background: rgb(37 99 235 / 6%);
}

.hover-box {
  outline: 1px dashed #94a3b8;
  outline-offset: 1px;
}

.drag-preview {
  border: 1px solid #2563eb;
  background: rgb(37 99 235 / 10%);
  box-shadow: 0 8px 20px rgb(15 23 42 / 12%);
}

.drag-preview[data-drag-mode='absolute'] {
  border-style: dashed;
}

.drop-marker {
  border-radius: 999px;
  background: #2563eb;
}
</style>
