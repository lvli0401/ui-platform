import { mount } from '@vue/test-utils'
import type { JsonValue } from '@vui/core'
import { describe, expect, it } from 'vitest'
import PropertyControl from './PropertyControl.vue'

interface ControlProps {
  type: 'string' | 'number' | 'boolean' | 'enum'
  value?: JsonValue
  options?: Array<{ value: string; label: string }>
  step?: number
  allowUnset?: boolean
}

function mountControl(props: ControlProps): ReturnType<typeof mount> {
  return mount(PropertyControl, {
    props: {
      label: 'Field',
      testId: 'field',
      ...props,
    },
  })
}

describe('PropertyControl', () => {
  it('emits string input changes', async () => {
    const wrapper = mountControl({ type: 'string', value: 'old' })
    const input = wrapper.get('[data-testid="field"]')

    expect((input.element as HTMLInputElement).value).toBe('old')
    await input.setValue('new')

    expect(wrapper.emitted('change')?.[0]).toEqual(['new'])
  })

  it('emits numeric input changes and ignores empty values', async () => {
    const wrapper = mountControl({ type: 'number', value: 12 })
    const input = wrapper.get('[data-testid="field"]')

    await input.setValue('24')
    await input.setValue('')

    expect(wrapper.emitted('change')).toEqual([[24]])
  })

  it('emits boolean changes from the checkbox', async () => {
    const wrapper = mountControl({ type: 'boolean', value: false })
    const input = wrapper.get('[data-testid="field"]')

    await input.setValue(true)

    expect(wrapper.emitted('change')?.[0]).toEqual([true])
  })

  it('emits enum selections and renders option labels', async () => {
    const wrapper = mountControl({
      type: 'enum',
      value: 'primary',
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
      ],
    })
    const select = wrapper.get('[data-testid="field"]')

    expect(select.text()).toContain('Primary')
    expect(select.text()).toContain('Secondary')
    await select.setValue('secondary')

    expect(wrapper.emitted('change')?.[0]).toEqual(['secondary'])
  })

  it('shows an unset option for optional enum values', () => {
    const wrapper = mountControl({
      type: 'enum',
      value: undefined,
      allowUnset: true,
      options: [{ value: 'flex', label: 'flex' }],
    })

    expect(wrapper.get('[data-testid="field"]').text()).toContain('Unset')
  })
})
