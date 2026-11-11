import type { Point } from './geometry'

export type DragMode = 'absolute' | 'flex'

export interface DragDropTarget {
  parentId: string
  index: number
}

export interface DragState {
  nodeId: string
  mode: DragMode
  startPoint: Point
  delta: Point
  dropTarget: DragDropTarget | null
}

export type DragCommit =
  | { mode: 'absolute'; left: number; top: number }
  | { mode: 'flex'; parentId: string; index: number }

export function createDragState(
  nodeId: string,
  mode: DragMode,
  startPoint: Point,
): DragState {
  return {
    nodeId,
    mode,
    startPoint: { ...startPoint },
    delta: { x: 0, y: 0 },
    dropTarget: null,
  }
}
