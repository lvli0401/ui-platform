import { describe, expect, it } from 'vitest'
import { createBasicRegistry } from './basic/definitions'
import { ComponentRegistry } from './types'

describe('ComponentRegistry', () => {
  it('registers the four P0 components', () => {
    const registry = createBasicRegistry()
    expect(registry.list().map((item) => item.name)).toEqual([
      'Text',
      'Card',
      'Input',
      'Button',
    ])
    expect(registry.get('Button')?.category).toBe('action')
    expect(registry.get('Unknown')).toBeUndefined()
  })

  it('creates nodes with cloned default props and unique ids', () => {
    const registry = createBasicRegistry()
    const first = registry.createNode('Button')
    const second = registry.createNode('Button')

    expect(first.id).not.toBe(second.id)
    expect(first.props).toEqual({
      label: 'Button',
      variant: 'primary',
      disabled: false,
    })
    expect(first.props).not.toBe(second.props)
  })

  it('creates nodes with cloned default styles', () => {
    const registry = createBasicRegistry()
    const card = registry.createNode('Card')
    expect(card.style?.display).toBe('flex')
    expect(card.style?.padding).toBe(32)
  })

  it('accepts an explicit node id', () => {
    const registry = createBasicRegistry()
    expect(registry.createNode('Text', 'title').id).toBe('title')
  })

  it('rejects duplicate registrations and unknown components', () => {
    const registry = new ComponentRegistry()
    const definition = createBasicRegistry().get('Button')
    if (!definition) throw new Error('Button definition missing')

    registry.register(definition)
    expect(() => registry.register(definition)).toThrow(/already registered/)
    expect(() => registry.createNode('Missing')).toThrow(/not registered/)
  })

  it('exposes enumerable property schemas', () => {
    const registry = createBasicRegistry()
    const input = registry.get('Input')
    expect(input?.propsSchema.properties.placeholder.type).toBe('string')
    expect(input?.propsSchema.properties.type.enum).toEqual(['text', 'password'])
    expect(input?.propsSchema.properties.disabled.type).toBe('boolean')
  })
})
