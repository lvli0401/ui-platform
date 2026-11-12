import { onBeforeUnmount, onMounted } from 'vue'
import type { UIStyle } from '@vui/core'
import {
  cancelDrag,
  deleteNode,
  getDocumentIndex,
  redo,
  selectionRef,
  setActiveTool,
  undo,
  updateNodeStyle,
} from './editor-instance'
import type { EditorCommand } from './commands'
import { createCommandRegistry } from './commands'
import { fitToPage, resetZoom, zoomIn, zoomOut } from './viewport-controls'

function activeNodeId(): string | null {
  return selectionRef.value.selectedNodeIds[0] ?? null
}

function handleDelete(): void {
  const nodeId = activeNodeId()
  if (!nodeId) return
  const parentId = getDocumentIndex().parentMap.get(nodeId) ?? null
  if (!parentId) return
  deleteNode(nodeId)
}

function numericLength(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function nudge(deltaX: number, deltaY: number): void {
  const nodeId = activeNodeId()
  if (!nodeId) return
  const node = getDocumentIndex().nodeMap.get(nodeId)
  if (!node || node.style?.position !== 'absolute') return

  const patch: Partial<UIStyle> = {}
  if (deltaX !== 0) {
    patch.left = numericLength(node.style.left) + deltaX
  }
  if (deltaY !== 0) {
    patch.top = numericLength(node.style.top) + deltaY
  }
  updateNodeStyle(nodeId, patch)
}

function arrowCommand(
  id: string,
  label: string,
  key: string,
  deltaX: number,
  deltaY: number,
): EditorCommand {
  return {
    id,
    label,
    bindings: [{ key }, { key, shift: true }],
    run: (event) => {
      const step = event.shiftKey ? 10 : 1
      nudge(deltaX * step, deltaY * step)
    },
  }
}

function buildCommands(): EditorCommand[] {
  return [
    {
      id: 'undo',
      label: '撤销',
      bindings: [{ key: 'z', mod: true }],
      run: undo,
    },
    {
      id: 'redo',
      label: '重做',
      bindings: [
        { key: 'z', mod: true, shift: true },
        { key: 'y', mod: true },
      ],
      run: redo,
    },
    {
      id: 'delete',
      label: '删除节点',
      bindings: [{ key: 'Delete' }, { key: 'Backspace' }],
      run: handleDelete,
    },
    {
      id: 'escape',
      label: '取消',
      bindings: [{ key: 'Escape' }],
      run: () => {
        cancelDrag()
        setActiveTool('select')
      },
    },
    {
      id: 'tool-select',
      label: '选择工具',
      bindings: [{ key: 'v' }],
      run: () => setActiveTool('select'),
    },
    {
      id: 'tool-hand',
      label: '抓手工具',
      bindings: [{ key: 'h' }],
      run: () => setActiveTool('hand'),
    },
    {
      id: 'tool-text',
      label: '文本工具',
      bindings: [{ key: 't' }],
      run: () => setActiveTool('text'),
    },
    arrowCommand('nudge-left', '向左微移', 'ArrowLeft', -1, 0),
    arrowCommand('nudge-right', '向右微移', 'ArrowRight', 1, 0),
    arrowCommand('nudge-up', '向上微移', 'ArrowUp', 0, -1),
    arrowCommand('nudge-down', '向下微移', 'ArrowDown', 0, 1),
    {
      id: 'zoom-in',
      label: '放大',
      bindings: [
        { key: '=', mod: true },
        { key: '+', mod: true },
        { key: '+', shift: true },
        { key: '+' },
      ],
      run: zoomIn,
    },
    {
      id: 'zoom-out',
      label: '缩小',
      bindings: [
        { key: '-', mod: true },
        { key: '_', mod: true, shift: true },
        { key: '-' },
      ],
      run: zoomOut,
    },
    {
      id: 'zoom-reset',
      label: '实际大小',
      bindings: [
        { key: '0', mod: true },
        { key: '0', shift: true },
        { key: ')', shift: true },
      ],
      run: resetZoom,
    },
    {
      id: 'zoom-fit',
      label: '适应画布',
      bindings: [
        { key: '1', shift: true },
        { key: '!', shift: true },
      ],
      run: fitToPage,
    },
  ]
}

export function useEditorShortcuts(): void {
  const registry = createCommandRegistry(buildCommands())

  function handleKeydown(event: KeyboardEvent): void {
    registry.handleKeydown(event)
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
