/**
 * Рендер боя.
 *
 * ЖЕЛЕЗНОЕ ПРАВИЛО: рендер ЧИТАЕТ состояние симуляции и никогда в него не пишет.
 * Интерполяция между тиками, тряска, всплывающие цифры — всё живёт здесь и во
 * float. Симуляция об этом не знает и знать не должна.
 *
 * Симуляция идёт 30 Гц, экран — 60 и выше. Между тиками позиции линейно
 * интерполируются, иначе движение выглядит рваным.
 */

import {
  Container,
  Sprite,
  Text,
  TextStyle,
  type Renderer,
} from 'pixi.js'
import {
  CLASS_PROFILES,
  EVENT_STRIDE,
  EventFlag,
  EventKind,
  type BattleSession,
  type World,
} from '@mw/sim'
import { buildAtlas, TEAM_COLOR, type UnitAtlas } from './atlas.js'

const WX_SHIFT = 8

/** Цвета всплывающих цифр — 02_GDD §7.1 требует различать типы урона. */
const DMG_COLOR = {
  normal: 0xe8e8e8,
  crit: 0xffd34d,
  counter: 0xff7a45,
  splash: 0xc79bff,
  heal: 0x6ee7a0,
} as const

interface FloatingNumber {
  text: Text
  life: number
  vy: number
}

/**
 * Значок над юнитом: стрелка контра или щит блокировки.
 * Живёт доли секунды и возвращается в пул.
 */
interface Marker {
  sprite: Text
  life: number
  target: number
}

/**
 * Индикатор контра — прямое требование 02_GDD §7.1: краткая иконка при
 * срабатывании множителя > 1.2. Цветом всплывающей цифры это НЕ заменяется:
 * цифра говорит «сколько», а стрелка — «почему столько».
 */
const COUNTER_MARK = '▲'
/** Щит: юнит залип на вражеской павизе и никуда больше не идёт (02_GDD §3.6). */
const BLOCK_MARK = '◤'

export interface ViewOptions {
  width: number
  height: number
  /** масштаб мировых единиц в пиксели */
  scale?: number
}

/**
 * Не чаще одной всплывающей цифры на цель за столько тиков.
 *
 * Без этого экран заливает наложенными числами: при 840 юнитах и частоте атак
 * 22–42 тика в кадре оказывается несколько десятков цифр в одной точке. Это
 * прямо ломает столп 2 — цифры перестают читаться и превращаются в шум.
 */
const NUMBER_COOLDOWN_TICKS = 12

export class BattleView {
  readonly stage = new Container()

  private readonly atlas: UnitAtlas
  private readonly unitLayer = new Container()
  private readonly barLayer = new Container()
  private readonly fxLayer = new Container()

  private sprites: Sprite[] = []
  private bars: Sprite[] = []
  private barBg: Sprite[] = []

  /** позиции на предыдущем и текущем тике — для интерполяции */
  private prevX = new Float32Array(0)
  private prevY = new Float32Array(0)
  private curX = new Float32Array(0)
  private curY = new Float32Array(0)

  private pool: FloatingNumber[] = []
  private active: FloatingNumber[] = []
  private markPool: Marker[] = []
  private markActive: Marker[] = []
  private lastMarkTick = new Int32Array(0)
  /** тик последней показанной цифры по каждой цели */
  private lastNumberTick = new Int32Array(0)

  /** тик последнего обработанного события — для троттлинга значков */
  private curTick = 0

  private scale: number
  private offsetX = 0
  private offsetY = 0
  /** цели камеры — к ним плавно едут текущие значения */
  private tScale = 1
  private tOffsetX = 0
  private tOffsetY = 0
  private baseScale = 1

  constructor(private readonly renderer: Renderer, private readonly opts: ViewOptions) {
    this.atlas = buildAtlas(renderer)
    this.scale = opts.scale ?? 1
    // Порядок слоёв фиксирован: юниты -> полоски -> эффекты.
    // Группировка по слоям, а не по юнитам, держит батчинг: смешивать спрайты
    // разных типов означает рвать батч на каждом юните.
    this.stage.addChild(this.unitLayer, this.barLayer, this.fxLayer)
  }

  /** Подготовить спрайты под конкретный бой. Вызывается один раз на бой. */
  bind(session: BattleSession): void {
    this.unitLayer.removeChildren()
    this.barLayer.removeChildren()
    this.clearNumbers()
    this.clearMarks()

    const w = session.world
    const n = w.count
    this.sprites = new Array<Sprite>(n)
    this.bars = new Array<Sprite>(n)
    this.barBg = new Array<Sprite>(n)
    this.prevX = new Float32Array(n)
    this.prevY = new Float32Array(n)
    this.curX = new Float32Array(n)
    this.curY = new Float32Array(n)
    this.lastNumberTick = new Int32Array(n).fill(-999)
    this.lastMarkTick = new Int32Array(n).fill(-999)

    // Размер канваса берём АКТУАЛЬНЫЙ, а не тот, что был при создании вида.
    // Первая версия считала масштаб один раз в конструкторе — до того, как
    // контейнер получил реальную высоту, и поле сжималось в угол экрана.
    const sw = this.viewW()
    const sh2 = this.viewH()

    const geo = w.geometry
    const laneSpan = (geo.lanes - 1) * geo.laneHeight
    const worldW = geo.fieldWidth
    const worldH = laneSpan + geo.laneHeight * 1.2
    this.baseScale = Math.min(sw / worldW, sh2 / worldH)
    this.scale = this.baseScale
    this.offsetX = (sw - worldW * this.scale) / 2
    this.offsetY = sh2 / 2
    this.tScale = this.scale
    this.tOffsetX = this.offsetX
    this.tOffsetY = this.offsetY

    for (let id = 0; id < n; id++) {
      const team = w.team[id]!
      const cls = w.cls[id]!
      const isHero = w.isHero[id]! === 1
      const sp = new Sprite(isHero ? this.atlas.hero[team]![cls]! : this.atlas.minion[team]![cls]!)
      sp.anchor.set(0.5)
      // Масштаб спрайта привязан к масштабу поля, иначе на широком экране
      // юниты выглядят точками, а на узком — залипают друг в друга
      const base = (isHero ? 30 : 17) * Math.min(1.35, Math.max(0.55, this.scale))
      sp.width = base
      sp.height = base
      this.sprites[id] = sp
      this.unitLayer.addChild(sp)

      const bg = new Sprite(this.atlas.pixel)
      bg.anchor.set(0, 0.5)
      bg.tint = 0x1a1d22
      bg.height = isHero ? 3 : 2
      this.barBg[id] = bg

      const bar = new Sprite(this.atlas.pixel)
      bar.anchor.set(0, 0.5)
      bar.tint = TEAM_COLOR[team]!
      bar.height = isHero ? 3 : 2
      this.bars[id] = bar
      // Полоски только у героев: 840 полосок — это шум, а не информация.
      // У миньонов состояние читается тем, что их становится меньше.
      if (isHero) this.barLayer.addChild(bg, bar)

      const x = w.px[id]! >> WX_SHIFT
      const y = w.py[id]! >> WX_SHIFT
      this.prevX[id] = x
      this.prevY[id] = y
      this.curX[id] = x
      this.curY[id] = y
    }
  }

  private viewW(): number {
    return this.renderer.screen.width || this.opts.width
  }

  private viewH(): number {
    return this.renderer.screen.height || this.opts.height
  }

  /** Зафиксировать позиции после тика симуляции. */
  captureTick(w: World): void {
    this.prevX.set(this.curX)
    this.prevY.set(this.curY)
    for (let id = 0; id < w.count; id++) {
      this.curX[id] = w.px[id]! >> WX_SHIFT
      this.curY[id] = w.py[id]! >> WX_SHIFT
    }
  }

  /** Прочитать события тика и породить всплывающие цифры. */
  consumeEvents(session: BattleSession): void {
    const ev = session.events
    const w = session.world
    this.curTick = w.tick
    for (let i = 0; i < ev.count; i++) {
      const o = i * EVENT_STRIDE
      const kind = ev.data[o]!
      const target = ev.data[o + 2]!
      const value = ev.data[o + 3]!
      const flags = ev.data[o + 4]!

      if (kind === EventKind.Damage) {
        // Только герои и крупные удары — иначе экран заливает цифрами
        const isHero = w.isHero[target]! === 1
        if (!isHero && (flags & (EventFlag.Crit | EventFlag.Counter)) === 0) continue
        if (w.tick - this.lastNumberTick[target]! < NUMBER_COOLDOWN_TICKS) continue
        this.lastNumberTick[target] = w.tick
        let color: number = DMG_COLOR.normal
        if (flags & EventFlag.Counter) color = DMG_COLOR.counter
        if (flags & EventFlag.Crit) color = DMG_COLOR.crit
        if (flags & EventFlag.Splash) color = DMG_COLOR.splash
        this.spawnNumber(this.curX[target]!, this.curY[target]!, `${value}`, color, !!(flags & EventFlag.Crit))
        if (flags & EventFlag.Counter) this.spawnMark(target, COUNTER_MARK, DMG_COLOR.counter)
      } else if (kind === EventKind.Blocked) {
        // Показываем только у героев: 840 щитов — это шум
        if (w.isHero[target]! === 1) this.spawnMark(target, BLOCK_MARK, 0x9ec5ff)
      } else if (kind === EventKind.Heal && w.isHero[target]! === 1) {
        if (w.tick - this.lastNumberTick[target]! < NUMBER_COOLDOWN_TICKS) continue
        this.lastNumberTick[target] = w.tick
        this.spawnNumber(this.curX[target]!, this.curY[target]!, `+${value}`, DMG_COLOR.heal, false)
      }
    }
  }

  /**
   * Автокадрирование.
   *
   * Армии стартуют по краям поля и сходятся к центру. Статичная камера на всю
   * карту означает, что 80% экрана занимает пустота, а собственно бой идёт в
   * мелком комке посередине — прямо против столпа 2.
   *
   * Камера держит в кадре всех живых с запасом и едет плавно, иначе она
   * дёргается на каждой смерти. На симуляцию не влияет никак: это чистая
   * функция от состояния, выполняется после тика.
   */
  private updateCamera(w: World, dt: number): void {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < w.aliveCount; i++) {
      const id = w.alive[i]!
      const x = this.curX[id]!
      const y = this.curY[id]!
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (!Number.isFinite(minX)) return

    const pad = 90
    const bw = Math.max(220, maxX - minX + pad * 2)
    const bh = Math.max(180, maxY - minY + pad * 2)
    const sw = this.viewW()
    const sh2 = this.viewH()

    // Не приближаем сильнее чем в 2.2 раза от обзора всей карты: иначе
    // в конце боя, когда остаётся пара юнитов, экран уезжает в макро.
    this.tScale = Math.min(sw / bw, sh2 / bh, this.baseScale * 2.2)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    this.tOffsetX = sw / 2 - cx * this.tScale
    this.tOffsetY = sh2 / 2 - cy * this.tScale

    // Экспоненциальное сглаживание, независимое от частоты кадров
    const k = 1 - Math.exp(-dt * 3.5)
    this.scale += (this.tScale - this.scale) * k
    this.offsetX += (this.tOffsetX - this.offsetX) * k
    this.offsetY += (this.tOffsetY - this.offsetY) * k
  }

  /** Нарисовать кадр. alpha — доля прошедшая от текущего тика к следующему. */
  render(session: BattleSession, alpha: number, dt: number): void {
    const w = session.world
    this.updateCamera(w, dt)
    const s = this.scale
    const spriteK = Math.min(1.6, Math.max(0.6, s / this.baseScale))
    for (let id = 0; id < w.count; id++) {
      const sp = this.sprites[id]!
      if (w.hp[id]! <= 0) {
        if (sp.visible) sp.visible = false
        const b = this.bars[id]!
        if (b.visible) { b.visible = false; this.barBg[id]!.visible = false }
        continue
      }
      const x = this.offsetX + (this.prevX[id]! + (this.curX[id]! - this.prevX[id]!) * alpha) * s
      const y = this.offsetY + (this.prevY[id]! + (this.curY[id]! - this.prevY[id]!) * alpha) * s
      sp.position.set(x, y)
      sp.scale.set((sp.texture.width ? 1 : 1))
      const target = (w.isHero[id]! === 1 ? 30 : 17) * spriteK * Math.min(1.35, Math.max(0.55, this.baseScale))
      if (Math.abs(sp.width - target) > 0.5) { sp.width = target; sp.height = target }

      if (w.isHero[id]! === 1) {
        const pct = w.hp[id]! / w.hpMax[id]!
        const bg = this.barBg[id]!
        const bar = this.bars[id]!
        const bw = 30 * spriteK * Math.min(1.35, Math.max(0.55, this.baseScale))
        bg.position.set(x - bw / 2, y - 16)
        bg.width = bw
        bar.position.set(x - bw / 2, y - 16)
        bar.width = bw * pct
        // Мораль сломана — герой мёртв, отряд просел: гасим цвет полоски отряда
        bar.tint = pct > 0.35 ? TEAM_COLOR[w.team[id]!]! : 0xd05050
      }
    }
    this.updateNumbers(dt)
    this.updateMarks(dt)
  }

  private spawnNumber(wx: number, wy: number, label: string, color: number, big: boolean): void {
    const fn = this.pool.pop() ?? this.createNumber()
    fn.text.text = label
    fn.text.style.fill = color
    fn.text.style.fontSize = big ? 15 : 11
    fn.text.position.set(this.offsetX + wx * this.scale, this.offsetY + wy * this.scale - 10)
    fn.text.alpha = 1
    fn.text.visible = true
    fn.life = big ? 1.1 : 0.8
    fn.vy = big ? -34 : -24
    this.fxLayer.addChild(fn.text)
    this.active.push(fn)
  }

  /** Значок над юнитом. Не чаще раза в 20 тиков на цель. */
  private spawnMark(target: number, glyph: string, color: number): void {
    if (this.curTick - this.lastMarkTick[target]! < 20) return
    this.lastMarkTick[target] = this.curTick
    const m = this.markPool.pop() ?? {
      sprite: new Text({
        text: '',
        style: new TextStyle({
          fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
          fill: 0xffffff, stroke: { color: 0x000000, width: 3 },
        }),
      }),
      life: 0,
      target: -1,
    }
    m.sprite.anchor.set(0.5)
    m.sprite.text = glyph
    m.sprite.style.fill = color
    m.sprite.alpha = 1
    m.sprite.visible = true
    m.life = 0.55
    m.target = target
    this.fxLayer.addChild(m.sprite)
    this.markActive.push(m)
  }

  private updateMarks(dt: number): void {
    for (let i = this.markActive.length - 1; i >= 0; i--) {
      const m = this.markActive[i]!
      m.life -= dt
      if (m.life <= 0) {
        m.sprite.visible = false
        this.fxLayer.removeChild(m.sprite)
        this.markActive.splice(i, 1)
        this.markPool.push(m)
        continue
      }
      // Значок ездит за целью, а не висит там, где событие произошло
      const id = m.target
      m.sprite.position.set(
        this.offsetX + this.curX[id]! * this.scale,
        this.offsetY + this.curY[id]! * this.scale - 22,
      )
      m.sprite.alpha = Math.min(1, m.life * 3)
    }
  }

  private createNumber(): FloatingNumber {
    const t = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      }),
    })
    t.anchor.set(0.5)
    return { text: t, life: 0, vy: 0 }
  }

  private updateNumbers(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fn = this.active[i]!
      fn.life -= dt
      if (fn.life <= 0) {
        fn.text.visible = false
        this.fxLayer.removeChild(fn.text)
        this.active.splice(i, 1)
        // Пул: ноль аллокаций на кадр даже при сотнях цифр
        this.pool.push(fn)
        continue
      }
      fn.text.y += fn.vy * dt
      fn.text.alpha = Math.min(1, fn.life * 2.5)
    }
  }

  private clearMarks(): void {
    for (const m of this.markActive) {
      m.sprite.visible = false
      this.fxLayer.removeChild(m.sprite)
      this.markPool.push(m)
    }
    this.markActive.length = 0
  }

  private clearNumbers(): void {
    for (const fn of this.active) {
      fn.text.visible = false
      this.fxLayer.removeChild(fn.text)
      this.pool.push(fn)
    }
    this.active.length = 0
  }

  /** Подпись класса для легенды и отчёта. */
  static className(cls: number): string {
    return CLASS_PROFILES[cls]?.name ?? '?'
  }
}
