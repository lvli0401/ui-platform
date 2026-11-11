import {
  DeleteNodeCommand,
  DocumentStore,
  InsertNodeCommand,
  MoveNodeCommand,
  UpdatePropsCommand,
  UpdateStyleCommand,
} from '@vui/core'
import type {
  DocumentIndex,
  JsonValue,
  UIDocument,
  UINode,
  UIStyle,
} from '@vui/core'
import type { CanvasTransform, Point } from './geometry'
import { IDENTITY_TRANSFORM } from './geometry'
import type { DragCommit, DragDropTarget, DragState } from './drag'
import { createDragState } from './drag'

export interface SelectionState {
  selectedNodeIds: string[]
  hoveredNodeId: string | null
}

export class EditorStore {
  private readonly store: DocumentStore
  private selectedNodeIds: string[] = []
  private hoveredNodeId: string | null = null
  private dragState: DragState | null = null
  private readonly viewport: CanvasTransform = { ...IDENTITY_TRANSFORM }
  private readonly listeners = new Set<() => void>()
  private readonly unsubscribeFromDocument: () => void

  constructor(document: UIDocument) {
    this.store = new DocumentStore(document)
    this.unsubscribeFromDocument = this.store.subscribe(() => {
      this.pruneSelection()
      this.notify()
    })
  }

  get document(): UIDocument {
    return this.store.document
  }

  get revision(): number {
    return this.store.revision
  }

  get index(): Readonly<DocumentIndex> {
    return this.store.index
  }

  get selection(): Readonly<SelectionState> {
    return {
      selectedNodeIds: [...this.selectedNodeIds],
      hoveredNodeId: this.hoveredNodeId,
    }
  }

  get canvasTransform(): Readonly<CanvasTransform> {
    return this.viewport
  }

  get drag(): Readonly<DragState> | null {
    return this.dragState
  }

  get canUndo(): boolean {
    return this.store.canUndo
  }

  get canRedo(): boolean {
    return this.store.canRedo
  }

  select(
    nodeId: string | null,
    options?: { additive?: boolean },
  ): void {
    // P0 is single-select. `additive` is reserved for P1 multi-select.
    void options

    if (nodeId === null) {
      this.selectedNodeIds = []
      this.notify()
      return
    }

    if (!this.store.index.nodeMap.has(nodeId)) {
      throw new Error(`Cannot select missing node "${nodeId}".`)
    }

    this.selectedNodeIds = [nodeId]
    this.notify()
  }

  hover(nodeId: string | null): void {
    const next =
      nodeId !== null && this.store.index.nodeMap.has(nodeId) ? nodeId : null
    if (next === this.hoveredNodeId) return
    this.hoveredNodeId = next
    this.notify()
  }

  beginDrag(nodeId: string, startPoint: Point): void {
    const node = this.store.index.nodeMap.get(nodeId)
    if (!node) {
      throw new Error(`Cannot drag missing node "${nodeId}".`)
    }

    const mode = node.style?.position === 'absolute' ? 'absolute' : 'flex'
    this.dragState = createDragState(nodeId, mode, startPoint)
    this.notify()
  }

  updateDrag(point: Point, dropTarget: DragDropTarget | null = null): void {
    const drag = this.dragState
    if (!drag) return

    this.dragState = {
      ...drag,
      delta: {
        x: point.x - drag.startPoint.x,
        y: point.y - drag.startPoint.y,
      },
      dropTarget: dropTarget ? { ...dropTarget } : null,
    }
    this.notify()
  }

  cancelDrag(): void {
    if (!this.dragState) return
    this.dragState = null
    this.notify()
  }

  /**
   * Commits the active drag as exactly one document command. Passing null
   * aborts without touching the document.
   */
  commitDrag(commit: DragCommit | null): boolean {
    const drag = this.dragState
    this.dragState = null
    if (!drag) return false
    if (!commit) {
      this.notify()
      return false
    }
    if (commit.mode !== drag.mode) {
      this.notify()
      throw new Error(
        `Drag mode "${drag.mode}" cannot commit as "${commit.mode}".`,
      )
    }

    if (commit.mode === 'absolute') {
      this.store.dispatch(
        new UpdateStyleCommand(drag.nodeId, {
          left: commit.left,
          top: commit.top,
        }),
      )
    } else {
      this.store.dispatch(
        new MoveNodeCommand(drag.nodeId, commit.parentId, commit.index),
      )
    }
    return true
  }

  updateProps(nodeId: string, patch: Record<string, JsonValue>): void {
    this.store.dispatch(new UpdatePropsCommand(nodeId, patch))
  }

  updateStyle(nodeId: string, patch: Partial<UIStyle>): void {
    this.store.dispatch(new UpdateStyleCommand(nodeId, patch))
  }

  insertNode(parentId: string, node: UINode, index?: number): void {
    this.store.dispatch(new InsertNodeCommand(parentId, node, index))
  }

  deleteNode(nodeId: string): void {
    this.store.dispatch(new DeleteNodeCommand(nodeId))
  }

  moveNode(nodeId: string, parentId: string, index: number): void {
    this.store.dispatch(new MoveNodeCommand(nodeId, parentId, index))
  }

  undo(): boolean {
    return this.store.undo()
  }

  redo(): boolean {
    return this.store.redo()
  }

  replaceDocument(document: UIDocument): void {
    this.selectedNodeIds = []
    this.hoveredNodeId = null
    this.dragState = null
    this.store.replaceDocument(document)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    this.unsubscribeFromDocument()
    this.listeners.clear()
  }

  private pruneSelection(): void {
    const { nodeMap } = this.store.index
    this.selectedNodeIds = this.selectedNodeIds.filter((id) => nodeMap.has(id))
    if (this.hoveredNodeId !== null && !nodeMap.has(this.hoveredNodeId)) {
      this.hoveredNodeId = null
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
