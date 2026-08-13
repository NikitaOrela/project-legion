/**
 * Типы, константы и конфигурация симуляции.
 * Всё, что здесь — данные. Ни одной цифры баланса в коде систем.
 */

/** Классы юнитов. Фаза 1 — три из восьми (04_ROADMAP). */
export const enum UnitClass {
  Infantry = 0,
  Archer = 1,
  Cavalry = 2,
  COUNT = 3,
}

export const enum Team {
  A = 0,
  B = 1,
}

/** Фиксированный тик. Рендер интерполирует, симуляция — нет. */
export const TICK_HZ = 30

/** Ретаргет раз в 15 тиков (0.5 с) с раскидкой по entityId — 03_TECH §5.1. */
export const RETARGET_PERIOD = 15

/**
 * Геометрия поля — DECISIONS.md ADR-001.
 * 5 лейнов (стоят друг над другом) × 4 ранга глубины (фронт → тыл).
 * Геометрия — ДАННЫЕ: тесты гоняют 4/5/6 лейнов без правки кода.
 */
export interface Geometry {
  lanes: number
  ranks: number
  /** ширина поля в мировых единицах */
  fieldWidth: number
  /** расстояние между центрами лейнов */
  laneHeight: number
  /** расстояние между рангами в глубину */
  rankDepth: number
}

export const DEFAULT_GEOMETRY: Geometry = {
  lanes: 5,
  ranks: 4,
  fieldWidth: 1200,
  laneHeight: 120,
  // 50, а не 70: отряд из 20 миньонов занимает ~44 единицы глубины, а лучник
  // с дальностью 190 обязан простреливать с 3-го ранга через свой фронт
  // (3 × 50 = 150 < 190). При 70 задние лучники физически не доставали
  // до линии соприкосновения и приходили к драке уже проигранной.
  rankDepth: 50,
}

/** Профиль класса. Все значения — целые мировые единицы и целые статы. */
export interface ClassProfile {
  readonly name: string
  /** дальность атаки в мировых единицах */
  readonly range: number
  /** мировых единиц за тик, ×256 (Q24.8) для субъединичной точности */
  readonly speed: number
  readonly baseHp: number
  readonly baseAtk: number
  readonly baseDef: number
  /** тиков между атаками */
  readonly attackPeriod: number
  /**
   * Ищет цель только в своём лейне (melee) или по кругу сквозь лейны (ranged).
   * ADR-004: правило лейновой изоляции.
   */
  readonly laneBound: boolean
  /**
   * Вес дистанции при выборе цели, Q16.16. У кавалерии понижен — она
   * игнорирует ближних и уходит вглубь (02_GDD §3.5).
   */
  readonly wDist: number
}

export const CLASS_PROFILES: readonly ClassProfile[] = [
  {
    name: 'Infantry',
    range: 14,
    speed: 40 * 256,
    baseHp: 620,
    baseAtk: 62,
    baseDef: 44,
    attackPeriod: 24,
    laneBound: true,
    wDist: 65536,
  },
  {
    name: 'Archer',
    range: 190,
    speed: 30 * 256,
    baseHp: 330,
    baseAtk: 88,
    baseDef: 16,
    attackPeriod: 27,
    laneBound: false,
    wDist: 65536,
  },
  {
    name: 'Cavalry',
    range: 16,
    speed: 96 * 256,
    baseHp: 540,
    baseAtk: 78,
    baseDef: 30,
    attackPeriod: 22,
    laneBound: true,
    wDist: 19661, // 0.3 в Q16.16 — летит вглубь
  },
]

/**
 * Матрица контров C[attacker][defender], проценты (100 == ×1.00).
 * Подмножество 02_GDD §3.2 для трёх классов фазы 1.
 * Целые проценты, а не Q16.16 — чтобы дизайнер правил таблицу, а не биты.
 */
export const COUNTER_PCT: readonly (readonly number[])[] = [
  //          Inf  Arch  Cav
  /* Inf  */ [100, 130, 85],
  /* Arch */ [100, 100, 80],
  /* Cav  */ [140, 150, 100],
]

/** Формула митигации — DECISIONS.md ADR-003 (процентная модель). */
export const MITIGATION_K_BASE = 400
export const MITIGATION_K_PER_LEVEL = 15

/** Разброс урона: 0.95…1.05, применяется как целые проценты 95..105. */
export const VARIANCE_MIN_PCT = 95
export const VARIANCE_SPAN_PCT = 11 // [95, 105]

export const CRIT_CHANCE_PCT = 10
export const CRIT_MULT_PCT = 175

/** Лимит боя — 02_GDD §3.4. */
export const BATTLE_TIMEOUT_TICKS = 180 * TICK_HZ

/** Пустой слот таргета. */
export const NO_TARGET = -1
