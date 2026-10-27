import { watch } from 'vue'
import { createI18n } from 'vue-i18n'

const SUPPORTED_LOCALES = ['de', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
const DEFAULT_LOCALE: AppLocale = 'de'

type MessageTree = { [key: string]: string | MessageTree }
type Messages = Record<AppLocale, Record<string, MessageTree>>

/**
 * Builds the message object from src/locales/<lang>/<ns>.json.
 * Each file becomes a namespace named after the file: de/today.json -> messages.de.today,
 * so components call t('today.title').
 */
export function buildMessages(files: Record<string, unknown>): Messages {
  const messages: Messages = { de: {}, en: {} }
  for (const [path, content] of Object.entries(files)) {
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path)
    if (!match) continue
    const [, lang, ns] = match
    if (!isSupportedLocale(lang) || !ns) continue
    messages[lang][ns] = content as MessageTree
  }
  return messages
}

export function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

const localeFiles = import.meta.glob<MessageTree>('./locales/*/*.json', { eager: true, import: 'default' })

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: buildMessages(localeFiles),
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
})

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
}

// Keep <html lang> in sync with the active locale (screen readers, hyphenation).
watch(
  i18n.global.locale,
  (locale) => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  },
  { immediate: true },
)
