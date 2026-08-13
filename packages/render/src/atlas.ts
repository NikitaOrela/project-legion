/**
 * Плейсхолдер-графика: по одной текстуре на класс и сторону.
 *
 * ГЛАВНОЕ ТРЕБОВАНИЕ — СИЛУЭТ СООБЩАЕТ РОЛЬ (02_GDD §8). На экране до 840
 * юнитов высотой 8–14 пикселей. Если класс не читается по форме, игрок получает
 * «все бои выглядят одинаково» — топ-1 претензию к оригиналу.
 *
 * Провал Warcraft Rumble задокументирован: юнит-танк, который «looks small»,
 * сломал онбординг. Contrast — Clash Royale, где Knight читается силуэтом сразу.
 *
 * ЦВЕТ КОДИРУЕТ СТОРОНУ, ФОРМА — КЛАСС (02_GDD §8): своя сторона холодная,
 * враг тёплый, внутри стороны все классы одного оттенка. Так игрок сначала
 * видит «где чьи», и только потом разбирает состав.
 *
 * Текстуры рисуются один раз в RenderTexture при старте, дальше это обычные
 * спрайты из одного источника — значит батчинг не рвётся.
 */

import { Graphics, type Renderer, RenderTexture, type Texture, Container } from 'pixi.js'
import { UnitClass } from '@mw/sim'

/** Своя сторона — холодная, враг — тёплая (02_GDD §8). */
export const TEAM_COLOR = [0x5b9bd5, 0xe06c4f] as const
export const TEAM_COLOR_HERO = [0x9fd0ff, 0xffb08a] as const

const SIZE = 24 // сторона текстуры в пикселях, дальше масштабируется

/**
 * Форма на класс. Рисуется в квадрате SIZE×SIZE.
 * Каждая форма подобрана так, чтобы отличаться от остальных ОЧЕРТАНИЕМ,
 * а не деталями: детали на 10 пикселях не видны.
 */
function drawShape(g: Graphics, cls: number, color: number): void {
  const s = SIZE
  const h = s / 2
  switch (cls) {
    case UnitClass.Infantry:
      // Компактный квадрат — базовая, «нейтральная» форма
      g.rect(s * 0.22, s * 0.22, s * 0.56, s * 0.56).fill(color)
      break
    case UnitClass.Pikeman:
      // Высокий и узкий + остриё вверх: длина оружия читается как высота
      g.rect(s * 0.38, s * 0.3, s * 0.24, s * 0.55).fill(color)
      g.poly([h, s * 0.05, s * 0.66, s * 0.32, s * 0.34, s * 0.32]).fill(color)
      break
    case UnitClass.Paviser:
      // Широкий щит с плечами — самая «толстая» форма в наборе
      g.poly([
        s * 0.16, s * 0.26, s * 0.84, s * 0.26,
        s * 0.84, s * 0.6, h, s * 0.88, s * 0.16, s * 0.6,
      ]).fill(color)
      break
    case UnitClass.Cavalry:
      // Вытянутая по горизонтали: скорость читается как направленность
      g.roundRect(s * 0.08, s * 0.34, s * 0.84, s * 0.34, s * 0.14).fill(color)
      g.poly([s * 0.86, s * 0.28, s * 0.99, h, s * 0.86, s * 0.72]).fill(color)
      break
    case UnitClass.Archer:
      // Треугольник вверх — «стрела»
      g.poly([h, s * 0.14, s * 0.82, s * 0.82, s * 0.18, s * 0.82]).fill(color)
      break
    case UnitClass.Arbalist:
      // Тот же треугольник, но с поперечиной: родственный класс, отличимый
      g.poly([h, s * 0.2, s * 0.82, s * 0.8, s * 0.18, s * 0.8]).fill(color)
      g.rect(s * 0.1, s * 0.44, s * 0.8, s * 0.13).fill(color)
      break
    case UnitClass.Mage:
      // Ромб — единственная форма на диагоналях
      g.poly([h, s * 0.08, s * 0.9, h, h, s * 0.92, s * 0.1, h]).fill(color)
      break
    case UnitClass.Healer:
      // Крест — читается как «поддержка» без обучения
      g.rect(s * 0.38, s * 0.12, s * 0.24, s * 0.76).fill(color)
      g.rect(s * 0.12, s * 0.38, s * 0.76, s * 0.24).fill(color)
      break
    default:
      g.circle(h, h, s * 0.3).fill(color)
  }
}

export interface UnitAtlas {
  /** [team][class] — миньоны */
  minion: Texture[][]
  /** [team][class] — герои, крупнее и светлее */
  hero: Texture[][]
  /** белый пиксель для полосок HP и подложек */
  pixel: Texture
}

export function buildAtlas(renderer: Renderer): UnitAtlas {
  const make = (cls: number, color: number, outline: boolean): Texture => {
    const g = new Graphics()
    if (outline) {
      // Обводка героя: тот же силуэт крупнее и светлее — герой узнаётся
      // как «тот же класс, но главный», а не как отдельный юнит
      drawShape(g, cls, 0x101418)
    }
    drawShape(g, cls, color)
    const rt = RenderTexture.create({ width: SIZE, height: SIZE, antialias: true })
    renderer.render({ container: g, target: rt })
    g.destroy()
    return rt
  }

  const minion: Texture[][] = []
  const hero: Texture[][] = []
  for (let team = 0; team < 2; team++) {
    minion[team] = []
    hero[team] = []
    for (let cls = 0; cls < UnitClass.COUNT; cls++) {
      minion[team]![cls] = make(cls, TEAM_COLOR[team]!, false)
      hero[team]![cls] = make(cls, TEAM_COLOR_HERO[team]!, true)
    }
  }

  const pg = new Graphics().rect(0, 0, 8, 8).fill(0xffffff)
  const pixel = RenderTexture.create({ width: 8, height: 8 })
  renderer.render({ container: pg, target: pixel })
  pg.destroy()

  return { minion, hero, pixel }
}

/** Легенда для UI: подпись и форма класса — нужна на экране формации. */
export function classSwatch(cls: number, team: number, size = 28): Container {
  const c = new Container()
  const g = new Graphics()
  drawShape(g, cls, TEAM_COLOR[team]!)
  g.scale.set(size / SIZE)
  c.addChild(g)
  return c
}
