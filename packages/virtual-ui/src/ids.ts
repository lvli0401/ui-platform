let fallbackCounter = 0

export function createNodeId(prefix = 'node'): string {
  const randomUuid = globalThis.crypto?.randomUUID
  if (typeof randomUuid === 'function') {
    return `${prefix}-${randomUuid.call(globalThis.crypto)}`
  }
  fallbackCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`
}

export function createDocumentId(): string {
  return createNodeId('doc')
}

export function createPageId(): string {
  return createNodeId('page')
}
