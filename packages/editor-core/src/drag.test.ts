import { describe, expect, it, vi } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import absolutePage from '../../../fixtures/absolute.page.json'
import type { UIDocument } from '@vui/core'
import { EditorStore } from './editor-store'

function clone(value: unknown): UIDocument {
  return JSON.parse(JSON.stringify(value)) as UIDocument
}

describe('EditorStore drag state', () => {
  it('tracks temporary geometry without touching the document', () => {
    const store = new EditorStore(clone(loginPage))
    const snapshot = JSON.stringify(store.document)

    store.beginDrag('submit', { x: 100, y: 100 })
    store.updateDrag({ x: 160, y: 130 }, { parentId: 'login-card', index: 0 })

    expect(store.drag).toMatchObject({
      nodeId: 'submit',
      mode: 'flex',
      startPoint: { x: 100, y: 100 },
      delta: { x: 60, y: 30 },
      dropTarget: { parentId: 'login-card', index: 0 },
    })
    expect(store.revision).toBe(0)
    expect(JSON.stringify(store.document)).toBe(snapshot)

    store.cancelDrag()
    expect(store.drag).toBeNull()
    expect(store.revision).toBe(0)
    expect(JSON.stringify(store.document)).toBe(snapshot)
  })

  it('commits a flex drag as one move command', () => {
    const store = new EditorStore(clone(loginPage))

    store.beginDrag('submit', { x: 0, y: 0 })
    store.updateDrag({ x: 0, y: -80 }, { parentId: 'login-card', index: 0 })
    const committed = store.commitDrag({
      mode: 'flex',
      parentId: 'login-card',
      index: 0,
    })

    expect(committed).toBe(true)
    expect(store.drag).toBeNull()
    expect(store.revision).toBe(1)
    expect(store.index.childrenMap.get('login-card')).toEqual([
      'submit',
      'login-title',
      'username',
      'password',
    ])

    store.undo()
    expect(store.revision).toBe(0)
    expect(store.index.childrenMap.get('login-card')).toEqual([
      'login-title',
      'username',
      'password',
      'submit',
    ])
  })

  it('commits an absolute drag as one style command', () => {
    const store = new EditorStore(clone(absolutePage))

    store.beginDrag('absolute-card', { x: 100, y: 100 })
    expect(store.drag?.mode).toBe('absolute')

    store.updateDrag({ x: 200, y: 180 })
    store.commitDrag({ mode: 'absolute', left: 180, top: 140 })

    const card = store.index.nodeMap.get('absolute-card')
    expect(card?.style?.left).toBe(180)
    expect(card?.style?.top).toBe(140)
    expect(store.revision).toBe(1)

    store.undo()
    expect(store.index.nodeMap.get('absolute-card')?.style?.left).toBe(80)
    expect(store.index.nodeMap.get('absolute-card')?.style?.top).toBe(60)
  })

  it('aborts a drag commit without changing the document', () => {
    const store = new EditorStore(clone(loginPage))
    const listener = vi.fn()
    store.subscribe(listener)

    store.beginDrag('submit', { x: 0, y: 0 })
    store.updateDrag({ x: 20, y: 0 })
    expect(store.commitDrag(null)).toBe(false)

    expect(store.drag).toBeNull()
    expect(store.revision).toBe(0)
    expect(listener).toHaveBeenCalled()
  })

  it('rejects dragging missing nodes and mode mismatches', () => {
    const store = new EditorStore(clone(loginPage))
    expect(() => store.beginDrag('missing', { x: 0, y: 0 })).toThrow(
      /missing node/,
    )

    store.beginDrag('submit', { x: 0, y: 0 })
    expect(() =>
      store.commitDrag({ mode: 'absolute', left: 1, top: 1 }),
    ).toThrow(/cannot commit/)
    expect(store.drag).toBeNull()
  })
})
