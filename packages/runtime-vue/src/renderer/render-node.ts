import { Fragment, h } from 'vue'
import type { VNode, VNodeChild } from 'vue'
import type { PageDefinition, UINode } from '@vui/core'
import type { ComponentRegistry } from '../component-registry/types'
import { resolveStyle } from './resolve-style'

export interface RenderContext {
  registry: Pick<ComponentRegistry, 'get'>
  interactive?: boolean
  resolveHandler?: (
    node: UINode,
    eventName: string,
  ) => ((...args: unknown[]) => void) | undefined
}

function eventPropName(eventName: string): string {
  return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
}

function resolveEvents(
  node: UINode,
  context: RenderContext,
): Record<string, unknown> {
  if (!context.interactive || !context.resolveHandler || !node.events) {
    return {}
  }

  const handlers: Record<string, unknown> = {}
  for (const eventName of Object.keys(node.events)) {
    const handler = context.resolveHandler(node, eventName)
    if (handler) {
      handlers[eventPropName(eventName)] = handler
    }
  }
  return handlers
}

function renderChildren(node: UINode, context: RenderContext): VNodeChild[] {
  return (node.children ?? []).map((child) => renderNode(child, context))
}

export function renderNode(node: UINode, context: RenderContext): VNodeChild {
  if (node.type === 'fragment') {
    return h(
      Fragment,
      { key: node.key ?? node.id },
      renderChildren(node, context),
    )
  }

  if (node.type === 'text') {
    return String(node.props?.text ?? '')
  }

  if (node.type === 'element') {
    if (!node.tag) {
      return h(
        'div',
        {
          key: node.key ?? node.id,
          'data-node-id': node.id,
          'data-invalid-node': 'missing-tag',
        },
        'Invalid element node: missing tag',
      )
    }
    return h(
      node.tag,
      {
        ...resolveEvents(node, context),
        key: node.key ?? node.id,
        'data-node-id': node.id,
        style: resolveStyle(node.style),
      },
      renderChildren(node, context),
    )
  }

  const definition = context.registry.get(node.component ?? '')
  if (!definition) {
    const name = node.component ?? 'unknown'
    return h(
      'div',
      {
        key: node.key ?? node.id,
        'data-node-id': node.id,
        'data-unknown-component': name,
        style: resolveStyle(node.style),
      },
      `Unknown component: ${name}`,
    )
  }

  return h(
    definition.component,
    {
      ...definition.defaultProps,
      ...(node.props ?? {}),
      ...resolveEvents(node, context),
      key: node.key ?? node.id,
      'data-node-id': node.id,
      style: resolveStyle(node.style),
    },
    () => renderChildren(node, context),
  )
}

export function renderPage(
  page: PageDefinition,
  context: RenderContext,
): VNode {
  return h(Fragment, null, [renderNode(page.root, context)])
}
