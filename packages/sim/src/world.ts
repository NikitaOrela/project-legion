/**
 * Состояние мира: SoA на TypedArray.
 *
 * ПОЧЕМУ SoA, А НЕ МАССИВ ОБЪЕКТОВ: публичные замеры дают 12–25× ускорение,
 * но главное не среднее, а p99 — у SoA он практически равен среднему,
 * у массива объектов спайки ×2–3 из-за пауз GC. Наше требование p99 ≤ 10 мс
 * закрывается именно этим.
 *
 * ПОЧЕМУ СВОЙ, А НЕ bitECS: zero dependencies в packages/sim, лицензия MPL-2.0
 * и — главное — порядок итерации query() в bitECS не специфицирован.
 *
 * ИНВАРИАНТ: обход только по dense-массиву `alive`, отсортированному по
 * возрастанию entityId. Никогда по итератору коллекции.
 */

import type { Geometry } from './types.js'
import { NO_TARGET } from './types.js'

export interface World {
  readonly cap: number

  // --- компоненты, индексируются entityId ---
  /** позиция X в Q24.8 (мировые единицы × 256) */
  readonly px: Int32Array
  /** позиция Y в Q24.8 */
  readonly py: Int32Array
  readonly hp: Int32Array
  readonly hpMax: Int32Array
  readonly atk: Int32Array
  readonly def: Int32Array
  readonly level: Int32Array
  readonly cls: Int32Array
  readonly team: Int32Array
  readonly lane: Int32Array
  /** тиков до следующей атаки */
  readonly cd: Int32Array
  /**
   * Кулдаун скилла в тиках, отдельно от кулдауна обычной атаки.
   *
   * В первоисточнике скиллы срабатывают ПО ТАЙМЕРУ («every 8 seconds»),
   * а не по числу атак и не по чистому шансу. Это принципиально: привязка
   * к числу атак делает скорость атаки самоусиливающимся статом (она разгоняет
   * и урон, и частоту скиллов одновременно), и в ремейке это привело к тому,
   * что гайды прямо советуют качать только его. Таймер разрывает эту связь.
   */
  readonly skillCd: Int32Array
  /**
   * Накопленные стаки защиты павизы (механика Hold Ground первоисточника):
   * пока юнит стоит в контакте с врагом, его защита растёт ступенями.
   * Обнуляется, как только контакт разорван.
   */
  readonly defStacks: Int32Array
  /** Отсчёт до следующей ступени Hold Ground, в тиках. */
  readonly holdTimer: Int32Array
  readonly target: Int32Array
  /** 1 — герой, 0 — миньон. Герои приоритетнее как цель и несут скилл */
  readonly isHero: Int32Array
  /** entityId героя-владельца отряда, для морали */
  readonly owner: Int32Array
  /** множитель статов отряда в процентах: 100 обычно, 60 после moraleBreak */
  readonly moralePct: Int32Array
  /** entityId павизы, которая держит этот юнит; -1 если свободен (02_GDD §3.6) */
  readonly blockedBy: Int32Array
  /** тиков до возможности «переагриться» с павизы */
  readonly blockTimer: Int32Array

  /** dense-массив живых entityId, ВСЕГДА по возрастанию */
  alive: Int32Array
  aliveCount: number

  /** очередь смертей текущего тика, применяется пакетом в конце */
  pendingDead: Int32Array
  pendingDeadCount: number

  count: number
  tick: number
  geometry: Geometry
}

export function createWorld(cap: number, geometry: Geometry): World {
  return {
    cap,
    px: new Int32Array(cap),
    py: new Int32Array(cap),
    hp: new Int32Array(cap),
    hpMax: new Int32Array(cap),
    atk: new Int32Array(cap),
    def: new Int32Array(cap),
    level: new Int32Array(cap),
    cls: new Int32Array(cap),
    team: new Int32Array(cap),
    lane: new Int32Array(cap),
    cd: new Int32Array(cap),
    skillCd: new Int32Array(cap),
    defStacks: new Int32Array(cap),
    holdTimer: new Int32Array(cap),
    target: new Int32Array(cap).fill(NO_TARGET),
    isHero: new Int32Array(cap),
    owner: new Int32Array(cap).fill(-1),
    moralePct: new Int32Array(cap).fill(100),
    blockedBy: new Int32Array(cap).fill(-1),
    blockTimer: new Int32Array(cap),
    alive: new Int32Array(cap),
    aliveCount: 0,
    pendingDead: new Int32Array(cap),
    pendingDeadCount: 0,
    count: 0,
    tick: 0,
    geometry,
  }
}

/** Создать сущность. Возвращает entityId. Id выдаются строго по возрастанию. */
export function spawn(w: World): number {
  const id = w.count++
  w.alive[w.aliveCount++] = id
  return id
}

/** Пометить на смерть. Применяется пакетом в конце тика. */
export function markDead(w: World, id: number): void {
  w.pendingDead[w.pendingDeadCount++] = id
}

/**
 * Применить смерти пакетом. Пересобирает dense-массив живых,
 * сохраняя возрастающий порядок entityId.
 */
export function flushDeaths(w: World): void {
  if (w.pendingDeadCount === 0) return

  // Отметка через hp — надёжнее, чем поиск в очереди
  for (let i = 0; i < w.pendingDeadCount; i++) {
    const id = w.pendingDead[i]!
    w.hp[id] = 0
  }
  w.pendingDeadCount = 0

  let write = 0
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    if (w.hp[id]! > 0) w.alive[write++] = id
  }
  w.aliveCount = write
}

/** Жив ли. */
export function isAlive(w: World, id: number): boolean {
  return w.hp[id]! > 0
}
