import type { UIDocument, UINode } from './types'

export interface DocumentIndex {
  nodeMap: Map<string, UINode>
  parentMap: Map<string, string | null>
  childrenMap: Map<string, string[]>
  pageRootMap: Map<string, string>
  nodePageMap: Map<string, string>
}

function visit(
  node: UINode,
  parentId: string | null,
  pageId: string,
  index: DocumentIndex,
): void {
  index.nodeMap.set(node.id, node)
  index.parentMap.set(node.id, parentId)
  index.nodePageMap.set(node.id, pageId)
  if (!index.childrenMap.has(node.id)) {
    index.childrenMap.set(node.id, [])
  }

  if (!node.children || node.children.length === 0) return

  const childIds: string[] = []
  for (const child of node.children) {
    childIds.push(child.id)
    visit(child, node.id, pageId, index)
  }
  index.childrenMap.set(node.id, childIds)
}

export function buildDocumentIndex(document: UIDocument): DocumentIndex {
  const index: DocumentIndex = {
    nodeMap: new Map(),
    parentMap: new Map(),
    childrenMap: new Map(),
    pageRootMap: new Map(),
    nodePageMap: new Map(),
  }

  for (const page of document.pages) {
    index.pageRootMap.set(page.id, page.root.id)
    visit(page.root, null, page.id, index)
  }

  return index
}

export function findNode(
  index: DocumentIndex,
  id: string,
): UINode | undefined {
  return index.nodeMap.get(id)
}

export function findParentNode(
  index: DocumentIndex,
  id: string,
): UINode | null {
  const parentId = index.parentMap.get(id)
  if (!parentId) return null
  return index.nodeMap.get(parentId) ?? null
}

export function getNodePath(index: DocumentIndex, id: string): string[] {
  if (!index.nodeMap.has(id)) return []
  const path: string[] = []
  let currentId: string | null | undefined = id
  while (currentId) {
    path.unshift(currentId)
    currentId = index.parentMap.get(currentId)
  }
  return path
}

function collectTreeIds(node: UINode, ids: Set<string>): void {
  if (ids.has(node.id)) {
    throw new Error(`Index invariant failed: duplicate node id "${node.id}".`)
  }
  ids.add(node.id)
  node.children?.forEach((child) => collectTreeIds(child, ids))
}

function assertSameIds(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
): void {
  if (actual.length !== expected.length) {
    throw new Error(
      `Index invariant failed: ${label} length ${actual.length} !== ${expected.length}.`,
    )
  }
  for (let position = 0; position < actual.length; position += 1) {
    if (actual[position] !== expected[position]) {
      throw new Error(
        `Index invariant failed: ${label}[${position}] "${actual[position]}" !== "${expected[position]}".`,
      )
    }
  }
}

/**
 * Rebuilds the index and verifies that the incremental index agrees with the
 * document tree. Throws on the first inconsistency.
 */
export function assertIndexInvariants(
  document: UIDocument,
  index: DocumentIndex,
): void {
  const reachableIds = new Set<string>()
  for (const page of document.pages) {
    collectTreeIds(page.root, reachableIds)
  }

  if (reachableIds.size !== index.nodeMap.size) {
    throw new Error(
      `Index invariant failed: reachable ${reachableIds.size} nodes, indexed ${index.nodeMap.size}.`,
    )
  }

  const fresh = buildDocumentIndex(document)

  for (const id of reachableIds) {
    if (!index.nodeMap.has(id)) {
      throw new Error(`Index invariant failed: node "${id}" is missing from nodeMap.`)
    }
    if (!index.parentMap.has(id)) {
      throw new Error(`Index invariant failed: node "${id}" is missing from parentMap.`)
    }
    if (!index.nodePageMap.has(id)) {
      throw new Error(`Index invariant failed: node "${id}" is missing from nodePageMap.`)
    }
    if (!index.childrenMap.has(id)) {
      throw new Error(`Index invariant failed: node "${id}" is missing from childrenMap.`)
    }

    const parentId = index.parentMap.get(id) ?? null
    const freshParentId = fresh.parentMap.get(id) ?? null
    if (parentId !== freshParentId) {
      throw new Error(`Index invariant failed: parent mismatch for node "${id}".`)
    }

    assertSameIds(
      `childrenMap("${id}")`,
      index.childrenMap.get(id) ?? [],
      fresh.childrenMap.get(id) ?? [],
    )

    const pageId = index.nodePageMap.get(id)
    if (pageId !== fresh.nodePageMap.get(id)) {
      throw new Error(`Index invariant failed: page mismatch for node "${id}".`)
    }

    for (const childId of index.childrenMap.get(id) ?? []) {
      if (index.parentMap.get(childId) !== id) {
        throw new Error(
          `Index invariant failed: child "${childId}" does not point back to parent "${id}".`,
        )
      }
    }
  }
}
