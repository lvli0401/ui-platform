import { describe, expect, it } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import invalidPage from '../../../fixtures/login.page.invalid.json'
import { createDocument } from './document'
import { parseDocument } from './serialization'
import type { UIDocument } from './types'
import { hasErrors, validateDocument } from './validation'

function codes(value: unknown): string[] {
  return validateDocument(value).map((item) => item.code)
}

describe('validateDocument', () => {
  it('accepts the login page fixture', () => {
    expect(validateDocument(loginPage)).toEqual([])
  })

  it('accepts a freshly created document', () => {
    expect(validateDocument(createDocument('New'))).toEqual([])
  })

  it('reports every seeded error in the invalid fixture', () => {
    const result = validateDocument(invalidPage)
    const found = new Set(result.map((item) => item.code))

    for (const code of [
      'SCHEMA_VERSION_UNSUPPORTED',
      'DOCUMENT_ID_MISSING',
      'DOCUMENT_NAME_INVALID',
      'REVISION_INVALID',
      'PAGE_NAME_INVALID',
      'PAGE_ID_DUPLICATE',
      'NODE_ID_MISSING',
      'ELEMENT_TAG_MISSING',
      'COMPONENT_NAME_MISSING',
      'NODE_ID_DUPLICATE',
      'TEXT_PROP_MISSING',
      'TEXT_CHILDREN_FORBIDDEN',
      'FRAGMENT_TAG_FORBIDDEN',
      'FRAGMENT_COMPONENT_FORBIDDEN',
      'NODE_TYPE_INVALID',
      'STYLE_KEY_UNKNOWN',
      'BINDING_INVALID',
      'EVENT_INVALID',
      'NODE_KEY_INVALID',
    ]) {
      expect(found.has(code), `expected code ${code}`).toBe(true)
    }
    expect(hasErrors(result)).toBe(true)
  })

  it('reports issues with a JSON path', () => {
    const result = validateDocument(invalidPage)
    const missingTag = result.find((item) => item.code === 'ELEMENT_TAG_MISSING')
    expect(missingTag?.path).toBe('pages[0].root.children[0].tag')

    const duplicateId = result.find((item) => item.code === 'NODE_ID_DUPLICATE')
    expect(duplicateId?.path).toBe('pages[0].root.children[2].id')
  })

  it('treats unknown style keys as warnings, not errors', () => {
    const document = JSON.parse(JSON.stringify(loginPage)) as Record<
      string,
      unknown
    >
    const root = (
      (document.pages as Record<string, unknown>[])[0] as Record<string, unknown>
    ).root as Record<string, unknown>
    ;(root.style as Record<string, unknown>).unknownKey = 1

    const result = validateDocument(document)
    const warning = result.find((item) => item.code === 'STYLE_KEY_UNKNOWN')
    expect(warning?.severity).toBe('warning')
    expect(hasErrors(result)).toBe(false)
  })

  it('rejects functions in props', () => {
    const document = JSON.parse(JSON.stringify(loginPage)) as Record<
      string,
      unknown
    >
    const root = (
      (document.pages as Record<string, unknown>[])[0] as Record<string, unknown>
    ).root as Record<string, unknown>
    const card = (root.children as Record<string, unknown>[])[0]
    card.props = {}
    ;(card.props as Record<string, unknown>).onClick = () => undefined

    expect(codes(document)).toContain('INVALID_JSON_VALUE')
  })

  it('rejects circular node trees', () => {
    const document = JSON.parse(JSON.stringify(loginPage)) as Record<
      string,
      unknown
    >
    const root = (
      (document.pages as Record<string, unknown>[])[0] as Record<string, unknown>
    ).root as Record<string, unknown>
    const children = root.children as unknown[]
    children.push(root)

    expect(codes(document)).toContain('CIRCULAR_NODE')
  })

  it('rejects non-object documents', () => {
    expect(validateDocument(null)[0].code).toBe('DOCUMENT_INVALID')
    expect(validateDocument([])[0].code).toBe('DOCUMENT_INVALID')
  })
})

describe('parseDocument', () => {
  it('parses the login fixture', () => {
    const result = parseDocument(JSON.stringify(loginPage))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warnings).toEqual([])
      expect((result.document as UIDocument).id).toBe('doc-login')
    }
  })

  it('returns issues for invalid JSON', () => {
    const result = parseDocument('{')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues[0].code).toBe('PARSE_ERROR')
    }
  })

  it('returns issues for unsupported schema versions', () => {
    const result = parseDocument(JSON.stringify(invalidPage))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.map((item) => item.code)).toContain(
        'SCHEMA_VERSION_UNSUPPORTED',
      )
    }
  })
})
