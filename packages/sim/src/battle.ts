/**
 * runBattle — единственная точка входа в симуляцию.
 *
 * Чистая функция: одинаковый вход (seed + формации + данные) даёт побитово
 * одинаковый выход. Всегда, на любом движке.
 *
 * ПОРЯДОК СИСТЕМ В ТИКЕ ФИКСИРОВАН. Менять нельзя — сломаются golden-реплеи:
 *   1. rebuild пространственного хэша
 *   2. targeting
 *   3. movement
 *   4. combat
 *   5. мораль за погибших героев
 *   6. пакетное применение смертей
 */

import type { World } from './world.js'
import { createWorld, spawn, flushDeaths } from './world.js'
import type { RngState } from './rng.js'
import { rngCreate, rngSave, RngStream } from './rng.js'
import type { SpatialHash } from './spatial.js'
import { createSpatialHash, rebuild } from './spatial.js'
import { runTargeting } from './systems/targeting.js'
import { runMovement, createCentroids, computeCentroids } from './systems/movement.js'
import type { CombatStats } from './systems/combat.js'
import { runCombat, createStats, applyMoraleBreak } from './systems/combat.js'
import type { EventBuffer } from './events.js'
import { clearEvents, createEventBuffer } from './events.js'
import { hashWorld } from './hash.js'
import type { StateHash } from './hash.js'
import { WX_SHIFT } from './fixed.js'
import type { Geometry } from './types.js'
import {
  BATTLE_TIMEOUT_TICKS,
  CLASS_PROFILES,
  DEFAULT_GEOMETRY,
  Team,
} from './types.js'

/** Один занятый слот формации: герой класса cls в клетке (lane, rank). */
export interface Slot {
  readonly lane: number
  readonly rank: number
  readonly cls: number
  readonly level: number
  /** сколько миньонов приводит герой */
  readonly squad: number
}

export interface Formation {
  readonly slots: readonly Slot[]
}

export const enum Outcome {
  TeamAWins = 0,
  TeamBWins = 1,
  Timeout = 2,
}

export interface BattleResult {
  outcome: Outcome
  ticks: number
  hash: StateHash
  survivorsA: number
  survivorsB: number
  /** доля оставшегося HP, проценты — критерий победы при таймауте */
  hpPctA: number
  hpPctB: number
  stats: CombatStats
  world: World
}

export interface BattleOptions {
  readonly geometry?: Geometry
  readonly maxTicks?: number
  /** колбэк после каждого тика — для ASCII-визуализатора и отладки */
  readonly onTick?: (w: World, tick: number, ev: EventBuffer) => void
}

const HERO_STAT_BONUS_PCT = 260 // герой заметно крепче миньона своего класса

function deployFormation(
  w: World,
  f: Formation,
  team: Team,
  geo: Geometry,
): void {
  const dir = team === Team.A ? 1 : -1
  const baseX = team === Team.A ? 60 : geo.fieldWidth - 60
  const laneSpan = (geo.lanes - 1) * geo.laneHeight
  const y0 = -laneSpan / 2

  for (const slot of f.slots) {
    const prof = CLASS_PROFILES[slot.cls]!
    const lvl = slot.level
    // heroStatAtLevel — DECISIONS.md ADR-005: множитель 0.05 за уровень
    const growthPct = 100 + 5 * (lvl - 1)

    const cellX = baseX + dir * slot.rank * geo.rankDepth
    const cellY = y0 + slot.lane * geo.laneHeight

    // Герой
    const hero = spawn(w)
    w.cls[hero] = slot.cls
    w.team[hero] = team
    w.lane[hero] = slot.lane
    w.level[hero] = lvl
    w.isHero[hero] = 1
    w.owner[hero] = -1
    w.hpMax[hero] =
      ((prof.baseHp * growthPct * HERO_STAT_BONUS_PCT) / 10000) | 0
    w.hp[hero] = w.hpMax[hero]!
    w.atk[hero] = ((prof.baseAtk * growthPct * HERO_STAT_BONUS_PCT) / 10000) | 0
    w.def[hero] = ((prof.baseDef * growthPct * HERO_STAT_BONUS_PCT) / 10000) | 0
    w.px[hero] = (cellX << WX_SHIFT) | 0
    w.py[hero] = (cellY << WX_SHIFT) | 0

    // Отряд: компактный строй позади и по бокам от героя
    for (let m = 0; m < slot.squad; m++) {
      const id = spawn(w)
      w.cls[id] = slot.cls
      w.team[id] = team
      w.lane[id] = slot.lane
      w.level[id] = lvl
      w.isHero[id] = 0
      w.owner[id] = hero
      w.hpMax[id] = ((prof.baseHp * growthPct) / 100) | 0
      w.hp[id] = w.hpMax[id]!
      w.atk[id] = ((prof.baseAtk * growthPct) / 100) | 0
      w.def[id] = ((prof.baseDef * growthPct) / 100) | 0

      // строй 5 в ряд, шаг 11 единиц — детерминированная раскладка
      const row = (m / 5) | 0
      const col = m % 5
      const ox = -dir * (10 + row * 11)
      const oy = (col - 2) * 11
      w.px[id] = ((cellX + ox) << WX_SHIFT) | 0
      w.py[id] = ((cellY + oy) << WX_SHIFT) | 0
    }
  }
}

export function runBattle(
  seed: number,
  a: Formation,
  b: Formation,
  opts: BattleOptions = {},
): BattleResult {
  const geo = opts.geometry ?? DEFAULT_GEOMETRY
  const maxTicks = opts.maxTicks ?? BATTLE_TIMEOUT_TICKS

  let cap = 0
  for (const s of a.slots) cap += 1 + s.squad
  for (const s of b.slots) cap += 1 + s.squad

  const w = createWorld(cap, geo)
  deployFormation(w, a, Team.A, geo)
  deployFormation(w, b, Team.B, geo)

  const rng: RngState = rngCreate(0, seed >>> 0, RngStream.Combat)
  const stats = createStats(cap)

  const laneSpan = (geo.lanes - 1) * geo.laneHeight
  const sh: SpatialHash = createSpatialHash(
    200,
    -100,
    -laneSpan / 2 - 200,
    geo.fieldWidth + 200,
    laneSpan + 400,
    cap,
  )

  const deadHeroes = new Int32Array(cap)
  const centroids = createCentroids(geo.lanes)
  const events = createEventBuffer(2048)

  let outcome = Outcome.Timeout
  let tick = 0

  for (; tick < maxTicks; tick++) {
    w.tick = tick

    clearEvents(events)
    rebuild(sh, w)
    computeCentroids(w, centroids)
    runTargeting(w, sh)
    runMovement(w, centroids)
    runCombat(w, rng, stats, sh, events)

    // Герои, погибшие в этом тике — до применения смертей
    let nDead = 0
    for (let i = 0; i < w.pendingDeadCount; i++) {
      const id = w.pendingDead[i]!
      if (w.isHero[id]! === 1) deadHeroes[nDead++] = id
    }
    if (nDead > 0) applyMoraleBreak(w, deadHeroes, nDead)

    flushDeaths(w)

    if (opts.onTick) opts.onTick(w, tick, events)

    let liveA = 0
    let liveB = 0
    for (let i = 0; i < w.aliveCount; i++) {
      if (w.team[w.alive[i]!]! === Team.A) liveA++
      else liveB++
    }
    if (liveA === 0 && liveB === 0) {
      outcome = Outcome.Timeout
      tick++
      break
    }
    if (liveB === 0) {
      outcome = Outcome.TeamAWins
      tick++
      break
    }
    if (liveA === 0) {
      outcome = Outcome.TeamBWins
      tick++
      break
    }
  }

  // Итоги
  let survivorsA = 0
  let survivorsB = 0
  let hpA = 0
  let hpB = 0
  let hpMaxA = 0
  let hpMaxB = 0
  for (let id = 0; id < w.count; id++) {
    if (w.team[id]! === Team.A) {
      hpMaxA += w.hpMax[id]!
      if (w.hp[id]! > 0) {
        survivorsA++
        hpA += w.hp[id]!
      }
    } else {
      hpMaxB += w.hpMax[id]!
      if (w.hp[id]! > 0) {
        survivorsB++
        hpB += w.hp[id]!
      }
    }
  }

  const hpPctA = hpMaxA > 0 ? ((hpA * 100) / hpMaxA) | 0 : 0
  const hpPctB = hpMaxB > 0 ? ((hpB * 100) / hpMaxB) | 0 : 0

  // При таймауте побеждает сторона с большей долей оставшегося HP (02_GDD §3.4)
  if (outcome === Outcome.Timeout) {
    if (hpPctA > hpPctB) outcome = Outcome.TeamAWins
    else if (hpPctB > hpPctA) outcome = Outcome.TeamBWins
  }

  const snap = rngSave(rng)
  return {
    outcome,
    ticks: tick,
    hash: hashWorld(w, snap[0]!, snap[1]!),
    survivorsA,
    survivorsB,
    hpPctA,
    hpPctB,
    stats,
    world: w,
  }
}
