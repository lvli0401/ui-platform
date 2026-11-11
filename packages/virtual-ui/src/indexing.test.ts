import { describe, expect, it } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import {
  assertIndexInvariants,
  buildDocumentIndex,
  findNode,
  findParentNode,
  getNodePath,
} from './indexing'
import type { UIDocument, UINode } from './types'

const loginDocument = loginPage as unknown as UIDocument

function randomDocument(nodeCount: number): UIDocument {
  const root: UINode = { id: 'n0', type: 'fragment', children: [] }
  const nodes: UINode[] = [root]

  for (let index = 1; index < nodeCount; index += 1) {
    const parent = nodes[Math.floor(Math.random() * nodes.length)]
    const node: UINode = {
      id: `n${index}`,
      type: 'element',
      tag: 'div',
    }
    parent.children ??= []
    parent.children.push(node)
    nodes.push(node)
  }

  return {
    schemaVersion: '0.1.0',
    id: 'doc-random',
    name: 'Random',
    revision: 0,
    pages: [{ id: 'page-random', name: 'Random', root }],
  }
}

describe('buildDocumentIndex', () => {
  it('indexes the login page tree', () => {
    const index = buildDocumentIndex(loginDocument)

    expect(index.nodeMap.size).toBe(6)
    expect(findNode(index, 'submit')?.component).toBe('Button')
    expect(findParentNode(index, 'submit')?.id).toBe('login-card')
    expect(index.childrenMap.get('login-card')).toEqual([
      'login-title',
      'username',
      'password',
      'submit',
    ])
    expect(index.parentMap.get('login-root')).toBeNull()
    expect(index.pageRootMap.get('page-login')).toBe('login-root')
    expect(index.nodePageMap.get('submit')).toBe('page-login')
  })

  it('builds a consistent index for 500 random nodes', () => {
    const document = randomDocument(500)
    const index = buildDocumentIndex(document)

    expect(index.nodeMap.size).toBe(500)
    expect(() => assertIndexInvariants(document, index)).not.toThrow()
  })

  it('returns the path from page root to node', () => {
    const index = buildDocumentIndex(loginDocument)
    expect(getNodePath(index, 'submit')).toEqual([
      'login-root',
      'login-card',
      'submit',
    ])
    expect(getNodePath(index, 'missing')).toEqual([])
  })
})

describe('assertIndexInvariants', () => {
  it('detects a corrupted parent entry', () => {
    const index = buildDocumentIndex(loginDocument)
    index.parentMap.set('submit', 'username')

    expect(() => assertIndexInvariants(loginDocument, index)).toThrow(
      /parent mismatch|does not point back/,
    )
  })

  it('detects duplicate node ids', () => {
    const document = randomDocument(10)
    const index = buildDocumentIndex(document)
    const root = document.pages[0].root
    const firstChild = root.children?.[0]
    const secondChild = root.children?.[1]

    expect(firstChild).toBeDefined()
    expect(secondChild).toBeDefined()
    if (!firstChild || !secondChild) return
    secondChild.id = firstChild.id

    expect(() => assertIndexInvariants(document, index)).toThrow(/duplicate/)
  })

  it('detects a missing node entry', () => {
    const index = buildDocumentIndex(loginDocument)
    index.nodeMap.delete('submit')

    expect(() => assertIndexInvariants(loginDocument, index)).toThrow(
      /indexed/,
    )
  })
})
