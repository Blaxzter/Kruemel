import type { IconName } from '@/domain/types'

export type IconShape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }

const p = (d: string): IconShape => ({ kind: 'path', d })
const c = (cx: number, cy: number, r: number): IconShape => ({ kind: 'circle', cx, cy, r })

/**
 * Line icons copied from the design (24x24 viewBox, stroke only, stroke-width 1.8).
 * Builtin tile icons use the detailed variants from Main.dc.html; noodles, egg and
 * pizza come from NewTile.dc.html.
 */
export const TILE_ICON_SHAPES: Readonly<Record<IconName, readonly IconShape[]>> = {
  apple: [
    p('M12 7.5c-2-1.5-7-1.2-7 4 0 4.2 3.2 8.5 5.5 8.5.8 0 1-.4 1.5-.4s.7.4 1.5.4c2.3 0 5.5-4.3 5.5-8.5 0-5.2-5-5.5-7-4z'),
    p('M12 7.5c0-2 .8-3.5 2.8-4.5'),
  ],
  carrot: [
    p('M15.5 8.5c-1.4-1.4-3.4-1.2-4.6 0L4.2 19.2c-.6.6-.0 1.2.6.6L15.5 13c1.2-1.2 1.4-3.2 0-4.5z'),
    p('M15.5 8.5L19 5M15 8l.5-4.5M16 9l4.5-.5'),
    p('M9 13l1.5 1.5M7 15.5l1.2 1.2'),
  ],
  bread: [
    p('M6 11.5A3.2 3.2 0 0 1 7 5h10a3.2 3.2 0 0 1 1 6.5V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z'),
    p('M10 9l-1.5 2M14.5 9L13 11'),
  ],
  bowl: [
    p('M3 12h18c0 4.8-4 8-9 8s-9-3.2-9-8z'),
    p('M8.5 9c-.6-1 .6-2 0-3.5M12 9c-.6-1 .6-2 0-3.5M15.5 9c-.6-1 .6-2 0-3.5'),
  ],
  noodles: [
    p('M3 12h18c0 4.8-4 8-9 8s-9-3.2-9-8z'),
    p('M7 12c1-3 3-3 4 0M11 12c1-3 3-3 4 0M15 12c.8-2 2-2.4 3-1'),
    p('M17 3l-4 9'),
  ],
  egg: [p('M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3z')],
  pizza: [
    p('M12 21L3.5 5.5C8.5 2.8 15.5 2.8 20.5 5.5z'),
    p('M5 8.2c4.5-2 9.5-2 14 0'),
    c(11, 11, 1),
    c(13.5, 14.5, 1),
  ],
  cookie: [c(12, 12, 8.5), c(9, 9.5, 1), c(14.5, 8.5, 0.8), c(14, 14, 1.1), c(9, 14.8, 0.8)],
  milk: [
    p('M8 3h8v3l2 3v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9l2-3z'),
    p('M6 9.5h12'),
    p('M9.5 14h5'),
  ],
  cup: [
    p('M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z'),
    p('M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17'),
    p('M9 3.5c-.5.8.5 1.5 0 2.5M13 3.5c-.5.8.5 1.5 0 2.5'),
  ],
  snack: [p('M7 3h10l-1.2 3 1.2 12-1.2 3H8.2L7 18 8.2 6z'), p('M9.5 10.5h5M10 14h4')],
}
