import type { UIStyle } from '@vui/core'

const UNITLESS_KEYS = new Set([
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'lineHeight',
  'zIndex',
  'opacity',
])

export function resolveStyle(
  style?: UIStyle,
): Record<string, string | number> | undefined {
  if (!style) return undefined

  const resolved: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'number' && !UNITLESS_KEYS.has(key)) {
      resolved[key] = `${value}px`
    } else {
      resolved[key] = value as string | number
    }
  }

  return resolved
}
