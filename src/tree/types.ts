export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

/** Props of TreeView.vue (contract for the TREE builder and its callers). */
export interface TreeViewProps {
  /** Number of leaves (= distinct days with entries). 0 renders the seed state. */
  leaves: number
  /** Tree shape seed, settings.treeSeed (1..999). */
  seed: number
  /** Palette season; 'auto' derives it from the current month. */
  season?: Season | 'auto'
  /** Sky and light; 'auto' derives it from the clock. */
  time?: TimeOfDay | 'auto'
  /** Rendered width in px (height follows the 360:440 world aspect). */
  size?: number
  /** Show the "welcome back" bird. */
  bird?: boolean
  /** Highlight the newest leaf (white outline + pop). */
  fresh?: boolean
}
