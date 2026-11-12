export interface KeyBinding {
  key: string
  /** metaKey on macOS, ctrlKey elsewhere; either counts as the modifier. */
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

export interface EditorCommand {
  id: string
  label: string
  bindings: readonly KeyBinding[]
  run: (event: KeyboardEvent) => void
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof HTMLElement
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  if (!element) return false
  if (element.isContentEditable) return true
  return (
    element.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
    ) !== null
  )
}

export function matchesBinding(
  event: KeyboardEvent,
  binding: KeyBinding,
): boolean {
  const mod = event.metaKey || event.ctrlKey
  if (Boolean(binding.mod) !== mod) return false
  if (Boolean(binding.shift) !== event.shiftKey) return false
  if (Boolean(binding.alt) !== event.altKey) return false
  return event.key.toLowerCase() === binding.key.toLowerCase()
}

export interface CommandRegistry {
  handleKeydown: (event: KeyboardEvent) => boolean
}

export function createCommandRegistry(
  commands: readonly EditorCommand[],
): CommandRegistry {
  return {
    handleKeydown(event) {
      if (event.defaultPrevented) return false
      if (isEditableTarget(event.target)) return false

      const command = commands.find((candidate) =>
        candidate.bindings.some((binding) => matchesBinding(event, binding)),
      )
      if (!command) return false

      command.run(event)
      event.preventDefault()
      return true
    },
  }
}
