export interface GridRow {
  id: string
  label: string
  dot: string
  /** One flag per column day: had an entry of this tile. */
  cells: boolean[]
}

export interface GridColumn {
  key: string
  label: string
  isToday: boolean
}

export interface MosaicDay {
  key: string
  day: number
  isToday: boolean
  isFuture: boolean
  /** Dot colours of the tiles logged that day. */
  dots: string[]
  /** Accessible description, e.g. "3. Oktober: Obst, Brot". */
  label: string
}
