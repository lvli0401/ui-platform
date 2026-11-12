import type { UINode } from '@vui/core'
import { createNodeId } from '@vui/core'
import { componentRegistry } from './editor-instance'

export const TEXT_TOOL_CONTENT = '文本'

/**
 * Builds a Text component node positioned at the given artboard coordinates.
 * Callers insert it through the command engine.
 */
export function createTextNode(left: number, top: number): UINode {
  const node = componentRegistry.createNode('Text', createNodeId('text'))
  return {
    ...node,
    props: {
      ...node.props,
      text: TEXT_TOOL_CONTENT,
      as: 'span',
    },
    style: {
      position: 'absolute',
      left: Math.round(left),
      top: Math.round(top),
      fontSize: 20,
      color: '#111827',
    },
  }
}

/** Converts a client point to artboard coordinates using the stage rect. */
export function clientToArtboardPoint(
  clientX: number,
  clientY: number,
  stageRect: Pick<DOMRect, 'left' | 'top'>,
  scale: number,
): { x: number; y: number } {
  const safeScale = scale === 0 ? 1 : scale
  return {
    x: (clientX - stageRect.left) / safeScale,
    y: (clientY - stageRect.top) / safeScale,
  }
}
