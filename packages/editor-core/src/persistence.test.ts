import { describe, expect, it } from 'vitest'
import loginPage from '../../../fixtures/login.page.json'
import { serializeDocument } from '@vui/core'
import type { UIDocument } from '@vui/core'
import {
  BrowserFilePersistence,
  defaultExportFileName,
  serializeDocumentForExport,
} from './persistence'

const loginDocument = loginPage as unknown as UIDocument

function clone(): UIDocument {
  return JSON.parse(JSON.stringify(loginDocument)) as UIDocument
}

describe('serializeDocumentForExport', () => {
  it('serializes a clean document deterministically', () => {
    expect(serializeDocumentForExport(clone())).toBe(
      serializeDocument(loginDocument),
    )
  })

  it('refuses to export editor state', () => {
    const document = clone() as UIDocument & {
      pages: Array<{ root: Record<string, unknown> }>
    }
    document.pages[0].root.hoveredNodeId = 'submit'

    expect(() => serializeDocumentForExport(document)).toThrow(
      /hoveredNodeId/,
    )
  })
})

describe('defaultExportFileName', () => {
  it('slugs the document name', () => {
    expect(defaultExportFileName(loginDocument)).toBe('login-page.json')
    expect(defaultExportFileName({ ...clone(), name: '  ' })).toBe(
      'virtual-ui-document.json',
    )
  })
})

describe('BrowserFilePersistence', () => {
  it('loads a valid document file', async () => {
    const persistence = new BrowserFilePersistence()
    const file = new File([serializeDocument(loginDocument)], 'login.json', {
      type: 'application/json',
    })

    const result = await persistence.load(file)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.document.name).toBe('Login Page')
      expect(result.warnings).toEqual([])
    }
  })

  it('reports validation issues with paths for invalid files', async () => {
    const persistence = new BrowserFilePersistence()
    const file = new File(['{"schemaVersion":"0.1.0"}'], 'broken.json', {
      type: 'application/json',
    })

    const result = await persistence.load(file)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.length > 0)).toBe(true)
    }
  })
})
