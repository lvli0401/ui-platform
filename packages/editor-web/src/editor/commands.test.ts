import { describe, expect, it, vi } from 'vitest'
import type { EditorCommand } from './commands'
import {
  createCommandRegistry,
  isEditableTarget,
  matchesBinding,
} from './commands'

function keydown(
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    cancelable: true,
    ...init,
  })
}

describe('matchesBinding', () => {
  it('requires an exact modifier match', () => {
    const binding = { key: 'z', mod: true }

    expect(matchesBinding(keydown('z', { metaKey: true }), binding)).toBe(true)
    expect(matchesBinding(keydown('z', { ctrlKey: true }), binding)).toBe(true)
    expect(matchesBinding(keydown('z'), binding)).toBe(false)
    expect(
      matchesBinding(keydown('z', { metaKey: true, shiftKey: true }), binding),
    ).toBe(false)
  })

  it('matches keys case-insensitively and honours shift', () => {
    expect(
      matchesBinding(keydown('Z', { shiftKey: true }), {
        key: 'z',
        shift: true,
      }),
    ).toBe(true)
    expect(
      matchesBinding(keydown('ArrowLeft'), { key: 'ArrowLeft' }),
    ).toBe(true)
  })
})

describe('isEditableTarget', () => {
  it('detects inputs, selects, and contenteditable hosts', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true)
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true)
    expect(isEditableTarget(document.createElement('select'))).toBe(true)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(isEditableTarget(editable)).toBe(true)

    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})

describe('createCommandRegistry', () => {
  function buildRegistry(): {
    run: ReturnType<typeof vi.fn>
    registry: ReturnType<typeof createCommandRegistry>
  } {
    const run = vi.fn()
    const command: EditorCommand = {
      id: 'demo',
      label: 'Demo',
      bindings: [{ key: 'd' }],
      run,
    }
    return { run, registry: createCommandRegistry([command]) }
  }

  it('runs the first matching command and prevents the default', () => {
    const { run, registry } = buildRegistry()
    const event = keydown('d')

    expect(registry.handleKeydown(event)).toBe(true)
    expect(run).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores editable targets', () => {
    const { run, registry } = buildRegistry()
    const input = document.createElement('input')
    const event = keydown('d')
    Object.defineProperty(event, 'target', { value: input })

    expect(registry.handleKeydown(event)).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('ignores events already handled elsewhere', () => {
    const { run, registry } = buildRegistry()
    const event = keydown('d', { cancelable: true })
    event.preventDefault()

    expect(registry.handleKeydown(event)).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('passes the keyboard event to the command', () => {
    const { run, registry } = buildRegistry()
    const event = keydown('d')

    registry.handleKeydown(event)

    expect(run).toHaveBeenCalledWith(event)
  })
})
