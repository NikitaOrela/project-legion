/**
 * Выбор цели.
 *
 * ДВА УРОВНЯ, И ЭТО ВАЖНО:
 *  1. Структурный фильтр — лейновая изоляция (DECISIONS.md ADR-004).
 *     Melee ищет только в своём лейне; из лейна выходит, лишь когда тот зачищен.
 *     Ranged бьёт по кругу сквозь лейны.
 *     Без этого пустой лейн не делает НИЧЕГО, и главный тактический приём
 *     оригинала («Top Shield» — пустые лейны заставляют врага бежать через
 *     всё поле) исчезает.
 *  2. Внутри разрешённого множества — взвешенный score из 02_GDD §3.5.
 *
 * ИНВАРИАНТ ДЕТЕРМИНИЗМА: в оригинале при равных дистанциях приоритет
 * геометрический («AI goes down before up»). Мы сравниваем score, а при его
 * равенстве — МЕНЬШИЙ entityId. Тай-брейкер обязателен: без него равные
 * расстояния дают недетерминированный выбор.
 *
 * Ретаргет раз в RETARGET_PERIOD тиков, фаза разнесена по entityId — иначе
 * все 840 юнитов ретаргетятся в один тик и дают спайк в p99.
 */

import type { World } from '../world.js'
import type { SpatialHash } from '../spatial.js'
import { cellRange } from '../spatial.js'
import { distSqUnits } from '../fixed.js'
import {
  CLASS_PROFILES,
  COUNTER_PCT,
  NO_TARGET,
  RETARGET_PERIOD,
} from '../types.js'

const W_COUNTER = 40 // Q16.16 * 0.4 упрощено до целых весов score
const W_HERO = 15
const W_LOWHP = 20
const W_AFFINITY = 60

const range4 = new Int32Array(4)

/**
 * Радиус поиска цели.
 *
 * Намеренно небольшой: сближение обеспечивает фаза Advance (02_GDD §3.4),
 * а не гигантский радиус поиска. Большой радиус означал бы скан сотни ячеек
 * пространственного хэша на каждый юнит — прямой удар по бюджету 4 мс.
 */
function searchRadius(cls: number): number {
  const p = CLASS_PROFILES[cls]!
  return p.laneBound ? 260 : p.range + 60
}

export function runTargeting(w: World, sh: SpatialHash): void {
  const phase = w.tick % RETARGET_PERIOD

  for (let i = 0; i < w.aliveCount; i++) {
    const self = w.alive[i]!

    // Раскидка ретаргета по кадрам
    if (self % RETARGET_PERIOD !== phase) {
      // цель могла умереть между ретаргетами — сбрасываем сразу
      const t = w.target[self]!
      if (t !== NO_TARGET && w.hp[t]! <= 0) w.target[self] = NO_TARGET
      if (w.target[self] !== NO_TARGET) continue
    }

    w.target[self] = pickTarget(w, sh, self)
  }
}

function pickTarget(w: World, sh: SpatialHash, self: number): number {
  const cls = w.cls[self]!
  const prof = CLASS_PROFILES[cls]!
  const myTeam = w.team[self]!
  const myLane = w.lane[self]!
  const sx = w.px[self]!
  const sy = w.py[self]!
  const radius = searchRadius(cls)

  cellRange(sh, sx, sy, radius, range4)
  const cx0 = range4[0]!
  const cy0 = range4[1]!
  const cx1 = range4[2]!
  const cy1 = range4[3]!

  let bestId = NO_TARGET
  let bestScore = -0x7fffffff
  // Проход 1 — только свой лейн (для laneBound). Проход 2 — весь радиус.
  let bestIdAnyLane = NO_TARGET
  let bestScoreAnyLane = -0x7fffffff

  for (let cy = cy0; cy <= cy1; cy++) {
    const rowBase = cy * sh.cols
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = rowBase + cx
      const end = sh.cellStart[c + 1]!
      // dense внутри ячейки отсортирован по возрастанию entityId
      for (let k = sh.cellStart[c]!; k < end; k++) {
        const other = sh.dense[k]!
        if (w.team[other]! === myTeam) continue
        if (w.hp[other]! <= 0) continue

        const d2 = distSqUnits(sx, sy, w.px[other]!, w.py[other]!)
        if (d2 > radius * radius) continue

        const score = scoreTarget(w, self, other, d2, prof.wDist)

        if (
          score > bestScoreAnyLane ||
          (score === bestScoreAnyLane && other < bestIdAnyLane)
        ) {
          bestScoreAnyLane = score
          bestIdAnyLane = other
        }

        if (w.lane[other]! === myLane) {
          if (score > bestScore || (score === bestScore && other < bestId)) {
            bestScore = score
            bestId = other
          }
        }
      }
    }
  }

  // Лейновая изоляция: melee выходит из лейна только когда свой зачищен
  if (prof.laneBound) return bestId !== NO_TARGET ? bestId : bestIdAnyLane
  return bestIdAnyLane
}

/**
 * Взвешенный score. Целочисленный: дистанция входит обратной величиной,
 * масштабированной так, чтобы веса были сравнимы.
 */
function scoreTarget(
  w: World,
  self: number,
  other: number,
  d2: number,
  wDist: number,
): number {
  const myCls = w.cls[self]!
  const otherCls = w.cls[other]!

  // 1/(1+d) в целых: 65536/(1+d). d берём из d2 грубо — точность не нужна,
  // важна монотонность и детерминизм.
  const dApprox = d2 >> 6
  const distTerm = ((65536 / (1 + dApprox)) | 0)
  const distScore = ((distTerm * wDist) / 65536) | 0

  const affinity = myCls === otherCls ? W_AFFINITY : 0
  const counter = ((COUNTER_PCT[myCls]![otherCls]! - 100) * W_COUNTER) / 100 | 0
  const hero = w.isHero[other]! === 1 ? W_HERO : 0
  const lowHp =
    ((w.hpMax[other]! - w.hp[other]!) * W_LOWHP) / (w.hpMax[other]! || 1) | 0

  return distScore + affinity + counter + hero + lowHp
}
