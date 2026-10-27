/** One day in the Week strip. */
export interface StripDay {
  key: string
  /** Short weekday ("Mi") or "Heute". */
  label: string
  /** Full name for the accessible label and detail title ("Mittwoch" or "Heute"). */
  name: string
  day: number
  isToday: boolean
  entryCount: number
  /** Dot colours (CSS values), at most 7. */
  dots: string[]
}

/** One entry chip in the day detail. */
export interface DetailItem {
  id: string
  label: string
  soft: string
}
