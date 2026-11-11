import { describe, expect, it } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import { parseDocument, serializeDocument } from './serialization'
import type { UIDocument } from './types'

const loginDocument = loginPage as unknown as UIDocument

describe('serializeDocument', () => {
  it('is deterministic regardless of key insertion order', () => {
    const reversed = Object.fromEntries(
      Object.entries(loginDocument).reverse(),
    ) as unknown as UIDocument

    expect(serializeDocument(reversed)).toBe(serializeDocument(loginDocument))
  })

  it('ends with a newline and supports round-trip parsing', () => {
    const json = serializeDocument(loginDocument)
    expect(json.endsWith('\n')).toBe(true)

    const result = parseDocument(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.document).toEqual(loginDocument)
    }
  })

  it('is byte-stable across serialize → parse → serialize', () => {
    const first = serializeDocument(loginDocument)
    const result = parseDocument(first)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(serializeDocument(result.document)).toBe(first)
  })
})

describe('parseDocument', () => {
  it('exposes warnings without failing', () => {
    const document = JSON.parse(JSON.stringify(loginDocument)) as UIDocument
    document.pages[0].root.style = { ...document.pages[0].root.style, custom: 'x' } as never

    const result = parseDocument(JSON.stringify(document))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warnings.map((item) => item.code)).toContain(
        'STYLE_KEY_UNKNOWN',
      )
    }
  })

  it('fails on non-JSON input', () => {
    expect(parseDocument('{').ok).toBe(false)
  })

  it('fails on structurally invalid documents', () => {
    const result = parseDocument(
      JSON.stringify({ schemaVersion: '0.1.0', pages: [] }),
    )
    expect(result.ok).toBe(false)
  })
})
