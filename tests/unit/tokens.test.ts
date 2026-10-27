import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Primary buttons put --color-accent-ink on --color-accent; SPEC asks for >= 4.5:1 in both themes.
const css = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8')

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('theme tokens', () => {
  it('give primary buttons at least 4.5:1 in every theme block', () => {
    const accents = [...css.matchAll(/--color-accent:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!)
    const inks = [...css.matchAll(/--color-accent-ink:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!)
    expect(accents.length).toBe(3) // light, dark, system dark
    expect(inks.length).toBe(accents.length)
    accents.forEach((accent, i) => expect(contrast(inks[i]!, accent)).toBeGreaterThanOrEqual(4.5))
  })
})
