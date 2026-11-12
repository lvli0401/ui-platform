import type { CanvasTransform, Point, Size } from '@vui/editor-core'
import { fitTransform, nextZoomStep } from '@vui/editor-core'
import { setViewport, viewportRef, zoomAt } from './editor-instance'

let viewportEl: HTMLElement | null = null
let stageEl: HTMLElement | null = null

export function registerViewportElements(
  viewport: HTMLElement,
  stage: HTMLElement,
): () => void {
  viewportEl = viewport
  stageEl = stage
  return () => {
    if (viewportEl === viewport) viewportEl = null
    if (stageEl === stage) stageEl = null
  }
}

function getViewportSize(): Size | null {
  if (!viewportEl) return null
  return {
    width: viewportEl.clientWidth,
    height: viewportEl.clientHeight,
  }
}

export function getViewportCenter(): Point | null {
  const size = getViewportSize()
  if (!size) return null
  return { x: size.width / 2, y: size.height / 2 }
}

export function getZoomPercent(): number {
  return Math.round(viewportRef.value.scale * 100)
}

export function zoomToPercent(percent: number): void {
  const center = getViewportCenter()
  if (!center) return
  zoomAt(center, percent / 100)
}

export function zoomIn(): void {
  const center = getViewportCenter()
  if (!center) return
  zoomAt(center, nextZoomStep(viewportRef.value.scale, 1))
}

export function zoomOut(): void {
  const center = getViewportCenter()
  if (!center) return
  zoomAt(center, nextZoomStep(viewportRef.value.scale, -1))
}

export function resetZoom(): void {
  zoomToPercent(100)
}

export function fitToPage(): void {
  const size = getViewportSize()
  if (!size || !stageEl) return

  const transform: CanvasTransform = fitTransform(size, {
    width: stageEl.offsetWidth,
    height: stageEl.offsetHeight,
  })
  setViewport(transform)
}
