export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type UINodeType = 'element' | 'component' | 'text' | 'fragment'

export interface EventDefinition {
  /** Registered action name. Never executable source. */
  action: string
  params?: Record<string, JsonValue>
}

export interface BindingDefinition {
  /** Registered data source name. Type-only in P0. */
  source: string
  path?: string
}

export type CSSLength = number | string

export interface UIStyle {
  // Layout
  display?: 'block' | 'flex' | 'none'
  position?: 'static' | 'relative' | 'absolute'
  flexDirection?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end'
  flexWrap?: 'nowrap' | 'wrap'
  flexGrow?: number
  flexShrink?: number
  gap?: CSSLength

  // Size
  width?: CSSLength
  height?: CSSLength
  minWidth?: CSSLength
  maxWidth?: CSSLength
  minHeight?: CSSLength
  maxHeight?: CSSLength

  // Spacing
  margin?: CSSLength
  marginTop?: CSSLength
  marginRight?: CSSLength
  marginBottom?: CSSLength
  marginLeft?: CSSLength
  padding?: CSSLength
  paddingTop?: CSSLength
  paddingRight?: CSSLength
  paddingBottom?: CSSLength
  paddingLeft?: CSSLength

  // Visual
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: CSSLength
  borderStyle?: 'none' | 'solid' | 'dashed'
  borderRadius?: CSSLength

  // Typography
  fontFamily?: string
  fontSize?: CSSLength
  fontWeight?: 400 | 500 | 600 | 700 | string
  lineHeight?: number | string
  textAlign?: 'left' | 'center' | 'right'

  // Positioning
  top?: CSSLength
  right?: CSSLength
  bottom?: CSSLength
  left?: CSSLength
  zIndex?: number
  opacity?: number
}

export interface UINode {
  id: string
  type: UINodeType
  key?: string
  /** Required when type === 'element'. */
  tag?: string
  /** Required when type === 'component'. */
  component?: string
  props?: Record<string, JsonValue>
  style?: UIStyle
  children?: UINode[]
  bindings?: Record<string, BindingDefinition>
  events?: Record<string, EventDefinition>
  meta?: Record<string, JsonValue>
}

export interface ThemeDefinition {
  colors?: Record<string, string>
  radii?: Record<string, number>
}

export interface PageDefinition {
  id: string
  name: string
  /** A page has exactly one root node. A fragment root is allowed. */
  root: UINode
}

export interface UIDocument {
  schemaVersion: string
  id: string
  name: string
  /** Edit counter. Preserved on import, incremented on commit. */
  revision: number
  theme?: ThemeDefinition
  pages: PageDefinition[]
  metadata?: Record<string, JsonValue>
}
