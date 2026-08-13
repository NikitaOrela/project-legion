import { describe, it, expect } from 'vitest'
import { fxSin, fxCos, fxInvSqrt, bamFromDeg, BAM_QUARTER } from '../src/trig.js'
import { FX_ONE, fxLit, fxToFloat } from '../src/fixed.js'

describe('Таблица тригонометрии', () => {
  it('опорные точки точны', () => {
    expect(fxSin(0)).toBe(0)
    expect(fxSin(BAM_QUARTER)).toBe(FX_ONE)
    expect(fxSin(BAM_QUARTER * 2)).toBe(0)
    expect(fxSin((BAM_QUARTER * 3) >>> 0)).toBe(-FX_ONE)
    expect(fxCos(0)).toBe(FX_ONE)
  })

  it('погрешность по всему обороту не превышает 2 LSB', () => {
    let maxErr = 0
    for (let deg = 0; deg < 360; deg += 0.05) {
      const got = fxSin(bamFromDeg(deg))
      const exact = Math.sin((deg * Math.PI) / 180) * FX_ONE
      maxErr = Math.max(maxErr, Math.abs(got - exact))
    }
    expect(maxErr).toBeLessThan(2)
  })

  it('переполнение угла бесплатно и корректно', () => {
    // BAM: полный оборот == 2^32, модуль берётся сам собой
    expect(fxSin(bamFromDeg(30))).toBe(fxSin((bamFromDeg(30) + 4294967296) >>> 0))
  })

  it('sin^2 + cos^2 == 1 в пределах точности', () => {
    for (let deg = 0; deg < 360; deg += 7) {
      const s = fxToFloat(fxSin(bamFromDeg(deg)))
      const c = fxToFloat(fxCos(bamFromDeg(deg)))
      expect(Math.abs(s * s + c * c - 1)).toBeLessThan(1e-3)
    }
  })

  it('обратный корень сходится', () => {
    for (const v of [0.01, 0.5, 1, 2, 4, 9, 16, 100, 1000, 20000]) {
      const got = fxToFloat(fxInvSqrt(fxLit(v)))
      const exact = 1 / Math.sqrt(v)
      expect(Math.abs(got - exact) / exact).toBeLessThan(0.005)
    }
  })
})
