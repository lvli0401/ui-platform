import type { UIDocument } from '@vui/core'

const FORBIDDEN_KEYS = new Set([
  'selectedNodeIds',
  'selectedIds',
  'hoveredNodeId',
  'drag',
  'dragState',
  'overlay',
  'viewport',
  'canvasTransform',
])

function walk(value: unknown, path: string, active: Set<object>): void {
  if (Array.isArray(value)) {
    if (active.has(value)) return
    active.add(value)
    value.forEach((item, index) => walk(item, `${path}[${index}]`, active))
    active.delete(value)
    return
  }

  if (typeof value === 'object' && value !== null) {
    if (active.has(value)) return
    active.add(value)
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(
          `Editor state leaked into document at ${path}.${key}. Documents must stay editor-state free.`,
        )
      }
      walk(item, `${path}.${key}`, active)
    }
    active.delete(value)
  }
}

/**
 * Throws when a serialized document contains editor-only state. Used as an
 * acceptance guard around export and persistence tests.
 */
export function assertNoEditorState(document: UIDocument): void {
  walk(document, 'document', new Set())
}
