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
 * Общее число бойцов у КАЖДОГО архетипа — одинаковое, и это критично.
 *
 * БАГ, КОТОРЫЙ ЭТО ЧИНИТ (найден 2026-08-13). Раньше здесь стоял фиксированный
 * размер отряда SQUAD = 12 на слот. Но у архетипов разное число слотов: у моно
 * три, у «сбалансированного» шесть. То есть «сбалансированный» выходил на поле
 * с 72 бойцами против 36 у моно — вдвое большей армией.
 *
 * При квадратичном законе Ланчестера двукратное численное превосходство даёт
 * не преимущество, а вайп. Поэтому весь отчёт BALANCE_01 («сбалансированный
 * и фронт+маги держат 92%») измерял не качество состава, а размер армии.
 * Вывод «смешанные составы доминируют над моно» был артефактом инструмента.
 *
 * 48 делится на 3, 4 и 6 — все текущие размеры формаций дают целый отряд.
 * Добавляя архетип с другим числом слотов, проверь делимость.
 */
const TOTAL_UNITS = 48

function arg(name: string, def: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? Number(hit.split('=')[1]) : def
}
function argStr(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? (hit.split('=')[1] ?? null) : null
}

const slot = (lane: number, rank: number, cls: number): Slot => ({
  lane, rank, cls, level: LEVEL, squad: 0,
})

/**
 * Разложить TOTAL_UNITS поровну по слотам формации.
 * Вызывается один раз при сборке архетипа, а не в горячем цикле.
 */
function equalize(slots: Slot[]): Formation {
  // −1, потому что слот выставляет на поле героя И его отряд. Без этого
  // состав из шести слотов выходил с шестью героями против трёх у моно при
  // формально равном числе миньонов — и выигрывал у всех 100% именно этим.
  const squad = ((TOTAL_UNITS / slots.length) | 0) - 1
  if ((squad + 1) * slots.length !== TOTAL_UNITS) {
    throw new Error(
      `формация из ${slots.length} слотов не делит ${TOTAL_UNITS} нацело — ` +
        'архетипы обязаны выходить равной численностью, иначе сравнивается ' +
        'размер армии, а не состав',
    )
  }
  return { slots: slots.map((s) => ({ ...s, squad })) }
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
}

/** Моно-состав: три слота одного класса в переднем ряду. */
function mono(cls: number): Archetype {
  return {
    key: `mono-${CLASS_PROFILES[cls]!.name.toLowerCase()}`,
    name: `моно ${CLASS_PROFILES[cls]!.name}`,
    formation: equalize([0, 1, 2].map((lane) => slot(lane, 0, cls))),
  }
}

const ARCHETYPES: Archetype[] = [
  ...Array.from({ length: UnitClass.COUNT }, (_, c) => mono(c)),
  {
    key: 'wall-shot',
    name: 'стена + стрелки',
    formation: equalize([
        slot(0, 0, UnitClass.Paviser), slot(1, 0, UnitClass.Paviser),
        slot(0, 3, UnitClass.Arbalist), slot(1, 3, UnitClass.Arbalist),
    ]),
  },
  {
    key: 'line-mage',
    name: 'фронт + маги',
    formation: equalize([
        slot(0, 0, UnitClass.Infantry), slot(1, 0, UnitClass.Infantry),
        slot(0, 3, UnitClass.Mage), slot(1, 3, UnitClass.Mage),
    ]),
  },
  {
    key: 'rush',
    name: 'прорыв кавалерией',
    formation: equalize([
        slot(0, 0, UnitClass.Cavalry), slot(2, 0, UnitClass.Cavalry),
        slot(4, 0, UnitClass.Cavalry), slot(1, 1, UnitClass.Cavalry),
    ]),
  },
  {
    key: 'anti-cav',
    name: 'анти-кавалерия',
    formation: equalize([
        slot(0, 0, UnitClass.Pikeman), slot(1, 0, UnitClass.Pikeman),
        slot(2, 0, UnitClass.Pikeman), slot(1, 2, UnitClass.Archer),
    ]),
  },
  {
    key: 'balanced',
    name: 'сбалансированный',
    formation: equalize([
        slot(0, 0, UnitClass.Paviser), slot(1, 0, UnitClass.Infantry),
        slot(2, 0, UnitClass.Pikeman), slot(1, 2, UnitClass.Archer),
        slot(0, 2, UnitClass.Mage), slot(2, 3, UnitClass.Healer),
    ]),
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

  // --- кто вне коридора ---
  console.log('\nВЫПАДАЮТ ИЗ КОРИДОРА 40-60% (справочно, не DoD):\n')
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
