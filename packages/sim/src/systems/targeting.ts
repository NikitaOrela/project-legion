/**
 * Выбор цели.
 *
 * ДВА УРОВНЯ, И ЭТО ВАЖНО:
 *  1. Структурный фильтр — лейновая изоляция (DECISIONS.md ADR-004).
 *     Melee ищет только в своём лейне; из лейна выходит, лишь когда тот зачищен.
 *     Ranged бьёт по кругу сквозь лейны.
 *     Без этого пустой лейн не делает НИЧЕГО, и главный тактический приём
 *     оригинала («Top Shield» — пустые лейны заставляют врага бежать через
 *     всё поле) исчезает.
 *  2. Внутри разрешённого множества — взвешенный score из 02_GDD §3.5.
 *
 * ИНВАРИАНТ ДЕТЕРМИНИЗМА: в оригинале при равных дистанциях приоритет
 * геометрический («AI goes down before up»). Мы сравниваем score, а при его
 * равенстве — МЕНЬШИЙ entityId. Тай-брейкер обязателен: без него равные
 * расстояния дают недетерминированный выбор.
 *
 * Ретаргет раз в RETARGET_PERIOD тиков, фаза разнесена по entityId — иначе
 * все 840 юнитов ретаргетятся в один тик и дают спайк в p99.
 */

import type { World } from '../world.js'
import type { EventBuffer } from '../events.js'
import { EventKind, pushEvent } from '../events.js'
import type { SpatialHash } from '../spatial.js'
import { cellRange } from '../spatial.js'
import { distSqUnits } from '../fixed.js'
import {
  BLOCK_RADIUS,
  BLOCK_TIMEOUT_TICKS,
  CLASS_PROFILES,
  MAX_ATTACKERS_MELEE,
  MAX_ATTACKERS_RANGED,
  NO_TARGET,
  PREF_TARGET,
  RETARGET_PERIOD,
  UnitClass,
  W_PREF,
} from '../types.js'

const W_HERO = 15
const W_LOWHP = 20

const range4 = new Int32Array(4)

/**
 * Радиус поиска цели.
 *
 * Намеренно небольшой: сближение обеспечивает фаза Advance (02_GDD §3.4),
 * а не гигантский радиус поиска. Большой радиус означал бы скан сотни ячеек
 * пространственного хэша на каждый юнит — прямой удар по бюджету 4 мс.
 */
function searchRadius(cls: number): number {
  const p = CLASS_PROFILES[cls]!
  return p.laneBound ? 260 : p.range + 60
}

/**
 * Сколько живых юнитов сейчас держат целью каждую сущность.
 *
 * Модульный буфер, а не поле World: он полностью перестраивается в начале
 * каждого тика из w.target, поэтому не является состоянием симуляции и не
 * участвует в хэшировании. Пересборка с нуля — обязательна: инкрементальное
 * ведение счётчиков накопило бы расхождение при смертях.
 */
let attackerCount = new Int32Array(0)

function rebuildAttackerCount(w: World): void {
  if (attackerCount.length < w.count) attackerCount = new Int32Array(w.count)
  else attackerCount.fill(0, 0, w.count)
  for (let i = 0; i < w.aliveCount; i++) {
    const t = w.target[w.alive[i]!]!
    if (t !== NO_TARGET) attackerCount[t] = attackerCount[t]! + 1
  }
}

function attackerCap(cls: number): number {
  return CLASS_PROFILES[cls]!.laneBound ? MAX_ATTACKERS_MELEE : MAX_ATTACKERS_RANGED
}

export function runTargeting(w: World, sh: SpatialHash, ev: EventBuffer): void {
  const phase = w.tick % RETARGET_PERIOD
  rebuildAttackerCount(w)

  for (let i = 0; i < w.aliveCount; i++) {
    const self = w.alive[i]!

    // Блокировка павизой держит цель принудительно, пока павиза жива
    // и не вышел таймаут «переагра» (02_GDD §3.6)
    const holder = w.blockedBy[self]!
    if (holder >= 0) {
      if (w.hp[holder]! > 0 && w.blockTimer[self]! > 0) {
        w.blockTimer[self]!--
        w.target[self] = holder
        continue
      }
      w.blockedBy[self] = -1
      w.blockTimer[self] = 0
    }

    // Раскидка ретаргета по кадрам
    if (self % RETARGET_PERIOD !== phase) {
      // цель могла умереть между ретаргетами — сбрасываем сразу
      const t = w.target[self]!
      if (t !== NO_TARGET && w.hp[t]! <= 0) {
        w.target[self] = NO_TARGET
        attackerCount[t] = attackerCount[t]! - 1
      }
      if (w.target[self] !== NO_TARGET) continue
    }

    const prof = CLASS_PROFILES[w.cls[self]!]!
    if (prof.isHealer) {
      w.target[self] = pickHealTarget(w, sh, self)
      continue
    }

    // Освобождаем прежнюю цель до выбора новой: иначе юнит конкурирует сам
    // с собой за место и не может переподтвердить текущую цель, когда та
    // заполнена ровно до предела.
    const prev = w.target[self]!
    if (prev !== NO_TARGET) attackerCount[prev] = attackerCount[prev]! - 1

    const t = pickTarget(w, sh, self)
    w.target[self] = t
    if (t !== NO_TARGET) attackerCount[t] = attackerCount[t]! + 1

    // Ближний бой залипает на павизе, если та рядом
    if (t !== NO_TARGET && prof.range <= 40) {
      const pav = findBlocker(w, sh, self)
      if (pav !== NO_TARGET && pav !== t) {
        const wasFree = w.blockedBy[self]! < 0
        // Блокировка перебивает выбор — переносим и счётчик атакующих.
        // Лимит фронта здесь намеренно НЕ проверяется: в том и смысл павизы,
        // что она собирает на себя больше врагов, чем обычный юнит.
        attackerCount[t] = attackerCount[t]! - 1
        attackerCount[pav] = attackerCount[pav]! + 1
        w.target[self] = pav
        w.blockedBy[self] = pav
        w.blockTimer[self] = BLOCK_TIMEOUT_TICKS
        // Событие только в момент залипания, не каждый тик: иначе рендер
        // будет мигать индикатором непрерывно
        if (wasFree) pushEvent(ev, EventKind.Blocked, pav, self, 0, 0)
      }
    }
  }
}

/**
 * Поиск вражеской павизы в радиусе блокировки.
 *
 * Смысл механики: павиза жертвует уроном ради удержания. Заблокированные враги
 * стоят на месте и превращаются в статичные мишени для своих дальних и магов.
 * Это единственная механика фазы 2, которая делает связку «стена + дальние»
 * сильнее суммы частей.
 */
function findBlocker(w: World, sh: SpatialHash, self: number): number {
  const sx = w.px[self]!
  const sy = w.py[self]!
  const myTeam = w.team[self]!
  cellRange(sh, sx, sy, BLOCK_RADIUS, range4)
  let best = NO_TARGET
  let bestD2 = BLOCK_RADIUS * BLOCK_RADIUS + 1
  for (let cy = range4[1]!; cy <= range4[3]!; cy++) {
    const rowBase = cy * sh.cols
    for (let cx = range4[0]!; cx <= range4[2]!; cx++) {
      const c = rowBase + cx
      const end = sh.cellStart[c + 1]!
      for (let k = sh.cellStart[c]!; k < end; k++) {
        const other = sh.dense[k]!
        if (w.team[other]! === myTeam || w.hp[other]! <= 0) continue
        if (!CLASS_PROFILES[w.cls[other]!]!.isBlocker) continue
        const d2 = distSqUnits(sx, sy, w.px[other]!, w.py[other]!)
        // тай-брейкер по entityId — иначе равные дистанции недетерминированы
        if (d2 < bestD2 || (d2 === bestD2 && other < best)) {
          bestD2 = d2
          best = other
        }
      }
    }
  }
  return best
}

/** Лекарь целится в союзника с наименьшей долей HP (02_GDD §3.5). */
function pickHealTarget(w: World, sh: SpatialHash, self: number): number {
  const prof = CLASS_PROFILES[w.cls[self]!]!
  const sx = w.px[self]!
  const sy = w.py[self]!
  const myTeam = w.team[self]!
  const r = prof.range
  cellRange(sh, sx, sy, r, range4)

  let best = NO_TARGET
  let bestPct = 101
  for (let cy = range4[1]!; cy <= range4[3]!; cy++) {
    const rowBase = cy * sh.cols
    for (let cx = range4[0]!; cx <= range4[2]!; cx++) {
      const c = rowBase + cx
      const end = sh.cellStart[c + 1]!
      for (let k = sh.cellStart[c]!; k < end; k++) {
        const other = sh.dense[k]!
        if (w.team[other]! !== myTeam || other === self) continue
        if (w.hp[other]! <= 0) continue
        if (distSqUnits(sx, sy, w.px[other]!, w.py[other]!) > r * r) continue
        const pct = ((w.hp[other]! * 100) / w.hpMax[other]!) | 0
        if (pct >= 100) continue
        if (pct < bestPct || (pct === bestPct && other < best)) {
          bestPct = pct
          best = other
        }
      }
    }
  }
  return best
}

function pickTarget(w: World, sh: SpatialHash, self: number): number {
  const cls = w.cls[self]!
  const prof = CLASS_PROFILES[cls]!
  const myTeam = w.team[self]!
  const myLane = w.lane[self]!
  const sx = w.px[self]!
  const sy = w.py[self]!
  const radius = searchRadius(cls)
  const cap = attackerCap(cls)

  cellRange(sh, sx, sy, radius, range4)
  const cx0 = range4[0]!
  const cy0 = range4[1]!
  const cx1 = range4[2]!
  const cy1 = range4[3]!

  let bestId = NO_TARGET
  let bestScore = -0x7fffffff
  // Проход 1 — только свой лейн (для laneBound). Проход 2 — весь радиус.
  let bestIdAnyLane = NO_TARGET
  let bestScoreAnyLane = -0x7fffffff
  // Для кавалерии: самая ДАЛЬНЯЯ цель за пределами своего лейна (см. ниже)
  let farId = NO_TARGET
  let farD2 = -1

  for (let cy = cy0; cy <= cy1; cy++) {
    const rowBase = cy * sh.cols
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = rowBase + cx
      const end = sh.cellStart[c + 1]!
      // dense внутри ячейки отсортирован по возрастанию entityId
      for (let k = sh.cellStart[c]!; k < end; k++) {
        const other = sh.dense[k]!
        if (w.team[other]! === myTeam) continue
        if (w.hp[other]! <= 0) continue

        // Фронт занят — цель не берём. Это и есть переход от квадратичного
        // закона Ланчестера к линейному, см. MAX_ATTACKERS_* в types.ts.
        if (attackerCount[other]! >= cap) continue

        const d2 = distSqUnits(sx, sy, w.px[other]!, w.py[other]!)
        if (d2 > radius * radius) continue

        const score = scoreTarget(w, self, other, d2, prof.wDist)

        if (
          score > bestScoreAnyLane ||
          (score === bestScoreAnyLane && other < bestIdAnyLane)
        ) {
          bestScoreAnyLane = score
          bestIdAnyLane = other
        }

        if (w.lane[other]! === myLane) {
          if (score > bestScore || (score === bestScore && other < bestId)) {
            bestScore = score
            bestId = other
          }
        } else if (d2 > farD2 || (d2 === farD2 && other < farId)) {
          farD2 = d2
          farId = other
        }
      }
    }
  }

  // Лейновая изоляция: melee выходит из лейна только когда свой зачищен
  if (prof.laneBound) {
    if (bestId !== NO_TARGET) return bestId

    /*
     * Кавалерия с пустым лейном идёт в САМУЮ ДАЛЬНЮЮ цель чужого лейна, а не
     * в ближайшую. Дословное правило ремейка, и оно тут не косметика.
     *
     * Ближайшая цель означала бы, что конница при пустом лейне просто
     * сворачивает к соседнему фронту и вязнет в нём — то есть ведёт себя как
     * медленная пехота. Самая дальняя означает нырок в тыл: конница
     * проламывается сквозь строй к стрелкам и магам. Отсюда же берётся
     * ценность пустого лейна в расстановке — игрок ОТКРЫВАЕТ коридор
     * намеренно, чтобы запустить по нему свою конницу.
     */
    if (w.cls[self]! === UnitClass.Cavalry && farId !== NO_TARGET) return farId
    return bestIdAnyLane
  }
  return bestIdAnyLane
}

/**
 * Взвешенный score.
 *
 * ЧТО ИЗМЕНИЛОСЬ В ADR-009. Раньше здесь стоял общий для всех классов
 * взвешенный счёт, где вклад контра брался из плотной матрицы: каждый юнит
 * чуть-чуть предпочитал того, кого чуть-чуть лучше бьёт. На поле это
 * выглядело как отсутствие всякой логики — все дрались с ближайшим, потому
 * что дистанция перевешивала слабые предпочтения.
 *
 * Теперь у класса есть ОДНА названная добыча (PREF_TARGET), и вес у неё
 * большой. Копейщик не «слегка склонен» к кавалерии — он за ней идёт.
 * Игрок видит это на поле за один бой и может на это рассчитывать.
 *
 * Целочисленный: дистанция входит обратной величиной, масштабированной так,
 * чтобы веса были сравнимы.
 */
function scoreTarget(
  w: World,
  self: number,
  other: number,
  d2: number,
  wDist: number,
): number {
  const myCls = w.cls[self]!
  const otherCls = w.cls[other]!

  // 1/(1+d) в целых: 65536/(1+d). d берём из d2 грубо — точность не нужна,
  // важна монотонность и детерминизм.
  const dApprox = d2 >> 6
  const distTerm = ((65536 / (1 + dApprox)) | 0)
  const distScore = ((distTerm * wDist) / 65536) | 0

  const pref = PREF_TARGET[myCls]! === otherCls ? W_PREF : 0
  const hero = w.isHero[other]! === 1 ? W_HERO : 0
  const lowHp =
    ((w.hpMax[other]! - w.hp[other]!) * W_LOWHP) / (w.hpMax[other]! || 1) | 0

  return distScore + pref + hero + lowHp
}
