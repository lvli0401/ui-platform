import {
  assertNodeAcceptsChildren,
  insertChild,
  refreshIndex,
  removeChild,
  requireNode,
  requireParent,
} from './helpers'
import type { CommandState, UICommand } from './types'

interface MoveOrigin {
  parentId: string
  index: number
}

export class MoveNodeCommand implements UICommand {
  readonly kind = 'move-node'

  private origin: MoveOrigin | null = null
  private capturedTarget = false
  private targetHadChildren = false

  constructor(
    readonly nodeId: string,
    readonly parentId: string,
    readonly index: number,
  ) {}

  private assertTarget(state: CommandState): void {
    if (this.parentId === this.nodeId) {
      throw new Error(`Node "${this.nodeId}" cannot be moved into itself.`)
    }

    const target = requireNode(state, this.parentId)
    assertNodeAcceptsChildren(target)

    let cursor: string | null | undefined = this.parentId
    while (cursor) {
      if (cursor === this.nodeId) {
        throw new Error(
          `Node "${this.nodeId}" cannot be moved into its own descendant "${this.parentId}".`,
        )
      }
      cursor = state.index.parentMap.get(cursor)
    }
  }

  execute(state: CommandState): void {
    requireNode(state, this.nodeId)
    this.assertTarget(state)

    const { parentId: oldParentId, index: oldIndex } = requireParent(
      state,
      this.nodeId,
    )

    if (!this.origin) {
      this.origin = { parentId: oldParentId, index: oldIndex }
    }
    if (!this.capturedTarget) {
      this.targetHadChildren =
        requireNode(state, this.parentId).children !== undefined
      this.capturedTarget = true
    }

    removeChild(state, oldParentId, this.nodeId)

    let targetIndex = this.index
    if (oldParentId === this.parentId && oldIndex < targetIndex) {
      targetIndex -= 1
    }

    insertChild(state, this.parentId, requireNode(state, this.nodeId), targetIndex)
    refreshIndex(state)
  }

  undo(state: CommandState): void {
    if (!this.origin) {
      throw new Error(`Cannot undo "${this.kind}" before execute.`)
    }

    const { parentId: currentParentId } = requireParent(state, this.nodeId)
    removeChild(state, currentParentId, this.nodeId)
    const currentParent = requireNode(state, currentParentId)
    if (!this.targetHadChildren && currentParent.children?.length === 0) {
      delete currentParent.children
    }
    insertChild(
      state,
      this.origin.parentId,
      requireNode(state, this.nodeId),
      this.origin.index,
    )
    refreshIndex(state)
  }
}
