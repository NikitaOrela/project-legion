/**
 * Бой: урон, крит, контры, мораль.
 *
 * ФОРМУЛА — DECISIONS.md ADR-003 (процентная модель из 02_GDD §3.7):
 *   raw       = ATK × C[attacker][defender]
 *   mitigated = raw × K / (K + DEF),  K = 400 + 15 × level
 *   damage    = max(1, mitigated × crit × variance)
 *
 * Крит применяется ПОСЛЕ митигации — это подтверждено замерами оригинала.
 *
 * ПОРЯДОК ПОТРЕБЛЕНИЯ RNG ФИКСИРОВАН: сначала бросок крита, потом разброс.
 * Менять порядок нельзя — сломаются все golden-реплеи.
 *
 * Смерти НЕ применяются сразу: копятся и разрешаются пакетом в конце тика.
 * Иначе «A убил B, B убил A в том же тике» даёт разный результат в зависимости
 * от порядка обхода.
 */

import type { World } from '../world.js'
import { markDead } from '../world.js'
import type { RngState } from '../rng.js'
import type { EventBuffer } from '../events.js'
import { EventFlag, EventKind, pushEvent } from '../events.js'
import { rngBelow } from '../rng.js'
import { distSqUnits } from '../fixed.js'
import { WX_SHIFT } from '../fixed.js'
import type { SpatialHash } from '../spatial.js'
import { cellRange } from '../spatial.js'
import {
  CLASS_PROFILES,
  COUNTER_PCT,
  CRIT_CHANCE_PCT,
  CRIT_MULT_PCT,
  MITIGATION_K_BASE,
  MITIGATION_K_PER_LEVEL,
  NO_TARGET,
  VARIANCE_MIN_PCT,
  VARIANCE_SPAN_PCT,
} from '../types.js'

/** Статистика боя для post-battle отчёта (столп 2). */
export interface CombatStats {
  dealt: Int32Array
  taken: Int32Array
  kills: Int32Array
  /** entityId того, кто убил, для каждого погибшего; -1 если жив */
  killedBy: Int32Array
  /** тик смерти, -1 если жив */
  deathTick: Int32Array
  /** сколько вылечено — отдельной строкой в отчёте, не мешаем с уроном */
  healed: Int32Array
}

export function createStats(cap: number): CombatStats {
  return {
    dealt: new Int32Array(cap),
    taken: new Int32Array(cap),
    kills: new Int32Array(cap),
    killedBy: new Int32Array(cap).fill(-1),
    deathTick: new Int32Array(cap).fill(-1),
    healed: new Int32Array(cap),
  }
}

const splashRange4 = new Int32Array(4)

export function runCombat(
  w: World,
  rng: RngState,
  stats: CombatStats,
  sh: SpatialHash,
  ev: EventBuffer,
): void {
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!

    if (w.cd[id]! > 0) {
      w.cd[id]!--
      continue
    }

    const t = w.target[id]!
    if (t === NO_TARGET || w.hp[t]! <= 0) continue

    const prof = CLASS_PROFILES[w.cls[id]!]!
    const d2 = distSqUnits(w.px[id]!, w.py[id]!, w.px[t]!, w.py[t]!)
    if (d2 > prof.range * prof.range) continue

    w.cd[id] = prof.attackPeriod

    if (prof.isHealer) {
      applyHeal(w, rng, stats, id, t, ev)
      continue
    }

    applyHit(w, rng, stats, id, t, ev, 0)

    // Маг задевает всех вокруг цели. Порядок обхода — по возрастанию entityId
    // внутри ячеек хэша, иначе RNG потребляется в непредсказуемом порядке.
    if (prof.splashRadius > 0) {
      applySplash(w, rng, stats, sh, id, t, prof.splashRadius, ev)
    }
  }
}

/** Порог, с которого контр считается «сработавшим» и подсвечивается игроку. */
const COUNTER_VISIBLE_PCT = 120

function applyHit(
  w: World,
  rng: RngState,
  stats: CombatStats,
  attacker: number,
  victim: number,
  ev: EventBuffer,
  extraFlags: number,
): void {
  const before = w.hp[victim]!
  const dmg = computeDamage(w, rng, attacker, victim)
  w.hp[victim] = before - dmg
  stats.dealt[attacker] = stats.dealt[attacker]! + dmg
  stats.taken[victim] = stats.taken[victim]! + dmg

  let flags = extraFlags | lastHitFlags
  if (COUNTER_PCT[w.cls[attacker]!]![w.cls[victim]!]! >= COUNTER_VISIBLE_PCT) {
    flags |= EventFlag.Counter
  }
  pushEvent(ev, EventKind.Damage, attacker, victim, dmg, flags)

  if (w.hp[victim]! <= 0) {
    markDead(w, victim)
    stats.kills[attacker] = stats.kills[attacker]! + 1
    stats.killedBy[victim] = attacker
    stats.deathTick[victim] = w.tick
    pushEvent(ev, EventKind.Death, attacker, victim, 0, 0)
  }
}

/**
 * Крит определяется внутри computeDamage, а флаг нужен снаружи. Модульная
 * переменная вместо возврата кортежа: кортеж — это аллокация объекта в самом
 * горячем цикле симуляции.
 */
let lastHitFlags = 0

function applySplash(
  w: World,
  rng: RngState,
  stats: CombatStats,
  sh: SpatialHash,
  attacker: number,
  centerUnit: number,
  radius: number,
  ev: EventBuffer,
): void {
  const cx0 = w.px[centerUnit]!
  const cy0 = w.py[centerUnit]!
  const myTeam = w.team[attacker]!
  cellRange(sh, cx0, cy0, radius, splashRange4)
  for (let cy = splashRange4[1]!; cy <= splashRange4[3]!; cy++) {
    const rowBase = cy * sh.cols
    for (let cx = splashRange4[0]!; cx <= splashRange4[2]!; cx++) {
      const c = rowBase + cx
      const end = sh.cellStart[c + 1]!
      for (let k = sh.cellStart[c]!; k < end; k++) {
        const other = sh.dense[k]!
        if (other === centerUnit) continue
        if (w.team[other]! === myTeam || w.hp[other]! <= 0) continue
        if (distSqUnits(cx0, cy0, w.px[other]!, w.py[other]!) > radius * radius) continue
        applyHit(w, rng, stats, attacker, other, ev, EventFlag.Splash)
      }
    }
  }
}

/** Лечение. Никогда не выводит HP выше максимума. */
function applyHeal(
  w: World,
  rng: RngState,
  stats: CombatStats,
  healer: number,
  ally: number,
  ev: EventBuffer,
): void {
  const power = ((w.atk[healer]! * w.moralePct[healer]!) / 100) | 0
  // Тот же порядок потребления RNG, что и у урона — крит, затем разброс
  const isCrit = rngBelow(rng, 100) < CRIT_CHANCE_PCT
  const variancePct = VARIANCE_MIN_PCT + rngBelow(rng, VARIANCE_SPAN_PCT)
  let heal = power
  if (isCrit) heal = ((heal * CRIT_MULT_PCT) / 100) | 0
  heal = ((heal * variancePct) / 100) | 0

  const room = w.hpMax[ally]! - w.hp[ally]!
  if (heal > room) heal = room
  if (heal <= 0) return
  w.hp[ally] = w.hp[ally]! + heal
  stats.healed[healer] = stats.healed[healer]! + heal
  pushEvent(ev, EventKind.Heal, healer, ally, heal, isCrit ? EventFlag.Crit : 0)
}

function computeDamage(
  w: World,
  rng: RngState,
  attacker: number,
  defender: number,
): number {
  const aCls = w.cls[attacker]!
  const dCls = w.cls[defender]!

  // Мораль: отряд погибшего героя бьёт слабее (02_GDD §3.9)
  const atkEff = ((w.atk[attacker]! * w.moralePct[attacker]!) / 100) | 0
  const defEff = ((w.def[defender]! * w.moralePct[defender]!) / 100) | 0

  const raw = ((atkEff * COUNTER_PCT[aCls]![dCls]!) / 100) | 0

  const k = MITIGATION_K_BASE + MITIGATION_K_PER_LEVEL * w.level[defender]!
  const mitigated = ((raw * k) / (k + defEff)) | 0

  // ПОРЯДОК ПОТРЕБЛЕНИЯ RNG — не менять
  const isCrit = rngBelow(rng, 100) < CRIT_CHANCE_PCT
  const variancePct = VARIANCE_MIN_PCT + rngBelow(rng, VARIANCE_SPAN_PCT)
  lastHitFlags = isCrit ? EventFlag.Crit : 0

  let dmg = mitigated
  if (isCrit) dmg = ((dmg * CRIT_MULT_PCT) / 100) | 0
  dmg = ((dmg * variancePct) / 100) | 0

  return dmg > 0 ? dmg : 1
}

/**
 * Мораль: когда герой погибает, его выжившие миньоны получают
 * −40% ATK/DEF и −20% MOVSPD (02_GDD §3.9).
 *
 * Это делает героев приоритетной целью и создаёт каскадные развалы фронта —
 * драматургия боя без единого скрипта.
 */
export function applyMoraleBreak(w: World, deadHeroes: Int32Array, n: number): void {
  if (n === 0) return
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    if (w.moralePct[id]! !== 100) continue
    const owner = w.owner[id]!
    if (owner < 0) continue
    for (let k = 0; k < n; k++) {
      if (deadHeroes[k]! === owner) {
        w.moralePct[id] = 60 // −40%
        break
      }
    }
  }
}
