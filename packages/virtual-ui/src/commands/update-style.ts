import type { UINode, UIStyle } from '../types'
import { requireNode } from './helpers'
import type { CommandState, UICommand } from './types'

interface StyleSnapshot {
  hadKey: boolean
  value: UIStyle[keyof UIStyle] | undefined
}

export class UpdateStyleCommand implements UICommand {
  readonly kind = 'update-style'

  private before: Map<string, StyleSnapshot> | null = null
  private hadStyle = false

  constructor(
    readonly nodeId: string,
    readonly patch: Partial<UIStyle>,
  ) {}

  private capture(node: UINode): void {
    if (this.before) return
    this.hadStyle = node.style !== undefined
    this.before = new Map()
    for (const key of Object.keys(this.patch) as (keyof UIStyle)[]) {
      const hadKey = node.style !== undefined && Object.hasOwn(node.style, key)
      this.before.set(key, {
        hadKey,
        value: hadKey ? node.style?.[key] : undefined,
      })
    }
  }

  execute(state: CommandState): void {
    const node = requireNode(state, this.nodeId)
    this.capture(node)
    node.style = { ...(node.style ?? {}), ...this.patch }
  }

  undo(state: CommandState): void {
    if (!this.before) {
      throw new Error(`Cannot undo "${this.kind}" before execute.`)
    }
    const node = requireNode(state, this.nodeId)
    const restored: UIStyle = { ...(node.style ?? {}) }

    for (const [key, snapshot] of this.before) {
      if (snapshot.hadKey) {
        ;(restored as Record<string, unknown>)[key] = snapshot.value
      } else {
        delete (restored as Record<string, unknown>)[key]
      }
    }

    if (!this.hadStyle && Object.keys(restored).length === 0) {
      delete node.style
    } else {
      node.style = restored
    }
  }
}
