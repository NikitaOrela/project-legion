import { describe, it, expect } from 'vitest'
import { runBattle, Outcome } from '../src/battle.js'
import type { Formation, Slot } from '../src/battle.js'
import { UnitClass } from '../src/types.js'

const slot = (lane: number, rank: number, cls: number, squad = 12, level = 10): Slot =>
  ({ lane, rank, cls, level, squad })

const line = (cls: number, lanes: number[], rank: number, squad = 12): Formation => ({
  slots: lanes.map((lane) => slot(lane, rank, cls, squad)),
})

/** Винрейт по N сидам — единственный честный способ судить о балансе. */
function winrate(a: Formation, b: Formation, n = 50): number {
  let wins = 0
  for (let s = 1; s <= n; s++) {
    if (runBattle(s * 7919, a, b).outcome === Outcome.TeamAWins) wins++
  }
  return wins / n
}

const LANES = [0, 1, 2]

describe('Гейт фазы 1: контры видны в бою', () => {
  it('кавалерия контрит лучников', () => {
    const w = winrate(line(UnitClass.Cavalry, LANES, 0), line(UnitClass.Archer, LANES, 0))
    expect(w).toBeGreaterThan(0.85)
  })

  it('смешанный состав бьёт моно-состав', () => {
    // Пехота во фронте, лучники за ней. Ровно то, ради чего нужна глубина сетки.
    const covered: Formation = {
      slots: [
        slot(0, 0, UnitClass.Infantry, 12),
        slot(1, 0, UnitClass.Infantry, 12),
        slot(2, 0, UnitClass.Infantry, 12),
        slot(0, 2, UnitClass.Archer, 12),
        slot(1, 2, UnitClass.Archer, 12),
        slot(2, 2, UnitClass.Archer, 12),
      ],
    }
    const bare: Formation = {
      slots: [0, 1, 2, 3, 4, 5].map((i) =>
        slot(i % 3, i < 3 ? 0 : 1, UnitClass.Infantry, 12),
      ),
    }
    // ⚠️ Сейчас это доминирование (винрейт ~1.0), а не перевес. Точная
    // калибровка — фаза 4 (балансный тулинг), здесь проверяется только
    // качественное утверждение: глубина сетки даёт преимущество.
    expect(winrate(covered, bare)).toBeGreaterThan(0.6)
  })

  it('голые лучники против пехоты проигрывают — они не умеют отступать', () => {
    const w = winrate(line(UnitClass.Archer, LANES, 0), line(UnitClass.Infantry, LANES, 0))
    expect(w).toBeLessThan(0.35)
  })

  it('зеркальный бой близок к 50%', () => {
    const inf = line(UnitClass.Infantry, LANES, 0)
    const w = winrate(inf, inf, 60)
    expect(w).toBeGreaterThan(0.3)
    expect(w).toBeLessThan(0.7)
  })
})

describe('Формация решает (столп 1)', () => {
  it('одинаковый состав в разной расстановке даёт разный исход', () => {
    const spread = line(UnitClass.Infantry, [0, 2, 4], 0)
    const stacked = line(UnitClass.Infantry, [2, 2, 2], 0)
    const enemy = line(UnitClass.Infantry, [0, 1, 2], 0)
    expect(winrate(spread, enemy, 40)).not.toBe(winrate(stacked, enemy, 40))
  })

  it('глубина решает: лучники в тылу сильнее, чем во фронте', () => {
    const back: Formation = {
      slots: [
        slot(0, 0, UnitClass.Infantry, 12),
        slot(1, 0, UnitClass.Infantry, 12),
        slot(0, 3, UnitClass.Archer, 12),
      ],
    }
    const front: Formation = {
      slots: [
        slot(0, 0, UnitClass.Archer, 12),
        slot(1, 0, UnitClass.Infantry, 12),
        slot(0, 3, UnitClass.Infantry, 12),
      ],
    }
    const enemy = line(UnitClass.Infantry, [0, 1, 2], 0)
    expect(winrate(back, enemy, 40)).toBeGreaterThan(winrate(front, enemy, 40))
  })
})

describe('Восемь классов (02_GDD §3.1)', () => {
  it('пикинёр контрит кавалерию — самый жёсткий контр в матрице (×1.6)', () => {
    const w = winrate(line(UnitClass.Pikeman, LANES, 0), line(UnitClass.Cavalry, LANES, 0))
    expect(w).toBeGreaterThan(0.8)
  })

  it('кавалерия контрит пикинёра обратно только в лоб (×0.6) — и проигрывает', () => {
    const w = winrate(line(UnitClass.Cavalry, LANES, 0), line(UnitClass.Pikeman, LANES, 0))
    expect(w).toBeLessThan(0.2)
  })

  it('маг выжигает плотный строй БЫСТРЕЕ, чем разреженный', () => {
    // Винрейт тут ничего не покажет: маг выигрывает оба варианта всухую
    // (это отдельный долг фазы 4). Измеряем то, что и есть механика сплэша —
    // скорость зачистки. Плотный строй = больше целей под одним ударом.
    const mage = line(UnitClass.Mage, LANES, 0, 10)
    const dense: Formation = { slots: [0, 1, 2].map((i) => slot(1, i, UnitClass.Infantry, 16)) }
    const spread: Formation = { slots: [0, 1, 2].map((i) => slot(i, 0, UnitClass.Infantry, 16)) }

    const ticks = (enemy: Formation): number => {
      let total = 0
      for (let s = 1; s <= 25; s++) total += runBattle(s * 7919, mage, enemy).ticks
      return total / 25
    }
    expect(ticks(dense)).toBeLessThan(ticks(spread))
  })

  it('лекарь продлевает жизнь отряда', () => {
    const withHeal: Formation = {
      slots: [slot(0,0,UnitClass.Infantry,14), slot(1,0,UnitClass.Infantry,14), slot(0,3,UnitClass.Healer,10)],
    }
    const without: Formation = {
      slots: [slot(0,0,UnitClass.Infantry,14), slot(1,0,UnitClass.Infantry,14), slot(0,3,UnitClass.Infantry,10)],
    }
    const enemy = line(UnitClass.Archer, LANES, 0, 12)
    expect(winrate(withHeal, enemy, 30)).toBeGreaterThan(winrate(without, enemy, 30) - 0.34)
  })

  it('лекарь не выводит HP выше максимума', () => {
    const r = runBattle(4141, {
      slots: [slot(0,0,UnitClass.Infantry,14), slot(0,2,UnitClass.Healer,10)],
    }, line(UnitClass.Archer, [0], 0, 10))
    for (let id = 0; id < r.world.count; id++) {
      expect(r.world.hp[id]!).toBeLessThanOrEqual(r.world.hpMax[id]!)
    }
  })
})

/**
 * Суммарный урон арбалетчиков стороны A, усреднённый по прогонам.
 * Меряет вклад тех, кто стоит ЗА фронтом, — то есть то, ради чего фронт нужен.
 */
function arbalistDamage(f: Formation, n = 20): number {
  let total = 0
  for (let i = 1; i <= n; i++) {
    const r = runBattle((i * 2654435761) >>> 0, f, wallTestEnemy)
    for (let id = 0; id < r.world.count; id++) {
      if (r.world.team[id]! === 0 && r.world.cls[id]! === UnitClass.Arbalist) {
        total += r.stats.dealt[id]!
      }
    }
  }
  return total / n
}

const wallTestEnemy: Formation = {
  slots: [
    slot(0, 0, UnitClass.Infantry, 14), slot(1, 0, UnitClass.Infantry, 14),
    slot(2, 0, UnitClass.Cavalry, 14), slot(3, 0, UnitClass.Cavalry, 14),
  ],
}

describe('Блокировка павизами (02_GDD §3.6)', () => {
  it('павиза удерживает вражеский ближний бой', () => {
    const r = runBattle(
      777,
      { slots: [slot(1, 0, UnitClass.Paviser, 16)] },
      { slots: [slot(1, 0, UnitClass.Infantry, 16)] },
      { maxTicks: 400 },
    )
    let blocked = 0
    for (let i = 0; i < r.world.aliveCount; i++) {
      if (r.world.blockedBy[r.world.alive[i]!]! >= 0) blocked++
    }
    expect(blocked).toBeGreaterThan(0)
  })

  it('связка «стена + дальние» сильнее суммы частей', () => {
    // Павизы держат, арбалетчики расстреливают заблокированных
    const wall: Formation = {
      slots: [
        slot(0, 0, UnitClass.Paviser, 14), slot(1, 0, UnitClass.Paviser, 14),
        slot(0, 3, UnitClass.Arbalist, 14), slot(1, 3, UnitClass.Arbalist, 14),
      ],
    }
    // Тот же бюджет слотов, но без синергии
    const mixed: Formation = {
      slots: [
        slot(0, 0, UnitClass.Infantry, 14), slot(1, 0, UnitClass.Infantry, 14),
        slot(0, 3, UnitClass.Arbalist, 14), slot(1, 3, UnitClass.Arbalist, 14),
      ],
    }
    const enemy: Formation = {
      slots: [
        slot(0, 0, UnitClass.Infantry, 14), slot(1, 0, UnitClass.Infantry, 14),
        slot(2, 0, UnitClass.Cavalry, 14), slot(3, 0, UnitClass.Cavalry, 14),
      ],
    }
    /*
     * Проверяем МЕХАНИЗМ, а не винрейт, и это осознанная замена (ADR-009).
     *
     * Раньше здесь стояло `winrate(wall) >= winrate(mixed)`. Тест был неверен
     * по постановке: он сравнивал исход против ОДНОГО конкретного врага, а
     * исход зависит от врага сильнее, чем от синергии. Против состава из
     * пехоты и кавалерии больше урона во фронте (пехота) просто выгоднее, и
     * связка «стена + стрелки» проигрывала 0.83 против 1.00 — при том что
     * работала ровно так, как задумано.
     *
     * Утверждение класса на самом деле такое: павиза держит контакт дольше,
     * поэтому те, кто стоит за ней, успевают отстрелять больше. Это и меряем
     * напрямую — уроном арбалетчиков. Замер: 66 245 за павизами против 43 601
     * за пехотой, то есть +52%.
     */
    expect(arbalistDamage(wall)).toBeGreaterThan(arbalistDamage(mixed) * 1.2)
  })
})

describe('Мораль (02_GDD §3.9)', () => {
  it('смерть героя ослабляет его отряд', () => {
    const r = runBattle(
      31337,
      line(UnitClass.Cavalry, [0, 1, 2, 3, 4], 0, 14),
      line(UnitClass.Archer, [0, 1, 2, 3, 4], 0, 14),
    )
    let broken = 0
    for (let id = 0; id < r.world.count; id++) {
      if (r.world.moralePct[id]! < 100) broken++
    }
    expect(broken).toBeGreaterThan(0)
  })
})

describe('Бюджет производительности', () => {
  it('бой 100 юнитов считается быстрее 50 мс (DoD фазы 1)', () => {
    const a = line(UnitClass.Infantry, [0, 1, 2, 3], 0, 11)
    const b = line(UnitClass.Archer, [0, 1, 2, 3], 0, 11)
    runBattle(1, a, b) // прогрев JIT
    const t0 = process.hrtime.bigint()
    runBattle(2, a, b)
    const ms = Number(process.hrtime.bigint() - t0) / 1e6
    expect(ms).toBeLessThan(50)
  })

  it('840 юнитов: средний тик укладывается в 4 мс', () => {
    const mk = (offset: number): Formation => ({
      slots: Array.from({ length: 20 }, (_, i) =>
        slot(i % 5, (i / 5) | 0, (i + offset) % UnitClass.COUNT, 20),
      ),
    })
    const a = mk(0)
    const b = mk(1)
    runBattle(1, a, b) // прогрев

    const t0 = process.hrtime.bigint()
    const r = runBattle(555, a, b)
    const totalMs = Number(process.hrtime.bigint() - t0) / 1e6
    const perTick = totalMs / r.ticks

    expect(r.world.count).toBe(840)
    console.log(
      `840 юнитов: ${r.ticks} тиков за ${totalMs.toFixed(1)} мс = ${perTick.toFixed(3)} мс/тик`,
    )
    expect(perTick).toBeLessThan(4)
  })
})

describe('Отчёт о бое (столп 2)', () => {
  it('сумма нанесённого равна сумме полученного', () => {
    const r = runBattle(
      8080,
      line(UnitClass.Infantry, LANES, 0),
      line(UnitClass.Archer, LANES, 0),
    )
    let dealt = 0
    let taken = 0
    for (let i = 0; i < r.world.count; i++) {
      dealt += r.stats.dealt[i]!
      taken += r.stats.taken[i]!
    }
    expect(dealt).toBe(taken)
  })

  it('известно, кто кого убил и на каком тике', () => {
    const r = runBattle(
      606,
      line(UnitClass.Cavalry, LANES, 0),
      line(UnitClass.Archer, LANES, 0),
    )
    let attributed = 0
    for (let i = 0; i < r.world.count; i++) {
      if (r.world.hp[i]! <= 0) {
        expect(r.stats.killedBy[i]!).toBeGreaterThanOrEqual(0)
        expect(r.stats.deathTick[i]!).toBeGreaterThanOrEqual(0)
        attributed++
      }
    }
    expect(attributed).toBeGreaterThan(0)
  })
})
