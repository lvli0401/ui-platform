import { validateDocument } from './validation'
import type { ParseResult } from './validation'
import type { UIDocument } from './types'

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/**
 * Serializes a document deterministically: object keys sorted, two-space
 * indentation, trailing newline.
 */
export function serializeDocument(document: UIDocument): string {
  return `${JSON.stringify(sortValue(document), null, 2)}\n`
}

export function parseDocument(json: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: 'PARSE_ERROR',
          path: '',
          message: error instanceof Error ? error.message : 'Invalid JSON.',
          severity: 'error',
        },
      ],
    }
  }

  const issues = validateDocument(parsed)
  const errors = issues.filter((item) => item.severity === 'error')
  if (errors.length > 0) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    document: parsed as UIDocument,
    warnings: issues.filter((item) => item.severity === 'warning'),
  }
}
