export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export const IDENTITY_TRANSFORM: CanvasTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

export const MIN_SCALE = 0.1
export const MAX_SCALE = 4
export const ZOOM_STEPS: readonly number[] = [
  0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4,
]

export interface Size {
  width: number
  height: number
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * Zooms around an anchor expressed in viewport-local screen pixels.
 * The world point under the anchor stays fixed:
 * offset' = anchor - (anchor - offset) * (scale' / scale).
 */
export function zoomAtPoint(
  transform: CanvasTransform,
  anchor: Point,
  nextScale: number,
): CanvasTransform {
  const scale = clampScale(nextScale)
  const ratio = scale / transform.scale
  return {
    scale,
    offsetX: anchor.x - (anchor.x - transform.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - transform.offsetY) * ratio,
  }
}

export function fitTransform(
  viewport: Size,
  content: Size,
  padding = 48,
): CanvasTransform {
  const availableWidth = Math.max(1, viewport.width - padding * 2)
  const availableHeight = Math.max(1, viewport.height - padding * 2)
  const contentWidth = Math.max(1, content.width)
  const contentHeight = Math.max(1, content.height)
  const scale = clampScale(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
  )

  return {
    scale,
    offsetX: (viewport.width - contentWidth * scale) / 2,
    offsetY: (viewport.height - contentHeight * scale) / 2,
  }
}

export function nextZoomStep(scale: number, direction: 1 | -1): number {
  if (direction === 1) {
    return ZOOM_STEPS.find((step) => step > scale + 0.001) ?? MAX_SCALE
  }
  let previous = MIN_SCALE
  for (const step of ZOOM_STEPS) {
    if (step >= scale - 0.001) break
    previous = step
  }
  return previous
}

export function toCanvasRect(
  clientRect: DOMRect,
  canvasRect: DOMRect,
  transform: CanvasTransform,
): Rect {
  return {
    x: (clientRect.left - canvasRect.left) / transform.scale - transform.offsetX,
    y: (clientRect.top - canvasRect.top) / transform.scale - transform.offsetY,
    width: clientRect.width / transform.scale,
    height: clientRect.height / transform.scale,
  }
}
