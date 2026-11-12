import {
  canNodeAcceptChildren,
  documentRef,
  getDocumentIndex,
  selectionRef,
} from './editor-instance'

/**
 * Resolves where a new node should be inserted: the selected container, the
 * nearest ancestor that accepts children, or the page root.
 */
export function findInsertionTargetId(
  selectedId: string | null = selectionRef.value.selectedNodeIds[0] ?? null,
): string | null {
  const index = getDocumentIndex()
  const selected = selectedId ? index.nodeMap.get(selectedId) : undefined
  if (selected && canNodeAcceptChildren(selected)) return selected.id

  let ancestorId = selectedId
    ? (index.parentMap.get(selectedId) ?? null)
    : null
  while (ancestorId) {
    const ancestor = index.nodeMap.get(ancestorId)
    if (ancestor && canNodeAcceptChildren(ancestor)) return ancestor.id
    ancestorId = index.parentMap.get(ancestorId) ?? null
  }

  return documentRef.value.pages[0]?.root.id ?? null
}
