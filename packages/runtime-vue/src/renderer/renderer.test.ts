import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import loginPage from '../../../../fixtures/login.page.json'
import type { PageDefinition, UIDocument } from '@vui/core'
import { createBasicRegistry } from '../component-registry/basic/definitions'
import { resolveStyle } from './resolve-style'
import { VirtualUIRuntime } from './VirtualUIRuntime'

const document = loginPage as unknown as UIDocument
const page = document.pages[0]

function mountLogin() {
  return mount(VirtualUIRuntime, {
    props: {
      page,
      registry: createBasicRegistry(),
    },
  })
}

describe('resolveStyle', () => {
  it('converts numeric lengths to pixels', () => {
    expect(
      resolveStyle({
        width: 100,
        fontSize: 16,
        padding: 8,
        minHeight: '100vh',
      }),
    ).toEqual({
      width: '100px',
      fontSize: '16px',
      padding: '8px',
      minHeight: '100vh',
    })
  })

  it('keeps unitless properties as numbers', () => {
    expect(
      resolveStyle({
        fontWeight: 600,
        lineHeight: 1.5,
        opacity: 0.5,
        zIndex: 2,
        flexGrow: 1,
      }),
    ).toEqual({
      fontWeight: 600,
      lineHeight: 1.5,
      opacity: 0.5,
      zIndex: 2,
      flexGrow: 1,
    })
  })

  it('returns undefined for missing styles', () => {
    expect(resolveStyle()).toBeUndefined()
  })
})

describe('VirtualUIRuntime', () => {
  it('renders the login page and marks every node', () => {
    const wrapper = mountLogin()
    const renderedIds = wrapper
      .findAll('[data-node-id]')
      .map((node) => node.attributes('data-node-id'))
      .sort()

    expect(renderedIds).toEqual([
      'login-card',
      'login-root',
      'login-title',
      'password',
      'submit',
      'username',
    ])
    expect(wrapper.text()).toContain('Sign in')
    expect(wrapper.findAll('input')).toHaveLength(2)
    expect(wrapper.find('button').text()).toBe('登录')
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('applies resolved styles to node roots', () => {
    const wrapper = mountLogin()
    const card = wrapper.find('[data-node-id="login-card"]').element as HTMLElement
    const submit = wrapper.find('[data-node-id="submit"]').element as HTMLElement

    expect(card.style.width).toBe('360px')
    expect(card.style.gap).toBe('16px')
    expect(submit.style.width).toBe('100%')
  })

  it('renders an unknown component as a visible fallback', () => {
    const unknownPage: PageDefinition = {
      id: 'unknown-page',
      name: 'Unknown',
      root: {
        id: 'root',
        type: 'fragment',
        children: [
          { id: 'missing', type: 'component', component: 'Missing' },
        ],
      },
    }

    const wrapper = mount(VirtualUIRuntime, {
      props: { page: unknownPage, registry: createBasicRegistry() },
    })

    const fallback = wrapper.find('[data-unknown-component="Missing"]')
    expect(fallback.exists()).toBe(true)
    expect(fallback.text()).toBe('Unknown component: Missing')
  })

  it('renders text and fragment nodes', () => {
    const textPage: PageDefinition = {
      id: 'text-page',
      name: 'Text',
      root: { id: 'text-node', type: 'text', props: { text: 'Hello' } },
    }

    const wrapper = mount(VirtualUIRuntime, {
      props: { page: textPage, registry: createBasicRegistry() },
    })
    expect(wrapper.text()).toBe('Hello')
  })

  it('wires events only through resolveHandler', async () => {
    const handler = vi.fn()
    const resolveHandler = vi.fn(() => handler)
    const eventPage: PageDefinition = {
      id: 'event-page',
      name: 'Event',
      root: {
        id: 'event-text',
        type: 'component',
        component: 'Text',
        props: { text: 'Click me' },
        events: { click: { action: 'select' } },
      },
    }

    const wrapper = mount(VirtualUIRuntime, {
      props: {
        page: eventPage,
        registry: createBasicRegistry(),
        interactive: true,
        resolveHandler,
      },
    })

    await wrapper.find('[data-node-id="event-text"]').trigger('click')

    expect(resolveHandler).toHaveBeenCalledWith(
      eventPage.root,
      'click',
    )
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not attach handlers without a resolver', async () => {
    const eventPage: PageDefinition = {
      id: 'event-page',
      name: 'Event',
      root: {
        id: 'event-text',
        type: 'component',
        component: 'Text',
        props: { text: 'Click me' },
        events: { click: { action: 'select' } },
      },
    }

    const wrapper = mount(VirtualUIRuntime, {
      props: { page: eventPage, registry: createBasicRegistry() },
    })

    await expect(
      wrapper.find('[data-node-id="event-text"]').trigger('click'),
    ).resolves.toBeUndefined()
  })
})
