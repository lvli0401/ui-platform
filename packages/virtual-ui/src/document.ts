import { DOCUMENT_SCHEMA_VERSION } from './schema'
import { createDocumentId, createNodeId } from './ids'
import type { UIDocument } from './types'

export function createDocument(name = 'Untitled'): UIDocument {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    id: createDocumentId(),
    name,
    revision: 0,
    pages: [
      {
        id: createNodeId('page'),
        name: 'Page 1',
        root: {
          id: createNodeId('root'),
          type: 'fragment',
          children: [],
        },
      },
    ],
  }
}
