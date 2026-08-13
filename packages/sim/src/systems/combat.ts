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
import { rngBelow } from '../rng.js'
import { distSqUnits } from '../fixed.js'
import { WX_SHIFT } from '../fixed.js'
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
}

export function createStats(cap: number): CombatStats {
  return {
    dealt: new Int32Array(cap),
    taken: new Int32Array(cap),
    kills: new Int32Array(cap),
    killedBy: new Int32Array(cap).fill(-1),
    deathTick: new Int32Array(cap).fill(-1),
  }
}

export function runCombat(
  w: World,
  rng: RngState,
  stats: CombatStats,
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

    const dmg = computeDamage(w, rng, id, t)

    w.hp[t] = w.hp[t]! - dmg
    stats.dealt[id] = stats.dealt[id]! + dmg
    stats.taken[t] = stats.taken[t]! + dmg
    w.cd[id] = prof.attackPeriod

    if (w.hp[t]! <= 0) {
      markDead(w, t)
      stats.kills[id] = stats.kills[id]! + 1
      stats.killedBy[t] = id
      stats.deathTick[t] = w.tick
    }
  }
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
