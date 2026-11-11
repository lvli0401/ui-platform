import type { DocumentIndex } from '../indexing'
import type { UIDocument } from '../types'

export interface CommandState {
  document: UIDocument
  index: DocumentIndex
}

export interface UICommand {
  readonly kind: string
  execute(state: CommandState): void
  undo(state: CommandState): void
}
