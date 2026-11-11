import type { UINodeType } from './types'

export const DOCUMENT_SCHEMA_VERSION = '0.1.0'

export const UINODE_TYPES: readonly UINodeType[] = [
  'element',
  'component',
  'text',
  'fragment',
]

export const STYLE_KEYS: readonly string[] = [
  'display',
  'position',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'flexWrap',
  'flexGrow',
  'flexShrink',
  'gap',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'backgroundColor',
  'color',
  'borderColor',
  'borderWidth',
  'borderStyle',
  'borderRadius',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'textAlign',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'opacity',
]

export const STYLE_KEY_SET: ReadonlySet<string> = new Set(STYLE_KEYS)
