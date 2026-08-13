import { describe, it, expect } from 'vitest'
import { rngCreate, rngNextU32, rngBelow, rngSave, rngLoad, RngStream } from '../src/rng.js'

describe('PCG32', () => {
  it('совпадает с эталонными тест-векторами (initstate=42, initseq=54)', () => {
    // Канонический набор из референсной C-реализации pcg-random.org
    const s = rngCreate(0, 42, 54 as unknown as RngStream)
    const got = Array.from({ length: 6 }, () =>
      rngNextU32(s).toString(16).padStart(8, '0'),
    )
    expect(got).toEqual([
      'a15c02b7', '7b47f409', 'ba1d3330', '83d2f293', 'bfa4784b', 'cbed606e',
    ])
  })

  it('одинаковый seed — одинаковая последовательность', () => {
    const a = rngCreate(0, 12345)
    const b = rngCreate(0, 12345)
    for (let i = 0; i < 1000; i++) expect(rngNextU32(a)).toBe(rngNextU32(b))
  })

  it('разные потоки не пересекаются', () => {
    const combat = rngCreate(0, 7, RngStream.Combat)
    const cosmetic = rngCreate(0, 7, RngStream.Cosmetic)
    const first = Array.from({ length: 50 }, () => rngNextU32(combat))
    const second = Array.from({ length: 50 }, () => rngNextU32(cosmetic))
    expect(first).not.toEqual(second)
  })

  it('косметический поток не сдвигает боевой', () => {
    const combatA = rngCreate(0, 99, RngStream.Combat)
    const expected = Array.from({ length: 20 }, () => rngNextU32(combatA))

    const combatB = rngCreate(0, 99, RngStream.Combat)
    const cosmetic = rngCreate(0, 99, RngStream.Cosmetic)
    const actual: number[] = []
    for (let i = 0; i < 20; i++) {
      for (let k = 0; k < 500; k++) rngNextU32(cosmetic)
      actual.push(rngNextU32(combatB))
    }
    expect(actual).toEqual(expected)
  })

  it('состояние сериализуется и восстанавливается', () => {
    const s = rngCreate(0, 4242)
    for (let i = 0; i < 137; i++) rngNextU32(s)
    const snapshot = rngSave(s)
    const expected = Array.from({ length: 100 }, () => rngNextU32(s))
    const restored = rngLoad(snapshot)
    const actual = Array.from({ length: 100 }, () => rngNextU32(restored))
    expect(actual).toEqual(expected)
  })

  it('rngBelow равномерен — столп «экономика не врёт»', () => {
    const s = rngCreate(0, 2026)
    const buckets = new Array<number>(7).fill(0)
    const N = 700_000
    for (let i = 0; i < N; i++) buckets[rngBelow(s, 7)]!++
    const expected = N / 7
    for (const b of buckets) {
      expect(Math.abs(b - expected) / expected).toBeLessThan(0.01)
    }
  })
})
