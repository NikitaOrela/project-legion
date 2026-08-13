/**
 * CLI: посмотреть бой в терминале.
 *   pnpm battle --seed=42 --frames=12
 */
import { runBattle, UnitClass } from '@mw/sim'
import type { Formation } from '@mw/sim'
import { renderAscii, summarize, topContributors } from './ascii.js'

function arg(name: string, def: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? Number(hit.split('=')[1]) : def
}

const seed = arg('seed', 42)
const frames = arg('frames', 10)

const A: Formation = {
  slots: [
    { lane: 0, rank: 0, cls: UnitClass.Infantry, level: 10, squad: 14 },
    { lane: 1, rank: 0, cls: UnitClass.Infantry, level: 10, squad: 14 },
    { lane: 2, rank: 0, cls: UnitClass.Infantry, level: 10, squad: 14 },
    { lane: 1, rank: 2, cls: UnitClass.Archer, level: 10, squad: 14 },
    { lane: 4, rank: 3, cls: UnitClass.Cavalry, level: 10, squad: 14 },
  ],
}
const B: Formation = {
  slots: [
    { lane: 1, rank: 0, cls: UnitClass.Infantry, level: 10, squad: 14 },
    { lane: 2, rank: 0, cls: UnitClass.Infantry, level: 10, squad: 14 },
    { lane: 3, rank: 1, cls: UnitClass.Archer, level: 10, squad: 14 },
    { lane: 4, rank: 1, cls: UnitClass.Archer, level: 10, squad: 14 },
    { lane: 0, rank: 3, cls: UnitClass.Cavalry, level: 10, squad: 14 },
  ],
}

const probe = runBattle(seed, A, B)
const every = Math.max(1, Math.floor(probe.ticks / frames))

console.log(`seed=${seed}  строчные = сторона A, ЗАГЛАВНЫЕ = сторона B`)
console.log(`i/I пехота · a/A лучники · c/C кавалерия · #@% герои\n`)

runBattle(seed, A, B, {
  onTick: (w, tick) => {
    if (tick % every !== 0) return
    console.log(`тик ${tick}  (${(tick / 30).toFixed(1)} с)`)
    console.log(renderAscii(w))
    console.log()
  },
})

console.log(summarize(probe))
console.log('\nТоп по вкладу:')
console.log(topContributors(probe))
console.log(`\nхеш боя: ${probe.hash.combined.toString(16)}`)
