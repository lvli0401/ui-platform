import type { CommandState, UICommand } from './commands/types'
import { CommandHistory } from './history'
import { buildDocumentIndex } from './indexing'
import type { DocumentIndex } from './indexing'
import type { UIDocument } from './types'

export class DocumentStore {
  private currentDocument: UIDocument
  private currentIndex: DocumentIndex
  private readonly history = new CommandHistory()
  private readonly listeners = new Set<(document: UIDocument) => void>()

  constructor(document: UIDocument) {
    this.currentDocument = document
    this.currentIndex = buildDocumentIndex(document)
  }

  get document(): UIDocument {
    return this.currentDocument
  }

  get index(): Readonly<DocumentIndex> {
    return this.currentIndex
  }

  get revision(): number {
    return this.currentDocument.revision
  }

  get canUndo(): boolean {
    return this.history.canUndo
  }

  get canRedo(): boolean {
    return this.history.canRedo
  }

  dispatch(command: UICommand): void {
    const state: CommandState = {
      document: this.currentDocument,
      index: this.currentIndex,
    }
    this.history.execute(state, command)
    this.currentDocument = { ...state.document }
    this.currentIndex = state.index
    this.notify()
  }

  undo(): boolean {
    const state: CommandState = {
      document: this.currentDocument,
      index: this.currentIndex,
    }
    if (!this.history.undo(state)) return false
    this.currentDocument = { ...state.document }
    this.currentIndex = state.index
    this.notify()
    return true
  }

  redo(): boolean {
    const state: CommandState = {
      document: this.currentDocument,
      index: this.currentIndex,
    }
    if (!this.history.redo(state)) return false
    this.currentDocument = { ...state.document }
    this.currentIndex = state.index
    this.notify()
    return true
  }

  replaceDocument(document: UIDocument): void {
    this.currentDocument = document
    this.currentIndex = buildDocumentIndex(document)
    this.history.clear()
    this.notify()
  }

  subscribe(listener: (document: UIDocument) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  protected notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentDocument)
    }
  }
}
