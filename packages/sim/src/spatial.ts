/**
 * Пространственный хэш на counting-sort бакетах.
 *
 * ПОЧЕМУ НЕ Map<cellKey, Entity[]> И НЕ Set: порядок итерации Map/Set — это
 * порядок вставки. Он зависит от истории и молча ломается при рефакторинге
 * порядка добавления сущностей. Это скрытый недетерминизм, который переживёт
 * все тесты и вылезет в проде.
 *
 * ЗДЕСЬ: два прохода по возрастанию entityId + префиксные суммы. Внутри каждой
 * ячейки id идут СТРОГО ПО ВОЗРАСТАНИЮ, независимо ни от чего.
 *
 * Ноль аллокаций после инициализации — важно для p99 ≤ 10 мс.
 *
 * Обоснование: в реальном кейсе RTS на 1000 юнитов в JS введение ячеек
 * уронило время поиска целей с ~11.6 мс до ~1.5 мс (−87%).
 */

import type { World } from './world.js'
import { WX_SHIFT } from './fixed.js'

export interface SpatialHash {
  readonly cellSize: number
  readonly cols: number
  readonly rows: number
  readonly originX: number
  readonly originY: number
  /** counts/старты ячеек, длина cols*rows + 1 */
  readonly cellStart: Int32Array
  readonly cursor: Int32Array
  /** entityId, сгруппированные по ячейкам */
  readonly dense: Int32Array
}

export function createSpatialHash(
  cellSize: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  cap: number,
): SpatialHash {
  const cols = Math.max(1, Math.ceil(width / cellSize)) + 2
  const rows = Math.max(1, Math.ceil(height / cellSize)) + 2
  return {
    cellSize,
    cols,
    rows,
    originX,
    originY,
    cellStart: new Int32Array(cols * rows + 1),
    cursor: new Int32Array(cols * rows),
    dense: new Int32Array(cap),
  }
}

function cellOf(sh: SpatialHash, wx: number, wy: number): number {
  // wx/wy в Q24.8 -> мировые единицы
  const ux = (wx >> WX_SHIFT) - sh.originX
  const uy = (wy >> WX_SHIFT) - sh.originY
  let cx = (ux / sh.cellSize) | 0
  let cy = (uy / sh.cellSize) | 0
  if (cx < 0) cx = 0
  else if (cx >= sh.cols) cx = sh.cols - 1
  if (cy < 0) cy = 0
  else if (cy >= sh.rows) cy = sh.rows - 1
  return cy * sh.cols + cx
}

/** Перестроить целиком. Вызывается раз в тик. O(n), ноль аллокаций. */
export function rebuild(sh: SpatialHash, w: World): void {
  const nCells = sh.cols * sh.rows
  sh.cellStart.fill(0)

  // Проход 1: подсчёт
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    sh.cellStart[cellOf(sh, w.px[id]!, w.py[id]!) + 1]!++
  }

  // Префиксные суммы
  for (let c = 0; c < nCells; c++) {
    sh.cellStart[c + 1] = sh.cellStart[c + 1]! + sh.cellStart[c]!
    sh.cursor[c] = sh.cellStart[c]!
  }

  // Проход 2: раскладка. alive отсортирован по возрастанию =>
  // внутри ячейки id тоже по возрастанию.
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    const c = cellOf(sh, w.px[id]!, w.py[id]!)
    sh.dense[sh.cursor[c]!++] = id
  }
}

/**
 * Границы ячеек, покрывающих круг радиуса r вокруг точки.
 * Результат пишется в out как [cx0, cy0, cx1, cy1] — без аллокаций.
 */
export function cellRange(
  sh: SpatialHash,
  wx: number,
  wy: number,
  r: number,
  out: Int32Array,
): void {
  const ux = (wx >> WX_SHIFT) - sh.originX
  const uy = (wy >> WX_SHIFT) - sh.originY
  let cx0 = ((ux - r) / sh.cellSize) | 0
  let cy0 = ((uy - r) / sh.cellSize) | 0
  let cx1 = ((ux + r) / sh.cellSize) | 0
  let cy1 = ((uy + r) / sh.cellSize) | 0
  if (cx0 < 0) cx0 = 0
  if (cy0 < 0) cy0 = 0
  if (cx1 >= sh.cols) cx1 = sh.cols - 1
  if (cy1 >= sh.rows) cy1 = sh.rows - 1
  out[0] = cx0
  out[1] = cy0
  out[2] = cx1
  out[3] = cy1
}
