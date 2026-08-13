/**
 * Тригонометрия через предвычисленную таблицу.
 *
 * ПОЧЕМУ НЕ Math.sin/cos: спецификация ECMAScript объявляет их
 * "implementation-approximated". V8 и SpiderMonkey используют порты fdlibm,
 * JavaScriptCore — системный cmath. Результаты расходятся в младших битах
 * и МЕНЯЮТСЯ между версиями одного движка. Для lockstep это конец.
 *
 * УГОЛ КАК BAM (binary angular measurement): uint32, полный оборот == 2^32.
 * Три бесплатных свойства:
 *   1. Взятие по модулю 2*PI — естественное переполнение uint32, ноль кода.
 *   2. Range reduction точен по построению (самый коварный источник расхождений).
 *   3. Старшие биты — индекс таблицы, следующие — дробь для интерполяции.
 *
 * Таблица: четверть волны, 1024 записи + замыкающая, 4100 байт.
 * Максимальная ошибка линейной интерполяции: 0.50 LSB Q16.16.
 */

import type { Fx } from './fixed.js'
import { FX_ONE } from './fixed.js'
import { SIN_QUARTER } from './trig-table.js'

export type Bam = number // uint32, полный оборот == 2^32

export const BAM_TURN = 4294967296
export const BAM_QUARTER = 0x40000000 // 2^30
export const BAM_HALF = 0x80000000 // 2^31

/** Градусы → BAM. Только для констант и тестов, не для рантайма. */
export function bamFromDeg(deg: number): Bam {
  return Math.round((deg / 360) * BAM_TURN) >>> 0
}

/** Интерполяция внутри четверти. p — фаза в [0, 2^30]. */
function quarterSin(p: number): Fx {
  const idx = p >>> 20 // 2^30 / 2^10 => 2^20 отсчётов на запись
  const frac = p & 0xfffff // 20 бит дроби
  const a = SIN_QUARTER[idx] ?? 0
  const b = SIN_QUARTER[idx + 1] ?? a
  // (b - a) <= ~101, frac < 2^20 => произведение < 2^27, точно в int32
  return (a + (((b - a) * frac) >>> 20)) | 0
}

/** sin(angle) в Q16.16, диапазон [-65536, 65536]. */
export function fxSin(angle: Bam): Fx {
  const a = angle >>> 0
  const quadrant = a >>> 30 // 0..3
  const phase = a & 0x3fffffff
  const p = quadrant & 1 ? BAM_QUARTER - phase : phase
  const v = quarterSin(p)
  return quadrant & 2 ? -v | 0 : v
}

/** cos(angle) == sin(angle + PI/2). */
export function fxCos(angle: Bam): Fx {
  return fxSin(((angle >>> 0) + BAM_QUARTER) >>> 0)
}

/**
 * Обратный квадратный корень — для нормализации вектора.
 *
 * ПОЧЕМУ ИМЕННО ОН: обычный sqrt в симуляции не нужен вообще. Для выбора цели
 * и проверки дальности сравниваются КВАДРАТЫ расстояний. Единственное место,
 * где нужен корень, — приведение вектора движения к единичной длине.
 *
 * Начальное приближение по битовому сдвигу + две итерации Ньютона.
 * Все операции целочисленные, поведение идентично во всех движках.
 */
export function fxInvSqrt(x: Fx): Fx {
  if (x <= 0) return 0

  // Range reduction: x = m * 4^k, где m в [1.0, 4.0).
  // Без неё Ньютон расходится на больших x (условие сходимости x*y^2 < 3)
  // и теряет точность на малых из-за квантования Q16.16.
  let k = 0
  let m = x
  while (m >= 4 * FX_ONE) {
    m >>= 2
    k++
  }
  while (m < FX_ONE) {
    m <<= 2
    k--
  }

  // На отрезке [1, 4) ответ лежит в (0.5, 1.0]. Старт с 0.7 даёт m*y^2 <= 1.96 < 3.
  let y = 45875 // fxLit(0.7)
  for (let i = 0; i < 5; i++) {
    const yy = fxMulLocal(y, y)
    const myy = fxMulLocal(m, yy)
    y = fxMulLocal(y, (3 * FX_ONE - myy) >> 1)
  }

  // invsqrt(m * 4^k) == invsqrt(m) / 2^k
  return k >= 0 ? y >> k : y << -k
}

// Локальная копия — избегаем циклического импорта и даём JIT инлайнить.
function fxMulLocal(a: number, b: number): number {
  const ah = a >> 16
  const al = a & 0xffff
  const bh = b >> 16
  const bl = b & 0xffff
  return (
    ((Math.imul(ah, bh) << 16) +
      Math.imul(ah, bl) +
      Math.imul(al, bh) +
      ((al * bl) >>> 16)) |
    0
  )
}
