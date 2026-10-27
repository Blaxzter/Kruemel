<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntries, useSettings, useToday } from '@/stores'
import TreeView from '@/tree/TreeView.vue'
import PageHeader from '@/components/settings/PageHeader.vue'
import { formatTime } from '@/components/today/todayModel'
import { hasFreshLeaf, leafCount, nextMilestones, seasonFor, showBird, timeOfDayFor } from '@/domain'

const { t, locale } = useI18n()
const { settings } = useSettings()
const { entries } = useEntries()
const { todayKey, now } = useToday()

// The design draws the tree at 310px; narrow phones get a smaller one.
const treeSize = typeof window === 'undefined' ? 310 : Math.max(200, Math.min(310, window.innerWidth - 40))

const leaves = computed(() => leafCount(entries.value))
const isSeed = computed(() => leaves.value === 0)
const loggedToday = computed(() => hasFreshLeaf(entries.value, todayKey.value))
const bird = computed(() => showBird(entries.value, todayKey.value))

const timeLabel = computed(() => {
  const clock = formatTime(now.value, locale.value)
  return t('treepage.timeLabel', {
    season: t(`treepage.seasons.${seasonFor(now.value)}`),
    time: t(`treepage.times.${timeOfDayFor(now.value)}`),
    clock,
  })
})

const heading = computed(() => t('treepage.heading', { n: leaves.value }, leaves.value))

const nextText = computed(() => {
  if (isSeed.value) return t('treepage.seedText')
  const { toFlower, toApple, firstApple } = nextMilestones(leaves.value)
  const apple = t(firstApple ? 'treepage.firstApple' : 'treepage.nextApple', { n: toApple })
  return `${t('treepage.nextFlower', { n: toFlower }, toFlower)}, ${apple}`
})

const status = computed(() => {
  if (isSeed.value) return { tone: 'seed', text: t('treepage.status.seed') }
  if (bird.value) return { tone: 'grown', text: t('treepage.status.bird') }
  if (loggedToday.value) return { tone: 'grown', text: t('treepage.status.fresh') }
  return { tone: 'seed', text: t('treepage.status.waiting') }
})
</script>

<template>
  <main class="tree-page">
    <PageHeader :title="t('treepage.title')" back-to="/" :back-label="t('treepage.back')">
      <span class="tree-page__time">{{ timeLabel }}</span>
    </PageHeader>

    <div class="tree-page__art">
      <TreeView :leaves="leaves" :seed="settings.treeSeed" season="auto" time="auto" :fresh="loggedToday" :bird="bird" :size="treeSize" />
    </div>

    <div class="tree-page__intro">
      <h2 class="tree-page__heading">{{ heading }}</h2>
      <p class="tree-page__next">{{ nextText }}</p>
    </div>

    <ul class="legend" :aria-label="t('treepage.legendLabel')">
      <li class="legend__item">
        <svg width="24" height="24" viewBox="-2 -8 20 16" aria-hidden="true" focusable="false"><path d="M0 0 C4 -6 11 -5.5 16 0 C11 5.5 4 6 0 0 Z" fill="#9CC26B" /><path d="M1.5 0 L13 0" stroke="#4E6B2A" stroke-width="1" opacity="0.5" /></svg>
        <span><b>{{ t('treepage.legend.leaf') }}</b> <span class="legend__text">· {{ t('treepage.legend.leafText') }}</span></span>
      </li>
      <li class="legend__item">
        <svg width="24" height="24" viewBox="-6 -6 12 12" aria-hidden="true" focusable="false"><g fill="#FFB3D1"><circle cx="0" cy="-3" r="2.6" /><circle cx="2.9" cy="-0.9" r="2.6" /><circle cx="1.8" cy="2.4" r="2.6" /><circle cx="-1.8" cy="2.4" r="2.6" /><circle cx="-2.9" cy="-0.9" r="2.6" /></g><circle cx="0" cy="0" r="1.6" fill="#F7C548" /></svg>
        <span><b>{{ t('treepage.legend.flower') }}</b> <span class="legend__text">· {{ t('treepage.legend.flowerText') }}</span></span>
      </li>
      <li class="legend__item">
        <svg width="24" height="24" viewBox="-8 -11 16 18" aria-hidden="true" focusable="false"><path d="M0 -6 L0.6 -9.5" stroke="#6E4B36" stroke-width="1.4" stroke-linecap="round" /><path d="M0 -5.5 C-3 -7.5 -7 -6 -7 -1.5 C-7 3 -3.5 6.5 0 5.5 C3.5 6.5 7 3 7 -1.5 C7 -6 3 -7.5 0 -5.5 Z" fill="#E5484D" /></svg>
        <span><b>{{ t('treepage.legend.apple') }}</b> <span class="legend__text">· {{ t('treepage.legend.appleText') }}</span></span>
      </li>
      <li class="legend__item">
        <svg width="24" height="24" viewBox="-18 -13 34 24" aria-hidden="true" focusable="false"><path d="M-10 0 C-10 -7 -2 -9 4 -6 C8 -4 9 1 6 5 C1 9 -8 7 -10 0 Z" fill="#4C7BD9" /><circle cx="6" cy="-7" r="5" fill="#4C7BD9" /><path d="M10.5 -7.8 L15 -6.3 L10.5 -5.2 Z" fill="#F2A541" /></svg>
        <span><b>{{ t('treepage.legend.bird') }}</b> <span class="legend__text">· {{ t('treepage.legend.birdText') }}</span></span>
      </li>
    </ul>

    <div class="status" :class="`status--${status.tone}`" role="status">
      <svg v-if="status.tone === 'grown'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      <span>{{ status.text }}</span>
    </div>
  </main>
</template>

<style scoped>
.tree-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tree-page__time {
  flex: none;
  /* Right-aligned, also when it wraps below the title on narrow screens. */
  margin-left: auto;
  background: var(--tile-apricot-soft);
  color: var(--color-tile-ink);
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 800;
}

.tree-page__art {
  align-self: center;
  width: 310px;
  max-width: 100%;
}

.tree-page__intro {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px;
}

.tree-page__heading {
  font-size: 28px;
}

.tree-page__next {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-muted);
}

.legend {
  list-style: none;
  margin: 0;
  padding: 6px 14px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
}

.legend__item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 4px 0;
  font-size: 14px;
}

.legend__item + .legend__item {
  border-top: 1px solid var(--color-surface-chip);
}

.legend__item svg {
  flex: none;
}

.legend__text {
  color: var(--color-muted);
  font-weight: 600;
}

.status {
  margin-top: auto;
  min-height: 56px;
  border-radius: 20px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 800;
  color: var(--color-ink);
}

.status--seed {
  background: var(--color-surface-highlight);
}

.status--grown {
  background: var(--color-leaf-fill);
}
</style>
