import { ref, shallowRef } from 'vue'
import type {
  DocumentIndex,
  JsonValue,
  UIDocument,
  UINode,
  UIStyle,
} from '@vui/core'
import type {
  DragCommit,
  DragDropTarget,
  Point,
  SelectionState,
} from '@vui/editor-core'
import { EditorStore } from '@vui/editor-core'
import { createBasicRegistry } from '@vui/runtime-vue'
import loginDocument from '../../../../fixtures/login.page.json'

const initialDocument = loginDocument as unknown as UIDocument

const store = new EditorStore(initialDocument)

export const componentRegistry = createBasicRegistry()

export const documentRef = shallowRef<UIDocument>(store.document)
export const revisionRef = ref(store.revision)
export const selectionRef = shallowRef<SelectionState>(store.selection)
export const canUndoRef = ref(store.canUndo)
export const canRedoRef = ref(store.canRedo)
export const dragRef = shallowRef(store.drag)

store.subscribe(() => {
  documentRef.value = store.document
  revisionRef.value = store.revision
  selectionRef.value = store.selection
  canUndoRef.value = store.canUndo
  canRedoRef.value = store.canRedo
  dragRef.value = store.drag
})

export function selectNode(nodeId: string | null): void {
  store.select(nodeId)
}

export function hoverNode(nodeId: string | null): void {
  store.hover(nodeId)
}

export function updateNodeProps(
  nodeId: string,
  patch: Record<string, JsonValue>,
): void {
  store.updateProps(nodeId, patch)
}

export function updateNodeStyle(nodeId: string, patch: Partial<UIStyle>): void {
  store.updateStyle(nodeId, patch)
}

export function replaceDocument(document: UIDocument): void {
  store.replaceDocument(document)
}

export function getDocumentIndex(): Readonly<DocumentIndex> {
  return store.index
}

export function insertNode(
  parentId: string,
  node: UINode,
  index?: number,
): void {
  store.insertNode(parentId, node, index)
}

export function deleteNode(nodeId: string): void {
  store.deleteNode(nodeId)
}

export function moveNode(
  nodeId: string,
  parentId: string,
  index: number,
): void {
  store.moveNode(nodeId, parentId, index)
}

export function canNodeAcceptChildren(node: UINode): boolean {
  if (node.type === 'text') return false
  if (node.type === 'component') {
    return (
      componentRegistry.get(node.component ?? '')?.editor?.acceptsChildren ===
      true
    )
  }
  return true
}

export function beginDrag(nodeId: string, point: Point): void {
  store.beginDrag(nodeId, point)
}

export function updateDrag(
  point: Point,
  dropTarget: DragDropTarget | null = null,
): void {
  store.updateDrag(point, dropTarget)
}

export function cancelDrag(): void {
  store.cancelDrag()
}

export function commitDrag(commit: DragCommit | null): boolean {
  return store.commitDrag(commit)
}

export function undo(): void {
  store.undo()
}

export function redo(): void {
  store.redo()
}
