/**
 * Оболочка приложения: формация → бой → результат.
 *
 * АРХИТЕКТУРА UI. Поле боя рисует PixiJS, всё остальное — обычный DOM.
 * Причина простая: сетка формации, кнопки и таблица отчёта на HTML делаются
 * быстрее, работают с тач-событиями из коробки и не тратят кадровый бюджет,
 * который целиком нужен 840 юнитам.
 *
 * ЦИКЛ. Симуляция идёт фиксированным шагом 1/30 с через аккумулятор, рендер —
 * с частотой экрана. Ускорение 2×/4× меняет ТОЛЬКО число шагов симуляции за
 * кадр; сам тик остаётся 1/30 с, иначе исход боя зависел бы от выбранной
 * скорости, а это прямое нарушение детерминизма.
 */

import { Application } from 'pixi.js'
import {
  CLASS_PROFILES,
  Outcome,
  TICK_HZ,
  UnitClass,
  createBattle,
  finishBattle,
  stepBattle,
  type BattleResult,
  type BattleSession,
  type Formation,
  type Slot,
} from '@mw/sim'
import { BattleView } from '@mw/render'

const LANES = 5
const RANKS = 4
const SQUAD = 14
const LEVEL = 10
const SEED = 20260813

// --- состояние экрана формации -------------------------------------------

/** null = клетка пуста */
const cells: (number | null)[] = new Array(LANES * RANKS).fill(null)
let selected: number = UnitClass.Infantry

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T

const CLASS_RU: Record<number, string> = {
  [UnitClass.Infantry]: 'Пехота',
  [UnitClass.Pikeman]: 'Пикинёр',
  [UnitClass.Paviser]: 'Павиза',
  [UnitClass.Cavalry]: 'Кавалерия',
  [UnitClass.Archer]: 'Лучник',
  [UnitClass.Arbalist]: 'Арбалет',
  [UnitClass.Mage]: 'Маг',
  [UnitClass.Healer]: 'Лекарь',
}

/**
 * SVG-силуэты, повторяющие формы из атласа рендера.
 * Одна форма в двух местах — риск рассинхрона, но альтернатива (рендерить
 * Pixi-текстуры в DOM) дороже и медленнее. Формы зафиксированы здесь и в
 * packages/render/src/atlas.ts, менять надо парой.
 */
function svgShape(cls: number, color: string): string {
  const s = 24
  const body = (() => {
    switch (cls) {
      case UnitClass.Infantry: return `<rect x="5.3" y="5.3" width="13.4" height="13.4"/>`
      case UnitClass.Pikeman: return `<rect x="9.1" y="7.2" width="5.8" height="13.2"/><polygon points="12,1.2 15.8,7.7 8.2,7.7"/>`
      case UnitClass.Paviser: return `<polygon points="3.8,6.2 20.2,6.2 20.2,14.4 12,21.1 3.8,14.4"/>`
      case UnitClass.Cavalry: return `<rect x="1.9" y="8.2" width="20.2" height="8.2" rx="3.4"/><polygon points="20.6,6.7 23.8,12 20.6,17.3"/>`
      case UnitClass.Archer: return `<polygon points="12,3.4 19.7,19.7 4.3,19.7"/>`
      case UnitClass.Arbalist: return `<polygon points="12,4.8 19.7,19.2 4.3,19.2"/><rect x="2.4" y="10.6" width="19.2" height="3.1"/>`
      case UnitClass.Mage: return `<polygon points="12,1.9 21.6,12 12,22.1 2.4,12"/>`
      case UnitClass.Healer: return `<rect x="9.1" y="2.9" width="5.8" height="18.2"/><rect x="2.9" y="9.1" width="18.2" height="5.8"/>`
      default: return `<circle cx="12" cy="12" r="7"/>`
    }
  })()
  return `<svg viewBox="0 0 ${s} ${s}" fill="${color}">${body}</svg>`
}

function buildRoster(): void {
  const host = $('roster')
  host.innerHTML = ''
  for (let cls = 0; cls < UnitClass.COUNT; cls++) {
    const p = CLASS_PROFILES[cls]!
    const el = document.createElement('div')
    el.className = 'unit' + (cls === selected ? ' sel' : '')
    el.draggable = true
    el.dataset.cls = String(cls)
    el.innerHTML =
      svgShape(cls, '#5b9bd5') +
      `<div><div class="nm">${CLASS_RU[cls]}</div>` +
      `<div class="lbl" style="font-size:10px;color:#8b949e">дальность ${p.range} · скорость ${(p.speed / 256) | 0}</div></div>`
    el.addEventListener('click', () => {
      selected = cls
      buildRoster()
    })
    el.addEventListener('dragstart', (e) => {
      selected = cls
      e.dataTransfer?.setData('text/plain', String(cls))
    })
    host.appendChild(el)
  }
}

function buildGrid(): void {
  const g = $('grid')
  g.style.gridTemplateColumns = `repeat(${RANKS}, 1fr)`
  g.innerHTML = ''
  for (let lane = 0; lane < LANES; lane++) {
    for (let rank = 0; rank < RANKS; rank++) {
      const i = lane * RANKS + rank
      const c = document.createElement('div')
      c.className = 'cell'
      c.dataset.i = String(i)
      c.addEventListener('dragover', (e) => {
        e.preventDefault()
        c.classList.add('drop')
      })
      c.addEventListener('dragleave', () => c.classList.remove('drop'))
      c.addEventListener('drop', (e) => {
        e.preventDefault()
        c.classList.remove('drop')
        cells[i] = selected
        paintCells()
      })
      // Тап как второй способ ввода — паттерн Clash Royale: drag ИЛИ tap-tap
      c.addEventListener('click', () => {
        cells[i] = cells[i] == null ? selected : null
        paintCells()
      })
      g.appendChild(c)
    }
  }
  paintCells()
}

function paintCells(): void {
  const nodes = $('grid').children
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i] as HTMLElement
    const cls = cells[i] ?? null
    const rank = i % RANKS
    el.className = 'cell' + (cls === null ? '' : ' filled')
    el.innerHTML =
      `<span class="lbl">${rank === 0 ? 'фронт' : rank === RANKS - 1 ? 'тыл' : ''}</span>` +
      (cls === null ? '' : svgShape(cls, '#5b9bd5'))
  }
  const used = cells.filter((c) => c !== null).length
  $('slots').textContent =
    `Занято ${used} из ${LANES * RANKS} слотов · ${used * (SQUAD + 1)} юнитов в поле`
}

function currentFormation(): Formation {
  const slots: Slot[] = []
  for (let i = 0; i < cells.length; i++) {
    const cls = cells[i]
    if (cls === null || cls === undefined) continue
    slots.push({
      lane: (i / RANKS) | 0,
      rank: i % RANKS,
      cls,
      level: LEVEL,
      squad: SQUAD,
    })
  }
  return { slots }
}

/** Соперник фиксирован — так видно, что меняет ИМЕННО расстановка игрока. */
function enemyFormation(): Formation {
  const s = (lane: number, rank: number, cls: number): Slot => ({
    lane, rank, cls, level: LEVEL, squad: SQUAD,
  })
  return {
    slots: [
      s(0, 0, UnitClass.Paviser), s(1, 0, UnitClass.Infantry), s(2, 0, UnitClass.Infantry),
      s(3, 0, UnitClass.Pikeman), s(1, 2, UnitClass.Archer), s(2, 2, UnitClass.Mage),
      s(4, 3, UnitClass.Cavalry), s(0, 3, UnitClass.Healer),
    ],
  }
}

function autoFill(): void {
  cells.fill(null)
  // «Игра никогда не оставляет игрока с пустым полем» — паттерн Art of War:
  // Legions. Заведомо неоптимальная эвристика: она для казуала, не для меты.
  const plan: Array<[number, number, number]> = [
    [0, 0, UnitClass.Paviser], [1, 0, UnitClass.Infantry], [2, 0, UnitClass.Infantry],
    [3, 0, UnitClass.Pikeman], [1, 2, UnitClass.Archer], [2, 2, UnitClass.Archer],
    [3, 2, UnitClass.Mage], [0, 3, UnitClass.Healer], [4, 3, UnitClass.Cavalry],
  ]
  for (const [lane, rank, cls] of plan) cells[lane * RANKS + rank] = cls
  paintCells()
}

// --- бой ------------------------------------------------------------------

let app: Application | null = null
let view: BattleView | null = null
let session: BattleSession | null = null
let speed = 1
let acc = 0
let lastResult: BattleResult | null = null

const STEP = 1 / TICK_HZ

async function ensurePixi(): Promise<void> {
  if (app) return
  const host = $('canvas-host')
  app = new Application()
  await app.init({
    background: 0x0b0e12,
    antialias: false,
    resizeTo: host,
    // WebGL2 как основной путь: WebGPU в Safari ещё не общедоступен по умолчанию
    preference: 'webgl',
  })
  host.appendChild(app.canvas)
  view = new BattleView(app.renderer, {
    width: host.clientWidth || 900,
    height: host.clientHeight || 460,
  })
  app.stage.addChild(view.stage)
  app.ticker.add((t) => frame(t.deltaMS / 1000))
}

function startBattle(): void {
  session = createBattle(SEED, currentFormation(), enemyFormation())
  view!.bind(session)
  acc = 0
  lastResult = null
  show('battle')
}

function frame(dt: number): void {
  if (!session || !view) return
  if (session.finished) return

  acc += dt * speed
  let steps = 0
  while (acc >= STEP && !session.finished && steps < 16) {
    view.captureTick(session.world)
    stepBattle(session)
    view.consumeEvents(session)
    acc -= STEP
    steps++
  }

  const alpha = Math.min(1, acc / STEP)
  view.render(session, alpha, dt)
  updateHud()

  if (session.finished) showResult()
}

function updateHud(): void {
  if (!session) return
  const w = session.world
  let a = 0, b = 0, ma = 0, mb = 0
  for (let id = 0; id < w.count; id++) {
    if (w.team[id]! === 0) { ma += w.hpMax[id]!; if (w.hp[id]! > 0) a += w.hp[id]! }
    else { mb += w.hpMax[id]!; if (w.hp[id]! > 0) b += w.hp[id]! }
  }
  $('hp-a').style.width = `${ma ? (a / ma) * 100 : 0}%`
  $('hp-b').style.width = `${mb ? (b / mb) * 100 : 0}%`
  $('timer').textContent = `${(session.tick / TICK_HZ).toFixed(1)}с`
}

/** Скип: досчитать бой мгновенно тем же ядром. Результат идентичен просмотру. */
function skipBattle(): void {
  if (!session) return
  while (!session.finished) stepBattle(session)
  showResult()
}

// --- результат ------------------------------------------------------------

function showResult(): void {
  if (!session || lastResult) return
  const r = finishBattle(session)
  lastResult = r
  const w = r.world

  const win = r.outcome === Outcome.TeamAWins
  $('verdict').textContent = win ? 'Победа' : r.outcome === Outcome.TeamBWins ? 'Поражение' : 'Ничья'
  $('verdict').style.color = win ? 'var(--ok)' : 'var(--b)'
  $('verdict-sub').textContent =
    `${(r.ticks / TICK_HZ).toFixed(1)} секунд · выжило ${r.survivorsA} против ${r.survivorsB} · ` +
    `HP ${r.hpPctA}% против ${r.hpPctB}%`

  // Меч / сердце / щит — паттерн Art of War: Legions. Отвечает на «почему
  // я проиграл» за пять секунд, до того как игрок откроет таблицу.
  let dealt = 0, taken = 0, healed = 0
  for (let id = 0; id < w.count; id++) {
    if (w.team[id]! !== 0) continue
    dealt += r.stats.dealt[id]!
    taken += r.stats.taken[id]!
    healed += r.stats.healed[id]!
  }
  $('icons').innerHTML =
    stat('⚔', 'Нанесено', dealt) +
    stat('♥', 'Получено', taken) +
    stat('🛡', 'Вылечено', healed)

  // Таблица героев: кто внёс вклад, кто погиб и от чьей руки
  const heroes: number[] = []
  for (let id = 0; id < w.count; id++) if (w.isHero[id]! === 1) heroes.push(id)
  heroes.sort((x, y) => r.stats.dealt[y]! - r.stats.dealt[x]! || x - y)

  const rows = heroes.map((id) => {
    const side = w.team[id]! === 0 ? 'своя' : 'враг'
    const color = w.team[id]! === 0 ? '#5b9bd5' : '#e06c4f'
    const dead = w.hp[id]! <= 0
    const killer = r.stats.killedBy[id]!
    const fate = dead
      ? `<span class="dead">пал на ${(r.stats.deathTick[id]! / TICK_HZ).toFixed(1)}с${
          killer >= 0 ? ` от ${CLASS_RU[w.cls[killer]!]}` : ''
        }</span>`
      : `выжил, ${((w.hp[id]! / w.hpMax[id]!) * 100) | 0}% HP`
    return `<tr>
      <td><div class="who">${svgShape(w.cls[id]!, color)}<span>${CLASS_RU[w.cls[id]!]} <span style="color:#8b949e">(${side})</span></span></div></td>
      <td class="num">${r.stats.dealt[id]}</td>
      <td class="num">${r.stats.taken[id]}</td>
      <td class="num">${r.stats.kills[id]}</td>
      <td>${fate}</td>
    </tr>`
  })

  $('report').innerHTML =
    `<thead><tr><th>Герой</th><th>Нанёс</th><th>Получил</th><th>Убил</th><th>Судьба</th></tr></thead>` +
    `<tbody>${rows.join('')}</tbody>`

  show('result')
}

function stat(icon: string, label: string, value: number): string {
  return `<div class="stat"><div class="k">${icon} ${label}</div><div class="v">${value.toLocaleString('ru')}</div></div>`
}

// --- навигация ------------------------------------------------------------

function show(name: 'formation' | 'battle' | 'result'): void {
  for (const s of ['formation', 'battle', 'result'] as const) {
    $(`scr-${s}`).classList.toggle('on', s === name)
  }
}

function setSpeed(v: number): void {
  speed = v
  for (const [id, val] of [['sp1', 1], ['sp2', 2], ['sp4', 4]] as const) {
    $(id).classList.toggle('on', val === v)
  }
}

function init(): void {
  buildRoster()
  buildGrid()
  autoFill()
  $('seedtag').textContent = `seed ${SEED}`

  $('btn-auto').addEventListener('click', autoFill)
  $('btn-clear').addEventListener('click', () => { cells.fill(null); paintCells() })
  $('btn-fight').addEventListener('click', async () => {
    if (currentFormation().slots.length === 0) autoFill()
    await ensurePixi()
    setSpeed(1)
    startBattle()
  })
  $('sp1').addEventListener('click', () => setSpeed(1))
  $('sp2').addEventListener('click', () => setSpeed(2))
  $('sp4').addEventListener('click', () => setSpeed(4))
  $('btn-skip').addEventListener('click', skipBattle)
  $('btn-back').addEventListener('click', () => show('formation'))
  $('btn-again').addEventListener('click', () => { setSpeed(1); startBattle() })
}

init()

// Для скриншот-тестов: дать Playwright дёрнуть сценарий без кликов
;(globalThis as unknown as Record<string, unknown>).__mw = {
  autoFill,
  startBattle: async () => { await ensurePixi(); setSpeed(1); startBattle() },
  skipBattle,
  show,
  state: () => ({ tick: session?.tick ?? 0, finished: session?.finished ?? false }),
}
