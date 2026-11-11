import type { Component } from 'vue'
import { markRaw } from 'vue'
import type { JsonValue, UINode, UIStyle } from '@vui/core'
import { createNodeId } from '@vui/core'

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean'
  title: string
  description?: string
  default?: JsonValue
  enum?: string[]
  enumNames?: string[]
  format?: 'color' | 'multiline'
  minimum?: number
  maximum?: number
}

export interface ComponentDefinition {
  name: string
  component: Component
  propsSchema: {
    type: 'object'
    properties: Record<string, PropertySchema>
    required?: string[]
  }
  category: 'layout' | 'content' | 'form' | 'action'
  defaultProps: Record<string, JsonValue>
  defaultStyle?: UIStyle
  editor?: {
    label?: string
    propOrder?: string[]
    /** Editor metadata: whether the component renders a default slot. */
    acceptsChildren?: boolean
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export class ComponentRegistry {
  private readonly definitions = new Map<string, ComponentDefinition>()

  register(definition: ComponentDefinition): void {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Component "${definition.name}" is already registered.`)
    }
    this.definitions.set(definition.name, markRaw(definition))
  }

  get(name: string): ComponentDefinition | undefined {
    return this.definitions.get(name)
  }

  list(): ComponentDefinition[] {
    return [...this.definitions.values()]
  }

  createNode(name: string, id?: string): UINode {
    const definition = this.definitions.get(name)
    if (!definition) {
      throw new Error(`Component "${name}" is not registered.`)
    }

    return {
      id: id ?? createNodeId('node'),
      type: 'component',
      component: name,
      props: cloneJson(definition.defaultProps),
      style: definition.defaultStyle
        ? cloneJson(definition.defaultStyle)
        : undefined,
    }
  }
}
