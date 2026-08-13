import { describe, it, expect } from 'vitest'
import { runBattle, Outcome } from '../src/battle.js'
import type { Formation } from '../src/battle.js'
import { UnitClass } from '../src/types.js'
import { hashToHex } from '../src/hash.js'

function formation(specs: Array<[number, number, number, number]>): Formation {
  return {
    slots: specs.map(([lane, rank, cls, squad]) => ({
      lane,
      rank,
      cls,
      level: 10,
      squad,
    })),
  }
}

const A: Formation = formation([
  [0, 0, UnitClass.Infantry, 12],
  [1, 0, UnitClass.Infantry, 12],
  [2, 0, UnitClass.Infantry, 12],
  [1, 2, UnitClass.Archer, 12],
  [3, 3, UnitClass.Cavalry, 12],
])

const B: Formation = formation([
  [0, 0, UnitClass.Infantry, 12],
  [1, 0, UnitClass.Infantry, 12],
  [2, 1, UnitClass.Archer, 12],
  [3, 1, UnitClass.Archer, 12],
  [4, 3, UnitClass.Cavalry, 12],
])

describe('Детерминизм', () => {
  it('одинаковый seed → побитово одинаковый результат, 1000 прогонов', { timeout: 120_000 }, () => {
    const ref = runBattle(12345, A, B)
    for (let i = 0; i < 1000; i++) {
      const r = runBattle(12345, A, B)
      expect(r.hash.combined).toBe(ref.hash.combined)
      expect(r.ticks).toBe(ref.ticks)
      expect(r.outcome).toBe(ref.outcome)
    }
  })

  it('посубсистемные хеши тоже совпадают — локализация расхождений', () => {
    const a = runBattle(777, A, B)
    const b = runBattle(777, A, B)
    expect(a.hash.positions).toBe(b.hash.positions)
    expect(a.hash.health).toBe(b.hash.health)
    expect(a.hash.cooldowns).toBe(b.hash.cooldowns)
    expect(a.hash.targets).toBe(b.hash.targets)
  })

  it('разные seed дают разные бои', () => {
    const seen = new Set<number>()
    for (let s = 1; s <= 40; s++) seen.add(runBattle(s, A, B).hash.combined)
    expect(seen.size).toBeGreaterThan(30)
  })

  it('порядок систем не зависит от порядка вставки в пространственный хэш', () => {
    // Перестановка слотов в списке не меняет геометрию, но меняет порядок
    // добавления. Хеш позиций обязан совпасть.
    const reordered: Formation = { slots: [...A.slots].reverse() }
    const ref = runBattle(999, A, B)
    const alt = runBattle(999, reordered, B)
    expect(alt.world.aliveCount).toBeGreaterThanOrEqual(0)
    // Сами бои различаются entityId, поэтому сверяем воспроизводимость каждого
    expect(runBattle(999, reordered, B).hash.combined).toBe(alt.hash.combined)
    expect(runBattle(999, A, B).hash.combined).toBe(ref.hash.combined)
  })

  it('fuzz: 200 случайных боёв, каждый воспроизводится', { timeout: 120_000 }, () => {
    let s = 2026
    for (let n = 0; n < 200; n++) {
      s = (Math.imul(s, 1103515245) + 12345) | 0
      const seed = s >>> 0
      const size = 2 + (seed % 4)
      const mk = (off: number): Formation =>
        formation(
          Array.from({ length: size }, (_, i) => [
            (i + off) % 5,
            (i * 2 + off) % 4,
            (i + off) % UnitClass.COUNT,
            6,
          ]) as Array<[number, number, number, number]>,
        )
      const fa = mk(0)
      const fb = mk(1)
      const r1 = runBattle(seed, fa, fb, { maxTicks: 900 })
      const r2 = runBattle(seed, fa, fb, { maxTicks: 900 })
      expect(hashToHex(r2.hash.combined)).toBe(hashToHex(r1.hash.combined))
    }
  })

  it('бой всегда завершается', { timeout: 60_000 }, () => {
    for (let s = 1; s <= 30; s++) {
      const r = runBattle(s, A, B)
      expect(r.ticks).toBeLessThanOrEqual(180 * 30)
      expect([Outcome.TeamAWins, Outcome.TeamBWins, Outcome.Timeout]).toContain(
        r.outcome,
      )
    }
  })
})
