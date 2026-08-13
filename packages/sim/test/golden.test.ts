/**
 * Golden-реплеи.
 *
 * Ломаются при ЛЮБОМ изменении баланса или порядка систем — и это правильно.
 * Их перегенерируют осознанно, отдельным коммитом «rebalance: …», и diff
 * показывает, какие именно бои поменяли исход.
 *
 * Перегенерация: GOLDEN_UPDATE=1 pnpm test
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runBattle } from '../src/battle.js'
import type { Formation, Slot } from '../src/battle.js'
import { UnitClass } from '../src/types.js'
import { hashToHex } from '../src/hash.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const GOLDEN = join(HERE, 'golden', 'replays.json')

const slot = (lane: number, rank: number, cls: number, squad = 12): Slot => ({
  lane, rank, cls, level: 10, squad,
})

interface Case {
  name: string
  seed: number
  a: Formation
  b: Formation
}

const CASES: Case[] = [
  {
    name: 'combined-arms-vs-mono',
    seed: 1001,
    a: { slots: [slot(0,0,UnitClass.Infantry), slot(1,0,UnitClass.Infantry), slot(1,2,UnitClass.Archer)] },
    b: { slots: [slot(0,0,UnitClass.Infantry), slot(1,0,UnitClass.Infantry), slot(2,0,UnitClass.Infantry)] },
  },
  {
    name: 'cavalry-dive',
    seed: 2002,
    a: { slots: [slot(4,3,UnitClass.Cavalry,16), slot(0,0,UnitClass.Infantry)] },
    b: { slots: [slot(0,0,UnitClass.Infantry), slot(2,2,UnitClass.Archer), slot(3,2,UnitClass.Archer)] },
  },
  {
    name: 'empty-lane-gambit',
    seed: 3003,
    a: { slots: [slot(2,0,UnitClass.Infantry,14), slot(2,2,UnitClass.Archer,14), slot(3,3,UnitClass.Cavalry,14)] },
    b: { slots: [slot(0,0,UnitClass.Infantry,14), slot(1,0,UnitClass.Infantry,14), slot(4,1,UnitClass.Archer,14)] },
  },
  {
    name: 'full-scale-840',
    seed: 4004,
    a: { slots: Array.from({length:20},(_,i)=>slot(i%5,(i/5)|0,i%UnitClass.COUNT,20)) },
    b: { slots: Array.from({length:20},(_,i)=>slot(i%5,(i/5)|0,(i+1)%UnitClass.COUNT,20)) },
  },
]

interface GoldenEntry {
  name: string
  seed: number
  ticks: number
  outcome: number
  hash: string
  positions: string
  health: string
}

function record(c: Case): GoldenEntry {
  const r = runBattle(c.seed, c.a, c.b)
  return {
    name: c.name,
    seed: c.seed,
    ticks: r.ticks,
    outcome: r.outcome,
    hash: hashToHex(r.hash.combined),
    positions: hashToHex(r.hash.positions),
    health: hashToHex(r.hash.health),
  }
}

describe('Golden-реплеи', () => {
  if (process.env.GOLDEN_UPDATE === '1' || !existsSync(GOLDEN)) {
    it('перегенерация эталонов', () => {
      mkdirSync(dirname(GOLDEN), { recursive: true })
      writeFileSync(GOLDEN, JSON.stringify(CASES.map(record), null, 2) + '\n')
      expect(existsSync(GOLDEN)).toBe(true)
    })
    return
  }

  const expected: GoldenEntry[] = JSON.parse(readFileSync(GOLDEN, 'utf8'))

  for (const c of CASES) {
    it(`${c.name} воспроизводится бит-в-бит`, { timeout: 30_000 }, () => {
      const want = expected.find((e) => e.name === c.name)
      expect(want, `нет эталона для ${c.name} — перегенерируй с GOLDEN_UPDATE=1`).toBeDefined()
      const got = record(c)
      // Посубсистемно — чтобы расхождение локализовалось сразу
      expect(got.positions, 'разошлись позиции').toBe(want!.positions)
      expect(got.health, 'разошлись HP').toBe(want!.health)
      expect(got.ticks, 'разошлась длительность').toBe(want!.ticks)
      expect(got.outcome, 'разошёлся исход').toBe(want!.outcome)
      expect(got.hash, 'разошёлся общий хеш').toBe(want!.hash)
    })
  }
})
