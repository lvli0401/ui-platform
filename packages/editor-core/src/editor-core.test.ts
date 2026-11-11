import { describe, expect, it, vi } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import type { UIDocument } from '@vui/core'
import { assertNoEditorState } from './assert-no-editor-state'
import { EditorStore } from './editor-store'
import { toCanvasRect } from './geometry'
import { resolveNodeIdFromTarget } from './selection'

const loginDocument = loginPage as unknown as UIDocument

function clone(): UIDocument {
  return JSON.parse(JSON.stringify(loginDocument)) as UIDocument
}

describe('EditorStore selection', () => {
  it('selects and clears a node without touching the document', () => {
    const store = new EditorStore(clone())
    const snapshot = JSON.stringify(store.document)

    store.select('submit')
    expect(store.selection.selectedNodeIds).toEqual(['submit'])
    expect(store.revision).toBe(0)
    expect(JSON.stringify(store.document)).toBe(snapshot)

    store.select(null)
    expect(store.selection.selectedNodeIds).toEqual([])
  })

  it('tracks hover and clears it for missing nodes', () => {
    const store = new EditorStore(clone())
    store.hover('username')
    expect(store.selection.hoveredNodeId).toBe('username')

    store.hover('missing')
    expect(store.selection.hoveredNodeId).toBeNull()
  })

  it('rejects selecting a missing node', () => {
    const store = new EditorStore(clone())
    expect(() => store.select('missing')).toThrow(/missing node/)
  })

  it('clears selection when the selected subtree is deleted', () => {
    const store = new EditorStore(clone())
    store.select('submit')
    store.deleteNode('login-card')

    expect(store.selection.selectedNodeIds).toEqual([])
    expect(store.revision).toBe(1)

    store.undo()
    expect(store.selection.selectedNodeIds).toEqual([])
    expect(store.index.nodeMap.has('submit')).toBe(true)
  })

  it('notifies subscribers for selection and document changes', () => {
    const store = new EditorStore(clone())
    const listener = vi.fn()
    store.subscribe(listener)

    store.select('submit')
    store.updateProps('submit', { label: 'Go' })
    store.select(null)

    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('prunes hovered state when the hovered node disappears', () => {
    const store = new EditorStore(clone())
    store.hover('username')
    store.deleteNode('username')
    expect(store.selection.hoveredNodeId).toBeNull()
  })
})

describe('resolveNodeIdFromTarget', () => {
  it('finds the nearest data-node-id inside the canvas', () => {
    const canvas = document.createElement('div')
    const button = document.createElement('button')
    button.setAttribute('data-node-id', 'submit')
    const label = document.createElement('span')
    button.append(label)
    canvas.append(button)
    document.body.append(canvas)

    expect(resolveNodeIdFromTarget(label, canvas)).toBe('submit')
    expect(resolveNodeIdFromTarget(button, canvas)).toBe('submit')
    expect(resolveNodeIdFromTarget(canvas, canvas)).toBeNull()

    canvas.remove()
  })

  it('ignores nodes outside the canvas', () => {
    const canvas = document.createElement('div')
    const outside = document.createElement('div')
    outside.setAttribute('data-node-id', 'outside')
    document.body.append(canvas, outside)

    expect(resolveNodeIdFromTarget(outside, canvas)).toBeNull()

    canvas.remove()
    outside.remove()
  })

  it('returns null for null targets', () => {
    const canvas = document.createElement('div')
    expect(resolveNodeIdFromTarget(null, canvas)).toBeNull()
  })
})

describe('assertNoEditorState', () => {
  it('accepts a clean document', () => {
    expect(() => assertNoEditorState(clone())).not.toThrow()
  })

  it('rejects editor state embedded in the document', () => {
    const document = clone() as UIDocument & {
      pages: Array<{ root: Record<string, unknown> }>
    }
    document.pages[0].root.selectedNodeIds = ['submit']

    expect(() => assertNoEditorState(document)).toThrow(/selectedNodeIds/)
  })
})

describe('toCanvasRect', () => {
  it('converts client coordinates into canvas document coordinates', () => {
    const rect = toCanvasRect(
      { left: 150, top: 220, width: 100, height: 50 } as DOMRect,
      { left: 100, top: 200 } as DOMRect,
      { scale: 2, offsetX: 5, offsetY: 10 },
    )

    expect(rect).toEqual({
      x: 20,
      y: 0,
      width: 50,
      height: 25,
    })
  })
})
