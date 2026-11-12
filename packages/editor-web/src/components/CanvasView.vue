<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import type { CSSProperties } from 'vue'
import type { PageDefinition } from '@vui/core'
import type {
  CanvasTransform,
  DragCommit,
  DragDropTarget,
  Point,
} from '@vui/editor-core'
import { resolveNodeIdFromTarget } from '@vui/editor-core'
import { VirtualUIRuntime } from '@vui/runtime-vue'
import {
  activeToolRef,
  beginDrag,
  canNodeAcceptChildren,
  cancelDrag,
  commitDrag,
  componentRegistry,
  documentRef,
  dragRef,
  getDocumentIndex,
  hoverNode,
  insertNode,
  panBy,
  revisionRef,
  selectNode,
  selectionRef,
  setActiveTool,
  setViewport,
  updateDrag,
  viewportRef,
  zoomAt,
} from '../editor/editor-instance'
import { isEditableTarget } from '../editor/commands'
import { findInsertionTargetId } from '../editor/insertion-target'
import { clientToArtboardPoint, createTextNode } from '../editor/tool-insert'
import { registerViewportElements } from '../editor/viewport-controls'
import CanvasToolbar from './CanvasToolbar.vue'

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

interface PanSession {
  pointerId: number
  startPoint: Point
  startViewport: CanvasTransform
}

interface ResolvedDrop {
  target: DragDropTarget
  marker: OverlayBox
}

const DRAG_THRESHOLD = 4
const WHEEL_LINE_HEIGHT = 16

const registry = componentRegistry
const viewportEl = ref<HTMLElement | null>(null)
const surfaceEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const selectionBox = ref<OverlayBox | null>(null)
const hoverBox = ref<OverlayBox | null>(null)
const dragBox = ref<OverlayBox | null>(null)
const dropMarker = ref<OverlayBox | null>(null)
const dragStart = ref<DragStart | null>(null)
const panSession = ref<PanSession | null>(null)
const spaceHeld = ref(false)

const nodeElements = new Map<string, HTMLElement>()
let dragPointer: Point | null = null
let frameRequest: number | null = null
let suppressClick = false
let unregisterViewport: (() => void) | null = null

const page = computed<PageDefinition>(() => documentRef.value.pages[0]!)
const selectedNodeId = computed(
  () => selectionRef.value.selectedNodeIds[0] ?? null,
)
const activeTool = computed(() => activeToolRef.value)
const dragMode = computed(() => dragRef.value?.mode ?? null)
const dropTarget = computed(() => dragRef.value?.dropTarget ?? null)
const isDragging = computed(() => dragBox.value !== null)
const isPanning = computed(() => panSession.value !== null)

const zoomStyle = computed<CSSProperties>(() => ({
  transform: `translate(${viewportRef.value.offsetX}px, ${viewportRef.value.offsetY}px) scale(${viewportRef.value.scale})`,
}))

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
  const surface = surfaceEl.value
  if (!surface) return null

  const surfaceRect = surface.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left - surfaceRect.left,
    top: rect.top - surfaceRect.top,
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
  hoverBox.value = hovered && hovered !== selected ? boxFor(hovered) : null
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
  if (dragStart.value || panSession.value) return
  if (activeTool.value !== 'select') return
  const stage = stageEl.value
  if (!stage) return
  hoverNode(resolveNodeIdFromTarget(event.target, stage))
}

function handlePointerLeave(): void {
  if (dragStart.value || panSession.value) return
  hoverNode(null)
}

function handleMouseDown(event: MouseEvent): void {
  if (event.button === 1) {
    event.preventDefault()
  }
}

function startPan(event: PointerEvent): void {
  const viewport = viewportEl.value
  if (!viewport) return

  panSession.value = {
    pointerId: event.pointerId,
    startPoint: { x: event.clientX, y: event.clientY },
    startViewport: { ...viewportRef.value },
  }
  viewport.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function insertTextAt(event: PointerEvent): void {
  const stage = stageEl.value
  const targetId = findInsertionTargetId()
  if (!stage || !targetId) return

  const scale = viewportRef.value.scale
  const world = clientToArtboardPoint(
    event.clientX,
    event.clientY,
    stage.getBoundingClientRect(),
    scale,
  )
  const origin = containingOrigin(targetId)
  const node = createTextNode(world.x - origin.x, world.y - origin.y)

  insertNode(targetId, node)
  selectNode(node.id)
  setActiveTool('select')
  suppressClick = true
  event.preventDefault()
}

/**
 * Absolute descendants are positioned against their nearest positioned
 * ancestor. Returns that ancestor's artboard-space origin, or (0, 0) when the
 * artboard itself is the containing block.
 */
function containingOrigin(targetId: string): Point {
  const stage = stageEl.value
  if (!stage) return { x: 0, y: 0 }

  const index = getDocumentIndex()
  const stageRect = stage.getBoundingClientRect()
  const scale = viewportRef.value.scale
  let cursor: string | null | undefined = targetId

  while (cursor) {
    const node = index.nodeMap.get(cursor)
    if (
      node &&
      (node.style?.position === 'relative' ||
        node.style?.position === 'absolute')
    ) {
      const element = findNodeElement(cursor)
      if (element) {
        const rect = element.getBoundingClientRect()
        return {
          x: (rect.left - stageRect.left) / scale,
          y: (rect.top - stageRect.top) / scale,
        }
      }
      break
    }
    cursor = index.parentMap.get(cursor) ?? null
  }

  return { x: 0, y: 0 }
}

function handlePointerDown(event: PointerEvent): void {
  suppressClick = false

  if (
    event.button === 1 ||
    spaceHeld.value ||
    activeTool.value === 'hand'
  ) {
    startPan(event)
    return
  }
  if (event.button !== 0) return
  if (activeTool.value === 'text') {
    insertTextAt(event)
    return
  }

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

  viewportEl.value?.setPointerCapture?.(event.pointerId)
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

  const surface = surfaceEl.value
  if (!surface) return null
  const surfaceRect = surface.getBoundingClientRect()

  const isRow = style.flexDirection.startsWith('row')
  const pointerMain = isRow
    ? point.x - surfaceRect.left
    : point.y - surfaceRect.top
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
  const pan = panSession.value
  if (pan) {
    setViewport({
      scale: pan.startViewport.scale,
      offsetX:
        pan.startViewport.offsetX + (event.clientX - pan.startPoint.x),
      offsetY:
        pan.startViewport.offsetY + (event.clientY - pan.startPoint.y),
    })
    event.preventDefault()
    return
  }

  if (!dragStart.value) return
  dragPointer = { x: event.clientX, y: event.clientY }
  if (frameRequest !== null) return

  frameRequest = requestAnimationFrame(() => {
    frameRequest = null
    processDragMove()
  })
}

function releasePointer(pointerId: number): void {
  const viewport = viewportEl.value
  if (viewport?.hasPointerCapture(pointerId)) {
    viewport.releasePointerCapture(pointerId)
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
  const pan = panSession.value
  if (pan) {
    releasePointer(pan.pointerId)
    panSession.value = null
    suppressClick = true
    return
  }

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
      const scale = viewportRef.value.scale
      commit = {
        mode: 'absolute',
        left: Math.round(start.absoluteLeft + delta.x / scale),
        top: Math.round(start.absoluteTop + delta.y / scale),
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
  const pan = panSession.value
  if (pan) {
    releasePointer(pan.pointerId)
    panSession.value = null
    return
  }

  const start = dragStart.value
  if (!start) return
  releasePointer(start.pointerId)
  cancelDrag()
  resetDrag()
}

function handleWheel(event: WheelEvent): void {
  const viewport = viewportEl.value
  if (!viewport) return

  event.preventDefault()
  const factor = event.deltaMode === 1 ? WHEEL_LINE_HEIGHT : 1
  const deltaX = event.deltaX * factor
  const deltaY = event.deltaY * factor

  if (event.ctrlKey || event.metaKey) {
    const rect = viewport.getBoundingClientRect()
    const anchor = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    zoomAt(anchor, viewportRef.value.scale * Math.exp(-deltaY * 0.002))
    return
  }

  if (event.shiftKey && deltaX === 0) {
    panBy(-deltaY, 0)
    return
  }
  panBy(-deltaX, -deltaY)
}

function resetTransient(): void {
  spaceHeld.value = false
  panSession.value = null
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.code === 'Space' || event.key === ' ') {
    if (isEditableTarget(event.target)) return
    const element =
      event.target instanceof HTMLElement ? event.target : null
    if (element?.closest('button, [role="button"]')) return
    spaceHeld.value = true
    event.preventDefault()
    return
  }

  if (event.key === 'Escape') {
    const pan = panSession.value
    if (pan) {
      releasePointer(pan.pointerId)
      panSession.value = null
    }
    if (dragStart.value) {
      releasePointer(dragStart.value.pointerId)
      cancelDrag()
      resetDrag()
    }
  }
}

function handleWindowKeyup(event: KeyboardEvent): void {
  if (event.code === 'Space' || event.key === ' ') {
    spaceHeld.value = false
  }
}

function handleWindowBlur(): void {
  resetTransient()
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

watch(
  viewportRef,
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
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('keyup', handleWindowKeyup)
  window.addEventListener('blur', handleWindowBlur)

  const viewport = viewportEl.value
  const stage = stageEl.value
  if (viewport && stage) {
    unregisterViewport = registerViewportElements(viewport, stage)
    const current = viewportRef.value
    if (
      current.scale === 1 &&
      current.offsetX === 0 &&
      current.offsetY === 0
    ) {
      setViewport({
        scale: 1,
        offsetX: Math.max(24, (viewport.clientWidth - stage.offsetWidth) / 2),
        offsetY: 24,
      })
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => measure())
    if (viewport) resizeObserver.observe(viewport)
    if (stage) resizeObserver.observe(stage)
  }

  rebuildNodeElements()
  measure()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('keyup', handleWindowKeyup)
  window.removeEventListener('blur', handleWindowBlur)
  resizeObserver?.disconnect()
  unregisterViewport?.()
  if (frameRequest !== null) cancelAnimationFrame(frameRequest)
})
</script>

<template>
  <section class="canvas-panel" :data-active-tool="activeTool">
    <div
      ref="viewportEl"
      class="canvas-viewport"
      :class="{
        'is-hand': activeTool === 'hand',
        'is-text': activeTool === 'text',
        'is-panning': isPanning,
      }"
      data-testid="canvas-viewport"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @pointerover="handlePointerOver"
      @pointerleave="handlePointerLeave"
      @mousedown="handleMouseDown"
      @click="handleClick"
    >
      <div ref="surfaceEl" class="canvas-surface">
        <div class="canvas-zoom" :style="zoomStyle">
          <div ref="stageEl" class="canvas-stage" data-testid="canvas-stage">
            <VirtualUIRuntime
              :page="page"
              :registry="registry"
              :revision="revisionRef"
            />
          </div>
        </div>

        <div class="canvas-overlay-layer">
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

      <span class="canvas-status" data-testid="selection-label">
        {{ selectedNodeId ?? '未选择' }}
      </span>
    </div>

    <CanvasToolbar
      :active-tool="activeTool"
      @update:active-tool="setActiveTool"
    />
  </section>
</template>

<style scoped>
.canvas-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--color-canvas);
}

.canvas-viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--color-canvas);
  touch-action: none;
}

.canvas-viewport.is-hand {
  cursor: grab;
}

.canvas-viewport.is-panning {
  cursor: grabbing;
}

.canvas-viewport.is-text {
  cursor: crosshair;
}

.canvas-surface {
  position: absolute;
  inset: 0;
}

.canvas-zoom {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.canvas-stage {
  position: relative;
  width: var(--artboard-width);
  min-height: var(--artboard-min-height);
  background: #ffffff;
  box-shadow: var(--artboard-shadow);
  color: #111827;
  color-scheme: light;
  font-size: 16px;
}

.canvas-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.selection-box,
.hover-box,
.drag-preview,
.drop-marker {
  position: absolute;
  pointer-events: none;
}

.selection-box {
  outline: 2px solid var(--color-panel-selected);
  outline-offset: 1px;
  background: var(--color-selection-fill);
}

.hover-box {
  outline: 1px dashed rgb(47 111 221 / 80%);
  outline-offset: 1px;
}

.drag-preview {
  border: 1px solid var(--color-panel-selected);
  background: var(--color-selection-fill);
  box-shadow: 0 8px 20px rgb(0 0 0 / 30%);
}

.drag-preview[data-drag-mode='absolute'] {
  border-style: dashed;
}

.drop-marker {
  border-radius: var(--radius-pill);
  background: var(--color-panel-selected);
}

.canvas-status {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 15;
  max-width: 40%;
  overflow: hidden;
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: rgb(42 42 42 / 85%);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--text-3xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}
</style>
