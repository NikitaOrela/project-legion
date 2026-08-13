/**
 * Буфер боевых событий за тик.
 *
 * ЗАЧЕМ ОН НУЖЕН. Рендер мог бы просто сравнивать HP между снимками и рисовать
 * разницу. Но столп 2 требует различать обычный удар, крит, срабатывание контра
 * и лечение — по цвету, в момент события. Из diff'а HP этого не восстановить.
 *
 * ПОЧЕМУ БУФЕР, А НЕ КОЛБЭКИ. Колбэк из симуляции — это внешний код внутри
 * детерминированного ядра: он может аллоцировать, бросить исключение или
 * прочитать часы. Буфер оставляет sim чистым: он только пишет числа, а рендер
 * читает их после тика.
 *
 * Плоский Int32Array, ноль аллокаций, фиксированная длина записи.
 */

export const enum EventKind {
  Damage = 0,
  Heal = 1,
  Death = 2,
  Blocked = 3,
}

/** Биты поля flags. */
export const enum EventFlag {
  Crit = 1,
  /** сработал бонус контра (множитель > 1.2) */
  Counter = 2,
  /** урон от сплэша, а не прямой удар */
  Splash = 4,
}

/** int32 на запись: kind, source, target, value, flags */
export const EVENT_STRIDE = 5

export interface EventBuffer {
  data: Int32Array
  count: number
  readonly cap: number
  /** сколько событий не влезло — сигнал, что буфер мал */
  dropped: number
}

export function createEventBuffer(cap: number): EventBuffer {
  return { data: new Int32Array(cap * EVENT_STRIDE), count: 0, cap, dropped: 0 }
}

export function pushEvent(
  b: EventBuffer,
  kind: EventKind,
  source: number,
  target: number,
  value: number,
  flags: number,
): void {
  if (b.count >= b.cap) {
    b.dropped++
    return
  }
  const o = b.count * EVENT_STRIDE
  b.data[o] = kind
  b.data[o + 1] = source
  b.data[o + 2] = target
  b.data[o + 3] = value
  b.data[o + 4] = flags
  b.count++
}

/** Очистка в начале тика. Память не переаллоцируется. */
export function clearEvents(b: EventBuffer): void {
  b.count = 0
}
