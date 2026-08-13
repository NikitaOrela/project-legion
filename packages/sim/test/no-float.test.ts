/**
 * Барьер детерминизма (03_TECH §8: «30 строк, которые спасут недели отладки»).
 *
 * Реализован тестом, а не ESLint-плагином: тест уже гоняется в CI, не требует
 * отдельной инфраструктуры и падает с внятным сообщением.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir).sort()) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (e.endsWith('.ts')) out.push(p)
  }
  return out
}

interface Rule {
  name: string
  re: RegExp
  why: string
  /** файлы, где нарушение разрешено осознанно */
  allow?: RegExp
}

const RULES: Rule[] = [
  { name: 'Math.random', re: /\bMath\s*\.\s*random\b/, why: 'недетерминирован — только seeded PCG32 из rng.ts' },
  { name: 'Date', re: /\bnew\s+Date\b|\bDate\s*\.\s*now\b/, why: 'время не входит в симуляцию' },
  { name: 'performance', re: /\bperformance\s*\.\s*now\b/, why: 'время не входит в симуляцию' },
  { name: 'Math.sin/cos/tan', re: /\bMath\s*\.\s*(sin|cos|tan|asin|acos|atan|atan2)\b/, why: 'реализации расходятся между движками — только таблицы из trig.ts', allow: /trig-table\.ts$/ },
  { name: 'Math.sqrt/pow/exp/log', re: /\bMath\s*\.\s*(sqrt|pow|exp|log|log2|log10|cbrt|hypot)\b/, why: 'implementation-approximated — только isqrt/fxInvSqrt' },
  { name: 'async/await', re: /\basync\s+function\b|\bawait\s+/, why: 'порядок выполнения недетерминирован' },
  { name: 'Promise', re: /\bnew\s+Promise\b|\bPromise\s*\./, why: 'порядок выполнения недетерминирован' },
  { name: 'setTimeout/setInterval', re: /\bset(Timeout|Interval|Immediate)\b/, why: 'таймеры вне симуляции' },
  { name: 'for...in', re: /\bfor\s*\([^)]*\bin\b[^)]*\)/, why: 'порядок ключей не гарантирован — обходи dense-массив alive' },
  { name: 'генератор', re: /function\s*\*/, why: 'yield имеет высокие накладные расходы в горячем цикле' },
  { name: 'import из другого пакета', re: /from\s+['"]@mw\//, why: 'packages/sim не зависит ни от чего' },
  { name: 'браузерные/Node API', re: /\b(window|document|localStorage|fetch|require\()/, why: 'ядро должно работать в Node, в воркере и на сервере' },
]

describe('Барьер детерминизма в packages/sim', () => {
  const files = walk(SRC)

  it('находит файлы для проверки', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  for (const rule of RULES) {
    it(`запрещено: ${rule.name}`, () => {
      const hits: string[] = []
      for (const f of files) {
        if (rule.allow?.test(f)) continue
        const lines = readFileSync(f, 'utf8').split('\n')
        lines.forEach((line, i) => {
          // комментарии не считаются
          const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
          if (rule.re.test(code)) {
            hits.push(`${relative(SRC, f)}:${i + 1}  ${line.trim()}`)
          }
        })
      }
      expect(hits, `\n${rule.why}\n\n${hits.join('\n')}\n`).toEqual([])
    })
  }

  it('package.json не имеет зависимостей', () => {
    const pkg = JSON.parse(
      readFileSync(join(SRC, '..', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> }
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([])
  })
})
