import type { CommandState, UICommand } from './commands/types'

interface HistoryEntry {
  command: UICommand
  revisionBefore: number
  revisionAfter: number
}

export class CommandHistory {
  private readonly undoStack: HistoryEntry[] = []
  private readonly redoStack: HistoryEntry[] = []

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  execute(state: CommandState, command: UICommand): void {
    const revisionBefore = state.document.revision
    command.execute(state)
    state.document.revision = revisionBefore + 1
    this.undoStack.push({
      command,
      revisionBefore,
      revisionAfter: revisionBefore + 1,
    })
    this.redoStack.length = 0
  }

  undo(state: CommandState): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false
    entry.command.undo(state)
    state.document.revision = entry.revisionBefore
    this.redoStack.push(entry)
    return true
  }

  redo(state: CommandState): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false
    entry.command.execute(state)
    state.document.revision = entry.revisionAfter
    this.undoStack.push(entry)
    return true
  }

  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }
}
