import { DOCUMENT_SCHEMA_VERSION } from './schema'
import { validateDocument } from './validation'
import type { UIDocument } from './types'

/**
 * P0 accepts one format version. The function exists so callers already use a
 * migration seam; future versions add branches here.
 */
export function migrateDocument(document: UIDocument): UIDocument {
  if (document.schemaVersion === DOCUMENT_SCHEMA_VERSION) {
    return document
  }

  throw new Error(
    `Unsupported document schemaVersion "${document.schemaVersion}"; expected "${DOCUMENT_SCHEMA_VERSION}".`,
  )
}

export function loadDocument(value: unknown): UIDocument {
  const issues = validateDocument(value)
  const errors = issues.filter((item) => item.severity === 'error')
  if (errors.length > 0) {
    throw new Error(
      errors.map((item) => `${item.path}: ${item.message}`).join('; '),
    )
  }
  return migrateDocument(value as UIDocument)
}
