/**
 * Бой: урон, крит, контры, мораль.
 *
 * ФОРМУЛА — DECISIONS.md ADR-009 (заменила ADR-003):
 *   mitigated = ATK² / (ATK + DEF)
 *   countered = mitigated × C[attacker][defender]
 *   damage    = max(1, countered × crit × variance)
 *
 * ПОЧЕМУ НЕ K/(K+DEF), КАК БЫЛО. Там K = 400 + 15×level — внешняя константа,
 * которую нужно подбирать под каждый диапазон уровней, иначе на 200-м уровне
 * защита перестаёт значить хоть что-то. Здесь роль K играет сама атака
 * нападающего, и модель самонормируется: при росте ATK и DEF в одинаковое
 * число раз урон растёт линейно, HP тоже — время убийства остаётся постоянным
 * по всей прогрессии. Подгонки не нужно вообще.
 *
 * Второе свойство важнее первого: слабый атакующий наказан КВАДРАТИЧНО.
 * Павиза с ATK 28 против DEF 47 наносит 28²/75 = 10, то есть 37% своей и без
 * того малой атаки. Танки перестают разменивать друг друга и начинают
 * стопорить бой — а это прямое противодействие петле Ланчестера, из-за которой
 * 156 пар архетипов из 156 выпадали из коридора 40–60% (BALANCE_01).
 *
 * Источник: `/en/stats` ремейка, подтверждено независимо двумя разборами
 * сообщества (`docs/01e_REBORN_NUMBERS.md`).
 *
 * Крит применяется ПОСЛЕ митигации — подтверждено замерами оригинала 2015 года
 * (рост защиты на 112 просадил обычный удар на 9.57, крит на 18.73; отношение
 * 1.96 при крит-множителе ×2 означает, что множитель идёт последним).
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
  BLOCK_RADIUS,
  CLASS_PROFILES,
  COUNTER_PCT,
  HOLD_DEF_STEP_PCT,
  HOLD_MAX_STACKS,
  HOLD_PERIOD,
  CRIT_CHANCE_PCT,
  CRIT_MULT_PCT,
  MAGE_SPLASH_PERIOD,
  NO_TARGET,
  SPLASH_PCT,
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

    /*
     * Площадной удар мага — СКИЛЛ ПО ТАЙМЕРУ, а не свойство обычной атаки.
     *
     * Так было не всегда, и прежний вариант — сплэш на каждой атаке — оказался
     * главным источником дисбаланса. Замер BALANCE_01: маг давал 32.5% всего
     * урона в игре при нуле полученного. Причина арифметическая: класс,
     * который бьёт по площади каждый удар, умножает свой урон на плотность
     * вражеского строя. Чем плотнее стоит противник, тем быстрее он тает, и
     * петля Ланчестера получает второй источник питания помимо численности.
     *
     * Это была наша выдумка, а не механика первоисточника. Там базовая атака
     * мага одноцелевая, а площадь приходит скиллом с таймером и вдобавок режется
     * по рядовым бойцам. Возвращаемся к этой модели.
     *
     * Кулдаун тикает в runCombat, а не отдельной системой: скилл — это часть
     * боя, и лишний проход по всем живым юнитам стоил бы такта в горячем цикле.
     */
    if (prof.splashRadius > 0 && w.skillCd[id]! <= 0) {
      w.skillCd[id] = MAGE_SPLASH_PERIOD
      applySplash(w, rng, stats, sh, id, t, prof.splashRadius, ev)
    }
  }

  // Кулдауны скиллов и стаки Hold Ground — отдельным проходом по alive, строго
  // по возрастанию entityId, чтобы порядок не зависел от того, кто в этом тике
  // атаковал. Проход без RNG, поэтому на детерминизм он не влияет вовсе.
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    if (w.skillCd[id]! > 0) w.skillCd[id]!--

    if (!CLASS_PROFILES[w.cls[id]!]!.isBlocker) continue

    const t = w.target[id]!
    const engaged =
      t !== NO_TARGET &&
      w.hp[t]! > 0 &&
      distSqUnits(w.px[id]!, w.py[id]!, w.px[t]!, w.py[t]!) <= BLOCK_RADIUS * BLOCK_RADIUS

    if (!engaged) {
      w.defStacks[id] = 0
      w.holdTimer[id] = 0
      continue
    }
    if (w.defStacks[id]! >= HOLD_MAX_STACKS) continue
    const timer = w.holdTimer[id]! + 1
    if (timer >= HOLD_PERIOD) {
      w.holdTimer[id] = 0
      w.defStacks[id] = w.defStacks[id]! + 1
    } else {
      w.holdTimer[id] = timer
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
  let dmg = computeDamage(w, rng, attacker, victim)
  // Сплэш бьёт слабее основной цели — см. SPLASH_PCT.
  // Срез ПОСЛЕ computeDamage, а не внутри: порядок потребления RNG обязан
  // остаться одинаковым для основной цели и для задетых, иначе golden-реплеи
  // разъезжаются при любом изменении плотности строя.
  if ((extraFlags & EventFlag.Splash) !== 0) {
    dmg = ((dmg * SPLASH_PCT) / 100) | 0
    if (dmg < 1) dmg = 1
  }
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
  // Мораль и стаки Hold Ground — оба множителя на защиту, оба целочисленные
  const holdPct = 100 + HOLD_DEF_STEP_PCT * w.defStacks[defender]!
  const defEff =
    ((((w.def[defender]! * w.moralePct[defender]!) / 100) | 0) * holdPct / 100) | 0

  // ATK² / (ATK + DEF) — целочисленно. atkEff на 200 уровне порядка 1500,
  // квадрат ~2.2e6, до предела Int32 (2.1e9) три порядка запаса.
  const mitigated = ((atkEff * atkEff) / (atkEff + defEff)) | 0

  // Контр — после митигации. Если домножать атаку ДО, множитель попадает
  // в квадрат числителя и +20% превращается в +44%.
  const countered = ((mitigated * COUNTER_PCT[aCls]![dCls]!) / 100) | 0

  // ПОРЯДОК ПОТРЕБЛЕНИЯ RNG — не менять
  const isCrit = rngBelow(rng, 100) < CRIT_CHANCE_PCT
  const variancePct = VARIANCE_MIN_PCT + rngBelow(rng, VARIANCE_SPAN_PCT)
  lastHitFlags = isCrit ? EventFlag.Crit : 0

  let dmg = countered
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
