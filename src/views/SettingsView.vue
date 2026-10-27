<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { useSettings } from '@/stores'
import type { Settings } from '@/domain/types'
import PageHeader from '@/components/settings/PageHeader.vue'
import SwitchRow from '@/components/settings/SwitchRow.vue'
import SegmentedRadio from '@/components/settings/SegmentedRadio.vue'
import DayStartSelect from '@/components/settings/DayStartSelect.vue'
import BackupSheet from '@/components/settings/BackupSheet.vue'
import InstallSheet from '@/components/settings/InstallSheet.vue'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'

const { t } = useI18n()
const router = useRouter()
const { settings, update } = useSettings()

/** Two-way binding to one settings field that writes through the store. */
function field<K extends keyof Settings>(key: K) {
  return computed<Settings[K]>({
    get: () => settings.value[key],
    set: (value) => void update({ [key]: value } as Partial<Settings>),
  })
}

const logMode = field('logMode')
const showWater = field('showWater')
const showTree = field('showTree')
const showColors = field('showColors')
const dayStartHour = field('dayStartHour')
const theme = field('theme')

// Switch the UI language right away; App.vue also follows settings.locale.
const locale = computed<Settings['locale']>({
  get: () => settings.value.locale,
  set: (value) => {
    setLocale(value)
    void update({ locale: value })
  },
})

const modes = computed(() => [
  { value: 'quick' as const, title: t('settings.mode.quick'), text: t('settings.mode.quickText') },
  { value: 'describe' as const, title: t('settings.mode.describe'), text: t('settings.mode.describeText') },
])

const themeOptions = computed(() => [
  { value: 'system' as const, label: t('settings.theme.system') },
  { value: 'light' as const, label: t('settings.theme.light') },
  { value: 'dark' as const, label: t('settings.theme.dark') },
])

// Language names stay in their own language.
const languageOptions = [
  { value: 'de' as const, label: 'Deutsch', lang: 'de' },
  { value: 'en' as const, label: 'English', lang: 'en' },
]

const backupOpen = ref(false)

// Installing stays possible after the intro: Chrome often offers its prompt only after some use.
const { mode: installMode, install } = useInstallPrompt()
const installOpen = ref(false)

async function onInstall(): Promise<void> {
  // With a prompt the browser shows its own dialog; otherwise the sheet explains the steps.
  if (installMode.value === 'prompt') await install()
  else installOpen.value = true
}

function replayIntro(): void {
  void router.push('/willkommen')
}
</script>

<template>
  <main class="settings">
    <PageHeader :title="t('settings.title')" back-to="/" :back-label="t('settings.back')" />

    <section class="card card--pad">
      <fieldset class="modes">
        <legend class="card__label">{{ t('settings.mode.label') }}</legend>
        <label v-for="mode in modes" :key="mode.value" class="mode">
          <input v-model="logMode" class="visually-hidden" type="radio" name="log-mode" :value="mode.value" />
          <span class="mode__text">
            <span class="mode__title">{{ mode.title }}</span>
            <span class="mode__hint">{{ mode.text }}</span>
          </span>
          <span class="mode__ring" aria-hidden="true"></span>
        </label>
      </fieldset>
    </section>

    <section class="card card--rows">
      <SwitchRow v-model="showWater" :title="t('settings.toggles.water')" :hint="t('settings.toggles.waterText')" />
      <SwitchRow v-model="showTree" :title="t('settings.toggles.tree')" :hint="t('settings.toggles.treeText')" />
      <SwitchRow v-model="showColors" :title="t('settings.toggles.colors')" :hint="t('settings.toggles.colorsText')" />
    </section>

    <section class="card card--rows day-start">
      <label for="settings-day-start" class="day-start__label">
        <span class="row-title">{{ t('settings.dayStart.label') }}</span>
        <span class="row-hint">{{ t('settings.dayStart.text') }}</span>
      </label>
      <DayStartSelect id="settings-day-start" v-model="dayStartHour" />
    </section>

    <section class="card card--pad card--stack">
      <SegmentedRadio v-model="theme" :legend="t('settings.theme.label')" :options="themeOptions" />
      <SegmentedRadio v-model="locale" :legend="t('settings.language.label')" :options="languageOptions" />
    </section>

    <section class="card card--links">
      <RouterLink to="/kacheln" class="link-row">
        <span>
          {{ t('settings.links.tiles') }} <span class="link-row__hint">· {{ t('settings.links.tilesText') }}</span>
        </span>
        <svg class="link-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg>
      </RouterLink>
      <button type="button" class="link-row" aria-haspopup="dialog" @click="backupOpen = true">
        <span>{{ t('settings.links.backup') }}</span>
        <svg class="link-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <button v-if="installMode !== 'installed'" type="button" class="link-row" data-testid="settings-install" :aria-haspopup="installMode === 'prompt' ? undefined : 'dialog'" @click="onInstall">
        <span>
          {{ t('settings.links.install') }} <span class="link-row__hint">· {{ t('settings.links.installText') }}</span>
        </span>
        <svg class="link-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <button type="button" class="link-row" @click="replayIntro">
        <span>{{ t('settings.links.intro') }}</span>
        <svg class="link-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </section>

    <p class="footer">{{ t('settings.footer') }}</p>

    <BackupSheet :open="backupOpen" @close="backupOpen = false" />
    <InstallSheet :open="installOpen" @close="installOpen = false" />
  </main>
</template>

<style scoped>
.settings {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.card--pad {
  padding: 14px;
}

.card--stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card--rows {
  padding: 6px 14px;
}

.card--links {
  padding: 4px 14px;
  display: flex;
  flex-direction: column;
}

.card__label {
  padding: 0;
  margin: 0 0 8px 4px;
  font-size: 13px;
  font-weight: 800;
  color: var(--color-muted);
}

.modes {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 2px solid var(--color-surface-chip);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  background: var(--color-card);
  cursor: pointer;
}

.mode:has(input:checked) {
  border-color: var(--color-accent);
  background: var(--color-surface-highlight);
}

.mode:has(input:focus-visible) {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.mode__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode__title {
  font-size: 16px;
  font-weight: 800;
}

.mode__hint {
  font-size: 13px;
  color: var(--color-muted);
}

.mode__ring {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border: 2px solid var(--color-line-dashed);
  background: var(--color-card);
}

.mode:has(input:checked) .mode__ring {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: inset 0 0 0 3px var(--color-card);
}

.day-start {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 60px;
}

.day-start__label {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-title {
  font-size: 15px;
  font-weight: 800;
}

.row-hint {
  font-size: 12px;
  color: var(--color-muted);
}

.link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 52px;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-ink);
  text-align: left;
  text-decoration: none;
  font: 800 15px var(--font-body);
}

.link-row + .link-row {
  border-top: 1px solid var(--color-surface-chip);
}

.link-row:hover {
  color: var(--color-ink);
}

.link-row__hint {
  font-weight: 600;
  color: var(--color-muted);
}

.link-row__chevron {
  flex: none;
  color: var(--color-muted);
}

/* The rows are list-like; no press scale. */
.link-row:active {
  transform: none;
}

.footer {
  margin-top: auto;
  text-align: center;
  font-size: 13px;
  color: var(--color-muted);
}
</style>
