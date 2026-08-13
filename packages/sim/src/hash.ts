/**
 * Хеш состояния — FNV-1a, посубсистемно.
 *
 * ЗАЧЕМ ПОСУБСИСТЕМНО, А НЕ ОДИН ГЛОБАЛЬНЫЙ: один хеш превращает отладку в
 * «desync on tick 4712». Раздельные превращают её в «позиции разошлись на
 * тике 4712, HP синхронны» — и сразу видно, какая система виновата и что
 * было причиной, а что каскадом.
 *
 * Криптостойкость не нужна: цель — поймать расхождение как можно раньше.
 */

import type { World } from './world.js'

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

function fnv(h: number, v: number): number {
  h ^= v & 0xff
  h = Math.imul(h, FNV_PRIME)
  h ^= (v >>> 8) & 0xff
  h = Math.imul(h, FNV_PRIME)
  h ^= (v >>> 16) & 0xff
  h = Math.imul(h, FNV_PRIME)
  h ^= (v >>> 24) & 0xff
  h = Math.imul(h, FNV_PRIME)
  return h
}

export interface StateHash {
  positions: number
  health: number
  cooldowns: number
  targets: number
  combined: number
}

export function hashWorld(w: World, rngHi: number, rngLo: number): StateHash {
  let hp1 = FNV_OFFSET
  let hh = FNV_OFFSET
  let hc = FNV_OFFSET
  let ht = FNV_OFFSET

  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    hp1 = fnv(fnv(hp1, id), w.px[id]!)
    hp1 = fnv(hp1, w.py[id]!)
    hh = fnv(fnv(hh, id), w.hp[id]!)
    hh = fnv(hh, w.moralePct[id]!)
    hc = fnv(fnv(hc, id), w.cd[id]!)
    ht = fnv(fnv(ht, id), w.target[id]!)
  }

  let combined = FNV_OFFSET
  combined = fnv(combined, w.tick)
  combined = fnv(combined, w.aliveCount)
  combined = fnv(combined, hp1)
  combined = fnv(combined, hh)
  combined = fnv(combined, hc)
  combined = fnv(combined, ht)
  combined = fnv(combined, rngHi)
  combined = fnv(combined, rngLo)

  return {
    positions: hp1 >>> 0,
    health: hh >>> 0,
    cooldowns: hc >>> 0,
    targets: ht >>> 0,
    combined: combined >>> 0,
  }
}

export function hashToHex(h: number): string {
  return (h >>> 0).toString(16).padStart(8, '0')
}
