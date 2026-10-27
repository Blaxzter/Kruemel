<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSettings } from '@/stores'
import { randomTreeSeed } from '@/domain/settings'
import type { Settings } from '@/domain/types'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'
import IntroDots from '@/components/intro/IntroDots.vue'
import IntroHello from '@/components/intro/IntroHello.vue'
import IntroTap from '@/components/intro/IntroTap.vue'
import IntroTree from '@/components/intro/IntroTree.vue'
import IntroInstall from '@/components/intro/IntroInstall.vue'

const { t } = useI18n()
const router = useRouter()
const { settings, update } = useSettings()
const { install, isStandalone, mode: installMode } = useInstallPrompt()

// Replaying the intro from Settings keeps the existing tree; a first run picks its seed now
// so step 3 already shows the tree that will grow.
const replay = settings.value.onboardingDone
const seed = replay ? settings.value.treeSeed : randomTreeSeed()

const name = ref(settings.value.name)
const dayStartHour = ref<Settings['dayStartHour']>(settings.value.dayStartHour)

// Already installed: no install step.
const total = computed(() => (isStandalone.value ? 3 : 4))
const step = ref(1)
const isLast = computed(() => step.value === total.value)
const isInstallStep = computed(() => step.value === 4)
// Until the app is installed, step 4 always offers "Später": next to the install button, or
// below the manual steps when the browser has no prompt (yet).
const offersInstall = computed(() => installMode.value !== 'installed')

const root = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)

// Move focus to the new step's heading so screen readers announce it.
watch(step, async () => {
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-step-title]')?.focus()
  // Only the middle row scrolls (on very short screens); start the new step at its top.
  body.value?.scrollTo?.({ top: 0 })
})

async function saveProfile(): Promise<void> {
  await update({ name: name.value.trim(), dayStartHour: dayStartHour.value })
}

async function next(): Promise<void> {
  if (step.value === 1) await saveProfile()
  if (isLast.value) await finish()
  else step.value += 1
}

async function skip(): Promise<void> {
  if (step.value === 1) await saveProfile()
  // "Überspringen" jumps to the install step, or finishes when there is none.
  if (total.value === 4) step.value = 4
  else await finish()
}

async function onInstall(): Promise<void> {
  const outcome = await install()
  if (outcome === 'accepted') await finish()
}

async function finish(): Promise<void> {
  await update({ onboardingDone: true, treeSeed: seed })
  await router.replace('/')
}
</script>

<template>
  <main ref="root" class="intro">
    <div class="intro__top">
      <button v-if="!isLast" type="button" class="intro__skip" @click="skip">{{ t('common.actions.skip') }}</button>
    </div>

    <div ref="body" class="intro__body">
      <IntroHello v-if="step === 1" v-model:name="name" v-model:day-start-hour="dayStartHour" />
      <IntroTap v-else-if="step === 2" />
      <IntroTree v-else-if="step === 3" :seed="seed" />
      <IntroInstall v-else :mode="installMode" @install="onInstall" />
    </div>

    <div class="intro__bottom">
      <IntroDots :step="step" :total="total" />
      <button v-if="isInstallStep && offersInstall" type="button" class="intro__later" data-testid="intro-finish" @click="finish">
        {{ t('intro.install.later') }}
      </button>
      <button v-else type="button" class="intro__primary" data-testid="intro-next" @click="next">
        {{ step === 1 || isLast ? t('common.actions.start') : t('common.actions.next') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
/*
 * The intro is exactly one screen high (the shell is fixed to 100dvh on this route, see
 * App.vue): skip button, the step, and the dots and buttons, which always stay on screen.
 * The step's picture shrinks on short screens; if it still does not fit, the step scrolls.
 */
.intro {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(12px, 2.4vh, 20px);
  padding: 0 4px;
}

/* A little inner room so focus rings are not cut off by the scroll box. */
.intro__body {
  min-height: 0;
  margin: -4px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.intro__top {
  display: flex;
  justify-content: flex-end;
  min-height: var(--touch-target);
  margin-top: -8px;
}

.intro__skip {
  height: var(--touch-target);
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 15px var(--font-body);
}

.intro__bottom {
  /* With the shell's 20px this gives the design's 28px below the buttons. */
  padding-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.intro__primary {
  height: 56px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: 800 17px var(--font-body);
}

.intro__later {
  height: 48px;
  margin-top: -8px;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: 800 16px var(--font-body);
}
</style>
