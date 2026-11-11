import type { ComponentDefinition } from '../types'
import { ComponentRegistry } from '../types'
import Button from './Button.vue'
import Card from './Card.vue'
import Input from './Input.vue'
import Text from './Text.vue'

export const textDefinition: ComponentDefinition = {
  name: 'Text',
  component: Text,
  category: 'content',
  propsSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        title: 'Text',
        default: 'Text',
      },
      as: {
        type: 'string',
        title: 'HTML element',
        enum: ['span', 'p', 'h1', 'h2'],
        enumNames: ['span', 'p', 'h1', 'h2'],
        default: 'span',
      },
    },
    required: ['text'],
  },
  defaultProps: {
    text: 'Text',
    as: 'span',
  },
  editor: {
    label: 'Text',
    propOrder: ['text', 'as'],
  },
}

export const cardDefinition: ComponentDefinition = {
  name: 'Card',
  component: Card,
  category: 'layout',
  propsSchema: {
    type: 'object',
    properties: {},
  },
  defaultProps: {},
  defaultStyle: {
    display: 'flex',
    flexDirection: 'column',
    padding: 32,
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  editor: {
    label: 'Card',
    propOrder: [],
    acceptsChildren: true,
  },
}

export const inputDefinition: ComponentDefinition = {
  name: 'Input',
  component: Input,
  category: 'form',
  propsSchema: {
    type: 'object',
    properties: {
      placeholder: {
        type: 'string',
        title: 'Placeholder',
        default: '',
      },
      type: {
        type: 'string',
        title: 'Input type',
        enum: ['text', 'password'],
        enumNames: ['Text', 'Password'],
        default: 'text',
      },
      value: {
        type: 'string',
        title: 'Value',
        default: '',
      },
      disabled: {
        type: 'boolean',
        title: 'Disabled',
        default: false,
      },
    },
  },
  defaultProps: {
    placeholder: '',
    type: 'text',
    value: '',
    disabled: false,
  },
  editor: {
    label: 'Input',
    propOrder: ['placeholder', 'type', 'value', 'disabled'],
  },
}

export const buttonDefinition: ComponentDefinition = {
  name: 'Button',
  component: Button,
  category: 'action',
  propsSchema: {
    type: 'object',
    properties: {
      label: {
        type: 'string',
        title: 'Label',
        default: 'Button',
      },
      variant: {
        type: 'string',
        title: 'Variant',
        enum: ['primary', 'secondary'],
        enumNames: ['Primary', 'Secondary'],
        default: 'primary',
      },
      disabled: {
        type: 'boolean',
        title: 'Disabled',
        default: false,
      },
    },
    required: ['label'],
  },
  defaultProps: {
    label: 'Button',
    variant: 'primary',
    disabled: false,
  },
  editor: {
    label: 'Button',
    propOrder: ['label', 'variant', 'disabled'],
  },
}

export const basicDefinitions: ComponentDefinition[] = [
  textDefinition,
  cardDefinition,
  inputDefinition,
  buttonDefinition,
]

export function createBasicRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry()
  for (const definition of basicDefinitions) {
    registry.register(definition)
  }
  return registry
}
