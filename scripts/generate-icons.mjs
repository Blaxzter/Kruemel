// Generates the PWA icons in public/ from one SVG source.
// Run with `pnpm icons` after changing the artwork. Output files are committed.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url))
const VIOLET = '#6B4EFF'
const LEAF_FILL = '#9BE0B0'

// Tree pill glyph from the design (24x24 viewBox), white stroke on violet.
const glyph = (scale, offset) => `
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 21v-6"/>
    <path d="M12 15c-4.5 0-7-2.5-7-6a7 7 0 0 1 14 0c0 3.5-2.5 6-7 6z" fill="${LEAF_FILL}"/>
    <path d="M12 15l-2.5-3M12 13l3-3"/>
  </g>`

/** Rounded-square icon with transparent corners (favicon, "any" purpose). */
const roundedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="${VIOLET}"/>${glyph(13, 100)}
</svg>
`

/** Full-bleed square; glyph kept inside the maskable safe zone (inner 80% circle). */
const fullBleedSvg = (scale) => {
  const offset = (512 - 24 * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${VIOLET}"/>${glyph(scale, offset)}
</svg>`
}

const render = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(PUBLIC_DIR + file)

await writeFile(PUBLIC_DIR + 'favicon.svg', roundedSvg)
await render(roundedSvg, 192, 'pwa-192x192.png')
await render(roundedSvg, 512, 'pwa-512x512.png')
await render(fullBleedSvg(9), 512, 'maskable-512x512.png')
await render(fullBleedSvg(11), 180, 'apple-touch-icon.png')
console.log('Icons written to public/')
