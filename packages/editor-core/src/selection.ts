export function resolveNodeIdFromTarget(
  target: EventTarget | null,
  canvas: HTMLElement,
): string | null {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null

  if (!element) return null

  const owner = element.closest('[data-node-id]')
  if (!(owner instanceof Element)) return null
  if (!canvas.contains(owner)) return null

  return owner.getAttribute('data-node-id')
}
