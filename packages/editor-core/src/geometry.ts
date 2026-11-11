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
