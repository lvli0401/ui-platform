import type { UINode } from '../types'
import {
  assertNoIdCollision,
  assertNodeAcceptsChildren,
  insertChild,
  refreshIndex,
  removeChild,
  requireNode,
} from './helpers'
import type { CommandState, UICommand } from './types'

export class InsertNodeCommand implements UICommand {
  readonly kind = 'insert-node'

  private captured = false
  private hadChildren = false

  constructor(
    readonly parentId: string,
    readonly node: UINode,
    readonly index?: number,
  ) {}

  execute(state: CommandState): void {
    const parent = requireNode(state, this.parentId)
    assertNodeAcceptsChildren(parent)
    assertNoIdCollision(state, this.node)

    if (!this.captured) {
      this.hadChildren = parent.children !== undefined
      this.captured = true
    }

    const targetIndex = this.index ?? (parent.children?.length ?? 0)
    insertChild(state, this.parentId, this.node, targetIndex)
    refreshIndex(state)
  }

  undo(state: CommandState): void {
    if (!state.index.nodeMap.has(this.node.id)) {
      throw new Error(`Cannot undo "${this.kind}": node "${this.node.id}" is not present.`)
    }
    removeChild(state, this.parentId, this.node.id)
    const parent = requireNode(state, this.parentId)
    if (!this.hadChildren && parent.children?.length === 0) {
      delete parent.children
    }
    refreshIndex(state)
  }
}
