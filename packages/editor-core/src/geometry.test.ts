import { describe, expect, it } from 'vitest'
import {
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  fitTransform,
  nextZoomStep,
  toCanvasRect,
  zoomAtPoint,
} from './geometry'

describe('clampScale', () => {
  it('clamps to the supported zoom range', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE)
    expect(clampScale(10)).toBe(MAX_SCALE)
    expect(clampScale(0.5)).toBe(0.5)
  })

  it('falls back to 100% for non-finite values', () => {
    expect(clampScale(Number.NaN)).toBe(1)
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(1)
  })
})

describe('zoomAtPoint', () => {
  it('keeps the world point under the anchor fixed', () => {
    const transform = { scale: 1, offsetX: 100, offsetY: 50 }
    const anchor = { x: 400, y: 300 }
    const world = {
      x: (anchor.x - transform.offsetX) / transform.scale,
      y: (anchor.y - transform.offsetY) / transform.scale,
    }

    const next = zoomAtPoint(transform, anchor, 2)

    expect(next.scale).toBe(2)
    expect(next.offsetX + world.x * next.scale).toBeCloseTo(anchor.x)
    expect(next.offsetY + world.y * next.scale).toBeCloseTo(anchor.y)
  })

  it('clamps the requested scale before computing offsets', () => {
    const next = zoomAtPoint({ scale: 1, offsetX: 0, offsetY: 0 }, { x: 0, y: 0 }, 99)

    expect(next.scale).toBe(MAX_SCALE)
    expect(next.offsetX).toBe(0)
    expect(next.offsetY).toBe(0)
  })
})

describe('fitTransform', () => {
  it('centers the content with padding inside the viewport', () => {
    const transform = fitTransform(
      { width: 1000, height: 800 },
      { width: 1024, height: 768 },
      48,
    )

    expect(transform.scale).toBeCloseTo(904 / 1024)
    expect(
      transform.offsetX + (1024 * transform.scale) / 2,
    ).toBeCloseTo(500)
    expect(
      transform.offsetY + (768 * transform.scale) / 2,
    ).toBeCloseTo(400)
  })

  it('never clamps below the minimum zoom', () => {
    const transform = fitTransform(
      { width: 100, height: 100 },
      { width: 100000, height: 100000 },
    )

    expect(transform.scale).toBe(MIN_SCALE)
  })
})

describe('nextZoomStep', () => {
  it('walks up and down the preset ladder', () => {
    expect(nextZoomStep(1, 1)).toBe(1.5)
    expect(nextZoomStep(1, -1)).toBe(0.75)
    expect(nextZoomStep(4, 1)).toBe(MAX_SCALE)
    expect(nextZoomStep(MIN_SCALE, -1)).toBe(MIN_SCALE)
  })

  it('moves off a value between presets in both directions', () => {
    expect(nextZoomStep(1.1, 1)).toBe(1.5)
    expect(nextZoomStep(1.1, -1)).toBe(1)
  })
})

describe('toCanvasRect', () => {
  it('maps a client rect into canvas world coordinates', () => {
    expect(
      toCanvasRect(
        new DOMRect(120, 80, 200, 100),
        new DOMRect(20, 30, 800, 600),
        { scale: 2, offsetX: 10, offsetY: 20 },
      ),
    ).toEqual({ x: 40, y: 5, width: 100, height: 50 })
  })
})
