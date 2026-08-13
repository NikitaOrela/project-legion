/**
 * ASCII-визуализатор боя в терминале.
 *
 * Это не шутка и не игрушка (04_ROADMAP, фаза 1). Пока нет рендера, это
 * единственный способ увидеть, что симуляция делает не то: залипшие юниты,
 * пробитый фронт, кавалерия, ушедшая не туда. Баг, который в цифрах выглядит
 * как «винрейт 0.56», в ASCII виден за секунду.
 */

import type { World, BattleResult } from '@mw/sim'
import { Team, UnitClass, CLASS_PROFILES } from '@mw/sim'

// Infantry Pikeman Paviser Cavalry Archer Arbalist Mage Healer
const GLYPH_A = ['i', 'p', 'v', 'c', 'a', 'b', 'm', 'h'] // своя сторона
const GLYPH_B = ['I', 'P', 'V', 'C', 'A', 'B', 'M', 'H'] // враг — заглавные
const HERO_A = ['#', '$', '=', '%', '@', '&', '*', '+']
const HERO_B = ['#', '$', '=', '%', '@', '&', '*', '+']

export interface AsciiOptions {
  width?: number
  height?: number
}

export function renderAscii(w: World, opts: AsciiOptions = {}): string {
  const cols = opts.width ?? 100
  const rows = opts.height ?? 22

  const geo = w.geometry
  const laneSpan = (geo.lanes - 1) * geo.laneHeight
  const minY = -laneSpan / 2 - 60
  const maxY = laneSpan / 2 + 60

  const grid: string[][] = Array.from({ length: rows }, () =>
    new Array<string>(cols).fill(' '),
  )

  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    const ux = w.px[id]! >> 8
    const uy = w.py[id]! >> 8

    let cx = ((ux / geo.fieldWidth) * cols) | 0
    let cy = (((uy - minY) / (maxY - minY)) * rows) | 0
    if (cx < 0) cx = 0
    else if (cx >= cols) cx = cols - 1
    if (cy < 0) cy = 0
    else if (cy >= rows) cy = rows - 1

    const cls = w.cls[id]!
    const isA = w.team[id]! === Team.A
    const hero = w.isHero[id]! === 1
    const ch = hero
      ? (isA ? HERO_A : HERO_B)[cls]!
      : (isA ? GLYPH_A : GLYPH_B)[cls]!

    // Герой перекрывает миньона, миньон не перекрывает героя
    const cur = grid[cy]![cx]!
    if (cur === ' ' || hero) grid[cy]![cx] = ch
  }

  const border = '+' + '-'.repeat(cols) + '+'
  const body = grid.map((r) => '|' + r.join('') + '|').join('\n')
  return `${border}\n${body}\n${border}`
}

/** Сводка боя одной строкой + распределение по классам. */
export function summarize(r: BattleResult): string {
  const w = r.world
  const alive = [
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let i = 0; i < w.aliveCount; i++) {
    const id = w.alive[i]!
    alive[w.team[id]!]![w.cls[id]!]!++
  }
  const fmt = (t: number): string =>
    CLASS_PROFILES.map((p, c) => `${p.name}:${alive[t]![c]}`).join(' ')

  const outcomeName = ['A побеждает', 'B побеждает', 'ничья'][r.outcome]!
  return [
    `${outcomeName} за ${r.ticks} тиков (${(r.ticks / 30).toFixed(1)} с)`,
    `  A: ${r.survivorsA} выживших, HP ${r.hpPctA}%  [${fmt(Team.A)}]`,
    `  B: ${r.survivorsB} выживших, HP ${r.hpPctB}%  [${fmt(Team.B)}]`,
  ].join('\n')
}

/** Топ-3 по нанесённому урону — прообраз пост-бой отчёта (02_GDD §7.1). */
export function topContributors(r: BattleResult, n = 3): string {
  const w = r.world
  const ids: number[] = []
  for (let i = 0; i < w.count; i++) if (w.isHero[i]! === 1) ids.push(i)
  ids.sort((x, y) => {
    const d = r.stats.dealt[y]! - r.stats.dealt[x]!
    return d !== 0 ? d : x - y // тай-брейкер по entityId — детерминизм
  })
  return ids
    .slice(0, n)
    .map((id) => {
      const side = w.team[id]! === Team.A ? 'A' : 'B'
      const cls = CLASS_PROFILES[w.cls[id]!]!.name
      const dead = w.hp[id]! <= 0 ? ` †тик ${r.stats.deathTick[id]}` : ''
      return `  ${side} ${cls}#${id}: нанёс ${r.stats.dealt[id]}, получил ${r.stats.taken[id]}, убил ${r.stats.kills[id]}${dead}`
    })
    .join('\n')
}
