import { parseDocument, serializeDocument } from '@vui/core'
import type { ParseResult, UIDocument } from '@vui/core'
import { assertNoEditorState } from './assert-no-editor-state'

/**
 * Formats a document for export. Fails when editor-only state leaked into the
 * document, so a corrupt document can never reach disk.
 */
export function serializeDocumentForExport(document: UIDocument): string {
  assertNoEditorState(document)
  return serializeDocument(document)
}

export function defaultExportFileName(document: UIDocument): string {
  const slug = document.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'virtual-ui-document'}.json`
}

export interface DocumentPersistence {
  save(document: UIDocument, fileName?: string): Promise<void>
  load(file: File): Promise<ParseResult>
}

export class BrowserFilePersistence implements DocumentPersistence {
  async save(document: UIDocument, fileName?: string): Promise<void> {
    const json = serializeDocumentForExport(document)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = globalThis.document.createElement('a')

    anchor.href = url
    anchor.download = fileName ?? defaultExportFileName(document)
    anchor.style.display = 'none'
    globalThis.document.body.append(anchor)
    anchor.click()
    anchor.remove()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async load(file: File): Promise<ParseResult> {
    return parseDocument(await file.text())
  }
}
