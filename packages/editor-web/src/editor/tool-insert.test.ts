import { beforeEach, describe, expect, it } from 'vitest'
import { selectNode } from './editor-instance'
import { findInsertionTargetId } from './insertion-target'
import {
  TEXT_TOOL_CONTENT,
  clientToArtboardPoint,
  createTextNode,
} from './tool-insert'

beforeEach(() => {
  selectNode(null)
})

describe('findInsertionTargetId', () => {
  it('uses the selected container', () => {
    expect(findInsertionTargetId('login-card')).toBe('login-card')
  })

  it('falls back to the nearest ancestor that accepts children', () => {
    expect(findInsertionTargetId('login-title')).toBe('login-card')
  })

  it('falls back to the page root when nothing is selected', () => {
    expect(findInsertionTargetId(null)).toBe('login-root')
  })

  it('falls back to the page root for a missing node', () => {
    expect(findInsertionTargetId('missing')).toBe('login-root')
  })
})

describe('createTextNode', () => {
  it('builds a registered Text component positioned on the artboard', () => {
    const node = createTextNode(12.4, 56.6)

    expect(node.type).toBe('component')
    expect(node.component).toBe('Text')
    expect(node.id).toMatch(/^text-/)
    expect(node.props?.text).toBe(TEXT_TOOL_CONTENT)
    expect(node.props?.as).toBe('span')
    expect(node.style?.position).toBe('absolute')
    expect(node.style?.left).toBe(12)
    expect(node.style?.top).toBe(57)
    expect(node.style?.width).toBeUndefined()
  })
})

describe('clientToArtboardPoint', () => {
  it('divides by the current zoom scale', () => {
    expect(
      clientToArtboardPoint(300, 250, { left: 100, top: 50 }, 2),
    ).toEqual({ x: 100, y: 100 })
  })

  it('treats a missing scale as 100%', () => {
    expect(
      clientToArtboardPoint(140, 70, { left: 100, top: 50 }, 0),
    ).toEqual({ x: 40, y: 20 })
  })
})
