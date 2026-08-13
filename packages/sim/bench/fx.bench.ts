/**
 * ГЕЙТ ФАЗЫ 0 (задача P0-07).
 *
 * Единственный публичный бенчмарк fixed-point-библиотеки в JS даёт ~24 нс на
 * операцию через обёрточное API. При бюджете 4 мс на тик и 840 юнитах это
 * оставляет всего ~200 операций на юнит. Проверяем, что свободные функции
 * над сырыми int32 на порядок быстрее.
 *
 * Порог: если fxMul дороже 5 нс/оп — придётся резать частоту подсистем.
 */
import { bench, describe } from 'vitest'
import { fxMul, fxDiv } from '../src/fixed.js'
import { fxSin } from '../src/trig.js'

const N = 1_000_000
const a = new Int32Array(N)
const b = new Int32Array(N)
for (let i = 0; i < N; i++) {
  a[i] = ((i * 2654435761) | 0) >> 8
  b[i] = ((i * 40503) | 0) >> 8
}

describe('fixed-point vs float', () => {
  bench('fxMul x1M', () => {
    let acc = 0
    for (let i = 0; i < N; i++) acc = (acc + fxMul(a[i]!, b[i]!)) | 0
    if (acc === 12345678) throw new Error('no-op guard')
  })

  bench('нативное умножение double x1M (референс)', () => {
    let acc = 0
    for (let i = 0; i < N; i++) acc += a[i]! * b[i]!
    if (acc === 12345678) throw new Error('no-op guard')
  })

  bench('fxDiv x1M', () => {
    let acc = 0
    for (let i = 0; i < N; i++) acc = (acc + fxDiv(a[i]!, b[i]! | 1)) | 0
    if (acc === 12345678) throw new Error('no-op guard')
  })

  bench('fxSin через таблицу x1M', () => {
    let acc = 0
    for (let i = 0; i < N; i++) acc = (acc + fxSin(a[i]! >>> 0)) | 0
    if (acc === 12345678) throw new Error('no-op guard')
  })

  bench('нативный Math.sin x1M (референс, ЗАПРЕЩЁН в sim)', () => {
    let acc = 0
    for (let i = 0; i < N; i++) acc += Math.sin(a[i]!)
    if (acc === 12345678) throw new Error('no-op guard')
  })
})
