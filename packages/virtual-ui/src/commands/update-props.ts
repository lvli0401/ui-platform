import type { JsonValue, UINode } from '../types'
import { requireNode } from './helpers'
import type { CommandState, UICommand } from './types'

interface PropSnapshot {
  hadKey: boolean
  value: JsonValue | undefined
}

export class UpdatePropsCommand implements UICommand {
  readonly kind = 'update-props'

  private before: Map<string, PropSnapshot> | null = null
  private hadProps = false

  constructor(
    readonly nodeId: string,
    readonly patch: Record<string, JsonValue>,
  ) {}

  private capture(node: UINode): void {
    if (this.before) return
    this.hadProps = node.props !== undefined
    this.before = new Map()
    for (const key of Object.keys(this.patch)) {
      const hadKey = node.props !== undefined && Object.hasOwn(node.props, key)
      this.before.set(key, {
        hadKey,
        value: hadKey ? node.props?.[key] : undefined,
      })
    }
  }

  execute(state: CommandState): void {
    const node = requireNode(state, this.nodeId)
    this.capture(node)
    node.props = { ...(node.props ?? {}), ...this.patch }
  }

  undo(state: CommandState): void {
    if (!this.before) {
      throw new Error(`Cannot undo "${this.kind}" before execute.`)
    }
    const node = requireNode(state, this.nodeId)
    const restored: Record<string, JsonValue> = { ...(node.props ?? {}) }

    for (const [key, snapshot] of this.before) {
      if (snapshot.hadKey) {
        restored[key] = snapshot.value as JsonValue
      } else {
        delete restored[key]
      }
    }

    if (!this.hadProps && Object.keys(restored).length === 0) {
      delete node.props
    } else {
      node.props = restored
    }
  }
}
