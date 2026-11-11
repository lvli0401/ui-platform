import { describe, expect, it } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import {
  DeleteNodeCommand,
  InsertNodeCommand,
  MoveNodeCommand,
  UpdatePropsCommand,
  UpdateStyleCommand,
} from './commands'
import { DocumentStore } from './document-store'
import { assertIndexInvariants } from './indexing'
import type { UIDocument, UINode } from './types'

function cloneLogin(): UIDocument {
  return JSON.parse(JSON.stringify(loginPage)) as UIDocument
}

function nodeById(store: DocumentStore, id: string): UINode {
  const node = store.index.nodeMap.get(id)
  if (!node) throw new Error(`missing node ${id}`)
  return node
}

function childIds(store: DocumentStore, id: string): string[] {
  return store.index.childrenMap.get(id) ?? []
}

describe('commands and history', () => {
  it('updates props and restores them on undo', () => {
    const store = new DocumentStore(cloneLogin())
    const initial = JSON.parse(JSON.stringify(store.document)) as UIDocument

    store.dispatch(new UpdatePropsCommand('submit', { label: 'Sign in' }))

    expect(nodeById(store, 'submit').props?.label).toBe('Sign in')
    expect(store.revision).toBe(1)
    assertIndexInvariants(store.document, store.index)

    expect(store.undo()).toBe(true)
    expect(store.document).toEqual(initial)
    expect(store.revision).toBe(0)

    expect(store.redo()).toBe(true)
    expect(nodeById(store, 'submit').props?.label).toBe('Sign in')
    expect(store.revision).toBe(1)
  })

  it('updates styles and restores them on undo', () => {
    const store = new DocumentStore(cloneLogin())

    store.dispatch(
      new UpdateStyleCommand('username', { backgroundColor: '#ff0000' }),
    )
    expect(nodeById(store, 'username').style?.backgroundColor).toBe('#ff0000')

    store.undo()
    expect(nodeById(store, 'username').style?.backgroundColor).toBeUndefined()
  })

  it('inserts a node at the requested index and undoes it', () => {
    const store = new DocumentStore(cloneLogin())
    const node: UINode = {
      id: 'inserted',
      type: 'component',
      component: 'Input',
      props: { placeholder: 'Inserted' },
    }

    store.dispatch(new InsertNodeCommand('login-card', node, 1))

    expect(childIds(store, 'login-card')).toEqual([
      'login-title',
      'inserted',
      'username',
      'password',
      'submit',
    ])
    assertIndexInvariants(store.document, store.index)

    store.undo()
    expect(childIds(store, 'login-card')).toEqual([
      'login-title',
      'username',
      'password',
      'submit',
    ])
  })

  it('deletes a subtree and restores it completely on undo', () => {
    const store = new DocumentStore(cloneLogin())
    const originalCard = JSON.parse(
      JSON.stringify(nodeById(store, 'login-card')),
    ) as UINode

    store.dispatch(new DeleteNodeCommand('login-card'))
    expect(store.index.nodeMap.has('login-card')).toBe(false)
    expect(store.index.nodeMap.has('submit')).toBe(false)

    store.undo()
    expect(nodeById(store, 'login-card')).toEqual(originalCard)
    expect(store.index.nodeMap.has('submit')).toBe(true)
  })

  it('moves a node across parents and undoes the move', () => {
    const store = new DocumentStore(cloneLogin())

    store.dispatch(new MoveNodeCommand('username', 'login-root', 0))

    expect(childIds(store, 'login-root')).toEqual(['username', 'login-card'])
    expect(store.index.parentMap.get('username')).toBe('login-root')
    assertIndexInvariants(store.document, store.index)

    store.undo()
    expect(childIds(store, 'login-root')).toEqual(['login-card'])
    expect(childIds(store, 'login-card')).toEqual([
      'login-title',
      'username',
      'password',
      'submit',
    ])
  })

  it('rejects moving a node into its own descendant without recording history', () => {
    const store = new DocumentStore(cloneLogin())

    expect(() =>
      store.dispatch(new MoveNodeCommand('login-card', 'username', 0)),
    ).toThrow(/descendant/)

    expect(store.revision).toBe(0)
    expect(store.canUndo).toBe(false)
  })

  it('does not record failed commands', () => {
    const store = new DocumentStore(cloneLogin())

    expect(() =>
      store.dispatch(new UpdatePropsCommand('missing', { label: 'x' })),
    ).toThrow(/does not exist/)

    expect(store.revision).toBe(0)
    expect(store.canUndo).toBe(false)
  })

  it('undoes 50 random mixed operations back to the initial document', () => {
    const store = new DocumentStore(cloneLogin())
    const initial = JSON.parse(JSON.stringify(store.document)) as UIDocument
    let executed = 0
    let inserted = 0

    for (let step = 0; step < 50; step += 1) {
      const ids = [...store.index.nodeMap.keys()]
      const randomId = ids[Math.floor(Math.random() * ids.length)]
      const operation = step % 5

      try {
        if (operation === 0) {
          store.dispatch(new UpdatePropsCommand(randomId, { [`step${step}`]: step }))
          executed += 1
        } else if (operation === 1) {
          store.dispatch(
            new UpdateStyleCommand(randomId, { opacity: (step % 10) / 10 }),
          )
          executed += 1
        } else if (operation === 2) {
          const parentCandidates = ids.filter(
            (id) => store.index.nodeMap.get(id)?.type !== 'text',
          )
          const parentId =
            parentCandidates[Math.floor(Math.random() * parentCandidates.length)]
          inserted += 1
          store.dispatch(
            new InsertNodeCommand(parentId, {
              id: `random-insert-${inserted}`,
              type: 'element',
              tag: 'div',
            }),
          )
          executed += 1
        } else if (operation === 3) {
          const deletable = ids.filter((id) => store.index.parentMap.get(id))
          if (deletable.length === 0) continue
          const targetId = deletable[Math.floor(Math.random() * deletable.length)]
          store.dispatch(new DeleteNodeCommand(targetId))
          executed += 1
        } else {
          const movable = ids.filter((id) => store.index.parentMap.get(id))
          const targets = ids.filter(
            (id) => store.index.nodeMap.get(id)?.type !== 'text',
          )
          const nodeId = movable[Math.floor(Math.random() * movable.length)]
          const parentId = targets[Math.floor(Math.random() * targets.length)]
          store.dispatch(new MoveNodeCommand(nodeId, parentId, 0))
          executed += 1
        }
      } catch {
        // Invalid random combinations are expected; failed commands must not
        // alter revision or history.
      }

      expect(store.revision).toBe(executed)
      assertIndexInvariants(store.document, store.index)
    }

    while (store.undo()) {
      // Drain history.
    }

    expect(store.revision).toBe(0)
    expect(store.document).toEqual(initial)
  })
})
