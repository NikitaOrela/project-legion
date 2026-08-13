/**
 * Типы, константы и конфигурация симуляции.
 * Всё, что здесь — данные. Ни одной цифры баланса в коде систем.
 */

/** Классы юнитов. Фаза 1 — три из восьми (04_ROADMAP). */
export const enum UnitClass {
  Infantry = 0,
  Pikeman = 1,
  Paviser = 2,
  Cavalry = 3,
  Archer = 4,
  Arbalist = 5,
  Mage = 6,
  Healer = 7,
  COUNT = 8,
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
  /** Лечит союзников вместо урона по врагам (02_GDD §3.5). */
  readonly isHealer: boolean
  /** Ставит стену: блокирует продвижение вражеского ближнего боя (02_GDD §3.6). */
  readonly isBlocker: boolean
  /** Бьёт по площади: урон получают все цели в радиусе splashRadius. */
  readonly splashRadius: number
}

export const CLASS_PROFILES: readonly ClassProfile[] = [
  {
    name: 'Infantry',
    range: 14, speed: 40 * 256,
    baseHp: 620, baseAtk: 62, baseDef: 44, attackPeriod: 24,
    laneBound: true, wDist: 65536, isHealer: false, isBlocker: false, splashRadius: 0,
  },
  {
    // Копьё достаёт дальше меча — отсюда и роль анти-кавалерии: пикинёр бьёт
    // всадника раньше, чем тот доскачет до контакта.
    name: 'Pikeman',
    range: 34, speed: 32 * 256,
    baseHp: 600, baseAtk: 66, baseDef: 40, attackPeriod: 27,
    laneBound: true, wDist: 65536, isHealer: false, isBlocker: false, splashRadius: 0,
  },
  {
    // Стена. Платит уроном за удержание: заблокированные враги превращаются
    // в статичные мишени для дальних и магов (02_GDD §3.6).
    name: 'Paviser',
    range: 14, speed: 22 * 256,
    baseHp: 1150, baseAtk: 30, baseDef: 90, attackPeriod: 32,
    laneBound: true, wDist: 65536, isHealer: false, isBlocker: true, splashRadius: 0,
  },
  {
    name: 'Cavalry',
    range: 16, speed: 96 * 256,
    baseHp: 540, baseAtk: 78, baseDef: 30, attackPeriod: 22,
    laneBound: true, wDist: 19661, isHealer: false, isBlocker: false, splashRadius: 0,
  },
  {
    name: 'Archer',
    range: 190, speed: 30 * 256,
    baseHp: 330, baseAtk: 88, baseDef: 16, attackPeriod: 27,
    laneBound: false, wDist: 65536, isHealer: false, isBlocker: false, splashRadius: 0,
  },
  {
    // Дальше лучника, но заметно медленнее стреляет — бурст, а не поток.
    name: 'Arbalist',
    range: 240, speed: 24 * 256,
    baseHp: 300, baseAtk: 132, baseDef: 14, attackPeriod: 42,
    laneBound: false, wDist: 65536, isHealer: false, isBlocker: false, splashRadius: 0,
  },
  {
    // Выжигание скучек: бьёт по площади, поэтому опасен против плотного строя
    // и почти бесполезен против одиночек.
    name: 'Mage',
    range: 150, speed: 24 * 256,
    baseHp: 260, baseAtk: 74, baseDef: 10, attackPeriod: 40,
    laneBound: false, wDist: 65536, isHealer: false, isBlocker: false, splashRadius: 42,
  },
  {
    name: 'Healer',
    range: 120, speed: 30 * 256,
    baseHp: 320, baseAtk: 58, baseDef: 18, attackPeriod: 36,
    laneBound: false, wDist: 65536, isHealer: true, isBlocker: false, splashRadius: 0,
  },
]

/**
 * Матрица контров C[attacker][defender], проценты (100 == ×1.00).
 * Подмножество 02_GDD §3.2 для трёх классов фазы 1.
 * Целые проценты, а не Q16.16 — чтобы дизайнер правил таблицу, а не биты.
 */
export const COUNTER_PCT: readonly (readonly number[])[] = [
  //          Inf  Pike  Pav  Cav  Arch  Arb  Mage  Heal
  /* Inf  */ [100, 115,  75,  85, 130, 130, 130, 130],
  /* Pike */ [ 90, 100,  85, 160, 100, 100,  80, 110],
  /* Pav  */ [ 80,  80,  80,  90, 110, 110,  70, 100],
  /* Cav  */ [140,  60, 135, 100, 150, 150, 160, 150],
  /* Arch */ [100, 120,  60,  80, 100, 100, 110, 110],
  /* Arb  */ [110, 120,  90, 115, 110, 100, 110, 110],
  /* Mage */ [135, 120, 150,  70, 120, 120, 100, 120],
  /* Heal */ [100, 100, 100, 100, 100, 100, 100, 100],
]

/**
 * Радиус блокировки павизой (02_GDD §3.6).
 *
 * Вражеский ближний бой, попавший в этот радиус, залипает на павизе и не идёт
 * дальше. Значение подбирается: слишком мало — стена не работает, слишком
 * много — павиза становится обязательной в любом составе.
 */
export const BLOCK_RADIUS = 46
/** Через сколько тиков заблокированный юнит может «переагриться». */
export const BLOCK_TIMEOUT_TICKS = 5 * TICK_HZ

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
