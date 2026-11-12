import { describe, expect, it, vi } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import type { UIDocument } from '@vui/core'
import { EditorStore } from './editor-store'

const loginDocument = loginPage as unknown as UIDocument

function clone(): UIDocument {
  return JSON.parse(JSON.stringify(loginDocument)) as UIDocument
}

describe('EditorStore viewport', () => {
  it('starts at the identity transform', () => {
    const store = new EditorStore(clone())

    expect(store.canvasTransform).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('clamps scale and ignores non-finite offsets', () => {
    const store = new EditorStore(clone())

    store.setViewport({ scale: 9, offsetX: Number.NaN, offsetY: 12 })

    expect(store.canvasTransform).toEqual({
      scale: 4,
      offsetX: 0,
      offsetY: 12,
    })
  })

  it('pans without touching the document or history', () => {
    const store = new EditorStore(clone())
    const snapshot = JSON.stringify(store.document)

    store.panBy(30, -20)

    expect(store.canvasTransform.offsetX).toBe(30)
    expect(store.canvasTransform.offsetY).toBe(-20)
    expect(store.revision).toBe(0)
    expect(store.canUndo).toBe(false)
    expect(JSON.stringify(store.document)).toBe(snapshot)
  })

  it('zooms around an anchor and preserves the anchored world point', () => {
    const store = new EditorStore(clone())
    store.setViewport({ scale: 1, offsetX: 100, offsetY: 50 })

    const anchor = { x: 400, y: 300 }
    const world = {
      x: (anchor.x - 100) / 1,
      y: (anchor.y - 50) / 1,
    }
    store.zoomAt(anchor, 2)

    const transform = store.canvasTransform
    expect(transform.scale).toBe(2)
    expect(transform.offsetX + world.x * transform.scale).toBeCloseTo(
      anchor.x,
    )
    expect(transform.offsetY + world.y * transform.scale).toBeCloseTo(
      anchor.y,
    )
  })

  it('only notifies when the viewport actually changes', () => {
    const store = new EditorStore(clone())
    const listener = vi.fn()
    store.subscribe(listener)

    store.setViewport({ scale: 1, offsetX: 0, offsetY: 0 })
    expect(listener).not.toHaveBeenCalled()

    store.setViewport({ scale: 1, offsetX: 10, offsetY: 0 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('resets to the identity transform', () => {
    const store = new EditorStore(clone())
    store.setViewport({ scale: 2, offsetX: 40, offsetY: 60 })

    store.resetViewport()

    expect(store.canvasTransform).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
  })
})

describe('EditorStore tools', () => {
  it('defaults to the select tool and switches tools', () => {
    const store = new EditorStore(clone())
    expect(store.activeTool).toBe('select')

    store.setActiveTool('text')
    expect(store.activeTool).toBe('text')

    store.setActiveTool('text')
    expect(store.activeTool).toBe('text')
  })

  it('resets selection, drag, and tool on replaceDocument but keeps the viewport', () => {
    const store = new EditorStore(clone())
    store.select('submit')
    store.beginDrag('submit', { x: 0, y: 0 })
    store.setActiveTool('hand')
    store.setViewport({ scale: 2, offsetX: 10, offsetY: 20 })

    store.replaceDocument(clone())

    expect(store.selection.selectedNodeIds).toEqual([])
    expect(store.selection.hoveredNodeId).toBeNull()
    expect(store.drag).toBeNull()
    expect(store.activeTool).toBe('select')
    expect(store.canvasTransform).toEqual({
      scale: 2,
      offsetX: 10,
      offsetY: 20,
    })
  })
})
