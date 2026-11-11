import { buildDocumentIndex } from '../indexing'
import type { UINode } from '../types'
import type { CommandState } from './types'

export function requireNode(state: CommandState, nodeId: string): UINode {
  const node = state.index.nodeMap.get(nodeId)
  if (!node) {
    throw new Error(`Node "${nodeId}" does not exist.`)
  }
  return node
}

export function requireParent(
  state: CommandState,
  nodeId: string,
): { parentId: string; index: number } {
  const parentId = state.index.parentMap.get(nodeId)
  if (!parentId) {
    throw new Error(`Node "${nodeId}" has no parent and cannot be moved or removed.`)
  }
  const siblings = state.index.childrenMap.get(parentId) ?? []
  const index = siblings.indexOf(nodeId)
  if (index === -1) {
    throw new Error(`Node "${nodeId}" is not present in parent "${parentId}".`)
  }
  return { parentId, index }
}

export function assertNodeAcceptsChildren(node: UINode): void {
  if (node.type === 'text') {
    throw new Error(`Text node "${node.id}" cannot contain children.`)
  }
}

export function collectSubtreeIds(node: UINode, result: string[] = []): string[] {
  result.push(node.id)
  node.children?.forEach((child) => collectSubtreeIds(child, result))
  return result
}

export function assertNoIdCollision(state: CommandState, node: UINode): void {
  for (const id of collectSubtreeIds(node)) {
    if (state.index.nodeMap.has(id)) {
      throw new Error(`Node id "${id}" already exists.`)
    }
  }
}

export function refreshIndex(state: CommandState): void {
  const fresh = buildDocumentIndex(state.document)
  replaceMap(state.index.nodeMap, fresh.nodeMap)
  replaceMap(state.index.parentMap, fresh.parentMap)
  replaceMap(state.index.childrenMap, fresh.childrenMap)
  replaceMap(state.index.pageRootMap, fresh.pageRootMap)
  replaceMap(state.index.nodePageMap, fresh.nodePageMap)
}

function replaceMap<K, V>(target: Map<K, V>, source: Map<K, V>): void {
  target.clear()
  for (const [key, value] of source) {
    target.set(key, value)
  }
}

export function removeChild(
  state: CommandState,
  parentId: string,
  nodeId: string,
): number {
  const parent = requireNode(state, parentId)
  const children = parent.children ?? []
  const index = children.findIndex((child) => child.id === nodeId)
  if (index === -1) {
    throw new Error(`Node "${nodeId}" is not a child of "${parentId}".`)
  }
  children.splice(index, 1)
  return index
}

export function insertChild(
  state: CommandState,
  parentId: string,
  node: UINode,
  index: number,
): void {
  const parent = requireNode(state, parentId)
  assertNodeAcceptsChildren(parent)
  parent.children ??= []
  const safeIndex = Math.max(0, Math.min(index, parent.children.length))
  parent.children.splice(safeIndex, 0, node)
}
