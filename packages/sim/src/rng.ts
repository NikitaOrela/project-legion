/**
 * PCG32 (XSH-RR, 64/32) — детерминированный генератор псевдослучайных чисел.
 *
 * ПОЧЕМУ НЕ Math.random: результат не воспроизводим, состояние не сериализуется,
 * реплей невозможен. Прямой запрет в packages/sim.
 *
 * ПОЧЕМУ PCG, А НЕ MERSENNE TWISTER: PCG-XSH-RR проходит BigCrush уже при
 * 39 битах состояния; Mersenne Twister проваливает его при 19937 битах.
 * Состояние PCG32 — 64 бита, сериализуется в две 32-битные ячейки.
 *
 * 64-битная арифметика эмулируется парой uint32 (hi, lo) через Math.imul.
 * BigInt исключён: замеры дают ~58x замедление относительно нативных чисел.
 */

// Множитель 6364136223846793005 == 0x5851F42D_4C957F2D
const MUL_HI = 0x5851f42d
const MUL_LO = 0x4c957f2d

export interface RngState {
  /** старшие 32 бита состояния */
  hi: number
  /** младшие 32 бита состояния */
  lo: number
  /** старшие 32 бита инкремента (нечётного) */
  incHi: number
  /** младшие 32 бита инкремента */
  incLo: number
}

/**
 * Отдельные потоки RNG. Разный inc => статистически независимые
 * последовательности из одного алгоритма.
 *
 * ЗАЧЕМ: косметика (частицы, тряска экрана) не должна сдвигать боевой поток.
 * Иначе включение эффекта меняет исход боя, и реплей ломается.
 */
export const enum RngStream {
  Combat = 0,
  Crit = 1,
  Cosmetic = 2,
  Loot = 3,
}

/** Умножение 64x64 -> младшие 64 бита. Все частичные произведения < 2^53. */
function mul64(
  aHi: number,
  aLo: number,
  bHi: number,
  bLo: number,
): { hi: number; lo: number } {
  const a0 = aLo & 0xffff
  const a1 = aLo >>> 16
  const b0 = bLo & 0xffff
  const b1 = bLo >>> 16

  const t = a0 * b0 // < 2^32
  const m = a1 * b0 + a0 * b1 // < 2^33
  const hiPart = a1 * b1 // < 2^32

  let low = t + (m % 65536) * 65536 // < 2^33, точно в double
  const carry = Math.floor(low / 4294967296)
  low = low - carry * 4294967296

  const high = hiPart + Math.floor(m / 65536) + carry

  // Вклад перекрёстных членов в старшее слово берём по модулю 2^32 через imul
  const hi =
    ((high >>> 0) + Math.imul(aHi, bLo) + Math.imul(aLo, bHi)) >>> 0

  return { hi, lo: low >>> 0 }
}

/** Сложение 64+64 по модулю 2^64. */
function add64(
  aHi: number,
  aLo: number,
  bHi: number,
  bLo: number,
): { hi: number; lo: number } {
  const lo = (aLo >>> 0) + (bLo >>> 0)
  const carry = lo >= 4294967296 ? 1 : 0
  return { hi: ((aHi + bHi + carry) >>> 0), lo: lo >>> 0 }
}

/** state = state * MUL + inc */
function advance(s: RngState): void {
  const m = mul64(s.hi, s.lo, MUL_HI, MUL_LO)
  const a = add64(m.hi, m.lo, s.incHi, s.incLo)
  s.hi = a.hi
  s.lo = a.lo
}

/** Циклический сдвиг вправо, корректный при r === 0. */
function rotr32(v: number, r: number): number {
  return ((v >>> r) | (v << ((-r) & 31))) >>> 0
}

/**
 * Инициализация по эталонной схеме pcg32_srandom_r:
 *   state = 0; advance(); state += initstate; advance();
 *   inc = (initseq << 1) | 1
 */
export function rngCreate(
  seedHi: number,
  seedLo: number,
  stream: RngStream = RngStream.Combat,
): RngState {
  // initseq = stream, inc = (initseq << 1) | 1
  const incLo = ((stream << 1) | 1) >>> 0
  const incHi = 0

  const s: RngState = { hi: 0, lo: 0, incHi, incLo }
  advance(s)
  const a = add64(s.hi, s.lo, seedHi >>> 0, seedLo >>> 0)
  s.hi = a.hi
  s.lo = a.lo
  advance(s)
  return s
}

/** Следующее 32-битное беззнаковое число. Мутирует состояние. */
export function rngNextU32(s: RngState): number {
  const oldHi = s.hi
  const oldLo = s.lo
  advance(s)

  // xorshifted = ((state >> 18) ^ state) >> 27  — младшие 32 бита результата
  const sh18Lo = ((oldLo >>> 18) | (oldHi << 14)) >>> 0
  const sh18Hi = oldHi >>> 18
  const xLo = (sh18Lo ^ oldLo) >>> 0
  const xHi = (sh18Hi ^ oldHi) >>> 0
  const xorshifted = ((xLo >>> 27) | (xHi << 5)) >>> 0

  // rot = state >> 59  == старшее слово >> 27
  const rot = oldHi >>> 27
  return rotr32(xorshifted, rot)
}

/**
 * Равномерное целое из [0, bound). Отбраковка смещения — обязательна:
 * простой остаток `% bound` даёт неравномерность, а она видна игроку
 * на объявленных шансах (столп «экономика не врёт»).
 */
export function rngBelow(s: RngState, bound: number): number {
  if (bound <= 1) return 0
  const threshold = (4294967296 - bound) % bound
  for (;;) {
    const r = rngNextU32(s)
    if (r >= threshold) return r % bound
  }
}

/** Бросок против шанса, заданного в Q16.16 (FX_ONE == 100%). */
export function rngChanceFx(s: RngState, chanceFx: number): boolean {
  return rngBelow(s, 65536) < chanceFx
}

/** Снимок состояния для сейва и реплея. */
export function rngSave(s: RngState): Int32Array {
  return Int32Array.of(s.hi | 0, s.lo | 0, s.incHi | 0, s.incLo | 0)
}

export function rngLoad(buf: Int32Array): RngState {
  return {
    hi: (buf[0] ?? 0) >>> 0,
    lo: (buf[1] ?? 0) >>> 0,
    incHi: (buf[2] ?? 0) >>> 0,
    incLo: (buf[3] ?? 1) >>> 0,
  }
}
