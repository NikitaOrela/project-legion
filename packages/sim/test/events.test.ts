import { describe, it, expect } from 'vitest'
import { runBattle } from '../src/battle.js'
import { UnitClass } from '../src/types.js'
import { EventFlag, EventKind, EVENT_STRIDE } from '../src/events.js'

const line = (cls: number, lanes: number[], rank: number, squad = 12) => ({
  slots: lanes.map((lane) => ({ lane, rank, cls, level: 10, squad })),
})

describe('Буфер боевых событий', () => {
  it('пишет урон, криты, контры и смерти', () => {
    const kinds = new Set<number>()
    const flags = new Set<number>()
    let total = 0
    runBattle(
      2024,
      line(UnitClass.Cavalry, [0, 1], 0),
      line(UnitClass.Archer, [0, 1], 0),
      {
        maxTicks: 600,
        onTick: (_w, _t, ev) => {
          total += ev.count
          for (let i = 0; i < ev.count; i++) {
            const o = i * EVENT_STRIDE
            kinds.add(ev.data[o]!)
            flags.add(ev.data[o + 4]!)
          }
        },
      },
    )
    expect(total).toBeGreaterThan(100)
    expect(kinds.has(EventKind.Damage)).toBe(true)
    expect(kinds.has(EventKind.Death)).toBe(true)
    // кавалерия против лучников — контр ×1.5, обязан подсветиться
    expect([...flags].some((f) => (f & EventFlag.Counter) !== 0)).toBe(true)
    expect([...flags].some((f) => (f & EventFlag.Crit) !== 0)).toBe(true)
  })

  it('буфер очищается каждый тик и не переполняется молча', () => {
    let maxCount = 0
    let dropped = 0
    const mk = (off: number) => ({
      slots: Array.from({ length: 20 }, (_, i) => ({
        lane: i % 5, rank: (i / 5) | 0, cls: (i + off) % UnitClass.COUNT, level: 10, squad: 20,
      })),
    })
    const r = runBattle(99, mk(0), mk(1), {
      onTick: (_w, _t, ev) => {
        if (ev.count > maxCount) maxCount = ev.count
        dropped = ev.dropped
      },
    })
    expect(r.world.count).toBe(840)
    expect(maxCount).toBeGreaterThan(0)
    // если тут не ноль — буфер мал, и рендер теряет цифры урона
    expect(dropped).toBe(0)
  })

  it('события не влияют на детерминизм', () => {
    const a = line(UnitClass.Infantry, [0, 1], 0)
    const b = line(UnitClass.Archer, [0, 1], 0)
    const h1 = runBattle(5150, a, b).hash.combined
    const h2 = runBattle(5150, a, b, { onTick: () => {} }).hash.combined
    expect(h2).toBe(h1)
  })
})
