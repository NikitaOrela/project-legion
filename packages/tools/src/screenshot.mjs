/**
 * Скриншот-тесты интерфейса.
 *
 * Гейт фазы 2 — «4 из 5 тестеров понимают, почему проиграли». Проверять это
 * глазами по описанию нельзя, поэтому прогон снимает три экрана и падает,
 * если в консоли появились ошибки страницы.
 *
 * Запуск: pnpm build в packages/app, затем vite preview и `node screenshot.mjs`.
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js'
const { chromium } = pw
const URL = process.env.MW_URL ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.MW_CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 })
const errs = []
p.on('console', m => { if (m.type()==='error') errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR: '+e.message))
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(600)
await p.screenshot({ path: 'shots/1-formation.png' })

// запустить бой
await p.click('#btn-fight')
await p.waitForTimeout(2500)
await p.screenshot({ path: 'shots/2-battle.png' })

// ускорение x4
await p.click('#sp4')
await p.waitForTimeout(2500)
await p.screenshot({ path: 'shots/3-battle-x4.png' })

// досчитать и посмотреть отчёт
await p.evaluate(() => globalThis.__mw.skipBattle())
await p.waitForTimeout(700)
await p.screenshot({ path: 'shots/4-result.png', fullPage: true })

const state = await p.evaluate(() => globalThis.__mw.state())
console.log('состояние:', JSON.stringify(state))
console.log('ошибки консоли:', errs.length ? errs.slice(0,5).join(' | ') : 'нет')
await b.close()
