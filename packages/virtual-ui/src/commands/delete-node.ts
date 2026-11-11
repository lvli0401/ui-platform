import type { UINode } from '../types'
import {
  insertChild,
  refreshIndex,
  removeChild,
  requireNode,
  requireParent,
} from './helpers'
import type { CommandState, UICommand } from './types'

interface DeleteSnapshot {
  node: UINode
  parentId: string
  index: number
}

export class DeleteNodeCommand implements UICommand {
  readonly kind = 'delete-node'

  private snapshot: DeleteSnapshot | null = null

  constructor(readonly nodeId: string) {}

  execute(state: CommandState): void {
    const node = requireNode(state, this.nodeId)
    const { parentId, index } = requireParent(state, this.nodeId)

    if (!this.snapshot) {
      this.snapshot = { node, parentId, index }
    }

    removeChild(state, parentId, this.nodeId)
    refreshIndex(state)
  }

  undo(state: CommandState): void {
    if (!this.snapshot) {
      throw new Error(`Cannot undo "${this.kind}" before execute.`)
    }
    insertChild(
      state,
      this.snapshot.parentId,
      this.snapshot.node,
      this.snapshot.index,
    )
    refreshIndex(state)
  }
}
