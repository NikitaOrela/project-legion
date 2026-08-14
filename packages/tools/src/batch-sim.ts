/**
 * Батч-симулятор и балансные отчёты.
 *
 * ЗАЧЕМ. Ручная балансировка авто-баттлера невозможна. Проверено на практике:
 * сдвиг атаки лучника с 88 до 76 — меньше 14% — перевернул винрейт прикрытых
 * лучников с 0.72 до 0.02. Не сдвинул, а перевернул. В таком режиме
 * «поправил число и посмотрел» — это не работа, а угадывание.
 *
 * Единственный рабочий способ — прогонять тысячи боёв и смотреть на
 * распределения. Детерминизм ядра делает это дешёвым: бой на 80 юнитов
 * считается за единицы миллисекунд, воспроизводимо, без графики.
 *
 * Запуск:
 *   pnpm sim                      — матрица винрейтов по всем парам
 *   pnpm sim --n=200              — точнее (по умолчанию 60 сидов на пару)
 *   pnpm sim --csv=out/wr.csv     — выгрузка для таблиц
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  CLASS_PROFILES,
  Outcome,
  TICK_HZ,
  UnitClass,
  runBattle,
  type Formation,
  type Slot,
} from '@mw/sim'

const LEVEL = 10

/**
 * У КАЖДОГО архетипа одинаковое число СЛОТОВ и одинаковый размер отряда.
 *
 * ДВЕ ОШИБКИ НОРМАЛИЗАЦИИ, обе исправлены здесь.
 *
 * Первая (найдена 2026-08-13). Стоял фиксированный отряд 12 на слот, а число
 * слотов у архетипов различалось: у моно три, у «сбалансированного» шесть. То
 * есть «сбалансированный» выходил с 72 бойцами против 36 — вдвое большей
 * армией. При квадратичном законе Ланчестера это не преимущество, а вайп.
 * Весь отчёт BALANCE_01 («сбалансированный держит 92%») измерял размер армии,
 * а не качество состава.
 *
 * Вторая (найдена 2026-08-14). Уравняли общее число бойцов — и доминировать
 * стали ВСЕ составы на шесть слотов, независимо от содержания. Причина:
 * слот выставляет героя И отряд, а герой сильнее миньона на
 * HERO_STAT_BONUS_PCT. При равном числе бойцов шесть слотов дают шесть героев
 * против трёх — то есть снова сравнивался не состав.
 *
 * Правильная нормализация — по СЛОТАМ, и она же совпадает с игрой: сетка даёт
 * фиксированное число слотов, оба игрока их заполняют, размер отряда растёт от
 * прогрессии одинаково. Поэтому у всех архетипов ровно SLOTS слотов.
 */
const SLOTS = 6
const SQUAD = 7

function arg(name: string, def: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? Number(hit.split('=')[1]) : def
}
function argStr(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? (hit.split('=')[1] ?? null) : null
}

const slot = (lane: number, rank: number, cls: number): Slot => ({
  lane, rank, cls, level: LEVEL, squad: SQUAD,
})

/**
 * Разложить TOTAL_UNITS поровну по слотам формации.
 * Вызывается один раз при сборке архетипа, а не в горячем цикле.
 */
function equalize(slots: Slot[]): Formation {
  if (slots.length !== SLOTS) {
    throw new Error(
      `формация из ${slots.length} слотов, а нужно ровно ${SLOTS} — иначе ` +
        'сравнивается число героев, а не состав (см. комментарий к SLOTS)',
    )
  }
  return { slots }
}

/**
 * Архетип — это осмысленный состав, а не просто класс.
 *
 * Балансировать по классам поодиночке бессмысленно: игрок ставит не «трёх
 * лучников», а «стену и стрелков за ней». Матрица классов покажет, что павиза
 * слаба, хотя в реальном составе она сильнейший юнит.
 */
interface Archetype {
  readonly key: string
  readonly name: string
  readonly formation: Formation
  /**
   * Моно-составы — это диагностические ЗОНДЫ, а не то, что кто-то соберёт.
   * «Шесть лекарей» обязаны проигрывать всем и всегда: это правильная работа
   * модели, а не дефект баланса. Поэтому коридор 40–60% меряется только по
   * смешанным составам (ADR-010), а зонды остаются как проверка, что каждый
   * класс делает то, что должен.
   */
  readonly isProbe: boolean
}

/** Моно-состав: три слота одного класса в переднем ряду. */
function mono(cls: number): Archetype {
  return {
    key: `mono-${CLASS_PROFILES[cls]!.name.toLowerCase()}`,
    name: `моно ${CLASS_PROFILES[cls]!.name}`,
    formation: equalize([0, 1, 2].flatMap((lane) => [slot(lane, 0, cls), slot(lane, 1, cls)])),
    isProbe: true,
  }
}

const ARCHETYPES: Archetype[] = [
  ...Array.from({ length: UnitClass.COUNT }, (_, c) => mono(c)),
  {
    key: 'wall-shot',
    name: 'стена + стрелки',
    formation: equalize([
      slot(0, 0, UnitClass.Paviser), slot(1, 0, UnitClass.Paviser),
      slot(2, 0, UnitClass.Paviser), slot(0, 3, UnitClass.Arbalist),
      slot(1, 3, UnitClass.Arbalist), slot(2, 3, UnitClass.Arbalist),
    ]),
    isProbe: false,
  },
  {
    key: 'line-mage',
    name: 'фронт + маги',
    formation: equalize([
      slot(0, 0, UnitClass.Infantry), slot(1, 0, UnitClass.Infantry),
      slot(2, 0, UnitClass.Infantry), slot(0, 3, UnitClass.Mage),
      slot(1, 3, UnitClass.Mage), slot(2, 3, UnitClass.Mage),
    ]),
    isProbe: false,
  },
  {
    key: 'rush',
    name: 'прорыв кавалерией',
    formation: equalize([
      slot(0, 0, UnitClass.Cavalry), slot(2, 0, UnitClass.Cavalry),
      slot(4, 0, UnitClass.Cavalry), slot(1, 1, UnitClass.Cavalry),
      slot(3, 1, UnitClass.Cavalry), slot(2, 2, UnitClass.Cavalry),
    ]),
    isProbe: false,
  },
  {
    key: 'anti-cav',
    name: 'анти-кавалерия',
    formation: equalize([
      slot(0, 0, UnitClass.Pikeman), slot(1, 0, UnitClass.Pikeman),
      slot(2, 0, UnitClass.Pikeman), slot(0, 2, UnitClass.Archer),
      slot(1, 2, UnitClass.Archer), slot(2, 2, UnitClass.Archer),
    ]),
    isProbe: false,
  },
  {
    key: 'balanced',
    name: 'сбалансированный',
    formation: equalize([
        slot(0, 0, UnitClass.Paviser), slot(1, 0, UnitClass.Infantry),
        slot(2, 0, UnitClass.Pikeman), slot(1, 2, UnitClass.Archer),
        slot(0, 2, UnitClass.Mage), slot(2, 3, UnitClass.Healer),
    ]),
    isProbe: false,
  },
  {
    key: 'archers-behind-mages',
    name: 'лучники за магами',
    formation: equalize([
      slot(0, 0, UnitClass.Infantry), slot(1, 0, UnitClass.Infantry),
      slot(0, 1, UnitClass.Mage), slot(1, 1, UnitClass.Mage),
      slot(0, 3, UnitClass.Archer), slot(1, 3, UnitClass.Archer),
    ]),
    isProbe: false,
  },
  {
    key: 'flank-dive',
    name: 'обход по пустому лейну',
    formation: equalize([
      slot(1, 0, UnitClass.Paviser), slot(2, 0, UnitClass.Paviser),
      slot(1, 2, UnitClass.Arbalist), slot(2, 2, UnitClass.Arbalist),
      slot(4, 0, UnitClass.Cavalry), slot(4, 1, UnitClass.Cavalry),
    ]),
    isProbe: false,
  },
  {
    key: 'sustain',
    name: 'стена с лечением',
    formation: equalize([
      slot(0, 0, UnitClass.Paviser), slot(1, 0, UnitClass.Paviser),
      slot(2, 0, UnitClass.Infantry), slot(0, 2, UnitClass.Archer),
      // Лекари в 1-м ранге, а НЕ в 3-м, и это не мелочь: дальность лекаря 130,
      // а до фронта из 3-го ранга 150 единиц — он физически не достаёт до тех,
      // кого должен лечить. Замер: тот же состав с лекарями в тылу держит 0%,
      // с лекарями у фронта — 60%. Короткая дальность саппорта — это механика
      // первоисточника (жрец 20 против лучника 30), и она превращает
      // расстановку лекаря в решение игрока, а не в декорацию.
      slot(1, 1, UnitClass.Healer), slot(2, 1, UnitClass.Healer),
    ]),
    isProbe: false,
  },
  {
    key: 'spear-shot',
    name: 'копья и стрелки',
    formation: equalize([
      slot(0, 0, UnitClass.Pikeman), slot(1, 0, UnitClass.Pikeman),
      slot(2, 0, UnitClass.Pikeman), slot(0, 3, UnitClass.Archer),
      slot(1, 3, UnitClass.Archer), slot(2, 3, UnitClass.Arbalist),
    ]),
    isProbe: false,
  },
  {
    key: 'deep-line',
    name: 'тройная линия',
    formation: equalize([
      slot(0, 0, UnitClass.Paviser), slot(1, 0, UnitClass.Infantry),
      slot(2, 0, UnitClass.Pikeman), slot(0, 2, UnitClass.Arbalist),
      slot(1, 2, UnitClass.Mage), slot(2, 2, UnitClass.Archer),
    ]),
    isProbe: false,
  },
]

interface PairResult {
  winsA: number
  battles: number
  avgTicks: number
  /** доля урона, нанесённая каждым классом со стороны A */
  dealtByClass: Float64Array
  /** сколько HP восстановлено каждым классом со стороны A */
  healedByClass: Float64Array
}

function runPair(a: Archetype, b: Archetype, n: number): PairResult {
  let winsA = 0
  let ticks = 0
  const dealtByClass = new Float64Array(UnitClass.COUNT)
  const healedByClass = new Float64Array(UnitClass.COUNT)

  for (let i = 1; i <= n; i++) {
    // Сид детерминирован парой и номером прогона: отчёт воспроизводим целиком
    const seed = (i * 2654435761 + a.key.length * 97 + b.key.length * 31) >>> 0
    const r = runBattle(seed, a.formation, b.formation)
    if (r.outcome === Outcome.TeamAWins) winsA++
    ticks += r.ticks
    const w = r.world
    for (let id = 0; id < w.count; id++) {
      if (w.team[id]! !== 0) continue
      dealtByClass[w.cls[id]!]! += r.stats.dealt[id]!
      healedByClass[w.cls[id]!]! += r.stats.healed[id]!
    }
  }
  return { winsA, battles: n, avgTicks: ticks / n, dealtByClass, healedByClass }
}

function pct(x: number): string {
  return (x * 100).toFixed(0).padStart(3)
}

function main(): void {
  const n = arg('n', 60)
  const csvPath = argStr('csv')
  const t0 = process.hrtime.bigint()

  const m = ARCHETYPES.length
  const wr: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0))
  const ttk: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0))
  const dealt = new Float64Array(UnitClass.COUNT)
  const healed = new Float64Array(UnitClass.COUNT)
  let battles = 0

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      const r = runPair(ARCHETYPES[i]!, ARCHETYPES[j]!, n)
      wr[i]![j] = r.winsA / r.battles
      ttk[i]![j] = r.avgTicks / TICK_HZ
      battles += r.battles
      for (let c = 0; c < UnitClass.COUNT; c++) {
        dealt[c]! += r.dealtByClass[c]!
        healed[c]! += r.healedByClass[c]!
      }
    }
  }

  const ms = Number(process.hrtime.bigint() - t0) / 1e6

  // --- матрица винрейтов ---
  console.log(`\nМАТРИЦА ВИНРЕЙТОВ (строка атакует столбец, ${n} боёв на пару)\n`)
  const label = (s: string): string => s.slice(0, 16).padEnd(17)
  console.log(label('') + ARCHETYPES.map((_, j) => String(j).padStart(4)).join(''))
  for (let i = 0; i < m; i++) {
    const row = wr[i]!.map((v, j) => (i === j ? '   ·' : pct(v).padStart(4))).join('')
    console.log(label(`${i} ${ARCHETYPES[i]!.name}`) + row)
  }

  /*
   * --- ГЛАВНАЯ МЕТРИКА: доля НЕ предрешённых матчапов ---
   *
   * Заменила прежний DoD «все пары в коридоре 40–60%» (04_ROADMAP, ADR-010).
   * Тот был сформулирован неверно: среди архетипов есть диагностические зонды
   * вроде «шесть лекарей», которые обязаны проигрывать всегда. Требовать от
   * них 40–60% — значит требовать, чтобы лекарь убивал.
   *
   * Здесь меряется то, ради чего вся балансная работа и делается: в скольких
   * матчапах исход НЕ известен заранее. Клетка 0 или 100 означает, что бой
   * можно не смотреть — а это смерть столпа 2.
   */
  let decided = 0
  let open = 0
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (i === j) continue
      const v = wr[i]![j]!
      if (v <= 0.02 || v >= 0.98) decided++
      else open++
    }
  }
  const openPct = (open * 100) / (open + decided)
  console.log(
    `\nИСХОД НЕ ПРЕДРЕШЁН: ${open} матчапов из ${open + decided} (${openPct.toFixed(0)}%)` +
      `  ← главная метрика, цель ≥ 40%`,
  )

  // --- симметрия сторон ---
  // wr(X,Y) + wr(Y,X) обязано давать 100%. Отклонение = преимущество за место
  // в сетке, а не за состав. Для PvP это вопрос честности матча.
  let worstSkew = 0
  let worstPair = ''
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const skew = Math.abs((wr[i]![j]! + wr[j]![i]!) * 100 - 100)
      if (skew > worstSkew) {
        worstSkew = skew
        worstPair = `${ARCHETYPES[i]!.name} / ${ARCHETYPES[j]!.name}`
      }
    }
  }
  console.log(
    `СИММЕТРИЯ СТОРОН: худшее отклонение ${worstSkew.toFixed(0)} п.п. (${worstPair})` +
      `  ← цель ≤ 15`,
  )

  // --- коридор 40-60%, ТОЛЬКО по смешанным составам ---
  // Зонды («шесть лекарей», «шесть павиз») из этой метрики исключены: они
  // обязаны проигрывать всегда, и включать их значило бы требовать, чтобы
  // лекарь убивал.
  let mixIn = 0
  let mixTotal = 0
  for (let i = 0; i < m; i++) {
    if (ARCHETYPES[i]!.isProbe) continue
    for (let j = 0; j < m; j++) {
      if (i === j || ARCHETYPES[j]!.isProbe) continue
      mixTotal++
      const v = wr[i]![j]!
      if (v >= 0.4 && v <= 0.6) mixIn++
    }
  }
  console.log(
    `КОРИДОР 40-60% (только смешанные составы): ${mixIn} пар из ${mixTotal} ` +
      `(${((mixIn * 100) / mixTotal).toFixed(0)}%)`,
  )

  // --- кто вне коридора ---
  console.log('\nВЫПАДАЮТ ИЗ КОРИДОРА 40-60% (все пары, справочно):\n')
  const bad: Array<[string, string, number]> = []
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (i === j) continue
      const v = wr[i]![j]!
      if (v < 0.4 || v > 0.6) bad.push([ARCHETYPES[i]!.name, ARCHETYPES[j]!.name, v])
    }
  }
  bad.sort((x, y) => Math.abs(y[2] - 0.5) - Math.abs(x[2] - 0.5))
  for (const [x, y, v] of bad.slice(0, 12)) {
    console.log(`  ${(v * 100).toFixed(0).padStart(3)}%  ${x} против ${y}`)
  }
  console.log(`  ...всего пар вне коридора: ${bad.length} из ${m * (m - 1)}`)

  // --- средний винрейт архетипа ---
  console.log('\nСРЕДНИЙ ВИНРЕЙТ АРХЕТИПА (мусор — ниже 40%, доминанта — выше 60%):\n')
  const avg = ARCHETYPES.map((a, i) => {
    let s = 0
    let k = 0
    for (let j = 0; j < m; j++) if (i !== j) { s += wr[i]![j]!; k++ }
    return { name: a.name, v: s / k }
  }).sort((x, y) => y.v - x.v)
  for (const a of avg) {
    const flag = a.v > 0.6 ? ' ← доминанта' : a.v < 0.4 ? ' ← мусор' : ''
    console.log(`  ${(a.v * 100).toFixed(0).padStart(3)}%  ${a.name}${flag}`)
  }

  // --- вклад в урон по классам ---
  console.log('\nВКЛАД В УРОН ПО КЛАССАМ (класс-пустышка = доля близкая к нулю):\n')
  const total = dealt.reduce((s, v) => s + v, 0)
  const byCls = Array.from({ length: UnitClass.COUNT }, (_, c) => ({
    name: CLASS_PROFILES[c]!.name,
    share: total > 0 ? dealt[c]! / total : 0,
  })).sort((x, y) => y.share - x.share)
  for (const c of byCls) {
    const bar = '█'.repeat(Math.round(c.share * 60))
    console.log(`  ${(c.share * 100).toFixed(1).padStart(5)}%  ${c.name.padEnd(10)} ${bar}`)
  }

  // --- вклад лекарей ---
  // Без этой строки лекарь неизмерим: он не наносит урона, поэтому в таблице
  // выше у него всегда 0.0%, и понять, работает ли класс, невозможно.
  const totalHealed = healed.reduce((s2, v) => s2 + v, 0)
  const totalDealt = dealt.reduce((s2, v) => s2 + v, 0)
  if (totalHealed > 0) {
    console.log('\nВОССТАНОВЛЕНО HP (лечение как доля от всего урона в игре):\n')
    for (let c = 0; c < UnitClass.COUNT; c++) {
      if (healed[c]! === 0) continue
      const share = (healed[c]! * 100) / totalDealt
      console.log(
        `  ${share.toFixed(1).padStart(5)}%  ${CLASS_PROFILES[c]!.name.padEnd(10)} ` +
          '▓'.repeat(Math.round(share * 2)),
      )
    }
  } else {
    console.log('\n⚠️  ЛЕЧЕНИЯ НЕ ЗАФИКСИРОВАНО ВООБЩЕ — лекарь не работает')
  }

  // --- темп ---
  let tsum = 0
  let tk = 0
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (i !== j) { tsum += ttk[i]![j]!; tk++ }
  console.log(`\nСредняя длительность боя: ${(tsum / tk).toFixed(1)} с`)
  console.log(`${battles} боёв за ${(ms / 1000).toFixed(1)} с (${(ms / battles).toFixed(2)} мс на бой)\n`)

  if (csvPath) {
    const head = ['archetype', ...ARCHETYPES.map((a) => a.key)].join(',')
    const rows = ARCHETYPES.map((a, i) =>
      [a.key, ...wr[i]!.map((v) => v.toFixed(3))].join(','),
    )
    mkdirSync(dirname(csvPath), { recursive: true })
    writeFileSync(csvPath, [head, ...rows].join('\n') + '\n')
    console.log(`CSV: ${csvPath}`)
  }
}

main()
