import { describe, it, expect } from 'vitest'
import {
  FX_ONE, fxMul, fxDiv, fxLit, fxToFloat, fxLerp, fxFromInt, fxToInt,
} from '../src/fixed.js'

describe('Q16.16: базовая корректность', () => {
  it('умножение на единицу — тождество', () => {
    for (const v of [0, 1, -1, 65536, -65536, 12345, -99999, 0x7fffff]) {
      expect(fxMul(v, FX_ONE)).toBe(v)
    }
  })

  it('граничный случай, ломающий наивные реализации', () => {
    // (a*b)>>16 здесь молча теряет точность, ((a&0xffff)*b)>>16 теряет старшие биты
    expect(fxMul(-1, 65536)).toBe(-1)
    expect(fxMul(65536, 65536)).toBe(65536)
  })

  it('знаки', () => {
    expect(fxMul(fxLit(2.5), fxLit(4))).toBe(fxLit(10))
    expect(fxMul(fxLit(-2.5), fxLit(4))).toBe(fxLit(-10))
    expect(fxMul(fxLit(-2.5), fxLit(-4))).toBe(fxLit(10))
  })

  it('коммутативность на 100k случайных пар', () => {
    let s = 1
    for (let i = 0; i < 100_000; i++) {
      s = (Math.imul(s, 1103515245) + 12345) | 0
      const a = s >> 4
      s = (Math.imul(s, 1103515245) + 12345) | 0
      const b = s >> 4
      expect(fxMul(a, b)).toBe(fxMul(b, a))
    }
  })

  it('деление обратно умножению в пределах точности', () => {
    for (const [a, b] of [[10, 4], [1, 3], [-7, 2], [1000, 7]] as const) {
      const fa = fxLit(a), fb = fxLit(b)
      const q = fxDiv(fa, fb)
      expect(Math.abs(fxToFloat(q) - a / b)).toBeLessThan(1e-4)
    }
  })

  it('усечение к нулю, а не floor', () => {
    expect(fxDiv(fxLit(-1), fxLit(2))).toBe(-32768)
    expect(fxToInt(fxLit(-2.5))).toBe(-2)
    expect(fxToInt(fxLit(2.5))).toBe(2)
  })

  it('lerp по краям точен', () => {
    const a = fxLit(10), b = fxLit(20)
    expect(fxLerp(a, b, 0)).toBe(a)
    expect(fxLerp(a, b, FX_ONE)).toBe(b)
    expect(fxLerp(a, b, FX_ONE >> 1)).toBe(fxLit(15))
  })

  it('целые ходят туда-обратно', () => {
    for (let n = -30000; n <= 30000; n += 137) {
      expect(fxToInt(fxFromInt(n))).toBe(n)
    }
  })
})
