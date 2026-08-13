/**
 * Движение.
 *
 * Три режима, в порядке приоритета:
 *  1. Цель в дальности атаки — стоим, бьём.
 *  2. Цель есть — идём к ней, вектор нормализуется целочисленным isqrt.
 *  3. Цели нет — фаза Advance (02_GDD §3.4): идём к центру масс противника.
 *
 * ПОЧЕМУ К ЦЕНТРУ МАСС, А НЕ ПРОСТО ВПЕРЁД. Первая версия двигала юнита без
 * цели вдоль оси X. ASCII-визуализатор показал результат за один прогон:
 * стороны РАЗМИНУЛИСЬ по лейнам и разошлись по противоположным краям карты,
 * где и простояли до таймаута. Лейновая изоляция + ограниченный радиус поиска
 * означают, что «вперёд» не гарантирует встречу.
 *
 * Центр масс врага решает это без эвристик: армии всегда сходятся.
 * Вычисляется раз в тик целочисленно, порядок обхода — по возрастанию entityId.
 */

import type { World } from '../world.js'
import { isqrt, WX_SHIFT } from '../fixed.js'
import { CLASS_PROFILES, NO_TARGET, Team } from '../types.js'

/**
 * Центры масс — глобальный на сторону и отдельный на каждый лейн.
 *
 * Лейновый нужен, чтобы фаза Advance НЕ ломала лейновую структуру. Первая
 * версия вела всех к одному глобальному центру, и ASCII показал, как поле
 * схлопывается в кашу к середине боя: лейны переставали что-либо значить.
 *
 * Теперь юнит без цели идёт к врагу в СВОЁМ лейне, и только если лейн
 * противника пуст — к общему центру. Формация держится до конца боя.
 *
 * Индексация: [team * lanes + lane] для лейновых, [team] для глобальных.
 */
export interface Centroids {
  x: Int32Array
  y: Int32Array
  count: Int32Array
  laneX: Int32Array
  laneY: Int32Array
  laneCount: Int32Array
  lanes: number
}

export function createCentroids(lanes: number): Centroids {
  return {
    x: new Int32Array(2),
    y: new Int32Array(2),
    count: new Int32Array(2),
    laneX: new Int32Array(2 * lanes),
    laneY: new Int32Array(2 * lanes),
    laneCount: new Int32Array(2 * lanes),
    lanes,
  }
}

/**
 * Целочисленное усреднение. Суммы влезают в double точно:
 * 840 юнитов × 1200 единиц × 256 = 258e6 << 2^53.
 */
export function computeCentroids(w: World, c: Centroids): void {
  c.laneX.fill(0)
  c.laneY.fill(0)
  c.laneCount.fill(0)
  const sx = [0, 0]
  const sy = [0, 0]
  const n = [0, 0]

  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    const t = w.team[id]!
    sx[t]! += w.px[id]!
    sy[t]! += w.py[id]!
    n[t]!++
    const li = t * c.lanes + w.lane[id]!
    c.laneX[li] = c.laneX[li]! + w.px[id]!
    c.laneY[li] = c.laneY[li]! + w.py[id]!
    c.laneCount[li] = c.laneCount[li]! + 1
  }

  for (let t = 0; t < 2; t++) {
    c.count[t] = n[t]!
    c.x[t] = n[t]! > 0 ? (sx[t]! / n[t]!) | 0 : 0
    c.y[t] = n[t]! > 0 ? (sy[t]! / n[t]!) | 0 : 0
    for (let l = 0; l < c.lanes; l++) {
      const li = t * c.lanes + l
      const k = c.laneCount[li]!
      if (k > 0) {
        c.laneX[li] = (c.laneX[li]! / k) | 0
        c.laneY[li] = (c.laneY[li]! / k) | 0
      }
    }
  }
}

export function runMovement(w: World, c: Centroids): void {
  const maxX = (w.geometry.fieldWidth << WX_SHIFT) | 0

  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    const prof = CLASS_PROFILES[w.cls[id]!]!

    // Мораль замедляет отряд погибшего героя (02_GDD §3.9: −20% MOVSPD)
    const morale = w.moralePct[id]!
    const speed =
      morale === 100
        ? prof.speed
        : ((prof.speed * (100 - (100 - morale) / 2)) / 100) | 0

    const t = w.target[id]!
    let tx: number
    let ty: number

    if (t === NO_TARGET) {
      const enemy = w.team[id]! === Team.A ? Team.B : Team.A
      if (c.count[enemy]! === 0) continue
      // Сначала свой лейн — иначе поле схлопывается в кашу к середине боя
      const li = enemy * c.lanes + w.lane[id]!
      if (c.laneCount[li]! > 0) {
        tx = c.laneX[li]!
        ty = c.laneY[li]!
      } else {
        tx = c.x[enemy]!
        ty = c.y[enemy]!
      }
    } else {
      tx = w.px[t]!
      ty = w.py[t]!
    }

    const dxu = (tx >> WX_SHIFT) - (w.px[id]! >> WX_SHIFT)
    const dyu = (ty >> WX_SHIFT) - (w.py[id]! >> WX_SHIFT)
    const d2 = dxu * dxu + dyu * dyu

    // В дальности атаки — стоим (только когда цель реальная, не центр масс)
    if (t !== NO_TARGET && d2 <= prof.range * prof.range) continue
    if (d2 === 0) continue

    const d = isqrt(d2)
    if (d === 0) continue

    let nx = (w.px[id]! + (((dxu * speed) / d) | 0)) | 0
    let ny = (w.py[id]! + (((dyu * speed) / d) | 0)) | 0

    // Держим юнитов на поле — иначе одиночки уходят за край и висят там
    if (nx < 0) nx = 0
    else if (nx > maxX) nx = maxX

    w.px[id] = nx
    w.py[id] = ny
  }
}
