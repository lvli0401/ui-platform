import { describe, expect, it, vi } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import { createDocument } from './document'
import { DocumentStore } from './document-store'
import type { UIDocument } from './types'

const loginDocument = loginPage as unknown as UIDocument

describe('DocumentStore', () => {
  it('exposes document, index and revision', () => {
    const store = new DocumentStore(loginDocument)
    expect(store.revision).toBe(0)
    expect(store.index.nodeMap.get('submit')?.component).toBe('Button')
  })

  it('replaces the document without changing revision', () => {
    const store = new DocumentStore(loginDocument)
    const next = createDocument('Next')
    next.revision = 7

    store.replaceDocument(next)

    expect(store.document).toBe(next)
    expect(store.revision).toBe(7)
    expect(store.index.nodeMap.size).toBe(1)
  })

  it('notifies subscribers until unsubscribed', () => {
    const store = new DocumentStore(loginDocument)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.replaceDocument(createDocument('A'))
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.replaceDocument(createDocument('B'))
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
